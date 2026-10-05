# Goal Spec — AI Proof-of-Work Phase A

## Objective

Add a safe evidence foundation to Time+ without changing Academy rewards, screen-time timer semantics, or requiring a new APK.

## Phase A scope

- Child can submit normalized image evidence from camera or gallery.
- Source is recorded as `camera_capture`, `gallery_upload`, or `unknown`.
- Evidence binary data is private R2; metadata/audit is D1.
- Exact duplicate SHA-256 detection exists before parent review.
- Parent can review retained evidence in an Evidence Journal.
- Existing parent approval path remains the reward authority and evidence approvals are traceable to the minute ledger.
- Images retain for 90 days unless held.
- Expired media can be cleaned without deleting historical metadata.
- No AI auto-approval in Phase A.
- No production deploy and no APK rebuild until QA gates pass.

## Non-goals for Phase A

- AI inference / Free Router routing.
- Auto-approval.
- Video frame extraction and AI verification.
- Production rollout while R2 is disabled.

## Stop condition

Phase A is proven only when:

1. Web build passes.
2. Worker TypeScript check passes.
3. Wrangler dry-run bundle passes.
4. Android debug build remains green.
5. R2 is enabled and the private `timeplus-evidence` bucket can be created/bound.
6. D1 migration is successfully applied to the target environment.
7. Camera and gallery evidence flow is validated end-to-end without double credit.

Until all seven are evidenced, Phase A is not marked complete.
