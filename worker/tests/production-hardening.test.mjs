import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const source = {
  index: read('../src/index.ts'),
  tasks: read('../src/tasks.ts'),
  wallet: read('../src/wallet.ts'),
  sessions: read('../src/screen-sessions.ts'),
  evidence: read('../src/evidence.ts'),
  evidenceReview: read('../src/evidence-review.ts'),
  ai: read('../src/ai-verification.ts'),
  timezone: read('../src/timezone.ts'),
  authContext: read('../../web/src/context/AuthContext.tsx'),
  mainActivity: read('../../android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt'),
  runtimeQa: read('../../.github/workflows/android-runtime-qa.yml'),
};

const migrationUrl = new URL('../migrations/0008_production_hardening.sql', import.meta.url);
const migration = existsSync(migrationUrl) ? readFileSync(migrationUrl, 'utf8') : '';
const consistencyMigrationUrl = new URL('../migrations/0009_consistency_security_hardening.sql', import.meta.url);
const consistencyMigration = existsSync(consistencyMigrationUrl) ? readFileSync(consistencyMigrationUrl, 'utf8') : '';

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('parent child-details task query joins task_templates before using tt.schedule_type', () => {
  const block = between(source.index, "pathname.match(/^\\/api\\/parent\\/children\\/[^/]+\\/details$/)", "pathname === '/api/parent/stats'");
  assert.match(block, /LEFT JOIN task_templates tt ON tt\.id\s*=\s*ti\.template_id/);
  assert.match(block, /tt\.schedule_type/);
});

test('repeatable task generation copies every AI verification field', () => {
  const ensureRepeatable = between(source.tasks, "if (tpl.schedule_type === 'repeatable')", 'continue;');
  for (const field of ['verification_mode', 'verification_rules_json', 'allow_video_proof', 'auto_approve_enabled', 'max_daily_auto_awards']) {
    assert.match(ensureRepeatable, new RegExp(field), `ensureDailyTaskInstances repeatable insert must copy ${field}`);
  }

  const submitRepeatable = between(source.tasks, "if (tpl && tpl.schedule_type === 'repeatable')", 'return { success: true };');
  for (const field of ['verification_mode', 'verification_rules_json', 'allow_video_proof', 'auto_approve_enabled', 'max_daily_auto_awards']) {
    assert.match(submitRepeatable, new RegExp(field), `submitTask repeatable insert must copy ${field}`);
  }
});

test('production hardening migration enforces one correction and one active timer per child', () => {
  assert.ok(migration, '0008_production_hardening.sql must exist');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS screen_usage_corrections/i);
  assert.match(migration, /usage_log_id\s+TEXT\s+NOT NULL\s+UNIQUE/i);
  assert.match(migration, /CREATE UNIQUE INDEX[\s\S]*screen_sessions\s*\(\s*child_id\s*\)[\s\S]*WHERE status IN \('running','paused'\)/i);
});

test('consistency hardening migration adds DB-enforced task generation and review operation invariants', () => {
  assert.ok(consistencyMigration, '0009_consistency_security_hardening.sql must exist');
  assert.match(consistencyMigration, /ALTER TABLE task_instances ADD COLUMN generation_key TEXT/i);
  assert.match(consistencyMigration, /ALTER TABLE task_instances ADD COLUMN rejection_operation_id TEXT/i);
  assert.match(consistencyMigration, /ALTER TABLE task_submissions ADD COLUMN evidence_review_operation_id TEXT/i);
  assert.match(consistencyMigration, /CREATE UNIQUE INDEX[\s\S]*task_instances\s*\(\s*generation_key\s*\)[\s\S]*WHERE generation_key IS NOT NULL/i);
});

