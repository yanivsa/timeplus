import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ai = readFileSync(new URL('../src/ai-verification.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0007_haprofessor_exam_verification.sql', import.meta.url), 'utf8');
const wrangler = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

test('Haprofessor awards use extracted correct answers as the server-side custom reward', () => {
  assert.match(ai, /haprofessor_exam_result/, 'specialized Haprofessor route is missing');
  assert.match(ai, /minutesToAward/, 'AI verification must pass deterministic correct-answer minutes to approval');
  assert.match(ai, /approveTask\([^)]*minutesToAward/s, 'auto approval must use extracted correct-answer minutes');
});

test('duplicate protection is keyed by child, provider and external exam ID at the auto-award boundary', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS external_reward_claims/i);
  assert.match(migration, /PRIMARY KEY\s*\(\s*provider\s*,\s*child_id\s*,\s*external_reference_id\s*\)/i);
  assert.match(ai, /INSERT OR IGNORE INTO external_reward_claims/i);
  assert.match(ai, /duplicate_exam_id/);
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

test('repeatable task instances inherit AI verification settings from their template', () => {
  assert.match(migration, /CREATE TRIGGER IF NOT EXISTS trg_task_instances_inherit_ai_verification/i);
  assert.match(migration, /AFTER INSERT ON task_instances/i);
  assert.match(migration, /NEW\.verification_mode\s*=\s*'manual'/i);
  assert.match(migration, /UPDATE task_instances/i);
  assert.match(migration, /verification_rules_json\s*=\s*\(SELECT verification_rules_json FROM task_templates/i);
});

test('existing Professor templates are explicitly configured for dynamic correct-answer rewards', () => {
  assert.match(migration, /UPDATE task_templates[\s\S]*haprofessor_exam_result/i);
  assert.match(migration, /provider[^\n]{0,80}haprofessor/i);
  assert.match(migration, /rewardPolicy[^\n]{0,80}correct_answers/i);
  assert.match(migration, /auto_approve_enabled\s*=\s*1/i);
});

test('automatic rollout is scoped to Professor while other AI evidence remains in shadow mode', () => {
  assert.match(wrangler, /AI_EVIDENCE_MODE\s*=\s*"shadow"/);
  assert.match(wrangler, /HAPROFESSOR_AUTO_APPROVE_ENABLED\s*=\s*"true"/);
  assert.match(ai, /haprofessorMode[^\n]{0,200}HAPROFESSOR_AUTO_APPROVE_ENABLED/s);
  assert.match(ai, /mode\s*===\s*'auto'/);
});
