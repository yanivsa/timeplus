import { generateId } from './crypto';
import { resolveEvidenceRetention } from './evidence-retention';
import {
  evaluateHaprofessorExtraction,
  HaprofessorEvaluation,
  HaprofessorModelExtraction,
  isHaprofessorRules,
} from './haprofessor-verifier';
import { approveTask } from './tasks';
import { getIsraelDateString } from './timezone';
import { Env } from './types';

export const AI_PROMPT_VERSION = 'proof-v2-haprofessor';
export const AI_POLICY_VERSION = 'proof-policy-v2-haprofessor';

type CheckResult = 'pass' | 'fail' | 'unknown';
type AiDecision = 'verified' | 'needs_review' | 'not_verified';
interface VerificationCheck { id: string; result: CheckResult; reason: string; }
interface VerificationResult { decision: AiDecision; checks: VerificationCheck[]; observed: string; suspicious: boolean; riskFlags: string[]; reason: string; }
interface SubmissionRow {
  id: string; task_instance_id: string; child_id: string; family_id: string; template_id: string | null;
  task_title: string; task_description: string | null; task_status: string; reward_minutes: number; task_kind: string;
  verification_mode: string | null; verification_rules_json: string | null; auto_approve_enabled: number | null;
  max_daily_auto_awards: number | null; media_kind: string | null; media_source: string | null;
}

const HAPROFESSOR_REQUIRED_CHECKS = [
  'correct_activity',
  'completion_visible',
  'result_readable',
  'screen_ui_visible',
  'exam_id_readable',
  'score_consistent',
];

const HAPROFESSOR_SCHEMA = {
  name: 'timeplus_haprofessor_exam_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      visibleUrl: { type: 'string' },
      completionHeading: { type: 'string' },
      resultText: { type: 'string' },
      successRateText: { type: 'string' },
      correctAnswers: { type: 'integer' },
      totalQuestions: { type: 'integer' },
      displayedPercentage: { type: 'number' },
      subjectBreakdown: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            correct: { type: 'integer' },
            total: { type: 'integer' },
          },
          required: ['name', 'correct', 'total'],
        },
      },
    },
    required: [
      'visibleUrl',
      'completionHeading',
      'resultText',
      'successRateText',
      'correctAnswers',
      'totalQuestions',
      'displayedPercentage',
      'subjectBreakdown',
    ],
  },
};

const GENERIC_SCHEMA = {
  name: 'timeplus_evidence_verification',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      decision: { type: 'string', enum: ['verified', 'needs_review', 'not_verified'] },
      checks: {
        type: 'array', minItems: 1, maxItems: 12,
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            id: { type: 'string' },
            result: { type: 'string', enum: ['pass', 'fail', 'unknown'] },
            reason: { type: 'string' },
          },
          required: ['id', 'result', 'reason'],
        },
      },
      observed: { type: 'string' },
      suspicious: { type: 'boolean' },
      riskFlags: { type: 'array', items: { type: 'string' }, maxItems: 12 },
      reason: { type: 'string' },
    },
    required: ['decision', 'checks', 'observed', 'suspicious', 'riskFlags', 'reason'],
  },
};

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const b = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) {
    s += String.fromCharCode(...b.subarray(i, Math.min(i + 0x8000, b.length)));
  }
  return btoa(s);
}

async function readEvidenceObject(env: Env, key: string): Promise<ArrayBuffer | null> {
  if (env.EVIDENCE) {
    const o = await env.EVIDENCE.get(key);
    return o ? o.arrayBuffer() : null;
  }
  return env.EVIDENCE_KV ? env.EVIDENCE_KV.get(key, 'arrayBuffer') : null;
}

function normalizedContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((p: any) => typeof p?.text === 'string' ? p.text : '').join('');
  }
  return '';
}

