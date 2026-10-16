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

test('task approval commits financial, XP, celebration, notification and audit effects in one D1 batch', () => {
  const block = between(tasks, 'export async function approveTask', 'export async function rejectTask');
  const staged = between(block, 'const approvalStatements = [', 'const approvalResults = await db.batch(approvalStatements);');
  for (const required of [
    'child_progress',
    'reward_events',
    'notifications',
    'audit_log',
  ]) {
    assert.match(staged, new RegExp(required), `${required} must be staged before the approval batch commits`);
  }

  assert.match(staged, /xp\s*=\s*xp\s*\+\s*\?/,
    'XP must use an arithmetic increment inside D1 so concurrent task approvals cannot overwrite each other');

  const afterBatch = block.slice(block.indexOf('const approvalResults = await db.batch(approvalStatements);'));
  assert.doesNotMatch(afterBatch, /UPDATE child_progress|INSERT INTO reward_events|INSERT INTO notifications|INSERT INTO audit_log/,
    'approval side effects must not be written after the guarded batch has already committed');
});
