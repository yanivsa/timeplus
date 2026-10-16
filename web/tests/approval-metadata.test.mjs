import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/screens/ParentDashboard.tsx', import.meta.url), 'utf8');

test('approval cards show when the request was submitted and the minute amount', () => {
  assert.match(source, /formatPendingAge\s*\(/, 'missing relative-age formatter for pending items');
  assert.match(source, /submission_time[\s\S]{0,500}reward_minutes|reward_minutes[\s\S]{0,500}submission_time/, 'task approval metadata must show both submission time and minutes');
  assert.match(source, /requested_at[\s\S]{0,500}requested_minutes|requested_minutes[\s\S]{0,500}requested_at/, 'screen-time request metadata must show both request time and minutes');
});

test('task approval cards visibly mark attached evidence', () => {
  assert.match(source, /\/api\/parent\/evidence/, 'parent dashboard must load evidence metadata');
  assert.match(source, /תיעוד מצורף/, 'missing visible evidence badge');
  assert.match(source, /evidenceTaskIds\.has\(t\.id\)/, 'evidence badge must be tied to the task being reviewed');
});

test('attached evidence badge opens an image/video evidence viewer', () => {
  assert.match(source, /openEvidenceForTask\s*=\s*async/, 'missing action that opens attached evidence');
  assert.match(source, /onClick=\{\(\) => openEvidenceForTask\(t\.id\)\}/, 'attached evidence badge must be clickable');
  assert.ok(source.includes('const detail = await apiRequest(`/api/parent/evidence/${submission.id}`);'), 'viewer must load the selected evidence submission');
  assert.ok(source.includes('const mediaUrl = `/api/parent/evidence/${submission.id}/media/${asset.id}`;'), 'viewer must use the protected evidence media endpoint');
  assert.match(source, /<video[\s\S]{0,500}controls/, 'video evidence must be playable in the parent viewer');
  assert.match(source, /<img[\s\S]{0,500}alt="תיעוד מצורף למשימה"/, 'image evidence must be visible in the parent viewer');
});

test('shadow AI recommendation shows a numeric confidence without auto-approving', () => {
  assert.match(source, /ביטחון AI באישור/, 'parent UI must label the numeric AI approval confidence');
  assert.match(source, /מצב Shadow/, 'parent UI must make clear that the AI output is advisory only');
  assert.match(source, /getAiApprovalConfidence\s*=|aiApprovalConfidence/, 'parent UI must derive a numeric confidence from evidence metadata');
  assert.match(source, /verification_summary/, 'parent evidence viewer must show the AI explanation');
});

test('needs_parent_review is never mislabeled as waiting for AI', () => {
  assert.match(
    source,
    /verification_status\s*===\s*['"]needs_parent_review['"][\s\S]{0,220}(?:בדיקת הורה|נדרשת בדיקת הורה|ממתין לבדיקת הורה)/,
    'manual-review evidence must be labeled as parent review, not pending AI'
  );
});
