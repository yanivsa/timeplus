import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tasks = readFileSync(new URL('../src/tasks.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('generated tasks use deterministic generation keys and INSERT OR IGNORE instead of check-then-insert', () => {
  const block = between(tasks, 'export async function ensureDailyTaskInstances', 'export async function submitTask');
  assert.match(block, /scheduled:\$\{tpl\.id\}:\$\{assignment\.child_id\}:\$\{targetDateStr\}/);
  assert.match(block, /repeatable-open:\$\{tpl\.id\}:\$\{assignment\.child_id\}/);
  assert.ok((block.match(/INSERT OR IGNORE INTO task_instances/g) || []).length >= 2,
    'scheduled and repeatable generation must rely on the DB unique key');
  assert.doesNotMatch(block, /SELECT id FROM task_instances[\s\S]{0,220}if \(!existing/,
    'generation must not use a race-prone SELECT-then-INSERT decision');
});

test('task submission claims state and writes submission, notification, audit and repeatable successor in one guarded batch', () => {
  const block = between(tasks, 'export async function submitTask', 'export async function approveTask');
  assert.match(block, /submissionOperationId/);
  assert.match(block, /submission_operation_id\s*=\s*\?/);
  assert.match(block, /const submissionStatements[^=]*=\s*\[/);
  assert.match(block, /INSERT INTO task_submissions/);
  assert.match(block, /INSERT INTO notifications/);
  assert.match(block, /INSERT INTO audit_log/);
  assert.match(block, /INSERT OR IGNORE INTO task_instances[\s\S]*generation_key/,
    'repeatable successor must be created idempotently inside the submission batch');
  assert.match(block, /await db\.batch\(submissionStatements\)/);
  const afterBatch = block.slice(block.indexOf('await db.batch(submissionStatements)'));
  assert.doesNotMatch(afterBatch, /INSERT INTO task_submissions|INSERT INTO notifications|INSERT INTO audit_log|INSERT OR IGNORE INTO task_instances/,
    'submission side effects must not be written after the guarded batch commits');
});

test('task rejection is one guarded batch keyed by rejection_operation_id', () => {
  const block = between(tasks, 'export async function rejectTask', '\n}');
  assert.match(block, /rejectionOperationId/);
  assert.match(block, /rejection_operation_id\s*=\s*\?/);
  assert.match(block, /const rejectionStatements[^=]*=\s*\[/);
  assert.match(block, /UPDATE task_submissions/);
  assert.match(block, /INSERT INTO notifications/);
  assert.match(block, /INSERT INTO audit_log/);
  assert.match(block, /await db\.batch\(rejectionStatements\)/);
});

test('archiving a task template atomically removes child-visible open and rejected instances', () => {
  const index = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  const marker = "pathname.match(/^\\/api\\/parent\\/tasks\\/templates\\/[^/]+$/) && method === 'DELETE'";
  const start = index.indexOf(marker);
  assert.notEqual(start, -1, 'missing task-template DELETE route');
  const block = index.slice(start, start + 1800);
  assert.match(block, /await env\.DB\.batch\(/,
    'template archive and instance cleanup must commit atomically');
  assert.match(block, /UPDATE task_templates[\s\S]*SET archived_at = \?, is_active = 0/);
  assert.match(block, /DELETE FROM task_instances/,
    'archiving a template must remove already-generated child-visible instances');
  assert.match(block, /status IN \('open', 'rejected'\)/,
    'only unfinished open or rejected instances should be removed');
});
