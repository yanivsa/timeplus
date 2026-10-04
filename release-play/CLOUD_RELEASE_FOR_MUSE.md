# Time+ 1.0.3 — Cloud-only Play release for Muse

Muse does **not** need access to Yaniv's Mac.

Everything needed for the build is in GitHub. The private upload key must **not** be committed to Git.

## Source

Repository:
https://github.com/yanivsa/timeplus

Branch:
`main`

Package:
`com.yanivsa.timeplus`

Release:
- versionName `1.0.3`
- versionCode `4`

Primary origin:
`https://timeplus-app.pages.dev`

Fallback:
`https://timeplus.yanivsa.workers.dev`

## Files already prepared in Git

- `.github/workflows/build-signed-play-aab.yml`
  Builds the final signed AAB entirely in GitHub Actions.
- `scripts/generate-play-upload-key.sh`
  Generates a new upload key + public PEM certificate when an upload-key reset is required.
- `release-play/PLAY_CONSOLE_UPDATE_1.0.3_FOR_MUSE.md`
  Final Play Console release instructions.
- All Android/Firebase/Cloudflare source is already on `main`.

## Signing path A — original upload key is available somewhere secure

If Muse already has the original Time+ upload keystore and passwords from a secure source, do not reset anything.

Create these GitHub Actions repository secrets:

- `TIMEPLUS_UPLOAD_KEYSTORE_B64`
  Base64 of the existing JKS file.
- `TIMEPLUS_KEYSTORE_PASSWORD`
- `TIMEPLUS_KEY_ALIAS`
- `TIMEPLUS_KEY_PASSWORD`

The JKS must never be committed to the repository.

Then manually run:

GitHub → yanivsa/timeplus → Actions → **Build Signed Play AAB** → Run workflow.

Download artifact:

`timeplus-v1.0.3-signed-play-package`

It contains:
- `timeplus-v1.0.3-release.aab`
- `timeplus-v1.0.3-release.aab.sha256`
- `upload_certificate.pem`

Before Play upload, compare the certificate shown by the workflow with the **Upload key certificate** shown in the existing Time+ Play Console app.

Only continue if they match.

## Signing path B — original upload key is not available

The app has previously been prepared for Play App Signing. If Play Console shows Play App Signing enabled and the original upload key is unavailable, use Google's official **Request upload key reset** process.

Do not change the app signing key.
Only reset the upload key.

In a secure cloud shell/session controlled by Muse:

```bash
git clone https://github.com/yanivsa/timeplus.git
cd timeplus
git checkout main

export TIMEPLUS_KEYSTORE_PASSWORD='USE-A-STRONG-NEW-PASSWORD'
export TIMEPLUS_KEY_PASSWORD='USE-A-STRONG-NEW-PASSWORD'
export TIMEPLUS_KEY_ALIAS='timeplus-upload'

chmod +x scripts/generate-play-upload-key.sh
./scripts/generate-play-upload-key.sh
```

This creates:
- private: `timeplus-upload-key/timeplus-upload-key.jks`
- public: `timeplus-upload-key/upload_certificate.pem`

Never commit the JKS or passwords.

In Google Play Console, open the **existing Time+ app** and go to the Play App Signing page. In the Upload key certificate section choose **Request upload key reset**, then upload the generated `upload_certificate.pem`.

Wait until Play Console confirms the new upload key is active.

Then create the four GitHub Actions secrets listed above using the new key.

For `TIMEPLUS_UPLOAD_KEYSTORE_B64`, encode the JKS:

Linux:
```bash
base64 -w 0 timeplus-upload-key/timeplus-upload-key.jks
```

macOS:
```bash
base64 < timeplus-upload-key/timeplus-upload-key.jks | tr -d '\n'
```

After the secrets are saved, run the **Build Signed Play AAB** workflow and download the signed artifact.

## Google Play upload

Upload:
`timeplus-v1.0.3-release.aab`

to the **existing** Time+ app:
`com.yanivsa.timeplus`

Do not create a new app.

Use the app's existing active release track and roll the update out to 100% of that track's current audience, as requested by Yaniv.

Release name:
`1.0.3 (4)`

Release notes:

```text
שיפור יציבות Time+:
• שיפור טעינת האפליקציה וההתאוששות מתקלות חיבור.
• מעבר לכתובת אפליקציה יציבה יותר.
• שיפור תשתית ההתראות והפתיחה מתוך התראה.
• מנגנון גיבוי אוטומטי במקרה של תקלה בשירות הראשי.
```

## Hard stops

STOP and report instead of publishing if:
- Play App Signing is not enabled and the original private key is unavailable.
- package is not `com.yanivsa.timeplus`.
- versionCode is not `4`.
- Play Console rejects the upload certificate.
- AAB signature verification fails.
- Google Play reports a signing/package/version blocking error.

Do not solve any signing problem by committing a JKS to Git.

## Final report

Return:
1. main commit used,
2. whether original-key or upload-key-reset path was used,
3. Play upload certificate SHA-256,
4. GitHub signed-AAB workflow result,
5. artifact name,
6. Play track used,
7. Play Console warnings/errors,
8. rollout percentage,
9. final status: RELEASED or BLOCKED.
