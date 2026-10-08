import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ai = readFileSync(new URL('../src/ai-verification.ts', import.meta.url), 'utf8');
const tasks = readFileSync(new URL('../src/tasks.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0007_haprofessor_exam_verification.sql', import.meta.url), 'utf8');

test('Haprofessor awards use extracted correct answers as the server-side custom reward', () => {
  assert.match(ai, /haprofessor_exam_result/, 'specialized Haprofessor route is missing');
  assert.match(ai, /minutesToAward/, 'AI verification must pass deterministic correct-answer minutes to approval');
  assert.match(ai, /approveTask\([^)]*minutesToAward/s, 'auto approval must use extracted correct-answer minutes');
});

test('duplicate protection is keyed by child, provider and external exam ID', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS external_reward_claims/i);
  assert.match(migration, /PRIMARY KEY\s*\(\s*provider\s*,\s*child_id\s*,\s*external_reference_id\s*\)/i);
  assert.match(tasks, /external_reward_claims/);
  assert.match(tasks, /INSERT OR IGNORE INTO external_reward_claims/i);
});

test('submission stores extracted exam metadata for audit and review', () => {
  for (const column of [
    'evidence_provider',
    'external_reference_id',
    'detected_course_id',
    'detected_correct_answers',
    'detected_total_questions',
    'detected_success_percent',
    'deterministic_confidence',
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN ${column}\\b`, 'i'), `missing ${column}`);
    assert.match(ai, new RegExp(column), `AI verifier does not persist ${column}`);
  }
});
