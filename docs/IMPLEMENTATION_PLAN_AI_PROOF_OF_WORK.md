# Time+ AI Proof-of-Work — Implementation Plan

Status: IMPLEMENTED / DEPLOYED IN SHADOW MODE — FINAL LIVE VISION E2E AND SIGNED PLAY AAB PENDING EXTERNAL BLOCKERS
Date: 2026-10-05
Scope: Time+ web + Cloudflare Worker + D1 + private Workers KV + Yaniv Free LLM Router
Primary constraint: remain $0 by design and fail closed to parent review rather than paid inference.

## 1. Goal

Allow a child to prove completion of activities that are not automatically imported from Academy by submitting:

- a screenshot,
- a camera photo,
- or a short video.

AI verifies the evidence against parent-defined rules. A clearly valid submission can be auto-approved and award the server-defined minutes. Anything uncertain, unsupported, duplicated, unavailable, or failed is preserved and sent to the parent review queue.

The AI never chooses the reward amount. Time+ remains the authority for rewards and ledger writes.

## 2. Reuse existing architecture

Do not build a second reward system.

Reuse:

- `task_templates` / `task_instances` for activities,
- `task_submissions` for the child's submission lifecycle,
- `approveTask()` / `rejectTask()` for final state changes,
- `minute_transactions` as the immutable ledger,
- existing parent approval UX,
- existing notification flow,
- evergreen WebView delivery so normal web changes do not require a new APK.

Academy automatic rewards remain unchanged. AI proof is an additional source of approved task completion.

## 3. AI routing decision

### Primary

`Time+ Worker -> Yaniv Free LLM Router -> best eligible free vision route`

Use the existing OpenAI-compatible endpoint and logical model `auto`.

### Infrastructure fallback

If the Free Router itself is unavailable, times out, has no eligible vision route, or returns `NO_HIGH_QUALITY_FREE_MODEL_AVAILABLE`:

`Time+ Worker -> OpenRouter -> openrouter/free`

This direct OpenRouter path is only an infrastructure fallback. The Free Router already contains OpenRouter as one of its internal providers, so do not call the direct fallback after a normal model rejection/verification result.

### Final fallback

If both AI paths fail, return malformed structured output, or cannot satisfy required capabilities:

`needs_parent_review`

Never silently reject the child's evidence because AI infrastructure is unavailable.

### Cost guard

- Only `free-router/auto` and `openrouter/free` are allowed.
- No paid model IDs may be configured as fallback.
- No generic provider auto-routing that can select paid models.
- Treat a cost-policy violation as AI unavailable -> parent review.
- Record which route/provider/model produced an evaluation.

## 4. Image and screenshot verification

Client-side preprocessing before upload:

- remove EXIF by re-encoding through Canvas,
- resize longest edge to max ~1600 px,
- WebP/JPEG output,
- target normal evidence size below ~1 MB,
- calculate SHA-256 for exact duplicate detection.

AI receives only the normalized image, task title, task verification rules and structured-output schema.

## 5. Video support — V1

Video is supported in V1, but the main AI path does NOT send the full video to the router.

Reason: the current Free Router capability detector is image-Vision based and this approach keeps the feature provider-independent and free.

### V1 limits

- maximum duration: 30 seconds,
- maximum original upload: 25 MB,
- accepted: MP4/WebM/MOV when the browser can decode it,
- reject oversized/unsupported files before upload with a clear child-friendly message.

### Browser-side analysis preparation

After the child selects/records a video:

1. Load it into an off-screen HTMLVideoElement.
2. Extract 8 evenly distributed frames, including first and last usable frames.
3. Add timestamp labels.
4. Build a 2x4 contact sheet for broad sequence understanding.
5. Keep 2-3 higher-resolution frames when OCR/details are likely to matter.
6. Hash the original video for exact duplicate detection.
7. Upload the original video plus generated visual evidence.

For AI, send the contact sheet + selected frames as standard image inputs. This already matches the Free Router's current vision detection and avoids requiring native video support from every provider.

### Future optional enhancement

Add a `video` capability to Free Router and allow direct Gemini video understanding when a verified-free route is available. This is Phase 2 only and must not be required for V1.

