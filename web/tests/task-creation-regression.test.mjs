import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parentSource = readFileSync(new URL('../src/screens/ParentDashboard.tsx', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../../worker/src/index.ts', import.meta.url), 'utf8');
const tasksSource = readFileSync(new URL('../../worker/src/tasks.ts', import.meta.url), 'utf8');

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

test('duplicating a template preserves AI verification settings', () => {
  const start = parentSource.indexOf('const handleDuplicateTemplate');
  assert.notEqual(start, -1, 'missing duplicate-template handler');
  const duplicateBlock = parentSource.slice(start, start + 2600);
  for (const field of ['verificationMode', 'verificationRules', 'allowVideoProof', 'autoApproveEnabled', 'maxDailyAutoAwards']) {
    assert.match(duplicateBlock, new RegExp(field), `duplicate-template handler must copy ${field}`);
  }
});

test('repeatable instances preserve AI verification settings from their template', () => {
  assert.match(
    tasksSource,
    /if\s*\(tpl\.schedule_type\s*===\s*'repeatable'\)[\s\S]{0,1800}INSERT INTO task_instances\s*\([\s\S]{0,500}verification_mode[\s\S]{0,300}auto_approve_enabled/,
    'ensureDailyTaskInstances repeatable branch must copy AI verification fields'
  );
  assert.match(
    tasksSource,
    /if\s*\(tpl\s*&&\s*tpl\.schedule_type\s*===\s*'repeatable'\)[\s\S]{0,1800}INSERT INTO task_instances\s*\([\s\S]{0,500}verification_mode[\s\S]{0,300}auto_approve_enabled/,
    'submitTask repeatable-spawn branch must copy AI verification fields'
  );
});
