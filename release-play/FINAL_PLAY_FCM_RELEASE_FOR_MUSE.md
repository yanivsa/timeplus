# Time+ — Final Google Play / FCM Release Runbook for Muse

Updated: 2026-10-02

## Goal

Prepare and upload the final native Android release for Time+ with Firebase Cloud Messaging support, then prove that ordinary future product updates are delivered from GitHub -> Cloudflare without another APK/AAB upload.

## Canonical sources

- Repository: https://github.com/yanivsa/timeplus
- Branch: `main`
- Current audited main must include at least commit `4681ec57a94929ce694746d48e7e4fef1ce0d93f`
- Android Gradle config: https://github.com/yanivsa/timeplus/blob/main/android/app/build.gradle
- Android MainActivity: https://github.com/yanivsa/timeplus/blob/main/android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt
- Android manifest: https://github.com/yanivsa/timeplus/blob/main/android/app/src/main/AndroidManifest.xml
- Firebase config: https://github.com/yanivsa/timeplus/blob/main/android/app/google-services.json
- FCM service: https://github.com/yanivsa/timeplus/blob/main/android/app/src/main/java/com/yanivsa/timeplus/TimePlusFirebaseMessagingService.kt
- Worker config: https://github.com/yanivsa/timeplus/blob/main/worker/wrangler.toml
- Play listing/data safety notes: https://github.com/yanivsa/timeplus/blob/main/release-play/STORE_LISTING.md
- Live app: https://timeplus.yanivsa.workers.dev
- Privacy policy: https://timeplus.yanivsa.workers.dev/privacy
- Play Console developer account: https://play.google.com/console/u/0/developers/6657095846037717804

## Current Android identity

- Application/package ID: `com.yanivsa.timeplus`
- compileSdk: `36`
- targetSdk: `36`
- minSdk: `26`
- Repo versionCode: `3`
- Repo versionName: `1.0.2`
- Production URL hard-coded in native shell: `https://timeplus.yanivsa.workers.dev`
- The app is a thin native WebView shell. Web/business/backend changes under `web/**` and `worker/**` are deployed by Cloudflare Workers Builds and do not normally require another Android binary.

## Important: do NOT upload the debug APK

GitHub CI currently produces a debug APK for device QA. It is not the Play release artifact.

The Play artifact must be a **signed release AAB** built from current `main`.

Expected local output after a successful release build:
`android/app/build/outputs/bundle/release/app-release.aab`

## Old release assets — reference only, DO NOT upload again

Release page:
https://github.com/yanivsa/timeplus/releases/tag/v1.0.0

Upload certificate:
https://github.com/yanivsa/timeplus/releases/download/v1.0.0/upload_certificate.pem

Old AABs:
- https://github.com/yanivsa/timeplus/releases/download/v1.0.0/timeplus-v1.0.0-release.aab
- https://github.com/yanivsa/timeplus/releases/download/v1.0.0/timeplus-v1.0.1-release.aab

Critical warning: the two old AAB assets above have the exact same SHA-256
`88fc3849523c68814f90671136415e3e18b284d619851013452ff2479c17786f`.
Therefore the file named v1.0.1 must not be trusted as an actual versionCode-2 build.

## Signing-key situation

The Gradle release config expects these local paths:

- `android/keystores/timeplus-upload-key.jks`
- `android/keystores/keystore.properties`

Both paths are deliberately ignored by Git and are not present in current GitHub or Git history. Never commit the JKS or passwords.

Before building:

1. Open the existing Time+ app in Play Console. Do not create a new app.
2. Go to Play App Signing / App integrity and record:
   - whether Play App Signing is enabled;
   - the current Upload key certificate SHA-1/SHA-256;
   - the highest versionCode already uploaded in any active, draft, testing or production release.
3. Try to locate the original Time+ upload JKS in the user's secure/local files. If found, export its public certificate and prove it matches the Upload key certificate shown by Play Console (and preferably the GitHub `upload_certificate.pem`).
4. If the original private upload key is unavailable and Play App Signing is enabled, generate a new RSA 2048-bit-or-stronger upload key, export its PEM certificate, and use Play Console's **Request upload key reset** flow. Do not continue until Play confirms the new upload certificate is active.
5. If Play App Signing is not enabled and the old private signing key is missing, stop and report the blocker; do not create a new package/app without Yaniv's approval.

