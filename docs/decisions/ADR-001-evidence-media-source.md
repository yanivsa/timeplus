# ADR-001 — Evidence media source tracking

Status: Accepted
Date: 2026-10-05
Scope: Time+ AI Proof-of-Work

## Decision

For video evidence, Time+ will support both:

- recording a new video from the device camera (`camera_capture`)
- selecting an existing video from the device gallery/file picker (`gallery_upload`)

The same source distinction should also be available for image evidence where the platform can reliably determine it.

Every evidence submission must persist a `media_source` value with one of:

- `camera_capture`
- `gallery_upload`
- `unknown` (fallback only when the platform cannot reliably determine the source)

## Data model

Add `media_source TEXT` to the evidence submission model/migration used by the AI Proof-of-Work feature.

`media_source` is metadata only. It must never directly mutate balances or reward amounts.

## API

Child evidence start/complete requests must carry or derive `media_source` server-side where possible.

The server must validate the value against the allowed enum and default to `unknown` rather than trusting arbitrary client strings.

## Parent UX

The Evidence Journal detail view must show whether the evidence was:

- `צולם עכשיו` for `camera_capture`
- `נבחר מהגלריה` for `gallery_upload`
- `מקור לא ידוע` for `unknown`

This information is diagnostic/audit context for the parent.

## Verification policy

In V1, `camera_capture` and `gallery_upload` use the same core verification rules and reward policy.

Do not auto-reject gallery uploads solely because they came from the gallery.

For tasks that require real-time proof, Phase 2 may allow a parent-defined rule such as `require_fresh_capture=true`. In that case, `gallery_upload` must route to parent review rather than being auto-approved.

## Video handling

Both video sources use the same limits:

- maximum duration: 30 seconds
- maximum original upload: 25 MB
- same R2 retention policy
- same duplicate hashing
- same frame extraction/contact-sheet pipeline
- same AI vision verification path

## QA requirements

Test at minimum:

1. Record video using device camera -> stored as `camera_capture`.
2. Select video from gallery -> stored as `gallery_upload`.
3. Parent Evidence Journal renders the correct source label.
4. Both paths produce the same frame extraction/contact-sheet behavior.
5. Both paths obey the same size/duration/retention rules.
6. Unsupported/ambiguous source falls back to `unknown` without blocking submission.
7. No source value can cause direct minute-credit changes.

## Rationale

Allowing both sources improves usability while preserving auditability. Tracking source separately lets Time+ introduce stricter real-time-proof rules later without redesigning the storage or submission model.
