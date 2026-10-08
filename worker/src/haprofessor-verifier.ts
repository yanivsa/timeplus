export type HaprofessorDecision = 'verified' | 'needs_review' | 'not_verified';
export type HaprofessorCheckResult = 'pass' | 'fail' | 'unknown';

export interface HaprofessorSubjectRow {
  name: string;
  correct: number;
  total: number;
}

export interface HaprofessorModelExtraction {
  visibleUrl: string;
  completionHeading: string;
  resultText: string;
  successRateText: string;
  correctAnswers: number;
  totalQuestions: number;
  displayedPercentage: number;
  subjectBreakdown: HaprofessorSubjectRow[];
}

export interface HaprofessorCheck {
  id: string;
  result: HaprofessorCheckResult;
  reason: string;
}

export interface HaprofessorEvaluation {
  decision: HaprofessorDecision;
  checks: HaprofessorCheck[];
  observed: string;
  suspicious: boolean;
  riskFlags: string[];
  reason: string;
  confidence: number;
  courseId: string | null;
  examId: string | null;
  correctAnswers: number | null;
  totalQuestions: number | null;
  displayedPercentage: number | null;
  minutesToAward: number;
}

interface ParsedUrl {
  courseId: string | null;
  examId: string | null;
  wrongProvider: boolean;
}

function parseExamUrl(raw: string): ParsedUrl {
  const text = String(raw || '').trim();
  if (!text) return { courseId: null, examId: null, wrongProvider: false };
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (host !== 'online.haprofessor.com') {
      return { courseId: null, examId: null, wrongProvider: true };
    }
    const match = url.pathname.match(/^\/exams\/(\d+)\/(\d+)\/summary\/?$/i);
    if (!match) return { courseId: null, examId: null, wrongProvider: false };
    return { courseId: match[1], examId: match[2], wrongProvider: false };
  } catch {
    return { courseId: null, examId: null, wrongProvider: false };
  }
}

function parseResultText(raw: string): { correct: number; total: number } | null {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const match = text.match(/ענית\s+נכון\s+על\s+(\d+)\s+שאל(?:ה|ות)\s+מתוך\s+(\d+)\s+שאל(?:ה|ות)/);
  if (!match) return null;
  return { correct: Number(match[1]), total: Number(match[2]) };
}

