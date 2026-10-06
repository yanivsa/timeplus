#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
KEYSTORE="$ANDROID_DIR/keystores/timeplus-upload-key.jks"
PROPS="$ANDROID_DIR/keystores/keystore.properties"
EXPECTED_SHA256="95:BA:F5:D7:A1:38:B6:B2:D8:F0:56:69:56:29:2B:C6:5E:D3:62:E0:08:9A:F1:6E:37:91:9D:F1:66:1D:9C:DA"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f "$KEYSTORE" ]] || fail "Missing existing Time+ upload keystore: $KEYSTORE. Do NOT generate a replacement key."
[[ -f "$PROPS" ]] || fail "Missing keystore.properties: $PROPS"

get_prop() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$PROPS"
}

KEYSTORE_PASSWORD="$(get_prop KEYSTORE_PASSWORD)"
KEY_ALIAS="$(get_prop KEY_ALIAS)"
KEY_PASSWORD="$(get_prop KEY_PASSWORD)"

[[ -n "$KEYSTORE_PASSWORD" ]] || fail "KEYSTORE_PASSWORD is missing"
[[ -n "$KEY_ALIAS" ]] || fail "KEY_ALIAS is missing"
[[ -n "$KEY_PASSWORD" ]] || fail "KEY_PASSWORD is missing"

ACTUAL_SHA256="$(keytool -list -v \
  -keystore "$KEYSTORE" \
  -alias "$KEY_ALIAS" \
  -storepass "$KEYSTORE_PASSWORD" 2>/dev/null \
  | awk -F': ' '/SHA256:/{print $2; exit}')"

[[ -n "$ACTUAL_SHA256" ]] || fail "Could not read SHA-256 fingerprint from the existing upload keystore"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || fail "Upload-key fingerprint mismatch. Expected $EXPECTED_SHA256 but got $ACTUAL_SHA256. STOP — do not upload."

echo "Upload-key fingerprint verified: $ACTUAL_SHA256"

cd "$ANDROID_DIR"
chmod +x ./gradlew
./gradlew clean lintRelease testReleaseUnitTest bundleRelease assembleRelease --no-daemon

AAB="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

[[ -f "$AAB" ]] || fail "Signed AAB was not produced: $AAB"

if ! jarsigner -verify "$AAB" >/dev/null 2>&1; then
  fail "AAB signature verification failed"
fi

if command -v apksigner >/dev/null 2>&1 && [[ -f "$APK" ]]; then
  apksigner verify --verbose "$APK" >/dev/null || fail "APK signature verification failed"
fi

echo "OK: Time+ 1.0.4 / versionCode 5 release build completed and signed with the existing upload key."
echo "AAB: $AAB"
[[ -f "$APK" ]] && echo "APK: $APK"