## 6. R2 storage

Create a private R2 bucket, recommended name:

`timeplus-evidence`

Worker binding:

`EVIDENCE`

Never make the bucket public.

Object key structure:

`evidence/{familyId}/{childId}/{YYYY-MM}/{submissionId}/original.ext`
`evidence/{familyId}/{childId}/{YYYY-MM}/{submissionId}/normalized.webp`
`evidence/{familyId}/{childId}/{YYYY-MM}/{submissionId}/video-contact-sheet.webp`
`evidence/{familyId}/{childId}/{YYYY-MM}/{submissionId}/frame-01.webp`

Media must be returned only through authenticated Worker endpoints after family/role authorization.

## 7. Retention policy

Metadata stays indefinitely unless the family explicitly deletes it later.

Media retention:

- normalized photos/screenshots: 90 days,
- original short videos: 30 days,
- generated video contact sheet/keyframes: 90 days,
- pending/disputed submission: place a retention hold until resolved, then apply the normal post-resolution retention window.

Use R2 lifecycle rules for the normal prefixes where practical. Cloudflare R2 supports lifecycle deletion by age. Add a D1-driven cleanup path for hold/release and emergency storage guard behavior.

### Free-tier storage guard

Track `byte_size` for every R2 object in D1.

Calculated active evidence bytes are the source of truth for the app-level guard.

Threshold policy:

- < 7 GB: normal retention,
- >= 7 GB: warn in parent diagnostics; preferentially purge expired media immediately,
- >= 8 GB: reduce new video retention to 14 days,
- >= 9 GB: stop accepting new original videos; allow image/screenshot proof and parent review,
- never knowingly cross the free storage envelope because of evidence uploads.

Do not use a paid R2 overage as a silent fallback.

## 8. D1 migration

Add migration `worker/migrations/0004_ai_evidence.sql`.

### Extend task templates

Add fields (or equivalent normalized table):

- `verification_mode` TEXT DEFAULT 'manual'  -- manual | ai_media
- `verification_rules_json` TEXT
- `allow_video_proof` INTEGER DEFAULT 0
- `auto_approve_enabled` INTEGER DEFAULT 0
- `max_daily_auto_awards` INTEGER DEFAULT NULL

Snapshot verification fields into each task instance when generated so edits to a template do not alter an already-issued task.

### Extend submissions

Add fields:

- `verification_status` TEXT -- pending_ai | verified | needs_parent_review | rejected_by_ai | ai_unavailable
- `verification_route` TEXT -- free_router | openrouter_direct | none
- `verification_provider` TEXT
- `verification_model` TEXT
- `verification_summary` TEXT
- `verification_checks_json` TEXT
- `review_mode` TEXT -- automatic | parent
- `media_sha256` TEXT
- `media_kind` TEXT -- image | screenshot | video
- `evidence_expires_at` TEXT
- `retention_hold` INTEGER DEFAULT 0

### Evidence assets table

Create `submission_evidence_assets`:

- `id` TEXT PRIMARY KEY
- `submission_id` TEXT NOT NULL
- `kind` TEXT NOT NULL -- original | normalized | contact_sheet | keyframe
- `object_key` TEXT NOT NULL
- `mime_type` TEXT NOT NULL
- `byte_size` INTEGER NOT NULL
- `sha256` TEXT
- `created_at` TEXT NOT NULL
- `expires_at` TEXT
- `deleted_at` TEXT

Indexes by submission, expiry, hash.

### Verification attempts table

Create `ai_verification_attempts`:

- `id`
- `submission_id`
- `route`
- `provider`
- `model`
- `status`
- `latency_ms`
- `result_json` (structured result only; no need to retain huge raw model output)
- `created_at`

### Ledger traceability

Add nullable `evidence_submission_id` to `minute_transactions` so an automatic or parent approval can be traced back to the evidence submission.

## 9. Verification contract

AI must return strict structured JSON. Example semantic shape:

