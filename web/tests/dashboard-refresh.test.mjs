import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const child = fs.readFileSync('web/src/screens/ChildDashboard.tsx', 'utf8');
const evidencePanel = fs.readFileSync('web/src/components/ChildEvidencePanel.tsx', 'utf8');
const notificationBell = fs.readFileSync('web/src/components/NotificationBell.tsx', 'utf8');
const parent = fs.readFileSync('web/src/screens/ParentDashboard.tsx', 'utf8');
const guard = fs.readFileSync('web/src/components/ChildDashboardGuard.tsx', 'utf8');
const api = fs.readFileSync('web/src/services/api.ts', 'utf8');
const app = fs.readFileSync('web/src/App.tsx', 'utf8');
const workerIndex = fs.readFileSync('worker/src/index.ts', 'utf8');
const workerTasks = fs.readFileSync('worker/src/tasks.ts', 'utf8');

test('background dashboard refresh is throttled and cannot overlap', () => {
  assert.match(child, /dashboardRefreshInFlightRef/);
  assert.match(child, /if \(dashboardRefreshInFlightRef\.current\) return;/);
  assert.match(child, /setInterval\(\(\) => \{[\s\S]*?loadDashboard\(\);[\s\S]*?\}, 60000\);/);
  assert.doesNotMatch(child, /\}, 10000\);/);

  assert.match(parent, /dashboardRefreshInFlightRef/);
  assert.match(parent, /if \(dashboardRefreshInFlightRef\.current\) return;/);
  assert.match(parent, /setInterval\(\(\) => \{[\s\S]*?loadDashboard\(\);[\s\S]*?\}, 60000\);/);
  assert.doesNotMatch(parent, /setInterval\(loadDashboard, 15000\)/);

  assert.match(notificationBell, /notificationRefreshInFlightRef/);
  assert.match(notificationBell, /setInterval\(\(\) => \{[\s\S]*?loadData\(\);[\s\S]*?\}, 60000\);/);
  assert.doesNotMatch(notificationBell, /setInterval\(loadData, 20000\)/);
});

test('parent evidence list is not fetched by the general dashboard poller', () => {
  const start = parent.indexOf('const loadDashboard = async');
  const end = parent.indexOf('const loadEvidenceForApprovals = async');
  assert.ok(start >= 0 && end > start);
  const dashboardLoader = parent.slice(start, end);
  assert.doesNotMatch(dashboardLoader, /\/api\/parent\/evidence/);
  assert.match(parent, /const loadEvidenceForApprovals = async/);
  assert.match(parent, /activeTab === 'approvals'[\s\S]*?loadEvidenceForApprovals\(\)/);
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

test('dashboard snapshot failures fall back to cache without retry amplification', () => {
  assert.match(api, /const attempts = 1;/);
  assert.match(api, /for \(let attempt = 1; attempt <= attempts; attempt\+\+\)/);
  assert.match(api, /value\?\.child\?\.id === childId/);
  assert.match(api, /CHILD_DASHBOARD_CACHE_PREFIX/);
  assert.match(api, /readDashboardCache\(dashboardSpec\)/);
  assert.match(api, /writeDashboardCache\(dashboardSpec, parsed\)/);
});

test('authenticated API uses a once-per-day task generation guard instead of full reconciliation on every request', () => {
  const start = workerIndex.indexOf("if (pathname.startsWith('/api/'))");
  const end = workerIndex.indexOf('// --- CHILD ROUTES ---', start);
  assert.ok(start >= 0 && end > start);
  const middleware = workerIndex.slice(start, end);
  assert.match(workerIndex, /ensureDailyTaskInstancesOnce/);
  assert.match(middleware, /await ensureDailyTaskInstancesOnce\(env\.DB, user\.familyId\)/);
  assert.doesNotMatch(middleware, /await ensureDailyTaskInstances\(env\.DB, user\.familyId\)/);
  assert.match(workerTasks, /export async function ensureDailyTaskInstancesOnce/);
  assert.match(workerTasks, /idempotency_keys/);
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

test('evidence panel refreshes on open and after submission without continuous polling', () => {
  assert.match(evidencePanel, /refreshAfterSubmission/);
  assert.match(evidencePanel, /template_id/);
  assert.match(evidencePanel, /\[0,\s*150,\s*350,\s*700,\s*1200\]/);
  assert.doesNotMatch(evidencePanel, /setInterval\([^,]+,\s*3000\)/);
  assert.match(evidencePanel, /if \(!open \|\| !user\?\.id\) return;[\s\S]*?load\(\);/);
  assert.match(evidencePanel, /await refreshAfterSubmission\(submittedTemplateId\)/);
});

test('evidence panel permanently hides the removed daily-completion pseudo task', () => {
  assert.match(evidencePanel, /סיום משימות יומיות/);
  assert.match(evidencePanel, /!t\.title\.includes\('סיום משימות יומיות'\)/);
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


test('parent has an explicit stop control for every active timer', () => {
  assert.match(parent, /activeScreenSessions\.map/);
  assert.match(parent, /handleStopScreenSession\(session\)/);
  assert.match(parent, /עצור טיימר/);
  assert.match(parent, /window\.confirm\(confirmation\)/);
  assert.match(parent, /stoppingScreenSessionRef\.current/);
  assert.match(parent, /\/api\/parent\/screen-sessions\/\$\{encodeURIComponent\(session\.id\)\}\/stop/);
  assert.match(parent, /result\.mode === 'self'/);
});

test('child syncs a live timer after a remote parent stop without full dashboard polling', () => {
  assert.match(child, /const refreshActiveTimer = async/);
  assert.match(child, /apiRequest\('\/api\/child\/screen-session'\)/);
  assert.match(child, /setInterval\(refreshActiveTimer, 8000\)/);
  assert.match(child, /if \(!latest\.activeSession\) setStatusMessage/);
  assert.match(child, /document\.visibilityState !== 'visible'/);
});
