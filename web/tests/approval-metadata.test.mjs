import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/screens/ParentDashboard.tsx', import.meta.url), 'utf8');

test('approval cards show when the request was submitted and the minute amount', () => {
  assert.match(source, /formatPendingAge\s*\(/, 'missing relative-age formatter for pending items');
  assert.match(source, /submission_time[\s\S]{0,500}reward_minutes|reward_minutes[\s\S]{0,500}submission_time/, 'task approval metadata must show both submission time and minutes');
  assert.match(source, /requested_at[\s\S]{0,500}requested_minutes|requested_minutes[\s\S]{0,500}requested_at/, 'screen-time request metadata must show both request time and minutes');
});

test('task approval cards visibly mark attached evidence', () => {
  assert.match(source, /\/api\/parent\/evidence/, 'parent dashboard must load evidence metadata');
  assert.match(source, /תיעוד מצורף/, 'missing visible evidence badge');
  assert.match(source, /evidenceTaskIds\.has\(t\.id\)/, 'evidence badge must be tied to the task being reviewed');
});
