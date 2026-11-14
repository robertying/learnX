#!/bin/bash
# Xcode build phase of the learnX target ("Configure updates"): writes the
# over-the-air update settings into the app's copy of Expo.plist. The URL and
# Expo project id come from the repo-root .env (OTA_UPDATE_URL,
# EXPO_PROJECT_ID; git-ignored, so the server isn't in the repo), the runtime
# version from app.json and the certificate from certs/ota-certificate.pem.
# Without OTA_UPDATE_URL the build has updates turned off (forks, CI); the
# release lanes refuse to build without it. Android does the same in
# android/app/build.gradle. E2E builds (TEST_LOGIN=1, scripts/e2e-build.sh)
# get the local test server (scripts/ota-e2e-server.mjs), runtime version
# "e2e" and the test certificate from scripts/ota-e2e-cert.sh instead, so they
# never load a published update.
set -euo pipefail

root="$SRCROOT/.."
plist="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/Expo.plist"

# A value from .env, without quotes.
env_value() {
  [ -f "$root/.env" ] || return 0
  sed -n "s/^$1=//p" "$root/.env" | tail -1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

project_id=""
if [ "${TEST_LOGIN:-}" = 1 ]; then
  url="http://localhost:${OTA_E2E_PORT:-8199}/manifest"
  runtime=e2e
  certificate="$root/build/ota-e2e/certificate.pem"
  [ -f "$certificate" ] || "$root/scripts/ota-e2e-cert.sh"
else
  url="$(env_value OTA_UPDATE_URL)"
  project_id="$(env_value EXPO_PROJECT_ID)"
  runtime="$(plutil -extract runtimeVersion raw "$root/app.json")"
  certificate="$root/certs/ota-certificate.pem"
fi

if [ -z "$url" ]; then
  plutil -replace EXUpdatesEnabled -bool NO "$plist"
  echo "Updates: off (no OTA_UPDATE_URL in .env)"
  exit 0
fi

plutil -replace EXUpdatesURL -string "$url" "$plist"
plutil -replace EXUpdatesRuntimeVersion -string "$runtime" "$plist"
plutil -replace EXUpdatesCodeSigningCertificate -string "$(cat "$certificate")" "$plist"
if [ -n "$project_id" ]; then
  plutil -replace EXUpdatesRequestHeaders.expo-app-id -string "$project_id" "$plist"
fi
echo "Updates: $url, runtime version $runtime"
