#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
ERROR: Do not generate a new Time+ upload key.

Time+ already has an established Google Play upload key. Creating a replacement key here would produce an AAB that does not match the existing Play Console upload certificate.

Use the existing local key instead:
  android/keystores/timeplus-upload-key.jks
  android/keystores/keystore.properties

Expected SHA-256 upload-certificate fingerprint:
  95:BA:F5:D7:A1:38:B6:B2:D8:F0:56:69:56:29:2B:C6:5E:D3:62:E0:08:9A:F1:6E:37:91:9D:F1:66:1D:9C:DA

To build the final 1.0.4 release, run:
  bash release-play/build-signed-1.0.4.sh
EOF

exit 1
