#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
KEYSTORE="$ANDROID_DIR/keystores/timeplus-upload-key.jks"
PROPS="$ANDROID_DIR/keystores/keystore.properties"
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f "$KEYSTORE" ]] || fail "Missing existing active Time+ upload keystore: $KEYSTORE. Do NOT generate a replacement key."
[[ -f "$PROPS" ]] || fail "Missing keystore.properties: $PROPS"
[[ -f "$BUILD_GRADLE" ]] || fail "Missing Android build.gradle"

# The Play upload key was reset in October 2026. Never hardcode the retired fingerprint here.
# The caller must copy the FULL currently-active SHA-256 fingerprint from Play Console.
: "${TIMEPLUS_EXPECTED_UPLOAD_SHA256:?Set TIMEPLUS_EXPECTED_UPLOAD_SHA256 to the FULL active upload-certificate SHA-256 fingerprint shown in Google Play Console}"
EXPECTED_SHA256="$(printf '%s' "$TIMEPLUS_EXPECTED_UPLOAD_SHA256" | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')"

# Refuse truncated or malformed fingerprints such as "0A:18:77:98...".
[[ "$EXPECTED_SHA256" =~ ^([0-9A-F]{2}:){31}[0-9A-F]{2}$ ]] || fail "TIMEPLUS_EXPECTED_UPLOAD_SHA256 must be the complete 32-byte SHA-256 fingerprint, not a truncated value"

grep -Eq 'versionCode[[:space:]]+5([[:space:]]|$)' "$BUILD_GRADLE" || fail "Expected versionCode 5"
grep -Eq 'versionName[[:space:]]+"1\.0\.4"' "$BUILD_GRADLE" || fail "Expected versionName 1.0.4"

get_prop() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); gsub(/\r$/, ""); print; exit }' "$PROPS"
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
  | awk -F': ' '/SHA256:/{print toupper($2); exit}')"

[[ -n "$ACTUAL_SHA256" ]] || fail "Could not read SHA-256 fingerprint from the active upload keystore"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || fail "Upload-key fingerprint mismatch. Play expects $EXPECTED_SHA256 but this keystore is $ACTUAL_SHA256. STOP — do not upload."

echo "Active Play upload-key fingerprint verified: $ACTUAL_SHA256"

cd "$ANDROID_DIR"
chmod +x ./gradlew
./gradlew clean lintRelease testReleaseUnitTest bundleRelease assembleRelease --no-daemon

AAB="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

[[ -f "$AAB" ]] || fail "Signed AAB was not produced: $AAB"

VERIFY_OUTPUT="$(LANG=C jarsigner -verify -verbose -certs "$AAB" 2>&1 || true)"
grep -q 'jar verified\.' <<<"$VERIFY_OUTPUT" || fail "AAB is not cryptographically verified by jarsigner"
unzip -Z1 "$AAB" | grep -Eq '^META-INF/.*\.(RSA|DSA|EC)$' || fail "AAB contains no JAR signing certificate entry"

if command -v apksigner >/dev/null 2>&1 && [[ -f "$APK" ]]; then
  apksigner verify --verbose "$APK" >/dev/null || fail "APK signature verification failed"
fi

echo "OK: Time+ 1.0.4 / versionCode 5 release build completed and signed with the active Play upload key."
echo "AAB: $AAB"
[[ -f "$APK" ]] && echo "APK: $APK"
