# Time+ resilient origin migration — implementation plan

## Goal
Remove the Android app's hard dependency on `timeplus.yanivsa.workers.dev` without interrupting the existing production app.

## Architecture
- Existing production Worker `timeplus`: unchanged; remains the API, D1 owner, cron/timer engine and legacy web origin.
- New Cloudflare Pages frontend: serves the React app at `https://timeplus-app.pages.dev`.
- Pages Function: proxies `/api/*`, `/healthz` and `/privacy` to the existing Worker through a Cloudflare Service Binding named `TIMEPLUS_API`.
- Android 1.0.3: primary origin = Pages; automatic fallback = the existing Workers origin.
- Current installed Android 1.0.2: remains untouched until 1.0.3 passes QA.

## Safety controls
1. No D1 migration.
2. No Worker deletion or route replacement.
3. No change to current production URL.
4. New Pages deployment is isolated and reversible.
5. APK version is bumped only on the migration branch.
6. The new APK accepts both the Pages and legacy Worker hostnames.
7. Main-frame load errors on Pages automatically retry the same path on the legacy Worker.
8. Full Play rollout happens only after web/API/auth/origin/FCM QA succeeds. Timer QA remains separate unless timer code is changed by this release.

## QA gate
- Pages root loads.
- `/healthz` and `/api/version` work through the service binding.
- Parent and child login work.
- Session survives app/web reload.
- Wallet balances match production.
- Screen-time request/approval works.
- Cloud-authoritative timer start/pause/resume/stop works.
- FCM token registration and notification deep links work.
- Legacy Worker remains reachable as fallback.
- Android build succeeds in CI.

## Rollback
Do not remove the existing Worker. If Pages has an incident, Android 1.0.3 falls back to the legacy Worker. Android 1.0.2 continues using the legacy Worker exactly as before.


## Provisioned migration resources
- Pages project: `timeplus-app`
- Production URL: `https://timeplus-app.pages.dev`
- Service binding: `TIMEPLUS_API -> timeplus`
- Migration branch: `migration/pages-origin-v1.0.3`


## Full rollout policy
- No one-device canary stage is required for this rollout.
- Complete all automated, emulator, release-signing, origin, auth/session, FCM registration, notification delivery, notification tap/deep-link, fallback, and upgrade/install QA before store upload.
- After every gate passes, publish Android 1.0.3 (versionCode 4) to 100% of the audience on the app's current Google Play track in one rollout.
- Do not create a new app or package; update com.yanivsa.timeplus.
