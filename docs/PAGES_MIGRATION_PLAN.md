# Time+ Pages Origin Migration — Implementation Plan

## Goal
Move the Android shell's primary web origin away from `*.workers.dev` without changing the existing Worker, D1 database, production data, timer logic, or FCM backend.

## Safety model
- Keep the existing `timeplus` Worker and `timeplus.yanivsa.workers.dev` live throughout the migration.
- Deploy a second frontend origin on Cloudflare Pages.
- Proxy API/health/privacy requests from Pages to the existing Worker through a Cloudflare Service Binding.
- Build Android 1.0.3 with Pages as primary origin and the existing Worker as fallback.
- Do not merge to `main` or replace the installed APK until QA passes.

## Implementation phases
1. Pages frontend: build the existing React app from `web/`.
2. Same-origin API proxy: route `/api/*`, `/healthz`, and `/privacy` through `TIMEPLUS_API` Service Binding to Worker `timeplus`.
3. SPA routing: fall back all frontend routes to `/index.html`.
4. Android shell 1.0.3: primary `https://timeplus-app.pages.dev`, fallback `https://timeplus.yanivsa.workers.dev`.
5. Preserve deep links, FCM bridge, cookies/session storage, file chooser, offline screen, and host allowlist.
6. QA gates: Cloudflare Pages deployment success; web/Worker CI success; Android APK build success; health/API/login smoke tests; FCM token registration; notification delivery while backgrounded/closed; notification deep-link open on the Pages origin.
7. Timer behavior is not part of this migration gate; it is unchanged by this work and should be validated only in its separate timer QA.
8. Release only after notification QA. Rollback is immediate by reinstalling 1.0.2 or switching back to the legacy origin before merge.

## Rollback
The existing Worker origin is not modified or removed. Android 1.0.3 includes the legacy origin as a fallback, and 1.0.2 remains compatible with the existing production Worker.
