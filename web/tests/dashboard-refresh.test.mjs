import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const child = fs.readFileSync('web/src/screens/ChildDashboard.tsx', 'utf8');
const parent = fs.readFileSync('web/src/screens/ParentDashboard.tsx', 'utf8');
const guard = fs.readFileSync('web/src/components/ChildDashboardGuard.tsx', 'utf8');
const api = fs.readFileSync('web/src/services/api.ts', 'utf8');
const app = fs.readFileSync('web/src/App.tsx', 'utf8');

test('child refreshes within 10 seconds and parent keeps its 15-second cadence', () => {
  assert.match(child, /setInterval\(\(\) => \{[\s\S]*?loadDashboard\(\);[\s\S]*?\}, 10000\);/);
  assert.match(parent, /setInterval\(loadDashboard, 15000\);/);
});

test('child dashboard refreshes immediately when foregrounded', () => {
  assert.match(child, /document\.addEventListener\('visibilitychange', syncWhenForegrounded\)/);
  assert.match(child, /window\.addEventListener\('focus', syncWhenForegrounded\)/);
  assert.match(child, /window\.addEventListener\('pageshow', syncWhenForegrounded\)/);
});

test('child dashboard is not mounted until a real wallet snapshot is verified', () => {
  assert.match(app, /ChildDashboardGuard/);
  assert.doesNotMatch(app, /<ChildDashboard\s*\/>/);
  assert.match(guard, /api\/child\/dashboard\?childId=/);
  assert.match(guard, /availableMinutes/);
  assert.match(guard, /Number\.isFinite/);
  assert.match(guard, /לא ניתן לטעון את יתרת הזמן/);
  assert.match(guard, /if \(ready\) return <ChildDashboard \/>/);
});

test('dashboard snapshot requests retry and cache only the matching child', () => {
  assert.match(api, /const attempts = dashboardSpec \? 3 : 1/);
  assert.match(api, /for \(let attempt = 1; attempt <= attempts; attempt\+\+\)/);
  assert.match(api, /value\?\.child\?\.id === childId/);
  assert.match(api, /CHILD_DASHBOARD_CACHE_PREFIX/);
  assert.match(api, /readDashboardCache\(dashboardSpec\)/);
  assert.match(api, /writeDashboardCache\(dashboardSpec, parsed\)/);
});

test('child dashboard separates Academy, task/bonus and usage minutes', () => {
  assert.match(child, /academyEarnedToday/);
  assert.match(child, /academyQuestionsToday/);
  assert.match(child, /taskEarnedToday/);
  assert.match(child, /אקדמיה היום/);
  assert.match(child, /משימות \/ בונוסים/);
  assert.match(child, /ניצלת היום/);
  assert.match(child, /היתרה כוללת/);
});

test('child dashboard loads independent refresh resources in parallel', () => {
  const start = child.indexOf('const loadDashboard = async () => {');
  const end = child.indexOf('const loadHistory = async () => {', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = child.slice(start, end);
  assert.match(block, /Promise\.all\(/);
  assert.match(block, /api\/child\/dashboard\?childId=/);
  assert.match(block, /api\/child\/tasks\?childId=/);
  assert.match(block, /api\/child\/screen-session/);
  assert.match(block, /api\/child\/celebration\?childId=/);
});

test('parent manual usage blocks repeat taps and sends an idempotency key', () => {
  assert.match(parent, /loggingUsage/);
  assert.match(parent, /loggingUsageRef/);
  assert.match(parent, /usageRequestIdRef/);
  assert.match(parent, /clientRequestId[,}:]/);
  assert.match(parent, /loggingUsageRef\.current\) return/);
  assert.match(parent, /disabled=\{loggingUsage\}/);
});

test('child write actions use synchronous refs to absorb rapid repeat taps', () => {
  assert.match(child, /submittingTaskRef/);
  assert.match(child, /submittingRequestRef/);
  assert.match(child, /screenSessionBusyRef/);
  assert.match(child, /if \(!selectedTask \|\| submittingTaskRef\.current\) return/);
  assert.match(child, /if \(submittingRequestRef\.current\) return/);
  assert.match(child, /if \(screenSessionBusyRef\.current\) return/);
});

test('parent minute adjustment blocks repeat taps and requires a reason when deducting', () => {
  assert.match(parent, /adjustingMinutesRef/);
  assert.match(parent, /adjustRequestIdRef/);
  assert.match(parent, /if \(!adjustModalChild \|\| adjustingMinutesRef\.current\) return/);
  assert.match(parent, /clientRequestId[,}:]/);
  assert.match(parent, /disabled=\{adjustingMinutes\}/);
  assert.match(parent, /required=\{adjustMinutesDelta < 0\}/);
});
