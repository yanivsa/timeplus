const MAX_BODY_BYTES = 900000;
const MAX_RECORDS_PER_STORE = 20000;
const AUTO_PROFILES = new Set(['ori', 'eitan', 'ayala']);


function isExamPrepRecord(record) {
  return Boolean(record && (record.source === 'exam_prep' || record.subject === 'exam_prep'));
}

function isRewardEligibleRecord(record) {
  return Boolean(
    record &&
    record.isCorrect === true &&
    record.correctFirstTry === true &&
    Number(record.attempts) === 1 &&
    !isExamPrepRecord(record)
  );
}

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

function buildRewardCandidates(localSnapshot, remoteSnapshot, mergedSnapshot, lastHistoryIndex) {
  const mergedHistory = Array.isArray(mergedSnapshot?.questionHistory) ? mergedSnapshot.questionHistory : [];
  const remoteHistory = Array.isArray(remoteSnapshot?.questionHistory) ? remoteSnapshot.questionHistory : [];
  const localHistory = Array.isArray(localSnapshot?.questionHistory) ? localSnapshot.questionHistory : [];

  let cursor = Number(lastHistoryIndex ?? -1);
  if (!Number.isInteger(cursor) || cursor < -1 || cursor >= mergedHistory.length) cursor = -1;

  const remoteKeys = new Set(remoteHistory.map(record => eventKey(record, 'questionHistory')));
  const candidates = new Map();

  // Normal fast path: everything appended after the last successfully scanned index.
  for (const record of mergedHistory.slice(cursor + 1)) {
    if (!record || typeof record !== 'object') continue;
    candidates.set(eventKey(record, 'questionHistory'), record);
  }

  // Safety path: catch late/offline records that merge earlier in the sorted history.
  for (const record of localHistory) {
    if (!record || typeof record !== 'object') continue;
    const key = eventKey(record, 'questionHistory');
    if (!remoteKeys.has(key)) candidates.set(key, record);
  }

  return {
    records: [...candidates.values()],
    newCursor: mergedHistory.length - 1,
  };
}

function addMissingEligibleRewardCandidates(records, mergedSnapshot, creditedKeys, enabledFromMs) {
  const candidates = new Map();
  const durableCredits = creditedKeys && typeof creditedKeys.has === 'function' ? creditedKeys : new Set();

  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record !== 'object') continue;
    const syncId = eventKey(record, 'questionHistory');
    if (!syncId || durableCredits.has(syncId)) continue;
    candidates.set(syncId, record);
  }

  const history = Array.isArray(mergedSnapshot?.questionHistory) ? mergedSnapshot.questionHistory : [];
  for (const record of history) {
    if (!isRewardEligibleRecord(record)) continue;
    const timestamp = Number(record.timestamp || 0);
    if (!Number.isFinite(timestamp) || timestamp < Number(enabledFromMs)) continue;
    const syncId = eventKey(record, 'questionHistory');
    if (!syncId || durableCredits.has(syncId)) continue;
    candidates.set(syncId, record);
  }

  return [...candidates.values()];
}


async function creditPendingCorrectAnswers(env, profileId, localSnapshot, remoteSnapshot, mergedSnapshot) {
  if (!env.TIMEPLUS_DB) return { credited: 0, scanned: 0, cursor: null };

  const link = await env.TIMEPLUS_DB
    .prepare(
      'SELECT profile_key, child_id, family_id, enabled_from_ms, last_history_index FROM learning_profile_links WHERE profile_key = ?'
    )
    .bind(profileId)
    .first();

  if (!link) return { credited: 0, scanned: 0, cursor: null };

  const { records, newCursor } = buildRewardCandidates(
    localSnapshot,
    remoteSnapshot,
    mergedSnapshot,
    link.last_history_index
  );

  const durableCreditRows = await env.TIMEPLUS_DB
    .prepare('SELECT sync_id FROM learning_reward_credits WHERE profile_key = ?')
    .bind(profileId)
    .all();
  const durableCreditKeys = new Set(
    (durableCreditRows?.results || [])
      .map(row => String(row?.sync_id || ''))
      .filter(Boolean)
  );
  const candidateRecords = addMissingEligibleRewardCandidates(
    records,
    mergedSnapshot,
    durableCreditKeys,
    link.enabled_from_ms
  );

  let credited = 0;

  // Reconcile durable credit IDs so a transient Time+ write failure self-heals.
  for (const record of candidateRecords) {
    if (!isRewardEligibleRecord(record)) continue;

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

  if (newCursor !== Number(link.last_history_index ?? -1)) {
    await env.TIMEPLUS_DB
      .prepare(
        "UPDATE learning_profile_links SET last_history_index = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE profile_key = ?"
      )
      .bind(newCursor, profileId)
      .run();
  }

  return { credited, scanned: candidateRecords.length, cursor: newCursor };
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

  let remoteSnapshot = null;
  let merged = null;
  let nextRevision = null;
  let persisted = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const account = await ensureAccount(context.env.AHAVA_DB, profileId);
    if (!account) return reply({ error: 'unknown_profile' }, 404);

    remoteSnapshot = null;
    if (account.snapshot_json) {
      try {
        remoteSnapshot = JSON.parse(account.snapshot_json);
      } catch {
        return reply({ error: 'corrupt_remote_snapshot' }, 500);
      }
    }

    merged = body.mode === 'replace' ? body.snapshot : mergeSnapshots(body.snapshot, remoteSnapshot);
    nextRevision = Number(account.revision || 0) + 1;
    const serialized = JSON.stringify(merged);
    if (serialized.length > MAX_BODY_BYTES) return reply({ error: 'snapshot_too_large' }, 413);

    const saveResult = await context.env.AHAVA_DB
      .prepare(
        'UPDATE ahava_sync_profiles SET snapshot_json = ?1, revision = ?2, updated_at = ?3, token_hash = ?4 WHERE profile_id = ?5 AND revision = ?6'
      )
      .bind(serialized, nextRevision, Date.now(), 'passwordless:v1', profileId, Number(account.revision || 0))
      .run();

    if (Number(saveResult?.meta?.changes || 0) > 0) {
      persisted = true;
      break;
    }
  }

  if (!persisted || !merged || nextRevision === null) {
    return reply({ error: 'concurrent_sync_retry' }, 503);
  }

  let rewardSync = { credited: 0, scanned: 0, cursor: null };
  if (context.env.TIMEPLUS_DB) {
    try {
      rewardSync = await creditPendingCorrectAnswers(
        context.env,
        profileId,
        body.snapshot,
        remoteSnapshot,
        merged
      );
    } catch (error) {
      console.error('timeplus academy credit failed', profileId, error?.stack || String(error));
      return reply(
        {
          error: 'timeplus_reward_sync_failed',
          academySaved: true,
          revision: nextRevision,
        },
        503
      );
    }
  }

  return reply({
    ok: true,
    auth: 'passwordless',
    revision: nextRevision,
    snapshot: merged,
    rewardSync,
  });
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
