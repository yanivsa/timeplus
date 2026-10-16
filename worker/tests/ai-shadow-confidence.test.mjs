import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ai = readFileSync(new URL('../src/ai-verification.ts', import.meta.url), 'utf8');
const evidence = readFileSync(new URL('../src/evidence.ts', import.meta.url), 'utf8');

test('generic vision result carries an explicit 0-100 approval confidence', () => {
  assert.match(ai, /approvalConfidence\s*:\s*number/, 'VerificationResult must carry approvalConfidence');
  assert.match(ai, /approvalConfidence:\s*\{\s*type:\s*'number'[\s\S]{0,120}minimum:\s*0[\s\S]{0,120}maximum:\s*100/, 'JSON schema must constrain approvalConfidence to 0-100');
  assert.match(ai, /required:[\s\S]{0,250}'approvalConfidence'/, 'approvalConfidence must be required structured output');
  assert.match(ai, /confidence that the evidence satisfies all required checks/i, 'prompt must define what the confidence percentage means');
});

test('parent evidence list exposes latest AI result for shadow recommendation rendering', () => {
  assert.match(evidence, /result_json\s+FROM\s+ai_verification_attempts[\s\S]{0,400}latest_ai_result_json/, 'parent evidence list must expose the latest AI result JSON');
});

test('confidence remains advisory while global evidence mode is shadow', () => {
  assert.match(ai, /AI_EVIDENCE_MODE \|\| 'shadow'/, 'shadow must remain the default global mode');
  assert.match(ai, /const automaticMode = mode === 'auto' \|\| professorAutoEnabled/, 'generic shadow confidence must not enable automatic approval');
});
