import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parentSource = readFileSync(new URL('../src/screens/ParentDashboard.tsx', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../../worker/src/index.ts', import.meta.url), 'utf8');

test('task creation is guarded against double submit and sends a stable client request id', () => {
  assert.match(parentSource, /creatingTemplateRef/, 'creation handler needs an immediate ref guard against double submit');
  assert.match(parentSource, /if\s*\(creatingTemplateRef\.current\)\s*return/, 'creation handler must stop a second concurrent submit');
  assert.match(parentSource, /clientRequestId/, 'task creation must send an idempotency key to the server');
  assert.match(parentSource, /disabled=\{creatingTemplate\}/, 'create button must be disabled while a task is being created');
});

test('server makes task-template creation idempotent for repeated client request ids', () => {
  assert.match(workerSource, /clientRequestId/, 'server must read the client idempotency key');
  assert.match(workerSource, /INSERT OR IGNORE INTO task_templates/, 'template insert must be idempotent');
});

test('repeatable open or rejected tasks remain visible even when their original due date is old', () => {
  assert.match(
    workerSource,
    /tt\.schedule_type\s*=\s*'repeatable'[\s\S]{0,220}ti\.status\s+IN\s+\('open','rejected'\)/,
    'child task query must include actionable repeatable tasks regardless of due date'
  );
});
