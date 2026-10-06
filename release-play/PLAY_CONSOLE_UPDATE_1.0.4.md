# Time+ 1.0.4 — Final Play Release Runbook

## Decision

Do not upload 1.0.3 again. The next Play update is:

- package: `com.yanivsa.timeplus`
- versionName: `1.0.4`
- versionCode: `5`

The native change in 1.0.4 is required for reliable camera and short-video capture from the WebView evidence flow. Normal Time+ web/backend changes remain evergreen and do not require future APK updates.

## Source of truth

Build only from the latest `main` branch.

Important: the Google Play upload key was reset in October 2026. The retired upload-certificate fingerprint must not be used for future releases. The full currently-active upload-certificate SHA-256 fingerprint shown in Google Play Console is the only signing fingerprint that is authoritative for this release.

The build script therefore does not hardcode the retired fingerprint. Before building, export the complete active fingerprint from Play Console as:

```bash
export TIMEPLUS_EXPECTED_UPLOAD_SHA256='AA:BB:...:ZZ'
```

Use the complete 32-byte SHA-256 fingerprint. Truncated text such as `0A:18:77:98...` is intentionally rejected.

The private active upload keystore is intentionally not committed. If the builder does not have the currently-active post-reset upload key, STOP. Never generate another replacement key without an explicit Play Console key-reset procedure.

## Build

From a machine that contains the currently-active Time+ upload key and `android/keystores/keystore.properties`:

```bash
cd /path/to/timeplus
git fetch origin
git checkout main
git pull --ff-only origin main
export TIMEPLUS_EXPECTED_UPLOAD_SHA256='FULL_ACTIVE_FINGERPRINT_FROM_PLAY_CONSOLE'
bash release-play/build-signed-1.0.4.sh
```

Expected signed bundle:

`android/app/build/outputs/bundle/release/app-release.aab`

The build script verifies:

- package source is on 1.0.4 / versionCode 5,
- the local keystore fingerprint exactly matches the full active Play upload certificate,
- Android lint/tests/release build pass,
- the resulting AAB contains a real JAR signing certificate and `jarsigner` reports `jar verified`.

## Already verified before signing

- Web build: passed.
- Worker typecheck/bundle: passed.
- D1 migrations: applied and schema checked.
- Pages production deployment: succeeded.
- Worker production deployment: succeeded.
- Android release build/lint/unit gates: passed.
- Android runtime smoke on Android 35 emulator: passed.
- `versionName 1.0.4` / `versionCode 5`: configured in `android/app/build.gradle`.
- Pre-release AAB/APK artifact exists, but that cloud artifact is intentionally unsigned and must not be uploaded to Play.

## Google Play

Open the existing Time+ app. Do not create a new application/package.

Do not upload the previously prepared 1.0.3 bundle. Cancel any scheduled 1.0.3 upload attempt.

Upload the newly built and signed:

`android/app/build/outputs/bundle/release/app-release.aab`

Release name:

`1.0.4 (5)`

Recommended Hebrew release notes:

```text
עדכון Time+:
• תמיכה אמינה בצילום תמונה ובווידאו קצר מתוך האפליקציה.
• הוספת מנגנון תיעוד ביצוע למשימות, כולל צילום מסך, תמונה ווידאו.
• שיפורי יציבות, אבטחה והתראות.
• שיפורים במנגנוני זמן המסך והסנכרון.
```

Use the same Play track currently serving the app's existing audience/testers. Respect any upload-key reset activation/cooldown timestamp shown by Play Console. Do not attempt the upload before Play says the new upload key is active.

After Play validation, release to 100% of that same track unless a Play warning requires intervention.

## Final upload gate

Before upload verify all of the following:

1. `com.yanivsa.timeplus`
2. `versionName=1.0.4`
3. `versionCode=5`
4. AAB signature verification passes.
5. The signing certificate exactly matches the FULL active post-reset upload certificate shown in Play Console.
6. Do not upload the unsigned pre-release artifact from GitHub Actions.
7. Do not upload 1.0.3.
8. Do not upload before the Play upload-key activation/cooldown has ended.

After this 1.0.4 update, ordinary Time+ UI, AI, task rules and backend updates continue remotely without another APK update unless another genuinely native Android capability is added.
