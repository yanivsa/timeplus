import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('integrations/ahava-sync-api/worker.js', 'utf8');

test('Academy reward mirror is strict and self-healing', () => {
  assert.match(source, /record\.isCorrect === true/);
  assert.match(source, /record\.correctFirstTry === true/);
  assert.match(source, /Number\(record\.attempts\) === 1/);
  assert.match(source, /SELECT sync_id FROM learning_reward_credits WHERE profile_key = \?/);
  assert.match(source, /function addMissingEligibleRewardCandidates\(/);
});

test('Academy snapshot mirror uses optimistic concurrency', () => {
  assert.match(source, /for \(let attempt = 0; attempt < 5; attempt \+= 1\)/);
  assert.match(source, /WHERE profile_id = \?5 AND revision = \?6/);
});
