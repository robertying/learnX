#!/bin/bash
# Makes the code-signing key and certificate that E2E builds trust for
# over-the-air updates, in build/ota-e2e/ (git-ignored), unless they exist.
# scripts/ota-e2e-server.mjs signs with the key; scripts/ota-config-ios.sh and
# android/app/build.gradle build the certificate into E2E builds instead of
# certs/ota-certificate.pem. Store builds never trust it.
set -euo pipefail

dir="$(cd "$(dirname "$0")/.." && pwd)/build/ota-e2e"
if [ -f "$dir/certificate.pem" ] && [ -f "$dir/private-key.pem" ]; then
  exit 0
fi
mkdir -p "$dir"
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout "$dir/private-key.pem" -out "$dir/certificate.pem" \
  -subj "/CN=learnX E2E" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=critical,codeSigning" 2>/dev/null
echo "Made $dir/certificate.pem"
