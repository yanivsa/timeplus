import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('English reading submissions expose direct recording and existing-file upload', () => {
  const recorder = read('web/src/components/EnglishReadingAudioProof.tsx');
  const dashboard = read('web/src/screens/ChildDashboard.tsx');
  const evidencePanel = read('web/src/components/ChildEvidencePanel.tsx');
  assert.match(recorder, /getUserMedia\(\{ audio: true \}\)/);
  assert.match(recorder, /new MediaRecorder\(/);
  assert.match(recorder, /type="file"/);
  assert.match(recorder, /accept="audio\/\*/);
  assert.match(recorder, /<audio controls/);
  assert.match(recorder, /submitAudioEvidence\(/);
  assert.match(dashboard, /isEnglishReadingTask\(selectedTask\)/);
  assert.match(dashboard, /<EnglishReadingAudioProof/);
  assert.match(evidencePanel, /<EnglishReadingAudioProof/);
});

test('Audio evidence is limited to English reading, uses original audio, and cannot trigger visual AI verification', () => {
  const server = read('worker/src/evidence.ts');
  const client = read('web/src/services/evidence.ts');
  assert.match(server, /mediaKind === 'audio' && !isEnglishReadingTask/);
  assert.match(server, /submission\.media_kind === 'audio' && \(assetKind !== 'original' \|\| !isAudio\)/);
  assert.match(server, /submission\.media_kind !== 'audio' && submission\.verification_mode === 'ai_media'/);
  assert.match(server, /const MAX_AUDIO_BYTES = 20 \* 1024 \* 1024/);
  assert.match(server, /if \(!looksLikeDeclaredMime\(bytes, contentType\)\)/);
  assert.match(client, /mediaKind: 'audio'/);
  assert.match(client, /asset\/original/);
});

test('Parents can hear the original audio through authenticated evidence media endpoint', () => {
  const parent = read('web/src/screens/ParentDashboard.tsx');
  const server = read('worker/src/evidence.ts');
  assert.match(parent, /mediaKind === 'audio'/);
  assert.match(parent, /<audio src=\{evidenceViewer\.mediaUrl\} controls/);
  assert.match(server, /async function streamParentEvidenceAsset/);
  assert.match(server, /if \(user\.role !== 'parent'\)/);
});

test('Android WebView asks for recording permission only on trusted HTTPS TimePlus origins', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const main = read('android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt');
  assert.match(manifest, /android\.permission\.RECORD_AUDIO/);
  assert.match(main, /override fun onPermissionRequest\(/);
  assert.match(main, /origin\.scheme == "https"/);
  assert.match(main, /origin\.host in ALLOWED_HOSTS/);
  assert.match(main, /request\.resources\.size == 1/);
  assert.match(main, /PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
});
