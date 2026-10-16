# Time+ Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verified production defects from the 2026-10-16 audit without changing product behavior beyond reliability, consistency, authentication continuity, and notification correctness.

**Architecture:** Preserve the existing Worker + D1 + React + Android WebView architecture. Fix consistency failures at database boundaries with idempotency/atomic batches and database constraints; keep existing routes and UX stable. Add source-level regression contracts plus existing build/typecheck/migration/runtime gates.

**Tech Stack:** Cloudflare Workers/D1/KV, TypeScript, React, Android/Kotlin, GitHub Actions.

**Spec:** 2026-10-16 production audit in the project conversation.

## Global Constraints

- Keep existing public API paths and current Time+ UI behavior.
- Do not require an APK reinstall for web-only behavior, except native auth bridge/runtime QA improvements that apply to the next Android release.
- No secrets or signing material in Git.
- Preserve AI Shadow-mode behavior from current `main`.
- Every production change gets a regression test first.

## Review Focus

- Concurrent/retried wallet actions must not double-charge, double-refund, or lose balance updates.
- Repeatable tasks must preserve all verification settings on every generated instance.
- Evidence completion must not leave `task_instances` and `task_submissions` in incompatible states.
- Android origin fallback must preserve bearer authentication across Pages/Worker origins.
- Israel day/week/month statistics must respect DST rather than a fixed UTC offset.

---

### Task 1: Regression contracts

**Files:**
- Create: `worker/tests/production-hardening.test.mjs`
- Modify: `.github/workflows/ci.yml`

- [ ] Write failing contracts for all verified defects.
- [ ] Run CI and verify the new suite fails against the pre-fix branch.

### Task 2: Task query and repeatable-instance correctness

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `worker/src/tasks.ts`

- [ ] Add the missing task-template join to parent child-details query.
- [ ] Copy AI verification fields into repeatable instances in both generation paths.
- [ ] Run regression suite and verify these contracts pass.

### Task 3: Wallet atomicity and correction idempotency

**Files:**
- Create: `worker/migrations/0008_production_hardening.sql`
- Modify: `worker/src/wallet.ts`
- Modify: `worker/src/tasks.ts`

- [ ] Add durable one-time correction claims and active-session uniqueness constraints.
- [ ] Make screen-time approval and usage correction atomic/idempotent.
- [ ] Make task minute-credit mutation atomic with task approval claim.
- [ ] Use arithmetic balance updates to avoid stale read-modify-write overwrites.
- [ ] Run migrations and regression suite.

### Task 4: Timer and evidence state races

**Files:**
- Modify: `worker/src/screen-sessions.ts`
- Modify: `worker/src/evidence.ts`

- [ ] Convert concurrent active-session insert conflicts into the existing friendly error.
- [ ] Commit evidence task/submission transition in one D1 batch with a linked claim timestamp.
- [ ] Run regression suite.

### Task 5: Authentication continuity and logout revocation

**Files:**
- Modify: `web/src/context/AuthContext.tsx`
- Modify: `android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt`
- Modify: `worker/src/index.ts`

- [ ] Persist the bearer token in app-private native storage and restore it on either allowed origin.
- [ ] Clear native token on logout.
- [ ] Revoke both cookie and bearer sessions server-side on logout.
- [ ] Run web/worker/Android builds.

### Task 6: Israel-time statistics and push correctness

**Files:**
- Modify: `worker/src/timezone.ts`
- Modify: `worker/src/wallet.ts`
- Modify: `worker/src/evidence-review.ts`
- Modify: `worker/src/ai-verification.ts`
- Modify: `worker/src/index.ts`

- [ ] Replace fixed `+3 hours` SQL date math with UTC boundaries derived from `Asia/Jerusalem`.
- [ ] Send push after evidence parent approval/rejection and automatic AI approval without duplicating DB notifications.
- [ ] Prevent duplicate in-app notification on normal task rejection.
- [ ] Run regression suite.

### Task 7: Runtime QA gating

**Files:**
- Modify: `.github/workflows/android-runtime-qa.yml`

- [ ] Run Android runtime QA automatically on pushes to `main` as well as PRs.
- [ ] Run full PR CI, typecheck, migrations, Android build, and runtime QA.
- [ ] Review the complete diff before merge.
