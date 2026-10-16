import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ai = readFileSync(new URL('../src/ai-verification.ts', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../src/index-evidence.ts', import.meta.url), 'utf8');

test('AI network calls have a bounded timeout shorter than waitUntil budget', () => {
  assert.match(ai, /AI_FETCH_TIMEOUT_MS\s*=\s*12_?000|AI_FETCH_TIMEOUT_MS\s*=\s*12000/, 'expected a 12s AI fetch timeout');
  assert.match(ai, /AbortController/, 'AI fetches must be abortable');
  assert.match(ai, /signal/, 'AI requests must receive an abort signal');
});

test('stale pending AI submissions are recovered with bounded retries', () => {
  assert.match(ai, /export async function recoverStalePendingAiEvidence/, 'missing stale pending AI recovery function');
  assert.match(ai, /verification_status\s*=\s*'pending_ai'|verification_status='pending_ai'/, 'recovery must target pending_ai');
  assert.match(ai, /recovery_claimed/, 'recovery must claim attempts to avoid overlapping retries');
  assert.match(ai, /MAX_RECOVERY_ATTEMPTS\s*=\s*3/, 'recovery must stop after three attempts');
  assert.match(ai, /ai_unavailable/, 'exhausted retries must fall back to parent review');
});

test('every-minute scheduled handler runs stale AI recovery', () => {
  assert.match(entry, /recoverStalePendingAiEvidence/, 'scheduled worker must import recovery');
  assert.match(entry, /await\s+recoverStalePendingAiEvidence\(env\)/, 'scheduled worker must await recovery');
});

test('duplicate evidence still receives an advisory AI evaluation in shadow mode', () => {
  assert.doesNotMatch(
    ai,
    /if\s*\(duplicateDetected\)\s*\{[\s\S]{0,700}updateManualFallback[\s\S]{0,500}return;/,
    'duplicate evidence must not short-circuit the shadow AI evaluation'
  );
  assert.match(ai, /deterministicEligibility\([\s\S]{0,800}duplicateDetected/, 'duplicate risk must still block automatic approval');
});

test('invalid structured output from the free router falls back to the direct provider path', () => {
  assert.match(ai, /invalid_structured_output/, 'invalid structured output must be detected');
  assert.match(
    ai,
    /invalid_structured_output[\s\S]{0,2200}(?:openrouter_direct|OPENROUTER_API_KEY)|(?:openrouter_direct|OPENROUTER_API_KEY)[\s\S]{0,2200}invalid_structured_output/,
    'a successful-but-invalid free-router response must get a second provider attempt before manual fallback'
  );
});
