import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('child task list only shows currently active templates still assigned to that child', () => {
  const block = between(index, "if (pathname === '/api/child/tasks'", "if (pathname.match(/^\\/api\\/child\\/tasks");
  assert.match(block, /tt\.is_active\s*=\s*1/);
  assert.match(block, /tt\.archived_at\s+IS\s+NULL/);
  assert.match(block, /task_template_children/);
  assert.match(block, /ttc\.child_id\s*=\s*ti\.child_id/);
});

test('recommended task only considers active templates currently assigned to the child', () => {
  const block = between(index, '// Best next open task', "if (pathname === '/api/child/tasks'");
  assert.match(block, /task_templates/);
  assert.match(block, /tt\.is_active\s*=\s*1/);
  assert.match(block, /tt\.archived_at\s+IS\s+NULL/);
  assert.match(block, /task_template_children/);
});

test('archiving a template cancels its open or rejected task instances', () => {
  const block = between(index, "method === 'DELETE'", "// ---");
  assert.match(block, /UPDATE\s+task_instances[\s\S]*SET\s+status\s*=\s*'cancelled'/i);
  assert.match(block, /status\s+IN\s*\(\s*'open'\s*,\s*'rejected'\s*\)/i);
});

test('removing a child assignment cancels stale open or rejected instances for that child', () => {
  const start = index.indexOf("method === 'PUT'");
  assert.notEqual(start, -1, 'missing template update route');
  const block = index.slice(start, index.indexOf("method === 'DELETE'", start));
  assert.match(block, /UPDATE\s+task_instances[\s\S]*SET\s+status\s*=\s*'cancelled'/i);
  assert.match(block, /task_template_children/);
});
