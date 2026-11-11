import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const workerDir = resolve('worker');
const wranglerBin = resolve('node_modules/.bin/wrangler');
const persist = resolve('.wrangler-audio-e2e');
const origin = 'http://127.0.0.1:8799';
const childToken = 'qa-audio-child-local-only';
const parentToken = 'qa-audio-parent-local-only';

function wrangler(args, timeout = 120000) {
  const proc = spawnSync(wranglerBin, args, {
    cwd: workerDir, encoding: 'utf8', timeout,
    env: { ...process.env, CI: 'true' },
  });
  assert.equal(proc.status, 0, [
    'wrangler', ...args, proc.stdout, proc.stderr, proc.error,
  ].filter(Boolean).join('\n'));
}

function makeWav() {
  const samples = 8000;
  const sampleRate = 8000;
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVEfmt ', 8, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 5000), 44 + i * 2);
  }
  return buffer;
}

async function request(path, { token, method = 'GET', data, contentType = 'application/json' } = {}) {
  const headers = { ...(token ? { Authorization: 'Bearer ' + token } : {}) };
  if (data !== undefined) headers['Content-Type'] = contentType;
  const response = await fetch(origin + path, {
    method, headers, body: data === undefined ? undefined : contentType === 'application/json' ? JSON.stringify(data) : data,
  });
  return response;
}

