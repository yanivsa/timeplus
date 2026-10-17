import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const child = fs.readFileSync('web/src/screens/ChildDashboard.tsx', 'utf8');
const parent = fs.readFileSync('web/src/screens/ParentDashboard.tsx', 'utf8');

test('child refreshes within 10 seconds and parent keeps its 15-second cadence', () => {
  assert.match(child, /setInterval\(\(\) => \{[\s\S]*?loadDashboard\(\);[\s\S]*?\}, 10000\);/);
  assert.match(parent, /setInterval\(loadDashboard, 15000\);/);
});

test('child dashboard refreshes immediately when foregrounded', () => {
  assert.match(child, /document\.addEventListener\('visibilitychange', syncWhenForegrounded\)/);
  assert.match(child, /window\.addEventListener\('focus', syncWhenForegrounded\)/);
  assert.match(child, /window\.addEventListener\('pageshow', syncWhenForegrounded\)/);
});
