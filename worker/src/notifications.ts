import { Env, UserRole } from './types';
import { generateId } from './crypto';
import { buildPushPayload, PushMessage, PushSubscription, VapidKeys } from '@block65/webcrypto-web-push';

export interface SendNotificationParams {
  familyId: string;
  recipientRole: UserRole;
  recipientChildId?: string | null;
  type: 'screen_request' | 'task_submitted' | 'screen_approved' | 'screen_rejected' | 'task_approved' | 'task_rejected' | 'manual_bonus' | 'screen_time_up';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  skipDbInsert?: boolean;
}

let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function pemToPkcs8(privateKey: string): ArrayBuffer {
  const normalized = privateKey.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getFcmAccessToken(env: Env): Promise<string | null> {
  if (!env.FCM_PROJECT_ID || !env.FCM_CLIENT_EMAIL || !env.FCM_PRIVATE_KEY) {
    return null;
  }

  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now()) {
    return fcmAccessTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: env.FCM_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const unsignedJwt = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(env.FCM_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  const assertion = `${unsignedJwt}.${bytesToBase64Url(new Uint8Array(signature))}`;
  const form = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!response.ok) {
    console.error('FCM OAuth token request failed:', response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const ttlSeconds = Math.max(60, Number(data.expires_in || 3600) - 120);
  fcmAccessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  return data.access_token;
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

export async function saveFcmToken(
  db: D1Database,
  familyId: string,
  recipientRole: UserRole,
  recipientChildId: string | null,
  token: string,
  deviceName?: string
) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO fcm_tokens (
        id, family_id, recipient_role, recipient_child_id, token, device_name, platform, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'android', ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        family_id = excluded.family_id,
        recipient_role = excluded.recipient_role,
        recipient_child_id = excluded.recipient_child_id,
        device_name = excluded.device_name,
        platform = excluded.platform,
        updated_at = excluded.updated_at`
    )
    .bind(
      generateId(),
      familyId,
      recipientRole,
      recipientChildId || null,
      token,
      deviceName || null,
      now,
      now
    )
    .run();
}

export async function removeFcmToken(db: D1Database, token: string) {
  await db.prepare(`DELETE FROM fcm_tokens WHERE token = ?`).bind(token).run();
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

async function sendFcmNotifications(
  db: D1Database,
  env: Env,
  notificationId: string,
  params: SendNotificationParams
) {
  const { familyId, recipientRole, recipientChildId, type, title, message, entityType, entityId } = params;

  let query = `SELECT token FROM fcm_tokens WHERE family_id = ? AND recipient_role = ?`;
  const queryParams: any[] = [familyId, recipientRole];

  if (recipientRole === 'child' && recipientChildId) {
    query += ` AND recipient_child_id = ?`;
    queryParams.push(recipientChildId);
  }

  const { results: tokens } = await db.prepare(query).bind(...queryParams).all<{ token: string }>();
  if (!tokens || tokens.length === 0) return;

  const accessToken = await getFcmAccessToken(env);
  if (!accessToken || !env.FCM_PROJECT_ID) {
    console.warn('Native FCM push skipped: Firebase service account is not configured');
    return;
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env.FCM_PROJECT_ID)}/messages:send`;

  for (const row of tokens) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title,
              body: message,
            },
            data: {
              notificationId,
              type,
              entityType: entityType || '',
              entityId: entityId || '',
              url: recipientRole === 'parent' ? '/parent' : '/child',
            },
            android: {
              priority: 'HIGH',
              notification: {
                channel_id: 'timeplus_updates',
                sound: 'default',
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('FCM send failed:', response.status, errorText);

        if (/UNREGISTERED|registration-token-not-registered/i.test(errorText)) {
          await removeFcmToken(db, row.token);
        }
      }
    } catch (err) {
      console.error('FCM dispatch failed:', err);
    }
  }
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

  // 2. Browser/PWA Web Push (VAPID)
  try {
    let subsQuery = `SELECT * FROM push_subscriptions WHERE family_id = ? AND recipient_role = ?`;
    const subsParams: any[] = [familyId, recipientRole];

    if (recipientRole === 'child' && recipientChildId) {
      subsQuery += ` AND recipient_child_id = ?`;
      subsParams.push(recipientChildId);
    }

    const { results: subscriptions } = await db.prepare(subsQuery).bind(...subsParams).all<any>();

    if (subscriptions && subscriptions.length > 0) {
      const vapidKeys: VapidKeys = {
        subject: env.VAPID_SUBJECT || 'https://timeplus.yanivsa.workers.dev',
        publicKey: env.VAPID_PUBLIC_KEY || '',
        privateKey: env.VAPID_PRIVATE_KEY || '',
      };

      if (vapidKeys.publicKey && vapidKeys.privateKey) {
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
            ttl: 86400,
          },
        };

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
              await removePushSubscription(db, sub.endpoint);
            }
          } catch (pushErr) {
            console.error(`Web Push dispatch failed for endpoint ${sub.endpoint}:`, pushErr);
          }
        }
      } else {
        console.warn('Web Push skipped: VAPID keys are not configured');
      }
    }
  } catch (err) {
    console.error('Web Push lookup/dispatch failed:', err);
  }

  // 3. Native Android Push (Firebase Cloud Messaging)
  try {
    await sendFcmNotifications(db, env, notificationId, params);
  } catch (err) {
    console.error('Native FCM push lookup/dispatch failed:', err);
  }
}
