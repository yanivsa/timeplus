import { Env, AuthUser } from './types';
import {
  getSessionUser,
  createSession,
  createSessionCookie,
  clearSessionCookie,
  deleteSession,
  checkRateLimit,
  recordLoginAttempt,
  parseCookies,
} from './auth';
import { hashPin, generateSalt, generateId } from './crypto';
import { requireActivePepper, verifyPinWithPepperMigration } from './pin-security';
import {
  isSystemInitialized,
  getPublicChildrenList,
  initializeFamily,
  SetupPayload,
} from './init';
import {
  ensureDailyTaskInstances,
  submitTask,
  approveTask,
  rejectTask,
} from './tasks';
import {
  requestScreenTime,
  reviewScreenTimeRequest,
  logManualScreenUsage,
  adjustMinutes,
  correctUsage,
  getChildWalletSummary,
} from './wallet';
import { getRankDetails } from './gamification';
import { getIsraelDateString } from './timezone';
import { getScreenSessionState, startScreenSession, pauseScreenSession, resumeScreenSession, stopScreenSession } from './screen-sessions';
import { renderPrivacyPolicyHtml } from './privacy';
import {
  savePushSubscription,
  removePushSubscription,
  getNotifications,
  markNotificationsAsRead,
  sendNotification,
} from './notifications';

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

