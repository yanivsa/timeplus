# Time+ 1.0.3 — Final Release Runbook for Muse

## Objective
Ship **one Android update** for the existing Time+ app after all pre-release gates pass.

Do not create a new Play app. Update the existing package:

`com.yanivsa.timeplus`

Release identity:
- versionName: `1.0.3`
- versionCode: `4`
- primary origin: `https://timeplus-app.pages.dev`
- fallback origin: `https://timeplus.yanivsa.workers.dev`

Repository:
- `https://github.com/yanivsa/timeplus`
- PR: #11
- migration branch: `migration/pages-origin-v1.0.3`

## Mandatory release gate
Do not upload to Google Play until all of these are green:
- CI: web build, Worker typecheck, Android build.
- Pre-Release Gate: Android lint, unit tests, release AAB/APK build, package/version checks, Firebase package check, Pages deep-link checks, Service Binding checks, FCM route/auth checks.
- Android Runtime QA: cold launch, Pages origin, no Chromium DNS/error page, no fatal crash, native FCM token acquisition, notification deep-link intent routing for `/child` and `/parent`.
- Cloudflare Pages production deployment: success.
- Cloudflare Worker: existing FCM bindings and D1 binding present.

## Local signing
The private upload keystore is intentionally not committed.

Expected local files:
- `/Users/ninja/Documents/Time-Plus/android/keystores/timeplus-upload-key.jks`
- `/Users/ninja/Documents/Time-Plus/android/keystores/keystore.properties`

If either file is missing, STOP. Never generate a replacement key.

After PR #11 is merged to main:

```bash
cd /Users/ninja/Documents/Time-Plus
git fetch origin
git checkout main
git pull --ff-only origin main
cd android
./gradlew clean lintRelease testReleaseUnitTest bundleRelease assembleRelease --no-daemon
```

Expected signed bundle:
`/Users/ninja/Documents/Time-Plus/android/app/build/outputs/bundle/release/app-release.aab`

Verify before upload:
- package: `com.yanivsa.timeplus`
- versionName: `1.0.3`
- versionCode: `4`
- signed with the existing Time+ upload key.

## Google Play
Open the **existing Time+ application** in Yaniv's Google Play Console.

Do not use Create app.

Create an update on the same current release track used by the existing audience.

Upload:
`android/app/build/outputs/bundle/release/app-release.aab`

Release name:
`1.0.3 (4)`

Release notes (Hebrew):

```text
שיפור יציבות Time+:
• שיפור טעינת האפליקציה וההתאוששות מתקלות חיבור.
• מעבר לכתובת אפליקציה יציבה יותר.
• שיפור תשתית ההתראות והפתיחה מתוך התראה.
• מנגנון גיבוי אוטומטי במקרה של תקלה בשירות הראשי.
```

Rollout request:
- Upload the update only after every gate above is green.
- Release it to **100% of the audience on the app's current Play track in one rollout**.
- Do not create a separate package or a parallel Time+ app.
- Do not promote to a different track unless Yaniv explicitly asks.

## Important expected behavior after upgrade
Because the primary web origin changes from `workers.dev` to `pages.dev`, the old web session is origin-scoped. A user may be asked to log in again once after the Android update. This is expected and is not an APK installation failure.

After login, the native FCM token is registered to the existing backend. Subsequent web/UI changes continue to arrive remotely through Pages without another Android APK update.

## Final evidence to return
Return:
1. final main commit SHA,
2. exact AAB path,
3. signing verification result,
4. package/version verification,
5. Google Play release track,
6. confirmation rollout is 100% on that track,
7. any Play Console warning/error verbatim,
8. final status: RELEASED or BLOCKED.


## Post-merge source of truth
- PR #11 is merged.
- Build the store release from the latest `main` branch only.
- Cloudflare Pages production branch is `main`.
- Before uploading, compare the release signing/upload certificate with the existing Time+ upload certificate. The documented SHA-256 fingerprint is:
  `95:BA:F5:D7:A1:38:B6:B2:D8:F0:56:69:56:29:2B:C6:5E:D3:62:E0:08:9A:F1:6E:37:91:9D:F1:66:1D:9C:DA`
- If the fingerprint differs, STOP and do not upload.
