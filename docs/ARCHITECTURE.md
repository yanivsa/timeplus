# TIME+ Architecture & System Design

TIME+ is a production-grade Hebrew RTL screen-time management and gamified habit system designed for Yaniv's family (initially Uri & Eitan, scalable to N children). It runs as both a responsive Web Application and an installable native Android APK.

---

## 1. High-Level Architecture Overview

TIME+ follows a unified single-origin architecture:
- **Cloudflare Workers**: High-performance V8 edge runtime handling routing, authentication, business logic, accounting rules, and API endpoints.
- **Workers Static Assets SPA**: React 18 single-page application compiled into static HTML/CSS/JS bundles and served directly from the same Cloudflare origin as the API (`https://timeplus.yanivsa.workers.dev`).
- **Cloudflare D1 SQL Database**: Distributed SQLite database at the edge (`timeplus-db`), storing immutable ledgers, entities, sessions, and state.
- **Android Native Shell (Kotlin + AndroidX WebView)**: Installable APK (`com.yanivsa.timeplus`) running a hardened full-screen WebView that loads the production origin directly. This architecture guarantees remote updates: any UI or logic update deployed to Cloudflare is instantly available inside the Android APK with zero app-store delays or APK recompilations.

```
+-----------------------------------------------------------------------+
|                              Clients                                  |
|   +--------------------------+       +----------------------------+   |
|   |   Mobile / Desktop Web   |       |    Android Native Shell    |   |
|   |   (Chrome, Safari, etc.) |       |    (com.yanivsa.timeplus)  |   |
|   +-------------+------------+       +-------------+--------------+   |
|                 |                                  |                  |
+-----------------|----------------------------------|------------------+
                  |                                  |
                  v                                  v
+-----------------------------------------------------------------------+
|               Cloudflare Edge (timeplus.yanivsa.workers.dev)          |
|                                                                       |
|   +-------------------------+      +------------------------------+   |
|   |  Workers Static Assets  |      |   Worker Edge API Router     |   |
|   |  - React 18 SPA (RTL)   |      |   - /healthz, /api/version   |   |
|   |  - Wizard Atmosphere    |      |   - /api/auth/* (Sessions)   |   |
|   |  - Web Audio Effects    |      |   - /api/child/*             |   |
|   |  - Tailwind Dark Theme  |      |   - /api/parent/*            |   |
|   +-------------------------+      +--------------+---------------+   |
|                                                   |                   |
+---------------------------------------------------|-------------------+
                                                    |
                                                    v
+-----------------------------------------------------------------------+
|                    Cloudflare D1 Database (timeplus-db)               |
|                                                                       |
|  - parents & children (credentials & metadata)                        |
|  - minute_transactions (append-only ledger)                           |
|  - task_templates & daily_tasks (recurring tasks engine)              |
|  - screen_time_requests (status lifecycle)                            |
|  - sessions & rate_limits (security)                                  |
|  - celebration_events (modal synchronization)                         |
+-----------------------------------------------------------------------+
```

---

## 2. Core Economic Engine & Ledger Integrity

The foundational requirement of TIME+ is that **a screen-time minute is the real economic unit of value**, while gamification (XP, ranks, streaks) is an emotional incentive layer.

### 2.1 Append-Only Ledger (`minute_transactions`)
Minutes are never incremented or decremented via arbitrary counters. Every minute change is recorded in an immutable ledger:

```sql
CREATE TABLE minute_transactions (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    amount INTEGER NOT NULL,          -- Positive (earned) or Negative (spent)
    balance_after INTEGER NOT NULL,    -- Snapshot for O(1) balance lookups
    transaction_type TEXT NOT NULL,    -- 'task_reward', 'screen_spend', 'manual_adjustment', 'refund'
    reference_id TEXT,                 -- daily_task_id or request_id
    note TEXT,
    created_at TEXT NOT NULL
);
```

### 2.2 Balance Invariants
1. **Computed & Snapshot Consistency**: The child's balance in `children.screen_time_balance` always matches `balance_after` of the latest transaction and `COALESCE(SUM(amount), 0)` of all transactions for that child.
2. **Guarded State Transitions**:
   - Tasks transition: `pending` -> `submitted` -> `approved` | `rejected`.
   - Re-approving or clicking twice is idempotent: the database checks `status = 'submitted'` before mutating. A duplicate approval is rejected, preventing double credits.
   - Screen requests transition: `pending` -> `approved` | `rejected`. Deductions happen only on state change from `pending` to `approved`.