function validateResult(v: any): VerificationResult | null {
  if (!v || !['verified', 'needs_review', 'not_verified'].includes(v.decision) || !Array.isArray(v.checks) || !v.checks.length) return null;
  const checks: VerificationCheck[] = [];
  for (const c of v.checks) {
    if (!c || typeof c.id !== 'string' || !['pass', 'fail', 'unknown'].includes(c.result)) return null;
    checks.push({ id: c.id.slice(0, 80), result: c.result, reason: String(c.reason || '').slice(0, 300) });
  }
  return {
    decision: v.decision,
    checks,
    observed: String(v.observed || '').slice(0, 700),
    suspicious: v.suspicious === true,
    riskFlags: Array.isArray(v.riskFlags) ? v.riskFlags.map((x: any) => String(x).slice(0, 120)).slice(0, 12) : [],
    reason: String(v.reason || '').slice(0, 700),
  };
}

function requiredChecksFromRules(r: any): string[] {
  const vals = Array.isArray(r?.requiredChecks) ? r.requiredChecks.map(String).filter(Boolean).slice(0, 12) : [];
  return vals.length ? vals : ['correct_activity', 'completion_visible', 'result_readable'];
}

function deterministicEligibility(args: {
  result: VerificationResult;
  requiredChecks: string[];
  duplicateDetected: boolean;
  mediaKind: string | null;
  rules: any;
  autoApproveEnabled: boolean;
}) {
  const blockers: string[] = [];
  const byId = new Map(args.result.checks.map(c => [c.id, c.result]));
  for (const id of args.requiredChecks) if (byId.get(id) !== 'pass') blockers.push(`check:${id}`);
  if (args.result.decision !== 'verified') blockers.push('ai_decision');
  if (args.result.suspicious) blockers.push('suspicious');
  if (args.result.riskFlags.length) blockers.push('risk_flags');
  if (args.duplicateDetected) blockers.push('duplicate');
  if (!args.autoApproveEnabled) blockers.push('template_auto_approve_disabled');
  if (String(args.mediaKind || '') !== 'screenshot') blockers.push('media_not_gallery_screenshot');
  if (!['educational_result_screenshot', 'haprofessor_exam_result'].includes(String(args.rules?.activityType || ''))) {
    blockers.push('activity_type_not_auto_eligible');
  }
  if (args.rules?.requireScreenUi !== true) blockers.push('screen_ui_rule_required');
  if (byId.get('screen_ui_visible') !== 'pass') blockers.push('screen_ui_not_verified');
  return { eligible: blockers.length === 0, blockers };
}

