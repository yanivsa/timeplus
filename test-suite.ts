// Comprehensive Automated Integration & QA Test Suite for Time+
// Tests all domain rules against https://timeplus.yanivsa.workers.dev

const BASE_URL = process.env.TEST_URL || 'https://timeplus.yanivsa.workers.dev';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ category, name, passed: true });
    console.log(`  ✓ [${category}] ${name}`);
  } catch (err: any) {
    results.push({ category, name, passed: false, error: err.message });
    console.error(`  ✗ [${category}] ${name}: ${err.message}`);
  }
}

async function api(path: string, options: RequestInit = {}, cookie?: string) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const setCookie = res.headers.get('set-cookie');
  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  return { status: res.status, ok: res.ok, data, setCookie };
}

function extractSessionCookie(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  const match = setCookieHeader.match(/timeplus_session=([^;]+)/);
  return match ? `timeplus_session=${match[1]}` : '';
}

async function runAll() {
  console.log(`\n🚀 Starting Time+ Integration QA on ${BASE_URL}\n`);

  let parentCookie = '';
  let uriCookie = '';
  let eitanCookie = '';
  let uriId = '';
  let eitanId = '';
  const TEST_PARENT_PIN = '8899';
  const TEST_URI_PIN = '1122';
  const TEST_EITAN_PIN = '3344';

  // --- HEALTH & VERSION ---
  await runTest('SYSTEM', 'GET /healthz returns ok with Asia/Jerusalem timezone', async () => {
    const res = await api('/healthz');
    if (res.status !== 200 || res.data?.status !== 'ok' || res.data?.timezone !== 'Asia/Jerusalem') {
      throw new Error(`Unexpected health response: ${JSON.stringify(res.data)}`);
    }
  });

  await runTest('SYSTEM', 'GET /api/version returns web and api versions', async () => {
    const res = await api('/api/version');
    if (res.status !== 200 || !res.data?.webVersion || !res.data?.apiVersion) {
      throw new Error(`Unexpected version response: ${JSON.stringify(res.data)}`);
    }
  });

  // --- SETUP ---
  await runTest('SETUP', 'System initialization with Uri & Eitan', async () => {
    const statusRes = await api('/api/setup/status');
    if (!statusRes.data?.initialized) {
      const initRes = await api('/api/setup/init', {
        method: 'POST',
        body: JSON.stringify({
          familyName: 'משפחת שאולקר',
          parentPin: TEST_PARENT_PIN,
          children: [
            { name: 'אורי', pin: TEST_URI_PIN, color: '#38bdf8', avatar: 'wand' },
            { name: 'איתן', pin: TEST_EITAN_PIN, color: '#10b981', avatar: 'potion' },
          ],
        }),
      });

      if (!initRes.ok) {
        throw new Error(`Setup failed: ${JSON.stringify(initRes.data)}`);
      }
      parentCookie = extractSessionCookie(initRes.setCookie);
    }

    // Verify status is now initialized
    const postStatus = await api('/api/setup/status');
    if (!postStatus.data?.initialized || postStatus.data?.children?.length < 2) {
      throw new Error(`System not initialized properly: ${JSON.stringify(postStatus.data)}`);
    }

    const children = postStatus.data.children;
    const uri = children.find((c: any) => c.name === 'אורי');
    const eitan = children.find((c: any) => c.name === 'איתן');
    if (!uri || !eitan) throw new Error('Uri or Eitan not found in children list');
    uriId = uri.id;
    eitanId = eitan.id;
  });

  await runTest('SETUP', 'Prevent duplicate re-initialization', async () => {
    const initRes = await api('/api/setup/init', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'משפחה אחרת',
        parentPin: '9999',
        children: [{ name: 'דני', pin: '5555' }],
      }),
    });
    if (initRes.status !== 400 && initRes.status !== 403) {
      throw new Error(`Expected error on duplicate init, got ${initRes.status}`);
    }
  });

  // --- AUTH QA ---
  await runTest('AUTH', 'Parent login with correct PIN', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role: 'parent', pin: TEST_PARENT_PIN }),
    });
    if (!res.ok || res.data?.user?.role !== 'parent') {
      throw new Error(`Parent login failed: ${JSON.stringify(res.data)}`);
    }
    parentCookie = extractSessionCookie(res.setCookie);
  });

  await runTest('AUTH', 'Parent login with wrong PIN fails', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role: 'parent', pin: '0000' }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 for wrong parent PIN, got ${res.status}`);
    }
  });

  await runTest('AUTH', 'Child login (Uri) with correct PIN', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role: 'child', childId: uriId, pin: TEST_URI_PIN }),
    });
    if (!res.ok || res.data?.user?.id !== uriId) {
      throw new Error(`Uri login failed: ${JSON.stringify(res.data)}`);
    }
    uriCookie = extractSessionCookie(res.setCookie);
  });

  await runTest('AUTH', 'Child login (Eitan) with correct PIN', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role: 'child', childId: eitanId, pin: TEST_EITAN_PIN }),
    });
    if (!res.ok || res.data?.user?.id !== eitanId) {
      throw new Error(`Eitan login failed: ${JSON.stringify(res.data)}`);
    }
    eitanCookie = extractSessionCookie(res.setCookie);
  });

  await runTest('AUTH', 'Child cannot access parent routes (Role authorization)', async () => {
    const res = await api('/api/parent/dashboard', {}, uriCookie);
    if (res.status !== 403) {
      throw new Error(`Expected 403 for child accessing parent route, got ${res.status}`);
    }
  });

  // --- TASK & APPROVAL FLOW QA ---
  let createdTemplateId = '';
  let uriInstanceId = '';

  await runTest('TASKS', 'Parent creates a task template', async () => {
    const res = await api(
      '/api/parent/tasks/templates',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'סידור ארון ספרים קסום',
          description: 'ארגון כל הספרים והמחברות',
          rewardMinutes: 25,
          scheduleType: 'daily',
          assignedChildIds: [uriId, eitanId],
        }),
      },
      parentCookie
    );
    if (!res.ok || !res.data?.templateId) {
      throw new Error(`Task template creation failed: ${JSON.stringify(res.data)}`);
    }
    createdTemplateId = res.data.templateId;
  });

  await runTest('TASKS', 'Child (Uri) sees generated task instance', async () => {
    const res = await api(`/api/child/tasks?childId=${uriId}`, {}, uriCookie);
    if (!res.ok || !Array.isArray(res.data?.tasks)) {
      throw new Error(`Failed to fetch child tasks: ${JSON.stringify(res.data)}`);
    }
    const found = res.data.tasks.find((t: any) => t.template_id === createdTemplateId);
    if (!found) {
      throw new Error('Created task instance not found in child list');
    }
    uriInstanceId = found.id;
  });

  await runTest('TASKS', 'Child submits task with note', async () => {
    const res = await api(
      `/api/child/tasks/${uriInstanceId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ childId: uriId, note: 'סיימתי לסדר את כל הספרים!' }),
      },
      uriCookie
    );
    if (!res.ok) {
      throw new Error(`Task submission failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runTest('TASKS', 'Prevent duplicate task submission while pending', async () => {
    const res = await api(
      `/api/child/tasks/${uriInstanceId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ childId: uriId, note: 'ניסיון הגשה נוסף' }),
      },
      uriCookie
    );
    if (res.status !== 400) {
      throw new Error(`Expected 400 for duplicate submission, got ${res.status}`);
    }
  });

  await runTest('TASKS', 'Parent sees submitted task in approvals inbox', async () => {
    const res = await api('/api/parent/approvals', {}, parentCookie);
    if (!res.ok) throw new Error('Failed to fetch approvals');
    const item = res.data.pendingTasks.find((t: any) => t.id === uriInstanceId);
    if (!item) {
      throw new Error('Submitted task not found in pending approvals');
    }
  });

  let balanceBeforeApproval = 0;
  await runTest('APPROVAL', 'Parent approves task and credits minutes', async () => {
    // Get balance before
    const dashBefore = await api(`/api/child/dashboard?childId=${uriId}`, {}, uriCookie);
    balanceBeforeApproval = dashBefore.data.wallet.availableMinutes;

    const res = await api(
      `/api/parent/tasks/${uriInstanceId}/approve`,
      { method: 'POST', body: JSON.stringify({}) },
      parentCookie
    );
    if (!res.ok || res.data?.minutesAwarded !== 25) {
      throw new Error(`Approval failed: ${JSON.stringify(res.data)}`);
    }

    // Verify balance increased by 25
    const dashAfter = await api(`/api/child/dashboard?childId=${uriId}`, {}, uriCookie);
    const balanceAfter = dashAfter.data.wallet.availableMinutes;
    if (balanceAfter !== balanceBeforeApproval + 25) {
      throw new Error(`Balance mismatch: expected ${balanceBeforeApproval + 25}, got ${balanceAfter}`);
    }
  });

  await runTest('APPROVAL_IDEMPOTENCY', 'Re-approval attempt does NOT double-credit', async () => {
    const res = await api(
      `/api/parent/tasks/${uriInstanceId}/approve`,
      { method: 'POST', body: JSON.stringify({}) },
      parentCookie
    );
    if (res.status !== 400) {
      throw new Error(`Expected 400 for duplicate approval, got ${res.status}`);
    }

    // Verify balance unchanged
    const dash = await api(`/api/child/dashboard?childId=${uriId}`, {}, uriCookie);
    if (dash.data.wallet.availableMinutes !== balanceBeforeApproval + 25) {
      throw new Error('Double credit occurred on re-approval attempt!');
    }
  });

  await runTest('GAMIFICATION', 'Child receives celebration reward event', async () => {
    const res = await api(`/api/child/celebration?childId=${uriId}`, {}, uriCookie);
    if (!res.ok) throw new Error('Celebration check failed');
    if (!res.data?.event || res.data.event.minutes_delta !== 25) {
      throw new Error(`Expected celebration event with 25 min, got: ${JSON.stringify(res.data)}`);
    }
  });

  // --- SCREEN TIME REQUEST & APPROVAL ---
  let initialEitanBalance = 0;
  await runTest('SCREEN_TIME', 'Child (Eitan) requests 15 minutes of PlayStation', async () => {
    const dash = await api(`/api/child/dashboard?childId=${eitanId}`, {}, eitanCookie);
    initialEitanBalance = dash.data.wallet.availableMinutes;

    const res = await api(
      '/api/child/screen-time/request',
      {
        method: 'POST',
        body: JSON.stringify({ childId: eitanId, minutes: 15, source: 'playstation' }),
      },
      eitanCookie
    );
    if (!res.ok) {
      throw new Error(`Screen time request failed: ${JSON.stringify(res.data)}`);
    }
  });

  let eitanRequestId = '';
  await runTest('SCREEN_TIME', 'Parent sees pending request and approves it', async () => {
    const appRes = await api('/api/parent/approvals', {}, parentCookie);
    const req = appRes.data.pendingRequests.find((r: any) => r.child_id === eitanId);
    if (!req) throw new Error('Screen request not found in parent approvals');
    eitanRequestId = req.id;

    const res = await api(
      `/api/parent/screen-time/${eitanRequestId}/review`,
      { method: 'POST', body: JSON.stringify({ approved: true }) },
      parentCookie
    );
    if (!res.ok || res.data?.deductedMinutes !== 15) {
      throw new Error(`Screen approval failed: ${JSON.stringify(res.data)}`);
    }

    // Verify deduction in wallet
    const dash = await api(`/api/child/dashboard?childId=${eitanId}`, {}, eitanCookie);
    if (dash.data.wallet.availableMinutes !== initialEitanBalance - 15) {
      throw new Error(`Expected balance ${initialEitanBalance - 15}, got ${dash.data.wallet.availableMinutes}`);
    }
  });

  await runTest('SCREEN_TIME_IDEMPOTENCY', 'Re-approval attempt does NOT double-deduct', async () => {
    const res = await api(
      `/api/parent/screen-time/${eitanRequestId}/review`,
      { method: 'POST', body: JSON.stringify({ approved: true }) },
      parentCookie
    );
    if (res.status !== 400) {
      throw new Error(`Expected 400 on duplicate screen review, got ${res.status}`);
    }

    const dash = await api(`/api/child/dashboard?childId=${eitanId}`, {}, eitanCookie);
    if (dash.data.wallet.availableMinutes !== initialEitanBalance - 15) {
      throw new Error('Double deduction occurred on repeat review!');
    }
  });

  // --- MANUAL USAGE & CORRECTION/REFUND ---
  let usageLogId = '';
  let balanceBeforeManual = 0;
  await runTest('MANUAL_USAGE', 'Parent logs 20 minutes manual usage', async () => {
    const dash = await api(`/api/child/dashboard?childId=${uriId}`, {}, uriCookie);
    balanceBeforeManual = dash.data.wallet.availableMinutes;

    const res = await api(
      '/api/parent/usage/log',
      {
        method: 'POST',
        body: JSON.stringify({ childId: uriId, minutes: 20, source: 'tv', reason: 'צפייה בסרט' }),
      },
      parentCookie
    );
    if (!res.ok || res.data?.newBalance !== balanceBeforeManual - 20) {
      throw new Error(`Manual usage failed: ${JSON.stringify(res.data)}`);
    }

    // Fetch history to get usage log id
    const hist = await api(`/api/parent/history?childId=${uriId}&limit=5`, {}, parentCookie);
    const item = hist.data.transactions.find((tx: any) => tx.type === 'spend' && tx.amount === -20);
    if (!item?.screen_usage_log_id) throw new Error('Usage log id not found in transaction history');
    usageLogId = item.screen_usage_log_id;
  });

  await runTest('CORRECTION_REFUND', 'Parent corrects mistaken usage (creates refund without deleting history)', async () => {
    const res = await api(
      `/api/parent/usage/${usageLogId}/correct`,
      { method: 'POST', body: JSON.stringify({ correctionReason: 'טעות בשם הילד' }) },
      parentCookie
    );
    if (!res.ok || res.data?.refundedMinutes !== 20 || res.data?.newBalance !== balanceBeforeManual) {
      throw new Error(`Correction failed: ${JSON.stringify(res.data)}`);
    }

    // Verify transaction history contains BOTH spend and refund (immutable ledger)
    const hist = await api(`/api/parent/history?childId=${uriId}&limit=5`, {}, parentCookie);
    const hasSpend = hist.data.transactions.some((tx: any) => tx.type === 'spend' && tx.amount === -20);
    const hasRefund = hist.data.transactions.some((tx: any) => tx.type === 'refund' && tx.amount === 20);
    if (!hasSpend || !hasRefund) {
      throw new Error('Ledger does not contain both original spend and compensating refund!');
    }
  });

  // --- SUMMARY REPORT ---
  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${results.length}`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
