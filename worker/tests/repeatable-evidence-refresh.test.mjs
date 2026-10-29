import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../migrations/0010_repeatable_evidence_repair.sql', import.meta.url), 'utf8');
const tasks = readFileSync(new URL('../src/tasks.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('DB migration repairs stale repeatable-open keys already held by completed rows', () => {
  assert.match(migration, /generation_key\s+LIKE\s+'repeatable-open:%'/);
  assert.match(migration, /status\s+NOT\s+IN\s*\('open',\s*'rejected'\)/);
  assert.match(migration, /'repeatable-closed:'\s*\|\|\s*id/);
});

test('DB trigger releases a repeatable-open key whenever a task leaves an actionable state', () => {
  assert.match(migration, /CREATE TRIGGER IF NOT EXISTS trg_release_repeatable_generation_key/i);
  assert.match(migration, /AFTER UPDATE OF status ON task_instances/i);
  assert.match(migration, /NEW\.status\s+NOT\s+IN\s*\('open',\s*'rejected'\)/);
  assert.match(migration, /NEW\.generation_key\s+LIKE\s+'repeatable-open:%'/);
});

test('removed daily-completion pseudo task is blocked at DB level without touching approved history', () => {
  assert.match(migration, /סיום משימות יומיות/);
  assert.match(migration, /NEW\.template_id\s+IS\s+NULL/);
  assert.match(migration, /NEW\.status\s+IN\s*\('open',\s*'rejected',\s*'submitted'\)/);
  assert.match(migration, /SET status = 'cancelled'/);
});

test('repeatable generator remains idempotent and keyed by template and child', () => {
  const block = between(tasks, 'export async function ensureDailyTaskInstances', 'export async function submitTask');
  assert.match(block, /repeatable-open:\$\{tpl\.id\}:\$\{assignment\.child_id\}/);
  assert.match(block, /INSERT OR IGNORE INTO task_instances/);
});