```json
{
  "decision": "verified | needs_review | not_verified",
  "checks": [
    { "id": "correct_activity", "result": "pass | fail | unknown", "reason": "..." },
    { "id": "completion_visible", "result": "pass | fail | unknown", "reason": "..." },
    { "id": "result_readable", "result": "pass | fail | unknown", "reason": "..." }
  ],
  "observed": "short factual description",
  "suspicious": false,
  "reason": "short explanation"
}
```

Do not use a model-generated percentage/confidence as the auto-approval authority.

Server auto-approval is deterministic:

- all required checks must be `pass`,
- `suspicious` must be false,
- duplicate check must pass,
- task must still be open/submitted and not already rewarded,
- daily cap must not be exceeded,
- `auto_approve_enabled` must be true,
- AI result must pass JSON schema validation.

Otherwise -> parent review.

AI `not_verified` should normally still be visible to the parent rather than permanently discarding evidence. The child can be offered "נסה לצלם שוב".

## 10. Anti-abuse and integrity

V1 safeguards:

- exact SHA-256 duplicate detection across the same child and activity,
- idempotency key on upload completion and approval,
- server-owned reward amount,
- no client-provided balance mutation,
- no double award after retries,
- rate limit proof submissions per child,
- file MIME sniffing / extension mismatch rejection,
- image dimension limits,
- video size/duration limits,
- private R2 objects,
- authenticated media access,
- audit-log entries for AI auto-approval and parent overrides.

Optional Phase 2: perceptual hash to detect visually identical screenshots that were merely re-saved/cropped.

## 11. Worker modules

Prefer adding focused modules rather than growing `index.ts` further:

- `worker/src/evidence.ts` — upload metadata, R2 access, retention and hashes
- `worker/src/ai-verification.ts` — prompt/schema, Free Router call, direct OpenRouter fallback
- `worker/src/evidence-review.ts` — deterministic decision policy and auto-approval orchestration

`worker/src/index.ts` should mostly route requests to these modules.

Update `worker/src/types.ts` with R2 binding and AI secrets/config.

Recommended secrets:

- `FREE_ROUTER_API_KEY`
- `OPENROUTER_API_KEY`

Recommended vars:

- `FREE_ROUTER_BASE_URL`
- `AI_EVIDENCE_ENABLED=true`
- `AI_DIRECT_OPENROUTER_FALLBACK=true`
- `EVIDENCE_IMAGE_RETENTION_DAYS=90`
- `EVIDENCE_VIDEO_RETENTION_DAYS=30`

## 12. API endpoints

Child:

- `POST /api/child/evidence/start`
  - validates task, media kind, limits
  - creates/returns submission + upload metadata
- `PUT /api/child/evidence/:submissionId/asset/:kind`
  - raw authenticated upload to R2
- `POST /api/child/evidence/:submissionId/complete`
  - verifies assets/hash, queues/runs AI verification
- `GET /api/child/evidence/:submissionId`
  - current state/result

Parent:

- `GET /api/parent/evidence?status=...`
  - journal/review list
- `GET /api/parent/evidence/:submissionId`
  - evidence + AI checks + model/route + award info
- `POST /api/parent/evidence/:submissionId/approve`
- `POST /api/parent/evidence/:submissionId/reject`
- `POST /api/parent/evidence/:submissionId/adjust`
- `GET /api/parent/evidence/:submissionId/media/:assetId`
  - authenticated R2 streaming

The existing `/api/parent/approvals` can be extended to include AI review items so the parent does not need two separate queues.

## 13. Child UX

Add a clear action such as `תיעוד ביצוע` / `הגש הוכחה` on eligible tasks.

Flow:

1. Task explanation + reward shown.
2. Choose `צילום`, `צילום מסך/גלריה`, or `וידאו קצר` when allowed.
3. Preview.
4. Upload/processing state.
5. Result:
   - auto-approved: reward celebration,
   - review required: `נשלח לבדיקה`,
   - weak evidence: explain briefly and allow resubmission.

Never expose model/provider jargon to the child.

## 14. Parent UX — Evidence Journal

Add `יומן ביצועים` to ParentDashboard.

Each row/card shows:

- child,
- task/activity,
- submission time,
- thumbnail/contact sheet,
- AI outcome,
- automatic/manual review state,
- awarded minutes,
- evidence expiry date.