function parseSuccessRate(raw: string): number | null {
  const text = String(raw || '').replace(/,/g, '.');
  const match = text.match(/שיעור\s+הצלחה\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

export function isHaprofessorRules(rules: unknown): boolean {
  const value = rules as Record<string, unknown> | null;
  return Boolean(
    value &&
    value.activityType === 'haprofessor_exam_result' &&
    value.provider === 'haprofessor' &&
    value.rewardPolicy === 'correct_answers'
  );
}

export function shouldUseHaprofessorVerifier(
  rules: unknown,
  task: { title?: string | null; description?: string | null }
): boolean {
  if (isHaprofessorRules(rules)) return true;
  const value = rules as Record<string, unknown> | null;
  if (!value || value.activityType !== 'educational_result_screenshot') return false;
  const context = [task?.title, task?.description, typeof value.instructions === 'string' ? value.instructions : '']
    .filter(Boolean)
    .join(' ');
  return /(?:haprofessor|הפרופסור|פרופסור)/i.test(context);
}

export function evaluateHaprofessorExtraction(raw: HaprofessorModelExtraction): HaprofessorEvaluation {
  const riskFlags: string[] = [];
  const checks: HaprofessorCheck[] = [];
  let confidence = 0;

  const parsedUrl = parseExamUrl(raw?.visibleUrl || '');
  if (parsedUrl.wrongProvider) {
    riskFlags.push('wrong_provider');
    checks.push({ id: 'correct_activity', result: 'fail', reason: 'The visible URL is not online.haprofessor.com.' });
  } else if (parsedUrl.examId && parsedUrl.courseId) {
    confidence += 30;
    checks.push({ id: 'correct_activity', result: 'pass', reason: 'Haprofessor summary URL is visible.' });
    checks.push({ id: 'exam_id_readable', result: 'pass', reason: `Exam ID ${parsedUrl.examId} is readable from the URL.` });
  } else {
    checks.push({ id: 'correct_activity', result: 'unknown', reason: 'Haprofessor summary URL is not fully readable.' });
    checks.push({ id: 'exam_id_readable', result: 'unknown', reason: 'Exam ID cannot be read reliably from the URL.' });
  }

  const headingVisible = String(raw?.completionHeading || '').includes('סיימתם את המבחן');
  if (headingVisible) {
    confidence += 20;
    checks.push({ id: 'completion_visible', result: 'pass', reason: 'Completed-exam heading is visible.' });
  } else {
    checks.push({ id: 'completion_visible', result: 'unknown', reason: 'Completed-exam heading is not clearly readable.' });
  }

  const parsedResult = parseResultText(raw?.resultText || '');
  let correct: number | null = null;
  let total: number | null = null;
  if (parsedResult) {
    const fieldsMatch = Number.isInteger(raw?.correctAnswers) && Number.isInteger(raw?.totalQuestions) &&
      raw.correctAnswers === parsedResult.correct && raw.totalQuestions === parsedResult.total;
    const rangeValid = parsedResult.total > 0 && parsedResult.correct >= 0 && parsedResult.correct <= parsedResult.total;
    if (!fieldsMatch) riskFlags.push('result_field_mismatch');
    if (!rangeValid) riskFlags.push('invalid_result_range');
    if (fieldsMatch && rangeValid) {
      correct = parsedResult.correct;
      total = parsedResult.total;
      confidence += 30;
      checks.push({ id: 'result_readable', result: 'pass', reason: `Explicit result is ${correct}/${total}.` });
    } else {
      checks.push({ id: 'result_readable', result: 'fail', reason: 'Explicit result text conflicts with extracted numeric fields or has an invalid range.' });
    }
  } else {
    checks.push({ id: 'result_readable', result: 'unknown', reason: 'The explicit “X out of Y” result line is not readable.' });
  }

  const parsedPercent = parseSuccessRate(raw?.successRateText || '');
  let displayedPercentage: number | null = null;
  if (parsedPercent != null && Number.isFinite(raw?.displayedPercentage)) {
    displayedPercentage = parsedPercent;
    if (Math.abs(parsedPercent - Number(raw.displayedPercentage)) > 0.01) {
      riskFlags.push('percentage_field_mismatch');
    }
  } else if (parsedPercent != null) {
    displayedPercentage = parsedPercent;
  }

  if (correct != null && total != null && displayedPercentage != null) {
    const expected = (correct / total) * 100;
    if (Math.abs(displayedPercentage - expected) <= 1.0 && !riskFlags.includes('percentage_field_mismatch')) {
      confidence += 15;
      checks.push({ id: 'score_consistent', result: 'pass', reason: `Displayed ${displayedPercentage}% is consistent with ${correct}/${total}.` });
    } else {
      riskFlags.push('percentage_mismatch');
      checks.push({ id: 'score_consistent', result: 'fail', reason: `Displayed percentage is inconsistent with ${correct}/${total}.` });
    }
  } else {
    checks.push({ id: 'score_consistent', result: 'unknown', reason: 'Percentage consistency cannot be verified.' });
  }

  const rows = Array.isArray(raw?.subjectBreakdown) ? raw.subjectBreakdown : [];
  let rowDataValid = true;
  let sumCorrect = 0;
  let sumTotal = 0;
  for (const row of rows) {
    if (!Number.isInteger(row?.correct) || !Number.isInteger(row?.total) || row.total < 0 || row.correct < 0 || row.correct > row.total) {
      rowDataValid = false;
      break;
    }
    sumCorrect += row.correct;
    sumTotal += row.total;
  }
  if (!rowDataValid) {
    riskFlags.push('invalid_subject_breakdown');
  } else if (rows.length && total != null && sumTotal === total) {
    if (sumCorrect === correct) {
      confidence += 5;
    } else {
      riskFlags.push('subject_breakdown_mismatch');
    }
  } else if (total != null && sumTotal > total) {
    riskFlags.push('subject_breakdown_mismatch');
  }

  const screenUiVisible = Boolean(parsedUrl.examId && headingVisible);
  checks.push({
    id: 'screen_ui_visible',
    result: screenUiVisible ? 'pass' : 'unknown',
    reason: screenUiVisible ? 'Browser result UI and summary context are visible.' : 'Result UI context is incomplete.',
  });

  let decision: HaprofessorDecision = 'needs_review';
  if (parsedUrl.wrongProvider) decision = 'not_verified';
  else if (confidence >= 95 && riskFlags.length === 0 && correct != null && total != null && parsedUrl.examId) decision = 'verified';

  const minutesToAward = decision === 'verified' && correct != null ? correct : 0;
  const observed = correct != null && total != null
    ? `הפרופסור: ${correct}/${total}${parsedUrl.examId ? ` · מבחן ${parsedUrl.examId}` : ''}`
    : 'תוצאת מבחן הפרופסור לא נקראה במלואה.';
  const reason = decision === 'verified'
    ? `אומת מסך סיום של הפרופסור; הזיכוי הוא ${minutesToAward} דקות לפי מספר התשובות הנכונות בלבד.`
    : parsedUrl.wrongProvider
      ? 'הצילום מציג ספק אחר ואינו מסך סיכום של הפרופסור.'
      : 'לא ניתן לאמת בביטחון את כל נתוני הסיום; נדרשת בדיקת הורה.';

  return {
    decision,
    checks,
    observed,
    suspicious: riskFlags.length > 0,
    riskFlags: [...new Set(riskFlags)],
    reason,
    confidence,
    courseId: parsedUrl.courseId,
    examId: parsedUrl.examId,
    correctAnswers: correct,
    totalQuestions: total,
    displayedPercentage,
    minutesToAward,
  };
}