async function responseJson(response, status) {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

async function waitForWorker(process, output) {
  for (let i = 0; i < 120; i++) {
    if (process.exitCode !== null) throw new Error('Worker exited: ' + output());
    try {
      const r = await fetch(origin + '/healthz', { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch { /* Worker still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Local Worker was not ready: ' + output());
}

test('end to end: audio upload, rejection checks, protected parent playback and approval', { timeout: 240000 }, async () => {
  if (existsSync(persist)) rmSync(persist, { recursive: true, force: true });
  wrangler(['d1', 'migrations', 'apply', 'timeplus-db', '--local', '--persist-to', persist], 120000);
  wrangler(['d1', 'execute', 'timeplus-db', '--local', '--persist-to', persist, '--file', 'tests/fixtures/audio-e2e.sql'], 120000);

  let logs = '';
  const server = spawn(wranglerBin, ['dev', '--local', '--ip', '127.0.0.1', '--port', '8799', '--persist-to', persist], {
    cwd: workerDir, env: { ...process.env, CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  server.stdout.on('data', (b) => { logs = (logs + String(b)).slice(-16000); });
  server.stderr.on('data', (b) => { logs = (logs + String(b)).slice(-16000); });

  try {
    await waitForWorker(server, () => logs);
    assert.equal((await responseJson(await request('/api/child/evidence/start', {
      method: 'POST', data: { taskInstanceId: 'audio_qa_reading', mediaKind: 'audio', mediaSource: 'gallery_upload' },
    }), 401)).error.length > 0, true);

    await responseJson(await request('/api/child/evidence/start', {
      token: childToken, method: 'POST',
      data: { taskInstanceId: 'audio_qa_math', mediaKind: 'audio', mediaSource: 'gallery_upload' },
    }), 400);

    const initial = await responseJson(await request('/api/child/evidence/start', {
      token: childToken, method: 'POST',
      data: { taskInstanceId: 'audio_qa_reading', mediaKind: 'audio', mediaSource: 'gallery_upload' },
    }), 200);
    assert.ok(initial.submissionId, 'Server returned submission id');
    const sid = encodeURIComponent(initial.submissionId);

    await responseJson(await request('/api/child/evidence/' + sid + '/asset/original', {
      token: childToken, method: 'PUT', data: Buffer.from('invalid audio file'),
      contentType: 'audio/wav',
    }), 415);

    const wav = makeWav();
    const upload = await responseJson(await request('/api/child/evidence/' + sid + '/asset/original', {
      token: childToken, method: 'PUT', data: wav, contentType: 'audio/wav',
    }), 200);
    assert.equal(upload.asset.mimeType, 'audio/wav');
    assert.equal(upload.asset.byteSize, wav.length);

    const completed = await responseJson(await request('/api/child/evidence/' + sid + '/complete', {
      token: childToken, method: 'POST', data: {},
    }), 200);
    assert.equal(completed.status, 'needs_parent_review');

    await responseJson(await request('/api/parent/evidence/' + sid, { token: childToken }), 403);
    const parent = await responseJson(await request('/api/parent/evidence/' + sid, { token: parentToken }), 200);
    assert.equal(parent.submission.media_kind, 'audio');
    assert.equal(parent.submission.verification_status, 'needs_parent_review');
    assert.equal(parent.assets.length, 1);
    const aid = encodeURIComponent(parent.assets[0].id);
    const mediaPath = '/api/parent/evidence/' + sid + '/media/' + aid;

    await responseJson(await request(mediaPath, { token: childToken }), 403);
    const sound = await request(mediaPath, { token: parentToken });
    assert.equal(sound.status, 200);
    assert.match(sound.headers.get('content-type') || '', /audio\/wav/);
    const body = Buffer.from(await sound.arrayBuffer());
    assert.deepEqual(body, wav, 'Original audio bytes survived private storage and retrieval');

    const review = await responseJson(await request('/api/parent/evidence/' + sid + '/approve', {
      token: parentToken, method: 'POST', data: {},
    }), 200);
    assert.equal(review.success, true);
    assert.equal(review.minutesAwarded, 3);

    const reviewed = await responseJson(await request('/api/parent/evidence/' + sid, { token: parentToken }), 200);
    assert.equal(reviewed.submission.status, 'approved');
    assert.equal(reviewed.submission.verification_status, 'verified');
    const again = await request(mediaPath, { token: parentToken });
    assert.equal(again.status, 200, 'Playback still works after approval');
    // A second activity uses ten distinct images in one submission.
    const batch = await responseJson(await request('/api/child/evidence/start', {
      token: childToken, method: 'POST',
      data: { taskInstanceId: 'audio_qa_math', mediaKind: 'screenshot', mediaSource: 'gallery_upload' },
    }), 200);
    const batchId = encodeURIComponent(batch.submissionId);
    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLgtAAAAABJRU5ErkJggg==', 'base64');
    for (let i = 0; i < 10; i++) {
      // Trailing metadata distinguishes uploaded files; the PNG itself remains valid.
      const png = Buffer.concat([tinyPng, Buffer.from([i])]);
      const saved = await responseJson(await request('/api/child/evidence/' + batchId + '/asset/normalized', {
        token: childToken, method: 'PUT', data: png, contentType: 'image/png',
      }), 200);
      assert.equal(saved.asset.byteSize, png.length);
    }
    await responseJson(await request('/api/child/evidence/' + batchId + '/asset/normalized', {
      token: childToken, method: 'PUT', data: Buffer.concat([tinyPng, Buffer.from([99])]),
      contentType: 'image/png',
    }), 409);

    const finished = await responseJson(await request('/api/child/evidence/' + batchId + '/complete', {
      token: childToken, method: 'POST', data: {},
    }), 200);
    assert.equal(finished.status, 'needs_parent_review');
    const allImages = await responseJson(await request('/api/parent/evidence/' + batchId, {
      token: parentToken,
    }), 200);
    assert.equal(allImages.assets.filter(a => a.kind === 'normalized' && !a.deleted_at).length, 10);
    for (const asset of allImages.assets) {
      const file = await request('/api/parent/evidence/' + batchId + '/media/' + encodeURIComponent(asset.id), { token: parentToken });
      assert.equal(file.status, 200, 'Parent can view every stored photo');
      assert.match(file.headers.get('content-type') || '', /image\/png/);
    }
    const approvedBatch = await responseJson(await request('/api/parent/evidence/' + batchId + '/approve', {
      token: parentToken, method: 'POST', data: {},
    }), 200);
    assert.equal(approvedBatch.minutesAwarded, 3, 'One activity awards exactly three minutes, not one per photo');
    const repeat = await request('/api/parent/evidence/' + batchId + '/approve', {
      token: parentToken, method: 'POST', data: {},
    });
    assert.ok(repeat.status >= 400, 'Duplicate approval must not grant more minutes');

  } finally {
    // Wrangler may spawn workerd; terminate the entire dedicated process group.
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
    await new Promise((resolve) => {
      if (server.exitCode !== null) return resolve();
      server.once('exit', resolve);
      setTimeout(resolve, 4000).unref();
    });
  }
});
