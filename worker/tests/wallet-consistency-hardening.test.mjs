import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wallet = readFileSync(new URL('../src/wallet.ts', import.meta.url), 'utf8');
const tasks = readFileSync(new URL('../src/tasks.ts', import.meta.url), 'utf8');
const index = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('screen-time request persists request, parent notification and audit in one D1 batch', () => {
  const block = between(wallet, 'export async function requestScreenTime', 'export async function reviewScreenTimeRequest');
  assert.match(block, /const requestStatements[^=]*=\s*\[/);
  for (const required of ['screen_time_requests', 'notifications', 'audit_log']) {
    assert.match(block, new RegExp(required), `${required} must be staged in the request batch`);
  }
  assert.match(block, /await db\.batch\(requestStatements\)/);
  const afterBatch = block.slice(block.indexOf('await db.batch(requestStatements)'));
  assert.doesNotMatch(afterBatch, /INSERT INTO screen_time_requests|INSERT INTO notifications|INSERT INTO audit_log/);
});

test('screen-time rejection is one guarded review-operation batch', () => {
  const block = between(wallet, 'export async function reviewScreenTimeRequest', 'export async function logManualScreenUsage');
  const rejection = between(block, 'if (!approved)', 'const finalMinutes');
  assert.match(rejection, /reviewOperationId/);
  assert.match(rejection, /review_operation_id\s*=\s*\?/);
  assert.match(rejection, /const rejectionStatements[^=]*=\s*\[/);
  assert.match(rejection, /INSERT INTO notifications/);
  assert.match(rejection, /INSERT INTO audit_log/);
  assert.match(rejection, /await db\.batch\(rejectionStatements\)/);
  assert.doesNotMatch(rejection, /\.run\(\)[\s\S]*db\.batch/,
    'the request must not be marked rejected before notification/audit are in the same transaction');
});

test('screen-time approval accepts only positive safe-integer minutes and claims only against current sufficient balance', () => {
  const block = between(wallet, 'export async function reviewScreenTimeRequest', 'export async function logManualScreenUsage');
  assert.match(block, /customMinutes\s*!==\s*undefined/,
    'invalid provided custom minutes must be rejected rather than silently falling back');
  assert.match(block, /Number\.isSafeInteger\(customMinutes\)/);
  assert.match(block, /available_minutes\s*>=\s*\?/,
    'approval claim must re-check current wallet balance');
  assert.match(block, /status\s*=\s*'pending'[\s\S]*EXISTS[\s\S]*available_minutes\s*>=\s*\?/,
    'the request approval transition itself must be conditioned on enough current balance');
});

test('manual screen usage and minute adjustments reject fractional values', () => {
  const manual = between(wallet, 'export async function logManualScreenUsage', 'export async function adjustMinutes');
  const adjust = between(wallet, 'export async function adjustMinutes', 'export async function correctUsage');
  assert.match(manual, /Number\.isSafeInteger\(minutes\)/);
  assert.match(adjust, /Number\.isSafeInteger\(minutesDelta\)/);
});

test('manual task reward override is also integer-only so the minute ledger stays integral', () => {
  const block = between(tasks, 'export async function approveTask', 'export async function rejectTask');
  assert.match(block, /customRewardMinutes\s*!==\s*undefined/);
  assert.match(block, /Number\.isSafeInteger\(customRewardMinutes\)/);
});


test('manual screen usage is idempotent for repeated client request ids', () => {
  const block = between(wallet, 'export async function logManualScreenUsage', 'export async function adjustMinutes');
  assert.match(block, /clientRequestId/);
  assert.match(block, /manual-usage:/);
  assert.match(block, /INSERT OR IGNORE INTO screen_usage_logs/);
  assert.match(block, /NOT EXISTS[\s\S]*minute_transactions/,
    'the wallet deduction must be guarded by the durable transaction id');
  assert.match(block, /db\.batch\s*\(/);
});

test('wallet summary exposes Academy credits and non-Academy earnings separately', () => {
  const block = wallet.slice(wallet.indexOf('export async function getChildWalletSummary'));
  assert.match(block, /academyEarnedToday/);
  assert.match(block, /academyQuestionsToday/);
  assert.match(block, /taskEarnedToday/);
  assert.match(block, /created_by\s*=\s*'academy_sync'/);
  assert.match(block, /type IN \('earn', 'adjustment'\)/,
    'earned totals and task/bonus earnings must exclude refund credits');
  assert.match(block, /type = 'spend'/,
    'usage totals must count only actual spend transactions, not negative adjustments');
  assert.match(block, /screen_usage_corrections/,
    'corrected usage must no longer appear in spent totals');
});


test('manual usage retries reject request-id reuse with a different payload', () => {
  const block = between(wallet, 'export async function logManualScreenUsage', 'export async function adjustMinutes');
  assert.match(block, /existingUsageId/);
  assert.match(block, /sameRequest/);
  assert.match(block, /מזהה הבקשה כבר שימש לרישום ניצול אחר/);
  assert.match(block, /return \{ success: true, warning, newBalance \}/,
    'an exact retry should return the existing balance without deducting again');
  const afterBatch = block.slice(block.indexOf('await db.batch(['));
  assert.match(afterBatch, /persistedUsage/,
    'the durable row must be revalidated after the batch to cover simultaneous conflicting retries');
  assert.match(afterBatch, /samePersistedRequest/);
});


test('parent usage route forwards the stable client request id to the wallet', () => {
  const route = index.slice(index.indexOf("pathname === '/api/parent/usage/log'"), index.indexOf("pathname.match(/^\/api\/parent\/usage", index.indexOf("pathname === '/api/parent/usage/log'")));
  assert.match(route, /clientRequestId/);
  assert.match(route, /logManualScreenUsage\([^)]*clientRequestId/);
});

test('manual minute adjustment is idempotent for repeated client request ids', () => {
  const block = between(wallet, 'export async function adjustMinutes', 'export async function correctUsage');
  assert.match(block, /clientRequestId/);
  assert.match(block, /manual-adjust:/);
  assert.match(block, /existingAdjustment/);
  assert.match(block, /sameRequest/);
  assert.match(block, /INSERT OR IGNORE INTO minute_transactions/);
  assert.match(block, /NOT EXISTS[\s\S]*minute_transactions/,
    'the wallet adjustment must be guarded by the durable transaction id');
  assert.match(block, /persistedAdjustment/,
    'the durable row must be revalidated after the batch to cover simultaneous conflicting retries');
});

test('parent adjustment route forwards the stable client request id to the wallet', () => {
  const start = index.indexOf("pathname === '/api/parent/minutes/adjust'");
  const route = index.slice(start, index.indexOf("pathname === '/api/parent/tasks/templates'", start));
  assert.match(route, /clientRequestId/);
  assert.match(route, /adjustMinutes\([^)]*clientRequestId/);
});