function errorJson(message: string, status = 400, extraHeaders: HeadersInit = {}): Response {
  return json({ success: false, error: message }, status, extraHeaders);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // --- 0. PRIVACY POLICY (Required by Google Play Console) ---
    if (pathname === '/privacy' && method === 'GET') {
      return new Response(renderPrivacyPolicyHtml(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // --- 1. HEALTH AND VERSION ENDPOINTS ---
    if (pathname === '/healthz' && method === 'GET') {
      return json({
        status: 'ok',
        app: env.APP_NAME || 'Time+',
        time: new Date().toISOString(),
        timezone: env.TIMEZONE || 'Asia/Jerusalem',
        israelDate: getIsraelDateString(),
      });
    }

    if (pathname === '/api/version' && method === 'GET') {
      return json({
        webVersion: env.WEB_VERSION || '1.0.0',
        apiVersion: env.API_VERSION || '1.0.0',
        environment: env.ENVIRONMENT || 'production',
        webBuildId: 'tp-' + (env.WEB_VERSION || '1.0.0'),
      });
    }

    if (pathname === '/api/push/vapid-public-key' && method === 'GET') {
      if (!env.VAPID_PUBLIC_KEY) return errorJson('Push notifications are not configured', 503);
      return json({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    // --- 2. SETUP & INITIALIZATION ---
    if (pathname === '/api/setup/status' && method === 'GET') {
      const initialized = await isSystemInitialized(env.DB);
      let children: { id: string; name: string; avatar: string; color: string }[] = [];
      let familyName = 'משפחה';
      if (initialized) {
        children = await getPublicChildrenList(env.DB);
        const family = await env.DB.prepare(`SELECT name FROM families LIMIT 1`).first<{ name: string }>();
        if (family) familyName = family.name;
      }
      return json({ initialized, familyName, children });
    }

    if (pathname === '/api/setup/init' && method === 'POST') {
      try {
        const payload = (await request.json()) as SetupPayload;
        const result = await initializeFamily(env.DB, env, payload);
        if (!result.success) {
          return errorJson(result.error || 'אתחול נכשל', 400);
        }
        const cookie = createSessionCookie(result.sessionToken!);
        return json(
          { success: true, message: 'המערכת אותחלה בהצלחה' },
          200,
          { 'Set-Cookie': cookie }
        );
      } catch (err: any) {
        return errorJson('שגיאה בעיבוד נתוני האתחול: ' + err.message, 500);
      }
    }

    // --- 3. AUTHENTICATION ---
    if (pathname === '/api/auth/login' && method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
      const body = (await request.json().catch(() => ({}))) as {
        role?: 'parent' | 'child';
        pin?: string;
        childId?: string;
      };

      const role = body.role;
      const pin = body.pin;
      const childId = body.childId;

      if (!role || !pin) {
        return errorJson('נא לספק תפקיד וקוד סודי', 400);
      }

      const targetId = role === 'parent' ? 'parent' : childId || 'unknown_child';

      // Rate limit check
      const rateLimit = await checkRateLimit(env.DB, ip, targetId);
      if (!rateLimit.allowed) {
        return errorJson(
          `יותר מדי ניסיונות שגויים. החשבון נעול ל-${rateLimit.remainingMinutes} דקות להגנה על המערכת.`,
          429
        );
      }

      if (!env.PEPPER_SECRET) {
        return errorJson('השרת אינו מוגדר בצורה מאובטחת', 503);
      }
      const familyId = env.DEFAULT_FAMILY_ID || 'yaniv_family';

      if (role === 'parent') {
        const family = await env.DB.prepare(
          `SELECT id, name, parent_pin_hash, parent_pin_salt FROM families WHERE id = ?`
        )
          .bind(familyId)
          .first<{ id: string; name: string; parent_pin_hash: string; parent_pin_salt: string }>();

        if (!family) {
          return errorJson('המשפחה טרם הוגדרה במערכת', 404);
        }

        const verification = await verifyPinWithPepperMigration(
          pin,
          family.parent_pin_hash,
          family.parent_pin_salt,
          env
        );
        await recordLoginAttempt(env.DB, ip, 'parent', 'parent', verification.valid);

        if (!verification.valid) {
          return errorJson('קוד הורה שגוי', 401);
        }

        if (verification.migrated && verification.hash && verification.salt) {
          await env.DB.prepare(
            `UPDATE families SET parent_pin_hash=?, parent_pin_salt=?, updated_at=? WHERE id=?`
          ).bind(verification.hash, verification.salt, new Date().toISOString(), family.id).run();
        }

        const { token } = await createSession(env.DB, family.id, 'parent');
        const cookie = createSessionCookie(token);
        const user: AuthUser = { id: 'parent', name: 'הורים', role: 'parent', familyId: family.id };

        return json({ success: true, user, token }, 200, { 'Set-Cookie': cookie });
      } else if (role === 'child') {
        if (!childId) {
          return errorJson('נא לבחור פרופיל ילד', 400);
        }

        const child = await env.DB.prepare(
          `SELECT id, family_id, name, pin_hash, pin_salt, avatar, color FROM children WHERE id = ? AND family_id = ?`
        )
          .bind(childId, familyId)
          .first<{
            id: string;
            family_id: string;
            name: string;
            pin_hash: string;
            pin_salt: string;
            avatar: string;
            color: string;
          }>();

        if (!child) {
          return errorJson('הילד לא נמצא', 404);
        }

        const verification = await verifyPinWithPepperMigration(
          pin,
          child.pin_hash,
          child.pin_salt,
          env
        );
        await recordLoginAttempt(env.DB, ip, 'child', childId, verification.valid);

        if (!verification.valid) {
          return errorJson('קוד סודי שגוי', 401);
        }

        if (verification.migrated && verification.hash && verification.salt) {
          await env.DB.prepare(
            `UPDATE children SET pin_hash=?, pin_salt=?, updated_at=? WHERE id=? AND family_id=?`
          ).bind(verification.hash, verification.salt, new Date().toISOString(), child.id, child.family_id).run();
        }

        const { token } = await createSession(env.DB, child.family_id, 'child', child.id);
        const cookie = createSessionCookie(token);
        const user: AuthUser = {
          id: child.id,
          name: child.name,
          role: 'child',
          familyId: child.family_id,
          avatar: child.avatar,
          color: child.color,
        };

        return json({ success: true, user, token }, 200, { 'Set-Cookie': cookie });
      }

      return errorJson('תפקיד לא תקין', 400);
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookieHeader = request.headers.get('Cookie');
      const cookies = parseCookies(cookieHeader);
      const token = cookies['timeplus_session'];
      if (token) {
        await deleteSession(env.DB, token);
      }
      return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        return errorJson('לא מחובר', 401);
      }
      return json({ success: true, user });
    }

    // --- 4. AUTHENTICATION MIDDLEWARE FOR /api/* ---
    if (pathname.startsWith('/api/')) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        return errorJson('נדרשת התחברות למערכת', 401);
      }

      // Lazy generation of today's instances
      await ensureDailyTaskInstances(env.DB, user.familyId);

      // --- CHILD ROUTES ---
      if (pathname === '/api/child/dashboard' && method === 'GET') {
        const childId = user.role === 'child' ? user.id : url.searchParams.get('childId');
        if (!childId) return errorJson('חסר מזהה ילד', 400);

        const child = await env.DB.prepare(
          `SELECT id, name, avatar, color, available_minutes FROM children WHERE id = ? AND family_id = ?`
        )
          .bind(childId, user.familyId)
          .first<{ id: string; name: string; avatar: string; color: string; available_minutes: number }>();

        if (!child) return errorJson('הילד לא נמצא', 404);

        const walletSummary = await getChildWalletSummary(env.DB, childId);

        // Progress & XP
        const progress = await env.DB.prepare(
          `SELECT level, xp, current_streak_days, best_streak_days FROM child_progress WHERE child_id = ?`
        )
          .bind(childId)
          .first<{ level: number; xp: number; current_streak_days: number; best_streak_days: number }>();

        const currentXp = progress?.xp || 0;
        const rankInfo = getRankDetails(currentXp);

        // Pending count
        const pendingRow = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'submitted'`
        )
          .bind(childId)
          .first<{ count: number }>();

        // Best next open task
        const nextTask = await env.DB.prepare(
          `SELECT id, title, description, reward_minutes FROM task_instances 
           WHERE child_id = ? AND status = 'open' 
           ORDER BY reward_minutes DESC LIMIT 1`
        )
          .bind(childId)
          .first();

        return json({
          child,
          wallet: walletSummary,
          progress: {
            ...rankInfo,
            currentStreakDays: progress?.current_streak_days || 0,
            bestStreakDays: progress?.best_streak_days || 0,
          },
          pendingSubmissionsCount: pendingRow?.count || 0,
          recommendedTask: nextTask || null,
        });
      }

      if (pathname === '/api/child/tasks' && method === 'GET') {
        const childId = user.role === 'child' ? user.id : url.searchParams.get('childId');
        if (!childId) return errorJson('חסר מזהה ילד', 400);

        const todayIsrael = getIsraelDateString();
        const { results: tasks } = await env.DB.prepare(
          `SELECT ti.*, ts.note as submission_note, tt.schedule_type
           FROM task_instances ti
           LEFT JOIN task_templates tt ON tt.id = ti.template_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.child_id = ? AND (ti.due_date = ? OR ti.status = 'submitted')
           ORDER BY 
             CASE ti.status 
               WHEN 'open' THEN 1 
               WHEN 'submitted' THEN 2 
               WHEN 'rejected' THEN 3 
               ELSE 4 
             END, 
             ti.reward_minutes DESC`
        )
          .bind(childId, todayIsrael)
          .all();

        return json({ tasks });
      }

      if (pathname.match(/^\/api\/child\/tasks\/[^/]+\/submit$/) && method === 'POST') {
        const instanceId = pathname.split('/')[4];
        const body = await request.json().catch(() => ({}));
        const note = (body as any).note || null;
        const photoKey = (body as any).photoObjectKey || null;

        const childId = user.role === 'child' ? user.id : (body as any).childId;
        if (!childId) return errorJson('לא צוין מזהה ילד', 400);

        const result = await submitTask(env.DB, instanceId, childId, note, photoKey);
        if (!result.success) {
          return errorJson(result.error || 'הגשת המשימה נכשלה', 400);
        }

        // Push notification to parents
        ctx.waitUntil(
          (async () => {
            try {
              const child = await env.DB.prepare(`SELECT name FROM children WHERE id = ?`).bind(childId).first<{ name: string }>();
              const instance = await env.DB.prepare(`SELECT title FROM task_instances WHERE id = ?`).bind(instanceId).first<{ title: string }>();
              await sendNotification(env.DB, env, {
                familyId: user.familyId,
                recipientRole: 'parent',
                type: 'task_submitted',
                title: 'משימה הוגשה לאישור! 📝',
                message: `${child?.name || 'הילד/ה'} הגיש/ה את המשימה "${instance?.title || 'משימה'}" וממתין/ה לאישורך`,
                entityType: 'task_instance',
                entityId: instanceId,
                skipDbInsert: true,
              });
            } catch (err) {
              console.error('Failed to dispatch task submission push:', err);
            }
          })()
        );

        return json({ success: true, message: 'המשימה נשלחה לאישור ההורים!' });
      }

      if (pathname === '/api/child/screen-time/request' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const minutes = Number(body.minutes);
        const source = body.source || 'other';

        const childId = user.role === 'child' ? user.id : body.childId;
        if (!childId) return errorJson('לא צוין מזהה ילד', 400);

        const result = await requestScreenTime(env.DB, user.familyId, childId, minutes, source);
        if (!result.success) {
          return errorJson(result.error || 'הבקשה נכשלה', 400);
        }

        // Push notification to parents
        ctx.waitUntil(
          (async () => {
            try {
              const child = await env.DB.prepare(`SELECT name FROM children WHERE id = ?`).bind(childId).first<{ name: string }>();
              const sourceHebrew =
                source === 'playstation' ? 'פלייסטיישן' :
                source === 'tv' ? 'טלוויזיה' :
                source === 'tablet' ? 'טאבלט' :
                source === 'phone' ? 'טלפון' : source;

              await sendNotification(env.DB, env, {
                familyId: user.familyId,
                recipientRole: 'parent',
                type: 'screen_request',
                title: 'בקשת זמן מסך חדשה 📱',
                message: `${child?.name || 'הילד/ה'} מבקש/ת ${minutes} דקות עבור ${sourceHebrew}`,
                entityType: 'screen_time_request',
                skipDbInsert: true,
              });
            } catch (err) {
              console.error('Failed to dispatch screen request push:', err);
            }
          })()
        );

        return json({ success: true, message: 'בקשת זמן המסך נשלחה להורים!' });
      }

      if (pathname === '/api/child/screen-session' && method === 'GET') {
        if (user.role !== 'child') return errorJson('הטיימר זמין לחשבון ילד בלבד', 403);
        return json(await getScreenSessionState(env.DB, user.familyId, user.id));
      }

      if (pathname === '/api/child/screen-session/start' && method === 'POST') {
        if (user.role !== 'child') return errorJson('הטיימר זמין לחשבון ילד בלבד', 403);
        const body = (await request.json().catch(() => ({}))) as any;
        const result = await startScreenSession(env.DB, user.familyId, user.id, String(body.requestId || ''));
        if (!result.success) return errorJson(result.error || 'לא ניתן להפעיל את הטיימר', 400);
        return json({ success: true, ...(await getScreenSessionState(env.DB, user.familyId, user.id)) });
      }

      if (pathname === '/api/child/screen-session/pause' && method === 'POST') {
        if (user.role !== 'child') return errorJson('הטיימר זמין לחשבון ילד בלבד', 403);
        const result = await pauseScreenSession(env.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || 'לא ניתן להשהות את הטיימר', 400);
        return json({ success: true, ...(await getScreenSessionState(env.DB, user.familyId, user.id)) });
      }

      if (pathname === '/api/child/screen-session/resume' && method === 'POST') {
        if (user.role !== 'child') return errorJson('הטיימר זמין לחשבון ילד בלבד', 403);
        const result = await resumeScreenSession(env.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || 'לא ניתן להמשיך את הטיימר', 400);
        return json({ success: true, ...(await getScreenSessionState(env.DB, user.familyId, user.id)) });
      }

      if (pathname === '/api/child/screen-session/stop' && method === 'POST') {
        if (user.role !== 'child') return errorJson('הטיימר זמין לחשבון ילד בלבד', 403);
        const result = await stopScreenSession(env.DB, user.familyId, user.id);
        if (!result.success) return errorJson(result.error || 'לא ניתן לעצור את הטיימר', 400);
        return json({ success: true, ...(await getScreenSessionState(env.DB, user.familyId, user.id)) });
      }

      if (pathname === '/api/child/history' && method === 'GET') {
        const childId = user.role === 'child' ? user.id : url.searchParams.get('childId');
        if (!childId) return errorJson('חסר מזהה ילד', 400);

        const limit = Number(url.searchParams.get('limit')) || 30;
        const { results: transactions } = await env.DB.prepare(
          `SELECT * FROM minute_transactions 
           WHERE child_id = ? 
           ORDER BY created_at DESC LIMIT ?`
        )
          .bind(childId, limit)
          .all();

        return json({ transactions });
      }

      if (pathname === '/api/child/celebration' && method === 'GET') {
        const childId = user.role === 'child' ? user.id : url.searchParams.get('childId');
        if (!childId) return errorJson('חסר מזהה ילד', 400);

        const event = await env.DB.prepare(
          `SELECT * FROM reward_events 
           WHERE child_id = ? AND seen_at IS NULL 
           ORDER BY created_at ASC LIMIT 1`
        )
          .bind(childId)
          .first();

        if (event) {
          // Mark seen
          await env.DB.prepare(`UPDATE reward_events SET seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
            .bind(event.id)
            .run();
        }

        return json({ event: event || null });
      }

      // --- NOTIFICATIONS & PUSH (Accessible by both parent and child) ---
      if (pathname === '/api/push/vapid-public-key' && method === 'GET') {
      if (!env.VAPID_PUBLIC_KEY) return errorJson('Push notifications are not configured', 503);
      return json({ publicKey: env.VAPID_PUBLIC_KEY });
    }

      if (pathname === '/api/push/subscribe' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const subscription = body.subscription;
        if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
          return errorJson('מבנה מנוי התראות אינו תקין', 400);
        }

        await savePushSubscription(
          env.DB,
          user.familyId,
          user.role,
          user.role === 'child' ? user.id : null,
          subscription,
          request.headers.get('User-Agent') || undefined
        );

        return json({ success: true, message: 'ההתראות הופעלו במכשיר זה בהצלחה!' });
      }

      if (pathname === '/api/push/unsubscribe' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        if (body.endpoint) {
          await removePushSubscription(env.DB, body.endpoint);
        }
        return json({ success: true });
      }

      if (pathname === '/api/notifications' && method === 'GET') {
        const data = await getNotifications(
          env.DB,
          user.familyId,
          user.role,
          user.role === 'child' ? user.id : null,
          30
        );
        return json(data);
      }

      if (pathname === '/api/notifications/read-all' && method === 'POST') {
        await markNotificationsAsRead(
          env.DB,
          user.familyId,
          user.role,
          user.role === 'child' ? user.id : null
        );
        return json({ success: true });
      }

      // --- PARENT ROUTES (Restricted to role === 'parent') ---
      if (user.role !== 'parent') {
        return errorJson('פעולה זו מורשית להורים בלבד', 403);
      }

      if (pathname === '/api/parent/dashboard' && method === 'GET') {
        // Detailed summary of all children
        const { results: children } = await env.DB.prepare(
          `SELECT c.id, c.name, c.avatar, c.color, c.available_minutes, c.debt_limit_minutes,
                  cp.level, cp.xp, cp.current_streak_days, cp.best_streak_days
           FROM children c
           LEFT JOIN child_progress cp ON cp.child_id = c.id
           WHERE c.family_id = ?
           ORDER BY c.created_at ASC`
        )
          .bind(user.familyId)
          .all<any>();

        const childrenSummaries = [];
        for (const child of children) {
          const stats = await getChildWalletSummary(env.DB, child.id);
          const rank = getRankDetails(child.xp || 0);

          const openTasks = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'open' AND due_date = ?`
          )
            .bind(child.id, getIsraelDateString())
            .first<{ count: number }>();

          const pendingTasks = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM task_instances WHERE child_id = ? AND status = 'submitted'`
          )
            .bind(child.id)
            .first<{ count: number }>();

          const pendingRequests = await env.DB.prepare(
            `SELECT COUNT(*) as count FROM screen_time_requests WHERE child_id = ? AND status = 'pending'`
          )
            .bind(child.id)
            .first<{ count: number }>();

          childrenSummaries.push({
            ...child,
            wallet: stats,
            rankTitle: rank.rankTitle,
            progressPercent: rank.progressPercent,
            openTasksCount: openTasks?.count || 0,
            pendingApprovalsCount: pendingTasks?.count || 0,
            pendingScreenRequestsCount: pendingRequests?.count || 0,
          });
        }

        // Global pending counts
        const totalPendingTasks = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM task_instances WHERE family_id = ? AND status = 'submitted'`
        )
          .bind(user.familyId)
          .first<{ count: number }>();

        const totalPendingRequests = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM screen_time_requests WHERE family_id = ? AND status = 'pending'`
        )
          .bind(user.familyId)
          .first<{ count: number }>();

        return json({
          children: childrenSummaries,
          totalPendingTasks: totalPendingTasks?.count || 0,
          totalPendingRequests: totalPendingRequests?.count || 0,
        });
      }

      if (pathname === '/api/parent/approvals' && method === 'GET') {
        const { results: pendingTasks } = await env.DB.prepare(
          `SELECT ti.*, c.name as child_name, c.color as child_color, c.avatar as child_avatar,
                  ts.note as submission_note, ts.photo_object_key, ts.submitted_at as submission_time
           FROM task_instances ti
           JOIN children c ON c.id = ti.child_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.family_id = ? AND ti.status = 'submitted'
           ORDER BY ts.submitted_at ASC`
        )
          .bind(user.familyId)
          .all();

        const { results: pendingRequests } = await env.DB.prepare(
          `SELECT str.*, c.name as child_name, c.color as child_color, c.avatar as child_avatar, c.available_minutes
           FROM screen_time_requests str
           JOIN children c ON c.id = str.child_id
           WHERE str.family_id = ? AND str.status = 'pending'
           ORDER BY str.requested_at ASC`
        )
          .bind(user.familyId)
          .all();

        return json({ pendingTasks, pendingRequests });
      }

      if (pathname === '/api/parent/tasks/approve-all' && method === 'POST') {
        const { results: pending } = await env.DB.prepare(
          `SELECT id FROM task_instances WHERE family_id=? AND status='submitted' ORDER BY submitted_at ASC LIMIT 50`
        ).bind(user.familyId).all<{ id: string }>();
        let approvedCount = 0;
        for (const item of pending || []) {
          const result = await approveTask(env.DB, item.id, user.familyId);
          if (result.success) approvedCount++;
        }
        return json({ success: true, approvedCount, message: `אושרו ${approvedCount} משימות` });
      }

      if (pathname.match(/^\/api\/parent\/tasks\/[^/]+\/approve$/) && method === 'POST') {
        const instanceId = pathname.split('/')[4];
        const body = (await request.json().catch(() => ({}))) as any;
        const customReward = body.rewardMinutes !== undefined ? Number(body.rewardMinutes) : undefined;

        const result = await approveTask(env.DB, instanceId, user.familyId, customReward);
        if (!result.success) {
          return errorJson(result.error || 'אישור המשימה נכשל', 400);
        }

        // Push notification to child
        ctx.waitUntil(
          (async () => {
            try {
              const task = await env.DB.prepare(`SELECT child_id, title FROM task_instances WHERE id = ?`).bind(instanceId).first<{ child_id: string; title: string }>();
              if (task) {
                await sendNotification(env.DB, env, {
                  familyId: user.familyId,
                  recipientRole: 'child',
                  recipientChildId: task.child_id,
                  type: 'task_approved',
                  title: 'המשימה אושרה! 🪙',
                  message: `כל הכבוד! המשימה "${task.title}" אושרה וקיבלת +${result.minutesAwarded} דקות!`,
                  entityType: 'task_instance',
                  entityId: instanceId,
                  skipDbInsert: true,
                });
              }
            } catch (err) {
              console.error('Failed to dispatch task approval push:', err);
            }
          })()
        );

        return json({
          success: true,
          message: 'המשימה אושרה בהצלחה והדקות הועברו לילד',
          minutesAwarded: result.minutesAwarded,
          xpAwarded: result.xpAwarded,
        });
      }

      if (pathname.match(/^\/api\/parent\/tasks\/[^/]+\/reject$/) && method === 'POST') {
        const instanceId = pathname.split('/')[4];
        const body = (await request.json().catch(() => ({}))) as any;
        const reason = body.reason || null;

        const result = await rejectTask(env.DB, instanceId, user.familyId, reason);
        if (!result.success) {
          return errorJson(result.error || 'דחיית המשימה נכשלה', 400);
        }
        return json({ success: true, message: 'המשימה נדחתה' });
      }

      if (pathname.match(/^\/api\/parent\/screen-time\/[^/]+\/review$/) && method === 'POST') {
        const requestId = pathname.split('/')[4];
        const body = (await request.json().catch(() => ({}))) as any;
        const approved = Boolean(body.approved);
        const customMinutes = body.customMinutes !== undefined ? Number(body.customMinutes) : undefined;

        const result = await reviewScreenTimeRequest(env.DB, requestId, user.familyId, approved, customMinutes);
        if (!result.success) {
          return errorJson(result.error || 'הפעולה נכשלה', 400);
        }

        // Push notification to child
        ctx.waitUntil(
          (async () => {
            try {
              const req = await env.DB.prepare(`SELECT child_id, source FROM screen_time_requests WHERE id = ?`).bind(requestId).first<{ child_id: string; source: string }>();
              if (req) {
                const sourceHebrew =
                  req.source === 'playstation' ? 'פלייסטיישן' :
                  req.source === 'tv' ? 'טלוויזיה' :
                  req.source === 'tablet' ? 'טאבלט' :
                  req.source === 'phone' ? 'טלפון' : req.source;

                await sendNotification(env.DB, env, {
                  familyId: user.familyId,
                  recipientRole: 'child',
                  recipientChildId: req.child_id,
                  type: approved ? 'screen_approved' : 'screen_rejected',
                  title: approved ? 'זמן המסך אושר! 🎉' : 'עדכון לגבי בקשת זמן מסך',
                  message: approved
                    ? `ההורים אישרו לך ${result.deductedMinutes || ''} דקות עבור ${sourceHebrew}! צפייה מהנה`
                    : `בקשת זמן המסך עבור ${sourceHebrew} לא אושרה כעת`,
                  entityType: 'screen_time_request',
                  entityId: requestId,
                  skipDbInsert: true,
                });
              }
            } catch (err) {
              console.error('Failed to dispatch screen review push:', err);
            }
          })()
        );
        return json({
          success: true,
          message: approved ? 'בקשת זמן המסך אושרה והדקות נוכו' : 'בקשת זמן המסך נדחתה',
          deductedMinutes: result.deductedMinutes,
        });
      }

      if (pathname === '/api/parent/usage/log' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const childId = body.childId;
        const minutes = Number(body.minutes);
        const source = body.source || 'other';
        const reason = body.reason || null;

        if (!childId || !minutes || minutes <= 0) {
          return errorJson('נתונים חסרים לרישום ניצול', 400);
        }

        const result = await logManualScreenUsage(env.DB, user.familyId, childId, minutes, source, reason);
        if (!result.success) {
          return errorJson(result.error || 'רישום ניצול נכשל', 400);
        }
        return json({
          success: true,
          message: 'הניצול נרשם בהצלחה',
          warning: result.warning,
          newBalance: result.newBalance,
        });
      }

      if (pathname.match(/^\/api\/parent\/usage\/[^/]+\/correct$/) && method === 'POST') {
        const usageLogId = pathname.split('/')[4];
        const body = (await request.json().catch(() => ({}))) as any;
        const correctionReason = body.correctionReason || 'תיקון רישום שגוי';

        const result = await correctUsage(env.DB, user.familyId, usageLogId, correctionReason);
        if (!result.success) {
          return errorJson(result.error || 'תיקון הרישום נכשל', 400);
        }
        return json({
          success: true,
          message: 'הרישום תוקן והדקות הוחזרו לחשבון הילד',
          refundedMinutes: result.refundedMinutes,
          newBalance: result.newBalance,
        });
      }

      if (pathname === '/api/parent/minutes/adjust' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const childId = body.childId;
        const minutesDelta = Number(body.minutesDelta);
        const reason = body.reason || '';

        if (!childId || isNaN(minutesDelta)) {
          return errorJson('נתונים לא תקינים', 400);
        }

        const result = await adjustMinutes(env.DB, user.familyId, childId, minutesDelta, reason);
        if (!result.success) {
          return errorJson(result.error || 'עדכון דקות נכשל', 400);
        }

        if (minutesDelta > 0) {
          ctx.waitUntil(
            (async () => {
              try {
                await sendNotification(env.DB, env, {
                  familyId: user.familyId,
                  recipientRole: 'child',
                  recipientChildId: childId,
                  type: 'manual_bonus',
                  title: 'קיבלת תוספת דקות! 🎁',
                  message: `ההורים הוסיפו לך +${minutesDelta} דקות${reason ? `: ${reason}` : ''}!`,
                });
              } catch (err) {
                console.error('Failed to dispatch bonus push:', err);
              }
            })()
          );
        }

        return json({
          success: true,
          message: 'היתרה עודכנה בהצלחה',
          warning: result.warning,
          newBalance: result.newBalance,
        });
      }

      if (pathname === '/api/parent/tasks/templates' && method === 'GET') {
        const { results: templates } = await env.DB.prepare(
          `SELECT tt.*, 
                  GROUP_CONCAT(ttc.child_id) as assigned_child_ids_str
           FROM task_templates tt
           LEFT JOIN task_template_children ttc ON ttc.template_id = tt.id
           WHERE tt.family_id = ? AND tt.archived_at IS NULL
           GROUP BY tt.id
           ORDER BY tt.created_at DESC`
        )
          .bind(user.familyId)
          .all<any>();

        const formatted = templates.map((t) => ({
          ...t,
          assigned_child_ids: t.assigned_child_ids_str ? t.assigned_child_ids_str.split(',') : [],
        }));

        return json({ templates: formatted });
      }

      if (pathname === '/api/parent/tasks/templates' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const title = body.title?.trim();
        const description = body.description?.trim() || null;
        const rewardMinutes = Math.max(1, Number(body.rewardMinutes) || 15);
        const scheduleType = String(body.scheduleType || 'daily');
        const taskKind = body.taskKind === 'mandatory' ? 'mandatory' : 'bonus';
        const assignedChildIds = Array.isArray(body.assignedChildIds) ? body.assignedChildIds : [];
        const requiresPhoto = body.requiresPhoto ? 1 : 0;
        const oneTimeDate = body.oneTimeDate || null;
        const timeWindowStart = body.timeWindowStart || null;
        const timeWindowEnd = body.timeWindowEnd || null;
        const rawDays = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : [];
        const validDays = [...new Set(rawDays.filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();

        if (!title) return errorJson('כותרת משימה נדרשת', 400);
        if (!['one_time','daily','weekly','custom','repeatable'].includes(scheduleType)) {
          return errorJson('תדירות משימה אינה תקינה', 400);
        }
        if ((scheduleType === 'weekly' || scheduleType === 'custom') && validDays.length === 0) {
          return errorJson('יש לבחור לפחות יום אחד בשבוע', 400);
        }
        if (scheduleType === 'one_time' && !/^\d{4}-\d{2}-\d{2}$/.test(String(oneTimeDate || ''))) {
          return errorJson('יש לבחור תאריך למשימה חד-פעמית', 400);
        }
        if (timeWindowStart && !/^\d{2}:\d{2}$/.test(timeWindowStart)) return errorJson('שעת התחלה אינה תקינה', 400);
        if (timeWindowEnd && !/^\d{2}:\d{2}$/.test(timeWindowEnd)) return errorJson('שעת סיום אינה תקינה', 400);
        if (timeWindowStart && timeWindowEnd && timeWindowEnd <= timeWindowStart) {
          return errorJson('שעת הסיום חייבת להיות אחרי שעת ההתחלה', 400);
        }

        const daysOfWeek =
          scheduleType === 'weekly' || scheduleType === 'custom'
            ? JSON.stringify(validDays)
            : scheduleType === 'daily' || scheduleType === 'repeatable'
            ? '[0,1,2,3,4,5,6]'
            : null;

        const templateId = generateId();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO task_templates (
            id, family_id, title, description, reward_minutes, schedule_type, days_of_week,
            time_window_start, time_window_end, requires_photo, task_kind, one_time_date,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).bind(
          templateId, user.familyId, title, description, rewardMinutes, scheduleType, daysOfWeek,
          timeWindowStart, timeWindowEnd, requiresPhoto, taskKind, oneTimeDate, now, now
        ).run();

        let targets = assignedChildIds;
        if (targets.length === 0) {
          const { results } = await env.DB.prepare(`SELECT id FROM children WHERE family_id=?`).bind(user.familyId).all<{ id: string }>();
          targets = (results || []).map((r) => r.id);
        }
        for (const cId of targets) {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO task_template_children (template_id, child_id)
             SELECT ?, id FROM children WHERE id=? AND family_id=?`
          ).bind(templateId, cId, user.familyId).run();
        }

        await ensureDailyTaskInstances(env.DB, user.familyId);
        return json({ success: true, message: 'תבנית המשימה נוצרה בהצלחה', templateId });
      }

      if (pathname.match(/^\/api\/parent\/tasks\/templates\/[^/]+$/) && method === 'PUT') {
        const templateId = pathname.split('/')[5];
        const body = (await request.json().catch(() => ({}))) as any;
        const title = body.title?.trim();
        const description = body.description !== undefined ? body.description?.trim() || null : undefined;
        const rewardMinutes = body.rewardMinutes !== undefined ? Math.max(1, Number(body.rewardMinutes) || 1) : undefined;
        const scheduleType = body.scheduleType ? String(body.scheduleType) : undefined;
        const taskKind = body.taskKind ? (body.taskKind === 'mandatory' ? 'mandatory' : 'bonus') : undefined;
        const assignedChildIds = Array.isArray(body.assignedChildIds) ? body.assignedChildIds : null;
        const oneTimeDate = body.oneTimeDate !== undefined ? body.oneTimeDate || null : undefined;
        const timeWindowStart = body.timeWindowStart !== undefined ? body.timeWindowStart || null : undefined;
        const timeWindowEnd = body.timeWindowEnd !== undefined ? body.timeWindowEnd || null : undefined;
        const rawDays = Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map(Number) : null;
        const validDays = rawDays ? [...new Set(rawDays.filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : null;

        const current = await env.DB.prepare(`SELECT * FROM task_templates WHERE id=? AND family_id=?`)
          .bind(templateId, user.familyId).first<any>();
        if (!current) return errorJson('תבנית המשימה לא נמצאה', 404);

        const nextSchedule = scheduleType || current.schedule_type;
        if (!['one_time','daily','weekly','custom','repeatable'].includes(nextSchedule)) return errorJson('תדירות משימה אינה תקינה', 400);
        if ((nextSchedule === 'weekly' || nextSchedule === 'custom') && (!validDays || validDays.length === 0) && !current.days_of_week) {
          return errorJson('יש לבחור לפחות יום אחד בשבוע', 400);
        }
        const nextDate = oneTimeDate !== undefined ? oneTimeDate : current.one_time_date;
        if (nextSchedule === 'one_time' && !/^\d{4}-\d{2}-\d{2}$/.test(String(nextDate || ''))) {
          return errorJson('יש לבחור תאריך למשימה חד-פעמית', 400);
        }
        const nextStart = timeWindowStart !== undefined ? timeWindowStart : current.time_window_start;
        const nextEnd = timeWindowEnd !== undefined ? timeWindowEnd : current.time_window_end;
        if (nextStart && nextEnd && nextEnd <= nextStart) return errorJson('שעת הסיום חייבת להיות אחרי שעת ההתחלה', 400);

        const daysOfWeek =
          validDays !== null
            ? JSON.stringify(validDays)
            : (nextSchedule === 'daily' || nextSchedule === 'repeatable')
            ? '[0,1,2,3,4,5,6]'
            : current.days_of_week;

        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE task_templates SET
             title=COALESCE(?,title),
             description=?,
             reward_minutes=COALESCE(?,reward_minutes),
             schedule_type=?,
             days_of_week=?,
             time_window_start=?,
             time_window_end=?,
             task_kind=?,
             one_time_date=?,
             updated_at=?
           WHERE id=? AND family_id=?`
        ).bind(
          title || null,
          description !== undefined ? description : current.description,
          rewardMinutes ?? null,
          nextSchedule,
          daysOfWeek,
          nextStart || null,
          nextEnd || null,
          taskKind || current.task_kind || 'bonus',
          nextDate || null,
          now,
          templateId,
          user.familyId
        ).run();

        if (assignedChildIds) {
          await env.DB.prepare(`DELETE FROM task_template_children WHERE template_id=?`).bind(templateId).run();
          for (const cId of assignedChildIds) {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO task_template_children (template_id, child_id)
               SELECT ?, id FROM children WHERE id=? AND family_id=?`
            ).bind(templateId, cId, user.familyId).run();
          }
        }

        await ensureDailyTaskInstances(env.DB, user.familyId);
        return json({ success: true, message: 'תבנית המשימה עודכנה בהצלחה' });
      }

      if (pathname.match(/^\/api\/parent\/tasks\/templates\/[^/]+$/) && method === 'DELETE') {
        const templateId = pathname.split('/')[5];
        const now = new Date().toISOString();
        await env.DB.prepare(`UPDATE task_templates SET archived_at = ?, is_active = 0 WHERE id = ? AND family_id = ?`)
          .bind(now, templateId, user.familyId)
          .run();
        return json({ success: true, message: 'תבנית המשימה הועברה לארכיון' });
      }

      if (pathname === '/api/parent/history' && method === 'GET') {
        const childId = url.searchParams.get('childId');
        const type = url.searchParams.get('type');
        const limit = Number(url.searchParams.get('limit')) || 50;

        let query = `SELECT mt.*, c.name as child_name, c.color as child_color 
                     FROM minute_transactions mt
                     JOIN children c ON c.id = mt.child_id
                     WHERE mt.family_id = ?`;
        const params: any[] = [user.familyId];

        if (childId) {
          query += ` AND mt.child_id = ?`;
          params.push(childId);
        }
        if (type) {
          query += ` AND mt.type = ?`;
          params.push(type);
        }

        query += ` ORDER BY mt.created_at DESC LIMIT ?`;
        params.push(limit);

        const { results: transactions } = await env.DB.prepare(query).bind(...params).all();
        return json({ transactions });
      }

      if (pathname.match(/^\/api\/parent\/children\/[^/]+\/details$/) && method === 'GET') {
        const childId = pathname.split('/')[4];
        const todayIsrael = getIsraelDateString();

        const child = await env.DB.prepare(
          `SELECT c.*, cp.level, cp.xp, cp.current_streak_days, cp.best_streak_days, cp.last_active_date
           FROM children c
           LEFT JOIN child_progress cp ON cp.child_id = c.id
           WHERE c.id = ? AND c.family_id = ?`
        )
          .bind(childId, user.familyId)
          .first<any>();

        if (!child) {
          return errorJson('הילד לא נמצא', 404);
        }

        const wallet = await getChildWalletSummary(env.DB, childId);
        const rank = getRankDetails(child.xp || 0);

        const { results: transactions } = await env.DB.prepare(
          `SELECT * FROM minute_transactions 
           WHERE child_id = ? AND family_id = ?
           ORDER BY created_at DESC LIMIT 60`
        )
          .bind(childId, user.familyId)
          .all();

        const { results: tasks } = await env.DB.prepare(
          `SELECT ti.*, ts.status as submission_status, ts.note as submission_note, ts.photo_object_key
           FROM task_instances ti
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'
           WHERE ti.child_id = ? AND (ti.due_date = ? OR ti.status = 'submitted')
           ORDER BY 
             CASE ti.status 
               WHEN 'submitted' THEN 1 
               WHEN 'open' THEN 2 
               WHEN 'approved' THEN 3 
               ELSE 4 
             END, 
             ti.reward_minutes DESC`
        )
          .bind(childId, todayIsrael)
          .all();

        const { results: screenRequests } = await env.DB.prepare(
          `SELECT * FROM screen_time_requests
           WHERE child_id = ? AND family_id = ?
           ORDER BY requested_at DESC LIMIT 20`
        )
          .bind(childId, user.familyId)
          .all();

        return json({
          child: {
            ...child,
            rankTitle: rank.rankTitle,
            progressPercent: rank.progressPercent,
          },
          wallet,
          transactions: transactions || [],
          tasks: tasks || [],
          screenRequests: screenRequests || [],
        });
      }

      if (pathname === '/api/parent/stats' && method === 'GET') {
        const { results: children } = await env.DB.prepare(
          `SELECT id, name FROM children WHERE family_id = ?`
        )
          .bind(user.familyId)
          .all<{ id: string; name: string }>();

        const statsList = [];
        for (const c of children) {
          const stats = await getChildWalletSummary(env.DB, c.id);
          statsList.push({ childId: c.id, childName: c.name, ...stats });
        }

        return json({ stats: statsList });
      }

      if (pathname === '/api/parent/settings' && method === 'GET') {
        const settings = await env.DB.prepare(`SELECT * FROM family_settings WHERE family_id = ?`)
          .bind(user.familyId)
          .first();
        return json({ settings });
      }

      if (pathname === '/api/parent/settings' && method === 'PUT') {
        const body = (await request.json().catch(() => ({}))) as any;
        const warningDebt = Number(body.warning_debt_threshold) || -60;
        const soundEnabled = body.sound_enabled ? 1 : 0;
        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE family_settings 
           SET warning_debt_threshold = ?, sound_enabled = ?, updated_at = ?
           WHERE family_id = ?`
        )
          .bind(warningDebt, soundEnabled, now, user.familyId)
          .run();

        return json({ success: true, message: 'ההגדרות עודכנו בהצלחה' });
      }

      if (pathname === '/api/parent/children' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const name = body.name?.trim();
        const pin = String(body.pin || '');
        const color = body.color || '#4facfe';
        const avatar = body.avatar || 'wand';

        if (!name) return errorJson('שם הילד נדרש', 400);
        if (pin.length < 4) return errorJson('קוד הילד חייב להכיל לפחות 4 ספרות', 400);

        let pepper: string;
        try { pepper = requireActivePepper(env); }
        catch { return errorJson('השרת אינו מוגדר בצורה מאובטחת', 503); }
        const childId = generateId();
        const salt = generateSalt(16);
        const pinHash = await hashPin(pin, salt, pepper);
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO children (id, family_id, name, pin_hash, pin_salt, avatar, color, available_minutes, debt_limit_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 30, 60, ?, ?)`
        )
          .bind(childId, user.familyId, name, pinHash, salt, avatar, color, now, now)
          .run();

        await env.DB.prepare(
          `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
           VALUES (?, ?, 1, 0, 1, 1, ?, ?)`
        )
          .bind(childId, user.familyId, getIsraelDateString(), now)
          .run();

        await env.DB.prepare(
          `INSERT INTO minute_transactions (id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at)
           VALUES (?, ?, ?, 'earn', 30, 30, 'ברוך הבא לאקדמיית הזמן!', 'parent', ?)`
        )
          .bind(generateId(), user.familyId, childId, now)
          .run();

        return json({ success: true, message: 'הילד נוסף בהצלחה למשפחה', childId });
      }

      if (pathname.match(/^\/api\/parent\/children\/[^/]+$/) && method === 'PUT') {
        const childId = pathname.split('/')[4];
        const body = (await request.json().catch(() => ({}))) as any;
        const name = body.name?.trim();
        const color = body.color;
        const avatar = body.avatar;
        const pin = body.pin;
        const now = new Date().toISOString();

        if (pin && pin.length >= 4) {
          if (pin.length < 4) return errorJson('קוד הילד חייב להכיל לפחות 4 ספרות', 400);
          let pepper: string;
          try { pepper = requireActivePepper(env); }
          catch { return errorJson('השרת אינו מוגדר בצורה מאובטחת', 503); }
          const salt = generateSalt(16);
          const pinHash = await hashPin(pin, salt, pepper);
          await env.DB.prepare(`UPDATE children SET pin_hash = ?, pin_salt = ? WHERE id = ? AND family_id = ?`)
            .bind(pinHash, salt, childId, user.familyId)
            .run();
        }

        await env.DB.prepare(
          `UPDATE children 
           SET name = COALESCE(?, name),
               color = COALESCE(?, color),
               avatar = COALESCE(?, avatar),
               updated_at = ?
           WHERE id = ? AND family_id = ?`
        )
          .bind(name, color, avatar, now, childId, user.familyId)
          .run();

        return json({ success: true, message: 'פרטי הילד עודכנו בהצלחה' });
      }

      return errorJson('נתיב API לא נמצא', 404);
    }

    // --- 5. FALLBACK TO WORKERS STATIC ASSETS (SPA) ---
    // If request is not an API call, serve static asset or SPA index.html
    return env.ASSETS.fetch(request);
  },

  // --- 6. CRON TRIGGER (Asia/Jerusalem Daily Task Generation) ---
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const familyId = env.DEFAULT_FAMILY_ID || 'yaniv_family';
    await ensureDailyTaskInstances(env.DB, familyId);
  },
};
