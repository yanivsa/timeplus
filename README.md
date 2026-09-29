# TIME+ (Time Plus) — מערכת ניהול זמן מסך ואקדמיית הזמן

**TIME+** is a production-grade, Hebrew-native (RTL) family screen-time management and gamified habit system built specifically for Yaniv's family (initially Uri & Eitan, fully scalable to N children).

It runs as both:
1. **A Responsive Web Application**: Deployed at the edge on Cloudflare Workers + Static Assets SPA (`https://timeplus.yanivsa.workers.dev`).
2. **An Installable Android APK**: Native Kotlin/AndroidX WebView shell (`com.yanivsa.timeplus`) with an evergreen remote update architecture.

---

## 🌟 Live Links & Production Resources

- **Production Web Application**: [https://timeplus.yanivsa.workers.dev](https://timeplus.yanivsa.workers.dev)
- **GitHub Repository**: [https://github.com/yanivsa/timeplus](https://github.com/yanivsa/timeplus)
- **Database (Cloudflare D1)**: `timeplus-db` (`6453bce5-c013-4bff-a34d-52cc4bc991d4`)
- **Integration Test Suite**: `test-suite.ts` (22/22 Automated Tests Passed)
- **QA Verification Report**: [docs/QA_REPORT.md](docs/QA_REPORT.md)

---

## 🛡️ Core Architectural Principles

1. **Screen-Time Minute as Real Economic Currency**:
   - The minute is the actual unit of account.
   - All balance mutations are recorded in an append-only, immutable transaction ledger (`minute_transactions`).
   - Balances are strictly guarded against double-credits and double-deductions via database state checks.
   - Corrections and refunds are issued as compensating ledger entries with mandatory audit notes; history is never deleted.

2. **Decoupled Wizard Academy Gamification**:
   - Original magical atmosphere inspired by wizard schools (clean, original IP; no copyrighted names or assets).
   - Experience Points (XP) and Wizard Ranks (*שוליית קסמים* ➔ *רב-מג הזמן*) incentivize consistent habits.
   - Gamification is strictly decoupled: XP cannot be spent as screen time, and screen time cannot buy ranks.
   - Positive streaks track consecutive daily completions.
   - Celebration modals featuring animated count-up, particle confetti, and Web Audio API synthesizer chimes (zero static audio downloads required).

3. **Strict Privacy & Role Isolation**:
   - Children access only their personal dashboard using their private PIN.
   - No public or unauthenticated endpoints expose child profiles, balances, or task histories.
   - Children cannot view each other's balances or requests.
   - Passwords and PINs are secured with 100,000-iteration PBKDF2 (SHA-256), individual cryptographic salts, and a server-side pepper (`SESSION_PEPPER`).
   - Brute-force rate limiting locks out attackers after 5 failed PIN attempts.

4. **Timezone Accuracy (`Asia/Jerusalem`)**:
   - All business logic, daily recurring task generation, and date resets are anchored strictly to `Asia/Jerusalem` on the server runtime.

5. **Evergreen Android Native Shell**:
   - Hardened AndroidX WebView shell with cleartext HTTP disabled, strict domain allowlist, swipe-to-refresh, file picker integration, and a branded native offline fallback screen.
   - **Remote Updates**: The APK is installed once and automatically renders the latest web application from Cloudflare. Verified end-to-end via an automated A/B test (see [docs/QA_REPORT.md](docs/QA_REPORT.md)).

---

## 📁 Repository Structure

```
/
  README.md                          # Project overview and quickstart
  GOAL.md                            # Comprehensive product specification
  package.json                       # Root scripts and workspace dependencies
  test-suite.ts                      # 22-step automated integration test suite
  docs/
    ARCHITECTURE.md                  # Comprehensive system & ledger design
    DEPLOYMENT.md                    # Cloudflare & Android deployment instructions
    QA_REPORT.md                     # Test matrix, QA results, and update evidence
    SECURITY.md                      # Security, PBKDF2 crypto, and hardening guide
    evidence_step3_markerA.png       # Android remote update proof (Marker A)
    evidence_step5_markerB.png       # Android remote update proof (Marker B)

  web/                               # React 18 + Vite + Tailwind CSS (RTL)
    src/
      components/                    # Reusable UI (Stars, Audio, Modal, Footer)
      context/                       # AuthContext & Session management
      screens/                       # LoginScreen, SetupScreen, Dashboards
      services/                      # API client and Web Audio API synthesizer
    public/                          # Favicons, manifest, icons

  worker/                            # Cloudflare Worker Edge Backend (TypeScript)
    src/
      auth.ts                        # Session management & rate limiting
      crypto.ts                      # PBKDF2 Web Crypto hashing & timing-safe compare
      gamification.ts                # Wizard ranks, XP & streaks
      init.ts                        # First-run setup initialization
      tasks.ts                       # Recurring task engine & lifecycle
      timezone.ts                    # Asia/Jerusalem calendar calculations
      wallet.ts                      # Immutable ledger & request engine
      index.ts                       # Single-origin router & Scheduled cron handler
    migrations/
      0001_initial_schema.sql        # Full D1 SQLite schema (28 queries)

  android/                           # Native Android Shell (Kotlin + AndroidX)
    app/src/main/
      java/com/yanivsa/timeplus/     # MainActivity.kt (Hardened WebView)
      res/                           # Native layouts, icons, branded offline screen
      AndroidManifest.xml            # Cleartext disabled, allowlist, launcher
```

---

## 🚀 Quick Start & Development

### 1. Web Application
```bash
cd web
npm install
npm run dev
```

### 2. Cloudflare Worker Edge Backend
```bash
cd worker
npm install
npx wrangler dev
```

### 3. Apply Remote Database Migrations
```bash
cd worker
npx wrangler d1 migrations apply timeplus-db --remote
```

### 4. Run Automated Integration Test Suite
```bash
# Runs 22 comprehensive tests against live production
npx tsx test-suite.ts
```

### 5. Build Android APK
```bash
cd android
./gradlew assembleDebug
# Generated APK: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📜 Documentation Index

- [Architecture & Ledger Design](docs/ARCHITECTURE.md)
- [Deployment & Operations Guide](docs/DEPLOYMENT.md)
- [Security & Cryptography Controls](docs/SECURITY.md)
- [Quality Assurance & Remote-Update Proof Report](docs/QA_REPORT.md)
