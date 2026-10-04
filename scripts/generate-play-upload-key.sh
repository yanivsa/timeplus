#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-$PWD/timeplus-upload-key}"
mkdir -p "$OUT_DIR"

: "${TIMEPLUS_KEYSTORE_PASSWORD:?Set TIMEPLUS_KEYSTORE_PASSWORD}"
: "${TIMEPLUS_KEY_PASSWORD:?Set TIMEPLUS_KEY_PASSWORD}"
TIMEPLUS_KEY_ALIAS="${TIMEPLUS_KEY_ALIAS:-timeplus-upload}"

JKS="$OUT_DIR/timeplus-upload-key.jks"
PEM="$OUT_DIR/upload_certificate.pem"

if [[ -e "$JKS" || -e "$PEM" ]]; then
  echo "Refusing to overwrite existing key material in $OUT_DIR" >&2
  exit 1
fi

keytool -genkeypair   -v   -keystore "$JKS"   -storepass "$TIMEPLUS_KEYSTORE_PASSWORD"   -keypass "$TIMEPLUS_KEY_PASSWORD"   -alias "$TIMEPLUS_KEY_ALIAS"   -keyalg RSA   -keysize 4096   -validity 10000   -dname "CN=TimePlus Upload, OU=Android, O=YanivSA, C=IL"

keytool -export -rfc   -keystore "$JKS"   -storepass "$TIMEPLUS_KEYSTORE_PASSWORD"   -alias "$TIMEPLUS_KEY_ALIAS"   -file "$PEM"

echo
echo "Generated:"
echo "  Private upload keystore: $JKS"
echo "  Public certificate:      $PEM"
echo
echo "SHA-256 certificate fingerprint:"
keytool -list -v   -keystore "$JKS"   -storepass "$TIMEPLUS_KEYSTORE_PASSWORD"   -alias "$TIMEPLUS_KEY_ALIAS"   | grep 'SHA256:'
echo
echo "IMPORTANT: Never commit the .jks file or passwords to Git."
