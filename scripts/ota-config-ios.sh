#!/bin/bash
# Xcode build phase of the learnX target ("Configure updates"): writes the
# over-the-air update URL, runtime version and code-signing certificate into
# the app's copy of Expo.plist, from app.json and certs/ota-certificate.pem
# (Android reads the same files in android/app/build.gradle). E2E builds
# (TEST_LOGIN=1, scripts/e2e-build.sh) get the local test server
# (scripts/ota-e2e-server.mjs), runtime version "e2e" and the test certificate
# from scripts/ota-e2e-cert.sh instead, so they never load a published update.
set -euo pipefail

root="$SRCROOT/.."
plist="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/Expo.plist"

if [ "${TEST_LOGIN:-}" = 1 ]; then
  url="http://localhost:${OTA_E2E_PORT:-8199}/manifest"
  runtime=e2e
  certificate="$root/build/ota-e2e/certificate.pem"
  [ -f "$certificate" ] || "$root/scripts/ota-e2e-cert.sh"
else
  url="$(plutil -extract updates.url raw "$root/app.json")"
  runtime="$(plutil -extract runtimeVersion raw "$root/app.json")"
  certificate="$root/certs/ota-certificate.pem"
fi

plutil -replace EXUpdatesURL -string "$url" "$plist"
plutil -replace EXUpdatesRuntimeVersion -string "$runtime" "$plist"
plutil -replace EXUpdatesCodeSigningCertificate -string "$(cat "$certificate")" "$plist"
echo "Updates: $url, runtime version $runtime"