3. **Refunds & Compensating Corrections**:
   - Time cannot be deleted from history.
   - If a parent mistakenly enters 60 minutes spent instead of 30, they issue a compensating correction transaction (`refund` or `manual_adjustment`) with an audit note.

---

## 3. Decoupled Gamification System

Gamification is decoupled from the screen-time wallet:
- **Experience Points (XP)**: Earned through good habits and completed tasks. Unlike minutes, XP cannot be "spent" on screen time.
- **Wizard Ranks**: Progression system inspired by a magical wizard academy (original IP, no copyrighted names):
  1. *שוליית קסמים* (Magic Apprentice) — 0 XP
  2. *מכשף שקדן* (Diligent Sorcerer) — 100 XP
  3. *אמן הלחשים* (Spell Master) — 300 XP
  4. *שומר הזמן* (Time Guardian) — 600 XP
  5. *קוסם עליון* (Archmage) — 1,000 XP
  6. *רב-מג הזמן* (Grand Magus of Time) — 2,000 XP
- **Positive Streaks**: Consecutive days of completing at least one task. Streaks motivate consistency and cannot be bought or reset by spending screen time.
- **Celebration Modal & Web Audio API**: When a parent approves a task or screen request, a celebration event is created. On next poll/load, the child client displays a full-screen celebration modal with animated count-up, particle confetti, and synthesized chime sound effects generated in real time using the browser's Web Audio API (zero audio file downloads required).

---

## 4. Timezone & Recurring Task Engine

All dates and daily resets are anchored strictly to **`Asia/Jerusalem`**:
- A dedicated timezone module (`worker/src/timezone.ts`) converts UTC timestamps into Jerusalem calendar dates (`YYYY-MM-DD`).
- **Daily Recurring Task Generation**:
  - Automatically triggered via Cloudflare Cron (`0 3 * * *` UTC / 05:00 or 06:00 Jerusalem time) and verified idempotently on child login.
  - Active task templates generate `daily_tasks` for the current Jerusalem date.
  - Idempotency guard: `INSERT OR IGNORE` ensures tasks are never duplicated if generated multiple times on the same date.

---

## 5. Security & Authentication Architecture

1. **Password Hashing**:
   - Multi-iteration PBKDF2 (SHA-256) with 100,000 iterations.
   - Unique cryptographic salt per user + server-side secret pepper (`SESSION_PEPPER`).
   - Constant-time verification prevents timing attacks.
2. **Session Security**:
   - Random 256-bit cryptographically secure session tokens (`crypto.getRandomValues`).
   - Delivered via `HttpOnly`, `Secure`, `SameSite=Lax` cookies, expiring after 30 days.
   - Role-based authorization (`parent` vs `child`). Child endpoints explicitly block parent endpoints and vice versa.
3. **Child Privacy & Data Isolation**:
   - Children cannot see each other's balances, tasks, or request histories.
   - There are zero public or unauthenticated endpoints that expose child identities, balances, or activity.
4. **Brute Force Protection**:
   - Rate limiting on login attempts per IP and target account.
   - Exponential lockout after repeated incorrect PIN entries.

---

## 6. Android Evergreen Architecture

The native Android app is implemented in Kotlin using AndroidX:
- **Hardened WebView**: Configured with strict host allowlist (`timeplus.yanivsa.workers.dev`). Any navigation outside this domain is delegated to the system browser.
- **Remote Updates**: The APK ships with no bundled static HTML; it renders the live Cloudflare production web app. All UI improvements, bug fixes, and feature additions deployed to Cloudflare are instantly live for all Android users without rebuilding or reinstalling the APK.
- **Resilient Offline Handling**: Includes a pull-to-refresh `SwipeRefreshLayout` and a native offline error screen with retry logic if the device has no internet connection.
- **Security Protections**: Cleartext HTTP is strictly disabled (`android:usesCleartextTraffic="false"`). Secure file picker handles photo evidence uploads safely.
