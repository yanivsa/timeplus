# GOAL — TIME+ FAMILY SCREEN-TIME SYSTEM
## Execution Tracking & Verification Log

### Phase 0: Reference Audit & Analysis
- [x] Clone and inspect `yanivsa/screencontrol-tasks` (reference for task logic, minutes wallet, D1 schema, approvals, gamification report).
- [x] Clone and inspect `yanivsa/hogwarts-geometry-game` (reference for magical theme, night palette, starfield, gold accents, Web Audio feedback).
- [x] Identify architectural anti-patterns to avoid (no D1 binary blob storage, no unverified CORS/Pages split, no plaintext/hardcoded PINs, no coupling to fixed child count).
- [x] Isolate external account capabilities (Cloudflare R2 requires Dashboard enablement; feature flag photo upload accordingly).

### Phase 1: Architecture & Repository
- [x] Verify `yanivsa/timeplus` availability and create private GitHub repository.
- [x] Initialize local git workspace with branch `main` and remote tracking.
- [x] Create comprehensive `.gitignore` preventing secrets, keys, or binaries from entering Git.
- [ ] Define shared workspace structure (`web/`, `worker/`, `android/`, `docs/`, `.github/`).
- [ ] Create initial `README.md` and architecture documentation.

### Phase 2: Worker & D1 Database
- [ ] Create Cloudflare D1 database `timeplus-db`.
- [ ] Author forward-safe SQL schema migrations (`0001_initial_schema.sql`):
  - `families`, `children`, `family_settings`, `sessions`, `task_templates`, `task_template_children`, `task_instances`, `task_submissions`, `minute_transactions`, `screen_time_requests`, `screen_usage_logs`, `child_progress`, `reward_events`, `audit_log`, `notifications`, `login_attempts`.
- [ ] Configure `worker/wrangler.toml` for Cloudflare Worker + Workers Static Assets (Single-Origin SPA + API).
- [ ] Implement database migration runner scripts (local + production).
- [ ] Execute initial production migration on `timeplus-db`.

### Phase 3: Authentication & Security
- [ ] Server-side PIN hashing with cryptographic salt + SHA-256 + secret pepper.
- [ ] Opaque random server-stored sessions with `HttpOnly`, `Secure`, `SameSite` cookies.
- [ ] Anti-brute-force rate limiting and failed attempt logging.
- [ ] Support first-run secure initialization flow without committed credentials.
- [ ] Role-based authorization (`parent` vs `child`) enforced on all Worker endpoints.
- [ ] Protection of private child data from unauthenticated access.

### Phase 4: Core Task & Minute Ledger Backend
- [ ] Timezone handling locked to `Asia/Jerusalem` on server.
- [ ] Task template management (one_time, daily, weekly, custom) and instance generation.
- [ ] Idempotent cron + lazy fallback task instance generation for Israeli local dates.
- [ ] Guarded state transitions: Task submission -> Parent review (approve, modify minutes & approve, reject).
- [ ] Atomic minute ledger transactions (`earn`, `spend`, `adjustment`, `refund`) with rolling balance.
- [ ] Screen-time request flow (request -> approve exact/modified -> deduct -> audit).
- [ ] Manual screen-time usage logging with parent correction/refund mechanism.
- [ ] Negative balance handling (parent-authorized with warning threshold; child cannot independently overspend).
- [ ] Audit logging for all administrative, financial, and security actions.

### Phase 5: Child Web UI
- [ ] Original magical wizard-academy visual theme: night sky, glowing hourglass, stars, gold accents.
- [ ] Hero minute balance display ("כמה דקות יש לי?"), today earned/spent breakdown.
- [ ] Wizard rank, level progress bar, positive streak counter.
- [ ] Daily/recommended tasks list with status indicators (open, pending approval, approved).
- [ ] Task submission modal with notes and optional photo upload (flag-controlled).
- [ ] Screen-time request modal with quick minute buttons and activity source selector.
- [ ] Personal transaction history ledger.

### Phase 6: Parent Web Dashboard
- [ ] Overview cards for all family children (current balance, today earned/spent, active tasks, pending approvals).
- [ ] Pending approval inbox with single-tap quick approve, custom reward adjustment, and rejection.
- [ ] Task management interface: create, edit templates, pause, resume, archive.
- [ ] Manual minute adjustment modal (bonus or deduction with mandatory reason).
- [ ] Manual screen-time usage logger with correction/refund action.
- [ ] Comprehensive immutable financial history with filters.
- [ ] Statistics panel (today, 7 days, 30 days breakdown of minutes and activity).
- [ ] Family settings (debt limits, daily spend limits, sound preferences).

### Phase 7: Gamification & Audio
- [ ] XP and Wizard Ranks (שוליית הזמן, קוסם שעה, אמן הזמן, רב-מג הזמן).
- [ ] Web Audio API synthesizer for restrained, delightful audio cues (tap, submit, reward sparkle, level-up fanfare).
- [ ] Polished `RewardCelebration` modal with animated minute counter and magical particle effects.
- [ ] Positive streak celebration without punitive mechanics.

### Phase 8: Production Web Deployment
- [ ] Build production web assets using Vite + React + TypeScript + Tailwind CSS.
- [ ] Deploy Cloudflare Worker with Workers Static Assets to production.
- [ ] Implement `GET /healthz` and `GET /api/version`.
- [ ] Verify live HTTPS production deployment in browser.

### Phase 9: Android Native Shell
- [ ] Create Kotlin/AndroidX WebView application (`com.yanivsa.timeplus`).
- [ ] Domain allowlist restricted strictly to production Time+ origin.
- [ ] Android back navigation handling.
- [ ] WebChromeClient photo/camera chooser implementation.
- [ ] Branded native offline/error screen with retry functionality.
- [ ] Build installable debug/test APK (`timeplus.apk`).

### Phase 10: End-to-End System QA
- [ ] Authentication tests: parent login, child logins, invalid PINs, lockout.
- [ ] Task lifecycle tests: create -> submit -> approve -> verify single reward.
- [ ] Idempotency tests: double approval retries, double screen-time deduction prevention.
- [ ] Financial ledger tests: adjustments, corrections, refunds, negative balance.
- [ ] Responsive UI verification: 360px, 390px, 412px, tablet, desktop.
- [ ] Automated integration test suite.

### Phase 11: Mandatory Remote-Update Proof
- [ ] Step 1: Install initial APK on device/emulator with marker `REMOTE_UPDATE_TEST=A`.
- [ ] Step 2: Deploy web update with marker `REMOTE_UPDATE_TEST=B` WITHOUT rebuilding APK.
- [ ] Step 3: Resume/reopen same installed APK and verify marker `B` appears.
- [ ] Step 4: Revert QA marker and document proof in `docs/QA_REPORT.md`.

### Phase 12: Visual Polish & RTL Accessibility
- [ ] High-contrast Hebrew RTL typography audit.
- [ ] Touch target sizes (>=44px), keyboard navigation, focus indicators.
- [ ] Wizard academy aesthetic refinement across mobile and desktop layouts.

### Phase 13: Documentation & Release Artifacts
- [ ] Comprehensive `README.md`.
- [ ] `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/QA_REPORT.md`.
- [ ] GitHub Release with installable APK asset and release notes.
