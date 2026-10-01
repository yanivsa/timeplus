const MAX_BODY_BYTES = 900000;
const MAX_RECORDS_PER_STORE = 20000;
const AUTO_PROFILES = new Set(['ori', 'eitan', 'ayala']);
const REWARD_RETRY_TAIL = 300;

function reply(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'Content-Security-Policy': "default-src 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function validProfile(profile) {
  return profile && typeof profile === 'object' && typeof profile.id === 'string' && profile.id.length <= 40;
}

function validateSnapshot(snapshot, profileId) {
  if (!snapshot || typeof snapshot !== 'object' || !validProfile(snapshot.profile)) return false;
  if (snapshot.profile.id !== profileId) return false;
  return ['logs', 'failedQuestions', 'questionHistory'].every(
    name => Array.isArray(snapshot[name]) && snapshot[name].length <= MAX_RECORDS_PER_STORE
  );
}

function eventKey(record, storeName) {
  if (record && typeof record.syncId === 'string' && record.syncId.length <= 160) return record.syncId;
  const parts =
    storeName === 'questionHistory'
      ? [record.userId, record.timestamp, record.questionId, record.attempts, record.isCorrect]
      : [record.userId, record.timestamp || record.date, record.questionId || record.subject, record.count, record.xp];
  return storeName + ':' + parts.map(value => String(value ?? '')).join(':');
}

function mergeAppendOnly(localRecords, remoteRecords, storeName) {
  const merged = new Map();
  for (const record of [...remoteRecords, ...localRecords]) {
    if (!record || typeof record !== 'object') continue;
    const key = eventKey(record, storeName);
    merged.set(key, { ...record, syncId: key });
  }
  return [...merged.values()].sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
}

function mergeFailed(localRecords, remoteRecords) {
  const merged = new Map();
  for (const record of [...remoteRecords, ...localRecords]) {
    if (!record || typeof record !== 'object' || !record.questionId) continue;
    const key = String(record.userId) + ':' + String(record.questionId);
    const previous = merged.get(key);
    if (!previous || Number(record.updatedAt || 0) >= Number(previous.updatedAt || 0)) {
      merged.set(key, { ...record, syncId: record.syncId || 'failed:' + key });
    }
  }
  return [...merged.values()];
}

function mergeProfiles(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const lt = Number(local.syncUpdatedAt || 0);
  const rt = Number(remote.syncUpdatedAt || 0);
  if (lt !== rt) return lt > rt ? local : remote;
  const lp = Number(local.xp || 0) + Number(local.points || 0);
  const rp = Number(remote.xp || 0) + Number(remote.points || 0);
  return lp >= rp ? local : remote;
}

function mergeSnapshots(local, remote) {
  if (!remote) return local;
  return {
    version: 2,
    profile: mergeProfiles(local.profile, remote.profile),
    logs: mergeAppendOnly(local.logs, remote.logs, 'logs'),
    failedQuestions: mergeFailed(local.failedQuestions, remote.failedQuestions),
    questionHistory: mergeAppendOnly(local.questionHistory, remote.questionHistory, 'questionHistory'),
  };
}

