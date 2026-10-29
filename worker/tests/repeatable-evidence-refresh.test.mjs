import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tasks = readFileSync(new URL('../src/tasks.ts', import.meta.url), 'utf8');
const evidence = readFileSync(new URL('../src/evidence.ts', import.meta.url), 'utf8');
const evidenceEntry = readFileSync(new URL('../src/index-evidence.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('repeatable generator releases stale open keys held by completed/submitted rows', () => {
  const block = between(tasks, 'export async function ensureDailyTaskInstances', 'export async function submitTask');
  assert.match(block, /generation_key\s+LIKE\s+'repeatable-open:%'/);
  assert.match(block, /status\s+NOT\s+IN\s*\('open','rejected'\)/);
  assert.match(block, /'repeatable-closed:'\s*\|\|\s*id/);
});

test('evidence completion closes the repeatable open key in the same task transition', () => {
  const block = between(evidence, 'async function completeEvidenceSubmission', 'async function getChildEvidence');
  assert.match(block, /generation_key\s*=\s*CASE/);
  assert.match(block, /generation_key\s+LIKE\s+'repeatable-open:%'/);
  assert.match(block, /'repeatable-closed:'\s*\|\|\s*id/);
});

test('successful evidence completion waits for repeatable regeneration before returning to the child', () => {
  const completeRoute = between(evidenceEntry, 'const evidenceResponse = await handleEvidenceRequest', 'const isWorkerRoute');
  assert.match(completeRoute, /await\s+ensureDailyTaskInstances\(env\.DB,\s*user\.familyId\)/);
  assert.doesNotMatch(completeRoute, /ctx\.waitUntil\(ensureDailyTaskInstances/);
});