Detail view shows:

- original evidence while retained,
- keyframes for video,
- each required AI check and pass/fail/unknown result,
- route/provider/model for diagnostics,
- parent approve/reject/override action,
- ledger link/audit history.

Expired media displays `המדיה נמחקה לפי מדיניות השמירה`; metadata remains.

## 15. Notification behavior

- Auto-approved -> child notification/celebration; optional parent informational notification grouped/silent.
- Needs review -> parent push notification.
- Parent approves/rejects -> existing child notification pattern.
- AI unavailable -> parent notification should say evidence is waiting for manual review, not that the task failed.

## 16. Retention execution

Use R2 lifecycle rules for predictable normal expiry where prefix strategy supports it. Cloudflare documents age-based lifecycle deletion.

Additionally run application cleanup (daily is sufficient) to:

- delete D1-tracked assets past `expires_at`,
- skip `retention_hold=1`,
- mark `deleted_at`,
- release media immediately when storage guard requires it,
- never delete immutable minute ledger/history.

Do not run expensive cleanup work every minute even though the Worker currently has a minute cron; gate it to once per day or a stored last-run timestamp.

## 17. Test / QA plan

### AI router QA before enabling auto-approval

1. Real image request through `free-router/auto`.
2. Confirm router selects only a vision-capable free route.
3. Confirm strict structured result.
4. Force primary-route failure and verify internal provider fallback.
5. Simulate Free Router outage and verify direct `openrouter/free` fallback.
6. Simulate both unavailable and verify `needs_parent_review`.
7. Verify no configured path can select a paid model.

### Media QA

- camera image,
- gallery screenshot,
- duplicate exact image,
- 30-sec video,
- video contact-sheet extraction,
- unsupported codec,
- oversized video,
- corrupt file,
- orientation/RTL/image rotation,
- upload retry.

### Reward integrity QA

- one verified submission -> one ledger credit,
- repeated complete/approve calls -> no double credit,
- parent override after AI review,
- child attempts to alter reward in request -> ignored,
- duplicate evidence -> never auto-awarded,
- Academy sync still works unchanged.

### Privacy/security QA

- child cannot view sibling evidence,
- unauthenticated media fetch -> 401,
- different family -> 403/404,
- R2 bucket not publicly browsable,
- EXIF removed from normalized image,
- secrets absent from repository/client bundle.

### Retention QA

- expiry calculation correct,
- hold prevents deletion,
- resolved hold restarts expiry,
- cleanup removes object and marks record,
- metadata/history remains,
- storage guard thresholds behave safely.

### Evergreen APK QA

Validate the whole evidence flow on the currently installed production APK/WebView before deciding that any native Android change is needed. A new APK is not part of this plan unless real-device QA proves the existing file picker cannot capture/select required media.

## 18. Rollout sequence

### Phase A — foundation

1. Add D1 migration.
2. Create/bind private R2 bucket.
3. Implement evidence upload/storage/authenticated read.
4. Implement image normalization/hash in web client.
5. Add evidence journal without AI auto-approval.

### Phase B — AI

6. Add strict AI verification contract.
7. Run live Vision QA against Yaniv Free Router.
8. Add direct `openrouter/free` infrastructure fallback.
9. Keep all AI decisions in `needs_parent_review` during shadow mode.

### Phase C — auto-approval

10. Compare AI decisions with parent decisions over real submissions.
11. Enable auto-approval only for task templates with stable verification rules.
12. Keep ambiguous tasks manual.

### Phase D — video

13. Add browser-side frame extraction/contact sheet.
14. Add original short-video R2 upload with 30-day retention.
15. Add video evidence to journal and AI image-frame verification.

### Phase E — retention and hardening

16. Apply lifecycle/cleanup policy.
17. Enable storage guard.
18. Complete security, duplicate, race/idempotency and regression QA.

## 19. Definition of Done

The feature is complete only when:

