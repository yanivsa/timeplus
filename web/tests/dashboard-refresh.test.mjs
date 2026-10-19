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

test('child dashboard never presents an unavailable wallet as a real zero balance', () => {
  assert.doesNotMatch(child, /\{wallet\?\.availableMinutes\s*\?\?\s*0\}/);
  assert.match(child, /dashboardError/);
  assert.match(child, /לא ניתן לטעון את יתרת הזמן/);
});

test('child dashboard retries transient snapshot failures before surfacing an error', () => {
  const loadStart = child.indexOf('const loadDashboard = async');
  const loadEnd = child.indexOf('const loadHistory = async', loadStart);
  assert.notEqual(loadStart, -1, 'missing loadDashboard');
  assert.notEqual(loadEnd, -1, 'missing loadHistory');
  const loadBlock = child.slice(loadStart, loadEnd);
  assert.match(loadBlock, /for\s*\(let attempt = 1; attempt <= 3; attempt\+\+\)/);
  assert.match(loadBlock, /setDashboardError\(/);
});
