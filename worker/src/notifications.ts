import { Env, UserRole } from './types';
import { generateId } from './crypto';
import { buildPushPayload, PushMessage, PushSubscription, VapidKeys } from '@block65/webcrypto-web-push';

export interface SendNotificationParams {
  familyId: string;
  recipientRole: UserRole;
  recipientChildId?: string | null;
  type: 'screen_request' | 'task_submitted' | 'screen_approved' | 'screen_rejected' | 'task_approved' | 'task_rejected' | 'manual_bonus';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  skipDbInsert?: boolean;
}

export async function savePushSubscription(
  db: D1Database,
  familyId: string,
  recipientRole: UserRole,
  recipientChildId: string | null,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
) {
  const now = new Date().toISOString();
  const id = generateId();

  await db
    .prepare(
      `INSERT INTO push_subscriptions (
        id, family_id, recipient_role, recipient_child_id, endpoint, p256dh, auth, user_agent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        family_id = excluded.family_id,
        recipient_role = excluded.recipient_role,
        recipient_child_id = excluded.recipient_child_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = excluded.updated_at`
    )
    .bind(
      id,
      familyId,
      recipientRole,
      recipientChildId || null,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent || null,
      now,
      now
    )
    .run();
}

export async function removePushSubscription(db: D1Database, endpoint: string) {
  await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
}

export async function getNotifications(
  db: D1Database,
  familyId: string,
  recipientRole: UserRole,
  recipientChildId?: string | null,
  limit: number = 30
) {
  let query = `SELECT * FROM notifications WHERE family_id = ? AND recipient_role = ?`;
  const params: any[] = [familyId, recipientRole];

  if (recipientRole === 'child' && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    params.push(recipientChildId);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const { results: notifications } = await db.prepare(query).bind(...params).all<any>();

  let unreadQuery = `SELECT COUNT(*) as unread_count FROM notifications WHERE family_id = ? AND recipient_role = ? AND read_at IS NULL`;
  const unreadParams: any[] = [familyId, recipientRole];
  if (recipientRole === 'child' && recipientChildId) {
    unreadQuery += ` AND recipient_child_id = ?`;
    unreadParams.push(recipientChildId);
  }

  const unread = await db.prepare(unreadQuery).bind(...unreadParams).first<{ unread_count: number }>();

  return {
    notifications: notifications || [],
    unreadCount: unread?.unread_count || 0,
  };
}

export async function markNotificationsAsRead(
  db: D1Database,
  familyId: string,
  recipientRole: UserRole,
  recipientChildId?: string | null
) {
  const now = new Date().toISOString();
  let query = `UPDATE notifications SET read_at = ? WHERE family_id = ? AND recipient_role = ? AND read_at IS NULL`;
  const params: any[] = [now, familyId, recipientRole];

  if (recipientRole === 'child' && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    params.push(recipientChildId);
  }

  await db.prepare(query).bind(...params).run();
}

export async function sendNotification(
  db: D1Database,
  env: Env,
  params: SendNotificationParams
) {
  const { familyId, recipientRole, recipientChildId, type, title, message, entityType, entityId } = params;
  const now = new Date().toISOString();
  const notificationId = generateId();

  // 1. Record In-App notification in DB (if not already recorded)
  if (!params.skipDbInsert) {
    try {
      await db
        .prepare(
          `INSERT INTO notifications (
            id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          notificationId,
          familyId,
          recipientRole,
          recipientChildId || null,
          type,
          title,
          message,
          entityType || null,
          entityId || null,
          now
        )
        .run();
    } catch (err) {
      console.error('Failed to insert in-app notification:', err);
    }
  }

  // 2. Fetch push subscriptions
  let subsQuery = `SELECT * FROM push_subscriptions WHERE family_id = ? AND recipient_role = ?`;
  const subsParams: any[] = [familyId, recipientRole];

  if (recipientRole === 'child' && recipientChildId) {
    subsQuery += ` AND recipient_child_id = ?`;
    subsParams.push(recipientChildId);
  }

  const { results: subscriptions } = await db.prepare(subsQuery).bind(...subsParams).all<any>();

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  // 3. Prepare VAPID Keys
  const vapidKeys: VapidKeys = {
    subject: env.VAPID_SUBJECT || 'https://timeplus.yanivsa.workers.dev',
    publicKey: env.VAPID_PUBLIC_KEY || '',
    privateKey: env.VAPID_PRIVATE_KEY || '',
  };

  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn('Push skipped: VAPID keys are not configured');
    return;
  }

  const pushMessage: PushMessage = {
    data: JSON.stringify({
      notificationId,
      title,
      body: message,
      type,
      entityType,
      entityId,
      url: recipientRole === 'parent' ? '/parent' : '/child',
      timestamp: Date.now(),
    }),
    options: {
      ttl: 86400, // 24 hours
    },
  };

  // 4. Dispatch push to each device subscription
  for (const sub of subscriptions) {
    try {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = await buildPushPayload(pushMessage, pushSub, vapidKeys);
      const res = await fetch(sub.endpoint, payload);

      if (res.status === 404 || res.status === 410) {
        // Subscription is expired or unregistered, remove from DB
        await removePushSubscription(db, sub.endpoint);
      }
    } catch (pushErr) {
      console.error(`Push dispatch failed for endpoint ${sub.endpoint}:`, pushErr);
    }
  }
}