async function recordAttempt(env: Env, submissionId: string, v: {
  route: string; provider: string | null; model: string | null; status: string; latencyMs: number; result: unknown;
}) {
  await env.DB.prepare(
    `INSERT INTO ai_verification_attempts (id, submission_id, route, provider, model, status, latency_ms, result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    generateId(), submissionId, v.route, v.provider, v.model, v.status, v.latencyMs,
    JSON.stringify(v.result ?? {}), new Date().toISOString()
  ).run();
}

async function updateManualFallback(
  env: Env,
  submissionId: string,
  status: 'ai_unavailable' | 'needs_parent_review' | 'rejected_by_ai',
  summary: string,
  extra: Record<string, unknown> = {}
) {
  await env.DB.prepare(
    `UPDATE task_submissions
     SET verification_status=?, verification_summary=?, review_mode='parent', verification_policy_version=?,
         verification_prompt_version=?, verification_risk_flags_json=?, ai_shadow_decision=?,
         auto_approval_eligible=0, ai_verified_at=?
     WHERE id=?`
  ).bind(
    status, summary, AI_POLICY_VERSION, AI_PROMPT_VERSION, JSON.stringify(extra.riskFlags || []),
    String(extra.decision || 'needs_review'), new Date().toISOString(), submissionId
  ).run();
}

async function claimHaprofessorExam(
  env: Env,
  sub: SubmissionRow,
  evaluation: HaprofessorEvaluation,
  minutesToAward: number
): Promise<'claimed' | 'duplicate'> {
  if (!evaluation.examId) return 'duplicate';
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO external_reward_claims
       (provider, child_id, external_reference_id, family_id, submission_id, task_instance_id, minutes_awarded, created_at)
     VALUES ('haprofessor', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sub.child_id,
    evaluation.examId,
    sub.family_id,
    sub.id,
    sub.task_instance_id,
    minutesToAward,
    now
  ).run();
  const owner = await env.DB.prepare(
    `SELECT submission_id FROM external_reward_claims
     WHERE provider='haprofessor' AND child_id=? AND external_reference_id=?`
  ).bind(sub.child_id, evaluation.examId).first<{ submission_id: string }>();
  return owner?.submission_id === sub.id ? 'claimed' : 'duplicate';
}

async function releaseHaprofessorClaim(env: Env, sub: SubmissionRow, evaluation: HaprofessorEvaluation): Promise<void> {
  if (!evaluation.examId) return;
  await env.DB.prepare(
    `DELETE FROM external_reward_claims
     WHERE provider='haprofessor' AND child_id=? AND external_reference_id=? AND submission_id=?`
  ).bind(sub.child_id, evaluation.examId, sub.id).run();
}

export async function verifyEvidenceSubmission(env: Env, submissionId: string): Promise<void> {
  const startedAt = Date.now();
  const sub = await env.DB.prepare(
    `SELECT ts.id, ts.task_instance_id, ts.child_id, ti.family_id, ti.template_id,
            ti.title AS task_title, ti.description AS task_description, ti.status AS task_status,
            ti.reward_minutes, ti.task_kind, ti.verification_mode, ti.verification_rules_json,
            ti.auto_approve_enabled, ti.max_daily_auto_awards, ts.media_kind, ts.media_source
     FROM task_submissions ts
     JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.id=?`
  ).bind(submissionId).first<SubmissionRow>();
  if (!sub || sub.task_status !== 'submitted') return;

  if (String(env.AI_EVIDENCE_ENABLED || 'true') !== 'true' || sub.verification_mode !== 'ai_media') {
    await updateManualFallback(env, submissionId, 'needs_parent_review', 'התיעוד ממתין לבדיקת הורה. אימות AI אינו מופעל למשימה זו.');
    return;
  }
  const directEnabled = String(env.AI_DIRECT_OPENROUTER_FALLBACK || 'true') === 'true' && Boolean(env.OPENROUTER_API_KEY);
  if ((!env.FREE_ROUTER || !env.TIMEPLUS_ROUTER_TOKEN) && !directEnabled) {
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'שירות האימות האוטומטי אינו זמין כרגע; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  const { results: assets } = await env.DB.prepare(
    `SELECT id,kind,object_key,mime_type,duplicate_of_asset_id
     FROM submission_evidence_assets
     WHERE submission_id=? AND deleted_at IS NULL
     ORDER BY CASE kind WHEN 'normalized' THEN 1 WHEN 'contact_sheet' THEN 2 WHEN 'keyframe' THEN 3 ELSE 4 END, created_at ASC`
  ).bind(submissionId).all<any>();
  const duplicateDetected = (assets || []).some((a: any) => Boolean(a.duplicate_of_asset_id));
  if (duplicateDetected) {
    await updateManualFallback(env, submissionId, 'needs_parent_review', 'זוהתה ראיה זהה להגשה קודמת; נדרשת בדיקת הורה.', {
      riskFlags: ['duplicate'], decision: 'needs_review',
    });
    return;
  }

  const visual = (assets || []).filter((a: any) =>
    String(a.mime_type || '').startsWith('image/') &&
    (sub.media_kind === 'video' ? ['contact_sheet', 'keyframe'].includes(a.kind) : ['normalized', 'original'].includes(a.kind))
  ).slice(0, 4);
  const imageParts: any[] = [];
  for (const a of visual) {
    const bytes = await readEvidenceObject(env, a.object_key);
    if (bytes) imageParts.push({ type: 'image_url', image_url: { url: `data:${a.mime_type};base64,${bytesToBase64(bytes)}` } });
  }
  if (!imageParts.length) {
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'לא נמצאה תמונה מתאימה לאימות אוטומטי; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  const rules = safeJson<any>(sub.verification_rules_json, {});
  const haprofessorMode = isHaprofessorRules(rules);
  const required = haprofessorMode ? HAPROFESSOR_REQUIRED_CHECKS : requiredChecksFromRules(rules);
  const prompt = haprofessorMode
    ? [
        'Extract visible facts from a completed exam summary screenshot from online.haprofessor.com.',
        'Do not decide whether to award anything and do not calculate reward minutes.',
        'Transcribe the browser address-bar URL exactly when readable. Never invent or complete missing digits.',
        'The target page normally contains the Hebrew heading “סיימתם את המבחן!”, an explicit line “ענית נכון על X שאלות מתוך Y שאלות”, and “שיעור הצלחה Z%”.',
        'correctAnswers and totalQuestions MUST come only from the explicit X-out-of-Y result line. Never derive them from the percentage, progress bar, visible question cards, or topic breakdown.',
        'If any required text or number is unreadable, use an empty string for its text and -1 for its numeric field. Do not guess.',
        'For subjectBreakdown, include only topic rows whose correct/total values are fully readable. It is valid to return an empty or partial array.',
        'Educational passages and questions may legitimately repeat in different exams. Do not mark repeated content as a duplicate. The server handles duplicates using the exam ID in the URL.',
        'Do not identify the child or infer any sensitive personal trait.',
        'Return only the requested extraction object.',
      ].join('\n')
    : [
        'You verify visual proof that a child completed a task. Inspect only the supplied media.',
        'Do not identify the child or infer identity, health, ethnicity, religion, location, or any sensitive trait.',
        `Task: ${sub.task_title}`,
        sub.task_description ? `Task description: ${sub.task_description}` : '',
        `Verification rules: ${JSON.stringify(rules)}`,
        `Required checks: ${required.join(', ')}`,
        'Be conservative. If the requested activity is unclear, completion is not visible, text is unreadable, the image is partial/manipulated, or evidence is ambiguous, use needs_review/not_verified and unknown/fail checks.',
        rules?.requireScreenUi === true ? 'For screen_ui_visible, pass only when the evidence clearly shows a software/app result screen or interface, not merely a camera photo of the physical world.' : '',
        'Return only the requested structured object. Do not decide reward minutes.',
      ].filter(Boolean).join('\n');

  const payload = {
    model: 'auto',
    temperature: 0,
    max_tokens: haprofessorMode ? 1200 : 900,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imageParts] }],
    response_format: { type: 'json_schema', json_schema: haprofessorMode ? HAPROFESSOR_SCHEMA : GENERIC_SCHEMA },
  };

  let response: Response | null = null;
  let route = 'free_router';
  if (env.FREE_ROUTER && env.TIMEPLUS_ROUTER_TOKEN) {
    try {
      response = await env.FREE_ROUTER.fetch('https://free-router.internal/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-timeplus-service-token': env.TIMEPLUS_ROUTER_TOKEN,
          'x-free-router-session': `timeplus-proof-${submissionId}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      await recordAttempt(env, submissionId, {
        route: 'free_router', provider: null, model: null, status: 'network_error',
        latencyMs: Date.now() - startedAt, result: { error: String(error) },
      });
    }
  }

  if ((!response || !response.ok) && directEnabled) {
    if (response) {
      const body = await response.clone().text().catch(() => '');
      await recordAttempt(env, submissionId, {
        route: 'free_router',
        provider: response.headers.get('x-free-router-provider'),
        model: response.headers.get('x-free-router-route-model'),
        status: `http_${response.status}`,
        latencyMs: Date.now() - startedAt,
        result: { status: response.status, body: body.slice(0, 1000) },
      });
    }
    route = 'openrouter_direct';
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://timeplus-app.pages.dev',
          'X-Title': 'Time+ evidence verification',
        },
        body: JSON.stringify({ ...payload, model: 'openrouter/free' }),
      });
    } catch (error) {
      await recordAttempt(env, submissionId, {
        route, provider: 'openrouter', model: 'openrouter/free', status: 'network_error',
        latencyMs: Date.now() - startedAt, result: { error: String(error) },
      });
      response = null;
    }
  }

  if (!response) {
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'שירות האימות לא היה זמין; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  const provider = route === 'openrouter_direct' ? 'openrouter' : response.headers.get('x-free-router-provider');
  const routeModel = route === 'openrouter_direct' ? 'openrouter/free' : response.headers.get('x-free-router-route-model');
  const canonical = route === 'openrouter_direct' ? 'openrouter/free' : response.headers.get('x-free-router-model');
  const rawText = await response.text();
  if (!response.ok) {
    await recordAttempt(env, submissionId, {
      route, provider, model: routeModel || canonical, status: `http_${response.status}`,
      latencyMs: Date.now() - startedAt, result: { status: response.status, body: rawText.slice(0, 1000) },
    });
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'לא נמצא כרגע מודל Vision חינמי מתאים; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  let parsed: any = null;
  try { parsed = JSON.parse(rawText); } catch {}
  const content = normalizedContent(parsed?.choices?.[0]?.message?.content);
  let rr: any = null;
  try { rr = JSON.parse(content); } catch {}
  if (!rr || typeof rr !== 'object') {
    await recordAttempt(env, submissionId, {
      route, provider, model: routeModel || canonical, status: 'invalid_structured_output',
      latencyMs: Date.now() - startedAt, result: { content: content.slice(0, 1000) },
    });
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'תוצאת האימות האוטומטי לא הייתה תקינה; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  let haprofessorEvaluation: HaprofessorEvaluation | null = null;
  let result: VerificationResult | null = null;
  if (haprofessorMode) {
    haprofessorEvaluation = evaluateHaprofessorExtraction(rr as HaprofessorModelExtraction);
    result = haprofessorEvaluation;
    await env.DB.prepare(
      `UPDATE task_submissions
       SET evidence_provider='haprofessor', external_reference_id=?, detected_course_id=?,
           detected_correct_answers=?, detected_total_questions=?, detected_success_percent=?, deterministic_confidence=?
       WHERE id=?`
    ).bind(
      haprofessorEvaluation.examId,
      haprofessorEvaluation.courseId,
      haprofessorEvaluation.correctAnswers,
      haprofessorEvaluation.totalQuestions,
      haprofessorEvaluation.displayedPercentage,
      haprofessorEvaluation.confidence,
      submissionId
    ).run();
  } else {
    result = validateResult(rr);
  }

  if (!result) {
    await recordAttempt(env, submissionId, {
      route, provider, model: routeModel || canonical, status: 'invalid_structured_output',
      latencyMs: Date.now() - startedAt, result: { content: content.slice(0, 1000) },
    });
    await updateManualFallback(env, submissionId, 'ai_unavailable', 'תוצאת האימות האוטומטי לא הייתה תקינה; התיעוד נשמר לבדיקה ידנית.');
    return;
  }

  const eligibility = deterministicEligibility({
    result,
    requiredChecks: required,
    duplicateDetected,
    mediaKind: sub.media_kind,
    rules,
    autoApproveEnabled: Number(sub.auto_approve_enabled || 0) === 1,
  });
  let capAllowed = true;
  const cap = Number(sub.max_daily_auto_awards || 0);
  if (cap > 0 && sub.template_id) {
    const today = getIsraelDateString();
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS c
       FROM task_submissions ts
       JOIN task_instances ti ON ti.id=ts.task_instance_id
       WHERE ti.child_id=? AND ti.template_id=? AND ti.due_date=? AND ts.review_mode='automatic' AND ts.status='approved'`
    ).bind(sub.child_id, sub.template_id, today).first<{ c: number }>();
    capAllowed = Number(row?.c || 0) < cap;
    if (!capAllowed) eligibility.blockers.push('daily_auto_award_cap');
  }

  const autoEligible = eligibility.eligible && capAllowed;
  const mode = String(env.AI_EVIDENCE_MODE || 'shadow').toLowerCase();
  await recordAttempt(env, submissionId, {
    route, provider, model: routeModel || canonical, status: 'success', latencyMs: Date.now() - startedAt,
    result: { ...result, requiredChecks: required, autoEligible, blockers: eligibility.blockers, canonical },
  });

  const now = new Date().toISOString();
  const summary = `${result.observed || result.reason}${eligibility.blockers.length ? ` · נדרש הורה: ${eligibility.blockers.join(', ')}` : ''}`.slice(0, 1000);
  await env.DB.prepare(
    `UPDATE task_submissions
     SET verification_status=?, verification_route=?, verification_provider=?, verification_model=?,
         verification_summary=?, verification_checks_json=?, verification_policy_version=?, verification_prompt_version=?,
         verification_risk_flags_json=?, ai_shadow_decision=?, auto_approval_eligible=?, ai_verified_at=?
     WHERE id=?`
  ).bind(
    result.decision === 'not_verified' ? 'rejected_by_ai' : 'needs_parent_review',
    route, provider, routeModel || canonical, summary, JSON.stringify(result.checks), AI_POLICY_VERSION,
    AI_PROMPT_VERSION, JSON.stringify(result.riskFlags), result.decision, autoEligible ? 1 : 0, now, submissionId
  ).run();

  if (mode !== 'auto' || !autoEligible) return;

  const minutesToAward = haprofessorEvaluation?.minutesToAward;
  if (haprofessorEvaluation) {
    const claim = await claimHaprofessorExam(env, sub, haprofessorEvaluation, minutesToAward ?? 0);
    if (claim === 'duplicate') {
      await updateManualFallback(
        env,
        submissionId,
        'needs_parent_review',
        `המבחן ${haprofessorEvaluation.examId || ''} כבר זיכה בדקות בעבר; לא ניתן זיכוי נוסף אוטומטית.`,
        { riskFlags: ['duplicate_exam_id'], decision: 'needs_review' }
      );
      return;
    }
  }

  const approved = await approveTask(env.DB, sub.task_instance_id, sub.family_id, minutesToAward, 'system');
  if (!approved.success) {
    const cur = await env.DB.prepare(
      `SELECT status FROM task_instances WHERE id=? AND family_id=?`
    ).bind(sub.task_instance_id, sub.family_id).first<{ status: string }>();
    if (cur?.status === 'approved') return;
    if (haprofessorEvaluation) await releaseHaprofessorClaim(env, sub, haprofessorEvaluation);
    await updateManualFallback(
      env,
      submissionId,
      'needs_parent_review',
      `AI אימת את הראיה, אך הזיכוי האוטומטי לא הושלם: ${approved.error || 'נדרשת בדיקת הורה'}`,
      { riskFlags: ['auto_approval_failed'], decision: 'verified' }
    );
    return;
  }

  await env.DB.prepare(
    `UPDATE task_submissions
     SET verification_status='verified', review_mode='automatic', status='approved', reviewed_at=?, verification_summary=?
     WHERE id=?`
  ).bind(now, `${result.observed || 'הראיה אומתה אוטומטית.'} · אושר אוטומטית לפי כללי Time+`, submissionId).run();
  await env.DB.prepare(
    `UPDATE minute_transactions SET evidence_submission_id=?
     WHERE id=(SELECT id FROM minute_transactions WHERE task_instance_id=? AND child_id=? AND evidence_submission_id IS NULL ORDER BY created_at DESC LIMIT 1)`
  ).bind(submissionId, sub.task_instance_id, sub.child_id).run();
  await resolveEvidenceRetention(env.DB, submissionId);
  await env.DB.prepare(
    `INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
     VALUES (?,?,'system','ai_verifier','evidence_auto_approved','task_submission',?,?,?)`
  ).bind(
    generateId(),
    sub.family_id,
    submissionId,
    JSON.stringify({
      provider,
      model: routeModel || canonical,
      policyVersion: AI_POLICY_VERSION,
      promptVersion: AI_PROMPT_VERSION,
      minutesAwarded: approved.minutesAwarded,
      xpAwarded: approved.xpAwarded,
      externalReferenceId: haprofessorEvaluation?.examId || null,
    }),
    now
  ).run();
}