## Versioning

Read the highest versionCode from Play Console first.

- If the highest uploaded versionCode is less than 3, keep `versionCode 3`, `versionName "1.0.2"`.
- If Play already contains versionCode 3 or higher, set `versionCode` to highest+1 before building. Update `versionName` sensibly and keep the TimePlusApp user-agent version in `MainActivity.kt` consistent.
- Never reuse an already-uploaded versionCode.

## Release build

Create the local `android/keystores/keystore.properties` expected by Gradle with:
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

Place the matching upload keystore at:
`android/keystores/timeplus-upload-key.jks`

Then build from a clean checkout of current `main`:

```bash
git checkout main
git pull --ff-only
cd android
./gradlew clean bundleRelease --no-daemon
```

The required artifact is:
`android/app/build/outputs/bundle/release/app-release.aab`

Verify before upload:
- package is exactly `com.yanivsa.timeplus`;
- target API is 36;
- versionCode is strictly greater than the current Play version;
- release AAB is signed by the currently registered Play upload key;
- Firebase `google-services.json` is included in the build for package `com.yanivsa.timeplus`;
- the release is not debuggable.

## Play Console upload

Use the existing Time+ application and preferably Internal testing first.

Upload only the newly built signed `app-release.aab`.
Reuse the existing tester list/group from Yaniv's previous internal-testing setup.
Do not upload any `app-debug.apk` artifact.

Review/update Data Safety before submission. The app now includes Firebase Cloud Messaging. Firebase Messaging/Installations can process application version, Firebase user-agent/device metadata and a per-installation Firebase Installation ID. Time+ also stores an FCM token and Android device model for push routing. Do not blindly reuse the old "no third-party data" answers; follow the current Play Console wording and the updated `release-play/STORE_LISTING.md` and live privacy policy.

## Mandatory Play-installed QA before calling this complete

Install Time+ from the Play Internal Testing link, not from a sideloaded debug APK.

Then verify end-to-end:

1. Notification permission is requested/allowed.
2. Login as parent or child.
3. Confirm Cloudflare D1 table `fcm_tokens` receives the device token with the correct role/child mapping.
4. Trigger a real notification-producing action (for example child screen-time request or task submission).
5. Confirm native push arrives when the app is foregrounded, backgrounded, and closed.
6. Tap the notification and confirm it opens the correct parent/child route.
7. Logout and confirm the token is removed from the previous user mapping.
8. Login as the other role and confirm the same device token is re-associated correctly.
9. Confirm no duplicate native notifications are produced for one event.

## Proof that future ordinary updates require no new Play upload

After the Play-installed build passes native push QA, make one harmless visible **web-only** change under `web/**`, push it to `main`, and wait for Cloudflare Workers Builds to succeed.

Without installing any new APK/AAB:
- reopen/reload the already Play-installed app;
- prove the web-only change appears;
- optionally revert the harmless test change and prove the revert appears too.

The service worker currently does not cache application assets, and the Android WebView loads the production URL directly, so normal web deployments are expected to be visible without rebuilding Android.

## Changes that DO require another AAB

Do not promise cloud-only updates for native changes. A new Play binary is required when changing Android-native code/config, including:
- `android/**` source/resources;
- Android permissions or manifest;
- Firebase/native SDK dependencies;
- FCM service/notification-channel native behavior;
- WebView native bridge methods;
- app icon/splash/native UI;
- package/application ID;
- target/min/compile SDK;
- production host hard-coded in MainActivity.

Web UI/business logic, Worker/API logic, D1 migrations and most server-side notification behavior can continue to update through GitHub -> Cloudflare without another Play upload.

## Completion report to Yaniv

Return:
- Play app/package;
- uploaded versionCode/versionName;
- exact signed AAB filename and SHA-256;
- signing certificate SHA-256 and confirmation that Play accepted it;
- track/release status;
- tester opt-in link;
- Play-installed native FCM QA results;
- D1 token registration/unregistration proof;
- cloud-only A→B update proof on the same Play-installed binary;
- any remaining blocker. Do not claim success from build output alone.
