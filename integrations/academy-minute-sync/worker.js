const BATCH_SIZE = 1000;

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function getProfileHistoryCount(profileKey) {
  const row = await AHAVA_DB
    .prepare(`SELECT json_array_length(snapshot_json, '$.questionHistory') AS history_count
              FROM ahava_sync_profiles
              WHERE profile_id = ?`)
    .bind(profileKey)
    .first();
  return Number(row?.history_count || 0);
}

async function readNewHistory(profileKey, lastHistoryIndex) {
  const { results = [] } = await AHAVA_DB
    .prepare(`
      SELECT
        CAST(j.key AS INTEGER) AS history_index,
        json_extract(j.value, '$.syncId') AS sync_id,
        json_extract(j.value, '$.subject') AS subject,
        json_extract(j.value, '$.questionId') AS question_id,
        CAST(json_extract(j.value, '$.timestamp') AS INTEGER) AS question_timestamp_ms,
        json_extract(j.value, '$.date') AS activity_date,
        CAST(json_extract(j.value, '$.isCorrect') AS INTEGER) AS is_correct
      FROM ahava_sync_profiles p,
           json_each(p.snapshot_json, '$.questionHistory') j
      WHERE p.profile_id = ?
        AND CAST(j.key AS INTEGER) > ?
      ORDER BY CAST(j.key AS INTEGER) ASC
      LIMIT ?
    `)
    .bind(profileKey, lastHistoryIndex, BATCH_SIZE)
    .all();
  return results;
}

async function creditAnswer(link, item) {
  const syncId = String(item.sync_id || '');
  if (!syncId) return false;

  const timestamp = Number(item.question_timestamp_ms || 0);
  if (Number(item.is_correct) !== 1 || timestamp < Number(link.enabled_from_ms)) return false;

  const transactionId = `academy:${syncId}`;
  const result = await TIMEPLUS_DB
    .prepare(`
      INSERT OR IGNORE INTO learning_reward_credits (
        sync_id, profile_key, child_id, family_id, subject, question_id,
        question_timestamp_ms, activity_date, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      syncId,
      link.profile_key,
      link.child_id,
      link.family_id,
      item.subject || null,
      item.question_id || null,
      timestamp,
      item.activity_date || null,
      transactionId
    )
    .run();

  return Number(result?.meta?.changes || 0) === 1;
}

async function syncProfile(link) {
  const historyCount = await getProfileHistoryCount(link.profile_key);
  let cursor = Number(link.last_history_index ?? -1);

  // If the source history was ever reset/truncated, safely rescan.
  // sync_id is the idempotency key, so rescanning cannot double-credit.
  if (historyCount - 1 < cursor) cursor = -1;

  const items = await readNewHistory(link.profile_key, cursor);
  let credited = 0;
  let maxIndex = cursor;

  for (const item of items) {
    const idx = Number(item.history_index);
    if (Number.isFinite(idx) && idx > maxIndex) maxIndex = idx;
    if (await creditAnswer(link, item)) credited += 1;
  }

  if (maxIndex !== Number(link.last_history_index ?? -1)) {
    await TIMEPLUS_DB
      .prepare(`
        UPDATE learning_profile_links
           SET last_history_index = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE profile_key = ?
      `)
      .bind(maxIndex, link.profile_key)
      .run();
  }

  return {
    profile: link.profile_key,
    scanned: items.length,
    credited,
    cursor: maxIndex,
    historyCount,
    hasMore: items.length === BATCH_SIZE,
  };
}

async function syncAll() {
  const { results: links = [] } = await TIMEPLUS_DB
    .prepare(`
      SELECT profile_key, child_id, family_id, enabled_from_ms, last_history_index
      FROM learning_profile_links
      ORDER BY profile_key
    `)
    .all();

  const profiles = [];
  let credited = 0;

  for (const link of links) {
    const result = await syncProfile(link);
    profiles.push(result);
    credited += result.credited;
  }

  return { ok: true, credited, profiles, at: new Date().toISOString() };
}

addEventListener('scheduled', event => {
  event.waitUntil(
    syncAll().then(result => console.log('academy-sync', JSON.stringify(result)))
      .catch(error => console.error('academy-sync failed', error?.stack || String(error)))
  );
});

addEventListener('fetch', event => {
  event.respondWith((async () => {
    const url = new URL(event.request.url);
    if (url.pathname === '/health') {
      return response({ ok: true, service: 'timeplus-academy-sync', at: new Date().toISOString() });
    }
    if (url.pathname === '/sync') {
      try {
        return response(await syncAll());
      } catch (error) {
        return response({ ok: false, error: String(error?.message || error) }, 500);
      }
    }
    return response({ ok: true, endpoints: ['/health', '/sync'] });
  })());
});