test('usage correction claims once and refunds atomically with arithmetic balance update', () => {
  const block = between(source.wallet, 'export async function correctUsage', 'export async function getChildWalletSummary');
  assert.match(block, /screen_usage_corrections/);
  assert.match(block, /db\.batch\s*\(/);
  assert.match(block, /available_minutes\s*=\s*available_minutes\s*\+\s*\?/);
  assert.match(block, /already|כבר/);
});

test('screen-time approval commits request, wallet and ledger in one guarded D1 batch', () => {
  const block = between(source.wallet, 'export async function reviewScreenTimeRequest', 'export async function logManualScreenUsage');
  assert.match(block, /db\.batch\s*\(/);
  assert.match(block, /available_minutes\s*=\s*available_minutes\s*-\s*\?/);
  assert.match(block, /meta\?\.changes|meta\.changes/);
});

test('task approval batches the guarded approval claim with minute credit and ledger write', () => {
  const block = between(source.tasks, 'export async function approveTask', 'export async function rejectTask');
  assert.match(block, /db\.batch\s*\(/);
  assert.match(block, /available_minutes\s*=\s*available_minutes\s*\+\s*\?/);
  assert.match(block, /reviewed_at\s*=\s*\?/);
});

test('timer starts convert active-session uniqueness races into a friendly conflict', () => {
  assert.match(source.sessions, /isActiveSessionConflict|active session conflict/i);
  const approved = between(source.sessions, 'export async function startScreenSession', 'export async function startSelfScreenSession');
  const self = between(source.sessions, 'export async function startSelfScreenSession', 'export async function pauseScreenSession');
  assert.match(approved, /catch/);
  assert.match(self, /catch/);
});

test('evidence completion transitions task and submission together in one linked batch', () => {
  const block = between(source.evidence, 'async function completeEvidenceSubmission', 'async function getChildEvidence');
  assert.match(block, /env\.DB\.batch\s*\(/);
  assert.match(block, /submitted_at\s*=\s*\?/);
  assert.match(block, /verification_status\s*=\s*\?/);
  assert.match(block, /EXISTS\s*\(\s*SELECT 1 FROM task_instances/i);
});

test('Android native bridge persists bearer auth across allowed origin fallback', () => {
  assert.match(source.mainActivity, /fun getAuthToken\(\): String/);
  assert.match(source.mainActivity, /fun setAuthToken\(token: String\)/);
  assert.match(source.mainActivity, /fun clearAuthToken\(\)/);
  assert.match(source.authContext, /getAuthToken/);
  assert.match(source.authContext, /setAuthToken/);
  assert.match(source.authContext, /clearAuthToken/);
});

test('logout revokes bearer and cookie sessions, not only the cookie token', () => {
  const block = between(source.index, "pathname === '/api/auth/logout'", "pathname === '/api/auth/me'");
  assert.match(block, /Authorization/);
  assert.match(block, /Bearer/);
  assert.match(block, /bearerToken/);
  assert.match(block, /deleteSession/);
});

test('wallet reporting uses DST-aware Israel UTC boundaries and no fixed +3-hour SQL shift', () => {
  assert.doesNotMatch(source.wallet, /date\(created_at, '\+3 hours'\)/);
  assert.match(source.timezone, /getIsraelUtcRange/);
  assert.match(source.wallet, /getIsraelUtcRange/);
  assert.match(source.wallet, /created_at\s*>=\s*\?[\s\S]*created_at\s*<\s*\?/);
});

test('evidence decisions dispatch push without duplicating in-app notification rows', () => {
  assert.match(source.evidenceReview, /sendNotification/);
  assert.match(source.evidenceReview, /skipDbInsert:\s*true/);
  assert.match(source.ai, /sendNotification/);
  assert.match(source.ai, /skipDbInsert:\s*true/);

  const rejectRoute = between(source.index, "pathname.match(/^\\/api\\/parent\\/tasks\\/[^/]+\\/reject$/)", "pathname.match(/^\\/api\\/parent\\/screen-time");
  assert.match(rejectRoute, /skipDbInsert:\s*true/);
});

test('Android runtime QA runs automatically on pushes to main', () => {
  assert.match(source.runtimeQa, /push:[\s\S]*branches:[\s\S]*- main/);
});