- photo, screenshot and short-video evidence work from the existing app,
- AI verification succeeds through Free Router on real media,
- direct OpenRouter free fallback is proven,
- AI outages never lose evidence,
- ambiguous evidence lands in parent review,
- automatic awards cannot double-credit,
- no paid model can be selected,
- parent can see retained evidence and the AI reasoning checks,
- expired media is deleted while historical metadata remains,
- Academy integration and screen-time timer remain regression-clean,
- production QA passes on the existing Android APK and web app.


## 20. Verified implementation status — 2026-10-06

The design above is retained as historical intent. The deployed implementation differs in these verified ways:

- Phase A + B/C code is merged to `main` via PR #18; merge commit `9f5e5259c37334fa80eec248d7f392ed6c638f62`.
- Production Pages deployment for that commit succeeded.
- Production Worker version 43 (`42ac0e25-50e4-4e9d-89be-dcd7a593bbc9`) is deployed at 100% traffic; deployment id `572e11ca-27f2-4d09-a02b-480d499aee37`.
- Evidence storage uses private Workers KV (`timeplus-evidence`) because R2 activation was account-gated. No paid R2 path is enabled.
- Evidence retention is 14 days after review resolution for images, screenshots and original short video. Pending/disputed evidence is held until resolution, then receives the 14-day window. Metadata/audit remain.
- `FREE_ROUTER` is a service binding to the deployed Yaniv Free LLM Router. Time+ uses a dedicated secret service token; the primary router token is not exposed to Time+.
- `AI_EVIDENCE_MODE=shadow` remains the production setting. AI results can be recorded for parent review, but automatic minute awards are not enabled globally.
- The deterministic auto-approval code is present, but permits only explicit `educational_result_screenshot` tasks, only gallery screenshots, only when all required checks pass, no duplicate/risk/suspicion exists, template auto-approval is enabled, and the daily cap passes. Camera photos and video are never auto-approved.
- Direct OpenRouter fallback is coded only as `openrouter/free` and only when a separate `OPENROUTER_API_KEY` secret exists; no paid fallback is configured.
- Video V1 is implemented: <=30 seconds, <=25 MB, original private evidence + 2x4 contact sheet + keyframes; AI receives the image derivatives rather than requiring native video-capable routing.
- Android 1.0.4 / versionCode 5 adds reliable WebView camera and video capture using FileProvider + `ACTION_IMAGE_CAPTURE` / `ACTION_VIDEO_CAPTURE`.
- CI on PR #18 passed: CI, Pages Migration Smoke, Pre-Release Gate and Android Runtime QA. Android Runtime QA built, installed and launched the app on an Android 35 emulator successfully.
- Pre-release Android artifact `timeplus-1.0.4-pre-release` was produced by the green pre-release workflow.
- A signed Play AAB cannot currently be produced because the repository does not contain the required GitHub Actions signing secrets: `TIMEPLUS_UPLOAD_KEYSTORE_B64`, `TIMEPLUS_KEYSTORE_PASSWORD`, `TIMEPLUS_KEY_ALIAS`, and `TIMEPLUS_KEY_PASSWORD`. Do not generate a replacement upload key without verifying it matches the Play Console app.
- A production-safe synthetic AI E2E harness was prepared, but the available connector safety layer blocked the isolated D1 fixture write / invocation path. Therefore a real Time+ media request has not yet proven the actual live Vision provider/model response. For that reason production remains in shadow mode and auto-approval must not be enabled yet.
- The temporary QA Worker used while attempting this E2E was deleted, and D1 was verified to contain no `qa_ai_*` / `qa_other_*` test family/child rows; `PRAGMA foreign_key_check` returned no rows.

### Remaining hard blockers before declaring the original goal fully complete

1. Run one real controlled evidence submission through production Time+ and confirm the recorded `verification_provider`, `verification_model`, strict structured checks, and fail-closed behavior. Only after that proof may `AI_EVIDENCE_MODE` be considered for `auto`.
2. Configure the existing Play upload signing credentials as GitHub Actions secrets (or upload the correctly signed 1.0.4 bundle by another trusted signing path). The signing key must match the existing Play Console app.

Until both are resolved, the safe production state is: full evidence feature deployed, AI in Shadow Mode, parent remains final approver, no paid inference path, and Android 1.0.4 code built/tested but not available as a signed Play AAB.
