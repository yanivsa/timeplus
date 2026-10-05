# Goal Plan — AI Proof-of-Work Phase A

## Milestones

### A1 — Data and storage contract
- D1 migration for verification/evidence metadata.
- Private `EVIDENCE` R2 binding.
- Authenticated media access only.

### A2 — Evidence API
- Start submission.
- Upload normalized asset.
- Complete submission into parent review.
- Exact duplicate detection.
- Retention metadata and cleanup.

### A3 — Web client
- Camera and gallery selection.
- Canvas normalization and EXIF removal.
- SHA-256.
- Child submission panel.
- Parent Evidence Journal.

### A4 — Reward integrity
- Preserve `approveTask()` as the only reward path.
- Trace approved evidence to `minute_transactions.evidence_submission_id`.
- Normal non-evidence approvals continue unchanged.

### A5 — Independent verification
- PR CI: web build, Worker typecheck/bundle, Android build.
- Resolve every build/type failure before merge.
- Real R2 + D1 integration test before production rollout.

## External dependency

Cloudflare R2 is currently disabled at account level. Cloudflare API returns error 10042: `Please enable R2 through the Cloudflare Dashboard.`

This blocks bucket creation and production E2E validation, but not branch implementation or compile-time QA.
