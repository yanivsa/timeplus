import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8');
const init = readFileSync(new URL('../src/init.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');

function between(text, start, end) {
  const a = text.indexOf(start);
  assert.notEqual(a, -1, `missing start marker: ${start}`);
  const b = text.indexOf(end, a + start.length);
  assert.notEqual(b, -1, `missing end marker: ${end}`);
  return text.slice(a, b);
}

test('login lockout is scoped to IP+target and has a separate IP-wide ceiling', () => {
  const block = between(auth, 'export async function checkRateLimit', 'export async function recordLoginAttempt');
  assert.doesNotMatch(block, /ip_address\s*=\s*\?\s+OR\s+target_id\s*=\s*\?/i,
    'one attacker IP must not globally lock a target account');
  assert.match(block, /ip_address\s*=\s*\?\s+AND\s+target_id\s*=\s*\?/i,
    'the primary lockout must be scoped to the caller IP and target');
  assert.ok((block.match(/SELECT\s+COUNT\(\*\)\s+as\s+failures/gi) || []).length >= 2,
    'rate limiting must also enforce a separate IP-wide brute-force ceiling');
});

test('successful login records success and resets prior failures only for the same IP+target', () => {
  const block = between(auth, 'export async function recordLoginAttempt', 'export async function createSession');
  assert.match(block, /db\.batch\s*\(/, 'success reset and success audit must commit together');
  assert.match(block, /DELETE FROM login_attempts[\s\S]*ip_address\s*=\s*\?[\s\S]*target_id\s*=\s*\?[\s\S]*success\s*=\s*0/i);
});

test('setup validates the entire payload before the first DB mutation and accepts only numeric PINs', () => {
  const validatorCall = init.indexOf('validateSetupPayload(env, payload)');
  const firstMutation = init.indexOf('DELETE FROM families');
  assert.ok(validatorCall >= 0, 'initializeFamily must call a whole-payload validator');
  assert.ok(firstMutation > validatorCall, 'all setup validation must finish before cleanup or inserts');
  assert.match(init, /PIN_PATTERN\s*=\s*\/\^\\d\{4,8\}\$\//,
    'parent and child PINs must be 4-8 decimal digits');
});

test('setup is recoverable: family stays uninitialized until all dependent work and session creation finish', () => {
  const block = between(init, 'export async function initializeFamily', 'return { success: true, sessionToken: token };');
  assert.match(block, /DELETE FROM families WHERE id = \? AND is_initialized = 0/,
    'retry cleanup must never delete an already initialized family');
  assert.match(block, /INSERT INTO families[\s\S]*is_initialized[\s\S]*VALUES\s*\([\s\S]*0[\s\S]*\)/i,
    'initial family row must start uninitialized');
  assert.match(block, /db\.batch\s*\(/, 'core setup rows must be staged in one D1 batch');
  const sessionPos = block.indexOf('createSession(');
  const finalizePos = block.indexOf('SET is_initialized = 1');
  assert.ok(sessionPos >= 0 && finalizePos > sessionPos,
    'is_initialized=1 must be the last durable setup transition after session creation');
});

test('production setup fails closed when INIT_SECRET is missing unless an explicit non-production escape hatch is enabled', () => {
  assert.match(types, /ALLOW_INSECURE_INIT\?:\s*string/);
  assert.match(init, /!env\.INIT_SECRET/);
  assert.match(init, /ALLOW_INSECURE_INIT/);
  assert.match(init, /ENVIRONMENT/);
});
