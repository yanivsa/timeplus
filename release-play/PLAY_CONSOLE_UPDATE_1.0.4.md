# Time+ 1.0.4 — Final Play Release Runbook

## Decision

Do not upload 1.0.3 again. The next Play update is:

- package: `com.yanivsa.timeplus`
- versionName: `1.0.4`
- versionCode: `5`

The native change in 1.0.4 is required for reliable camera and short-video capture from the WebView evidence flow. Normal Time+ web/backend changes remain evergreen and do not require future APK updates.

## Source of truth

Build only from the latest `main` branch.

The private upload keystore is intentionally not committed. Expected local files:

- `/Users/ninja/Documents/Time-Plus/android/keystores/timeplus-upload-key.jks`
- `/Users/ninja/Documents/Time-Plus/android/keystores/keystore.properties`

If either file is missing, STOP. Never generate a replacement key.

Expected upload certificate SHA-256 fingerprint:

`95:BA:F5:D7:A1:38:B6:B2:D8:F0:56:69:56:29:2B:C6:5E:D3:62:E0:08:9A:F1:6E:37:91:9D:F1:66:1D:9C:DA`

If the local keystore fingerprint differs, STOP and do not upload.

## Build

From the Mac that contains the existing Time+ upload key:

```bash
cd /Users/ninja/Documents/Time-Plus
git fetch origin
git checkout main
git pull --ff-only origin main
bash release-play/build-signed-1.0.4.sh
```

Expected signed bundle:

`/Users/ninja/Documents/Time-Plus/android/app/build/outputs/bundle/release/app-release.aab`

The build script verifies the expected upload certificate before building and verifies that the resulting AAB is signed.

## Already verified before local signing

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

Upload the newly locally signed:

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

Use the same Play track currently serving the app's existing audience/testers. After Play validation, release to 100% of that same track unless a Play warning requires intervention.

## Final upload gate

Before upload verify all of the following:

1. `com.yanivsa.timeplus`
2. `versionName=1.0.4`
3. `versionCode=5`
4. AAB signature verification passes.
5. Upload certificate fingerprint exactly matches the documented Time+ upload key.
6. Do not upload the unsigned pre-release artifact from GitHub Actions.

After this 1.0.4 update, ordinary Time+ UI, AI, task rules and backend updates continue remotely without another APK update unless another genuinely native Android capability is added.