import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('child can queue up to ten photos and send them only after review', () => {
  const panel = read('web/src/components/ChildEvidencePanel.tsx');
  assert.match(panel, /const \[queuedImages, setQueuedImages\]/);
  assert.match(panel, /queuedImages\.length \+ picked\.length > MAX_EVIDENCE_IMAGES/);
  assert.match(panel, /multiple\s+className="hidden"/);
  assert.match(panel, /onClick=\{submitImages\}/);
  assert.match(panel, /onClick=\{\(\) => setQueuedImages/);
  assert.doesNotMatch(panel, /onChange=\{\(e\) => image\(/);
  assert.match(panel, /setQueuedImages\(\[\]\)/);
});

test('all photos are uploaded sequentially to one submission before completing', () => {
  const client = read('web/src/services/evidence.ts');
  assert.match(client, /export const MAX_EVIDENCE_IMAGES = 10/);
  assert.match(client, /submitImagesEvidence\(/);
  assert.match(client, /for \(const \{ file \} of p\.files\)/);
  assert.match(client, /await apiUpload\(\`\/api\/child\/evidence\/\$\{start\.submissionId\}\/asset\/normalized/);
  assert.match(client, /return complete\(start\.submissionId\)/);
});

test('D1 atomically rejects image 11 and leaves video/audio routes intact', () => {
  const server = read('worker/src/evidence.ts');
  assert.match(server, /const MAX_IMAGES_PER_SUBMISSION = 10/);
  assert.match(server, /const isPhotoSubmission = submission\.media_kind === 'image' \|\| submission\.media_kind === 'screenshot'/);
  assert.match(server, /SELECT COUNT\(\*\) FROM submission_evidence_assets/);
  assert.match(server, /\) < \?\)/);
  assert.match(server, /MAX_IMAGES_PER_SUBMISSION\s+\)\s+\.run\(\)/);
  assert.match(server, /if \(isPhotoSubmission && imageCount > MAX_IMAGES_PER_SUBMISSION\)/);
  assert.match(server, /\(!isPhotoSubmission \|\| imageCount <= 4\)/);
  assert.match(server, /submission\.media_kind === 'audio'/);
  assert.match(server, /submission\.media_kind === 'video'/);
});

test('parents can view every uploaded image in the same activity', () => {
  const journal = read('web/src/components/EvidenceJournalPanel.tsx');
  assert.match(journal, /d\.assets\.map/);
  assert.match(journal, /a\.mime_type\.startsWith\('image\/'\)/);
  assert.match(journal, /<img loading="lazy"/);
});

test('existing Android WebView handles chooser ClipData for multi-file selection', () => {
  const android = read('android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt');
  assert.match(android, /val clipData = result\.data\?\.clipData/);
  assert.match(android, /Array\(clipData\.itemCount\)/);
});

test('normal parent approvals preview allows navigating all ten images without changing submission', () => {
  const parent = read('web/src/screens/ParentDashboard.tsx');
  assert.match(parent, /images: any\[\]/);
  assert.match(parent, /selectedIndex: number/);
  assert.match(parent, /activeAssets\.filter\(\(item: any\) => \['normalized', 'original'\]/);
  assert.match(parent, /evidenceViewer\.images\.map/);
  assert.match(parent, /setEvidenceViewer\(\(current\)/);
  assert.match(parent, /aria-pressed=\{i === evidenceViewer\.selectedIndex\}/);
});