async function creditRecentCorrectAnswers(env, profileId, snapshot) {
  if (!env.TIMEPLUS_DB || !snapshot || !Array.isArray(snapshot.questionHistory)) return 0;

  const link = await env.TIMEPLUS_DB
    .prepare(
      'SELECT profile_key, child_id, family_id, enabled_from_ms FROM learning_profile_links WHERE profile_key = ?'
    )
    .bind(profileId)
    .first();

  if (!link) return 0;

  const recent = snapshot.questionHistory.slice(-REWARD_RETRY_TAIL);
  let credited = 0;

  for (const record of recent) {
    if (!record || typeof record !== 'object' || record.isCorrect !== true) continue;

    const timestamp = Number(record.timestamp || 0);
    if (!Number.isFinite(timestamp) || timestamp < Number(link.enabled_from_ms)) continue;

    const syncId = eventKey(record, 'questionHistory');
    if (!syncId) continue;

    const result = await env.TIMEPLUS_DB
      .prepare(
        `INSERT OR IGNORE INTO learning_reward_credits (
          sync_id, profile_key, child_id, family_id, subject, question_id,
          question_timestamp_ms, activity_date, transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        syncId,
        profileId,
        link.child_id,
        link.family_id,
        record.subject || null,
        record.questionId || null,
        timestamp,
        record.date || null,
        'academy:' + syncId
      )
      .run();

    if (Number(result?.meta?.changes || 0) > 0) credited += 1;
  }

  return credited;
}

async function ensureAccount(db, profileId) {
  let account = await db
    .prepare('SELECT profile_id, snapshot_json, revision FROM ahava_sync_profiles WHERE profile_id = ?1')
    .bind(profileId)
    .first();

  if (!account && AUTO_PROFILES.has(profileId)) {
    await db
      .prepare(
        'INSERT INTO ahava_sync_profiles (profile_id, token_hash, snapshot_json, revision, updated_at) VALUES (?1, ?2, NULL, 0, ?3) ON CONFLICT(profile_id) DO NOTHING'
      )
      .bind(profileId, 'passwordless:v1', Date.now())
      .run();

    account = await db
      .prepare('SELECT profile_id, snapshot_json, revision FROM ahava_sync_profiles WHERE profile_id = ?1')
      .bind(profileId)
      .first();
  }

  return account;
}

async function handlePost(context) {
  if (!context.env.AHAVA_DB) return reply({ error: 'cloud_database_unavailable' }, 503);

  const contentLength = Number(context.request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return reply({ error: 'payload_too_large' }, 413);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return reply({ error: 'invalid_json' }, 400);
  }

  const profileId = typeof body.profileId === 'string' ? body.profileId.trim().toLowerCase() : '';
  if (!/^[a-z0-9_-]{1,40}$/i.test(profileId)) return reply({ error: 'invalid_request' }, 400);
  if (!validateSnapshot(body.snapshot, profileId)) return reply({ error: 'invalid_snapshot' }, 400);

  const account = await ensureAccount(context.env.AHAVA_DB, profileId);
  if (!account) return reply({ error: 'unknown_profile' }, 404);

  let remoteSnapshot = null;
  if (account.snapshot_json) {
    try {
      remoteSnapshot = JSON.parse(account.snapshot_json);
    } catch {
      return reply({ error: 'corrupt_remote_snapshot' }, 500);
    }
  }

  const merged = body.mode === 'replace' ? body.snapshot : mergeSnapshots(body.snapshot, remoteSnapshot);
  const nextRevision = Number(account.revision || 0) + 1;
  const serialized = JSON.stringify(merged);

  if (serialized.length > MAX_BODY_BYTES) return reply({ error: 'snapshot_too_large' }, 413);

  await context.env.AHAVA_DB
    .prepare(
      'UPDATE ahava_sync_profiles SET snapshot_json = ?1, revision = ?2, updated_at = ?3, token_hash = ?4 WHERE profile_id = ?5'
    )
    .bind(serialized, nextRevision, Date.now(), 'passwordless:v1', profileId)
    .run();

  if (context.env.TIMEPLUS_DB) {
    context.waitUntil(
      creditRecentCorrectAnswers(context.env, profileId, merged)
        .then(count => {
          if (count > 0) console.log('timeplus academy credits', profileId, count);
        })
        .catch(error => console.error('timeplus academy credit failed', profileId, error?.stack || String(error)))
    );
  }

  return reply({ ok: true, auth: 'passwordless', revision: nextRevision, snapshot: merged });
}

const ALLOWED_ORIGINS = new Set(['https://ahava-prep.pages.dev', 'https://ahava-prep-bpb.pages.dev']);

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && Boolean(u.port);
  } catch {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function withCors(response, origin) {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(corsHeaders(origin))) result.headers.set(name, value);
  return result;
}

export default {
  async fetch(request, env, executionContext) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
      return Response.json(
        { error: 'origin_not_allowed' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return withCors(reply({ error: 'method_not_allowed' }, 405), origin);
    }

    const response = await handlePost({
      request,
      env,
      waitUntil: promise => executionContext.waitUntil(promise),
    });

    return withCors(response, origin);
  },
};
