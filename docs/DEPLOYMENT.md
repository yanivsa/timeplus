# TIME+ Deployment & Operations Guide

This guide details how to configure, build, migrate, and deploy TIME+ to Cloudflare and Android devices.

---

## 1. System Requirements & Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Cloudflare Account**: With Workers and D1 enabled
- **Wrangler CLI**: `v3.x` or higher (installed as dev dependency)
- **Java Development Kit (JDK)**: OpenJDK 17
- **Android SDK**: API 34/35 build-tools and platform-tools
- **Git & GitHub CLI (`gh`)**: For repository management and releases

---

## 2. Environment Configuration

### Worker Secrets
TIME+ uses a server-side secret pepper for cryptographically hashing PINs and signing sessions.
Set this secret in Cloudflare Workers using Wrangler:

```bash
cd worker
npx wrangler secret put SESSION_PEPPER
# Enter a secure 64-character random string when prompted
```

### Wrangler Configuration (`worker/wrangler.toml`)
The worker configuration binds the D1 database, static assets, and scheduled triggers:

```toml
name = "timeplus"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "../web/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "timeplus-db"
database_id = "6453bce5-c013-4bff-a34d-52cc4bc991d4"
migrations_dir = "migrations"

[triggers]
crons = ["0 3 * * *"] # 03:00 UTC = 05:00/06:00 Asia/Jerusalem
```

---

## 3. Database Migrations (Cloudflare D1)

Database schema migrations are located in `worker/migrations/`.

### Applying Migrations
To apply migrations to the remote production D1 database:

```bash
cd worker
npx wrangler d1 migrations apply timeplus-db --remote
```

To run migrations locally for development:
```bash
npx wrangler d1 migrations apply timeplus-db --local
```

### Schema Overview
- `parents`: Parent accounts with PBKDF2 hashed PINs and salts.
- `children`: Child profiles, current balance snapshot, XP, streak count, and PIN credentials.
- `minute_transactions`: Append-only ledger recording all earnings, spends, adjustments, and refunds.
- `task_templates`: Recurring task definitions (title, description, minute reward, XP, icon, active status).
- `daily_tasks`: Instances generated each day in `Asia/Jerusalem`, tracking lifecycle (`pending`, `submitted`, `approved`, `rejected`).
- `screen_time_requests`: On-demand screen requests from children with lifecycle tracking.
- `sessions`: Ephemeral token storage for authenticated sessions with expiration.
- `rate_limits`: Brute-force protection counter and lockout tracking per IP and action.
- `celebration_events`: Queue of pending reward celebration modals for children.

---

## 4. Building & Deploying the Web Application & Edge Worker

The web frontend and Cloudflare Worker are deployed together as a single-origin application:

```bash
# 1. Build the React 18 SPA
cd web
npm install
npm run build

# 2. Deploy Worker and Static Assets
cd ../worker
npm install
npx wrangler deploy
```

Once deployed, verify the health status:
```bash
curl https://timeplus.yanivsa.workers.dev/healthz
# Expected: {"status":"healthy","database":"connected","time":"...","timezone":"Asia/Jerusalem"}
```

---

## 5. Android Native Shell (APK)

The Android application is located in `android/`. It embeds a hardened WebView pointing directly to `https://timeplus.yanivsa.workers.dev`.

### Building Debug APK
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Building Release APK
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
# Sign using apksigner with your family production keystore
```

### Remote Updates in Action
Because the Android app functions as a native container loading the production single-origin URL, any web updates deployed via `wrangler deploy` are **immediately active** inside all installed Android APKs upon next app launch or pull-to-refresh.

---

## 6. Maintenance & Operational Monitoring

- **Tail Worker Logs**:
  ```bash
  cd worker
  npx wrangler tail
  ```
- **Query D1 Database**:
  ```bash
  cd worker
  npx wrangler d1 execute timeplus-db --remote --command="SELECT id, name, screen_time_balance, xp, streak_days FROM children;"
  ```
