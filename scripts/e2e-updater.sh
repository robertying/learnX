#!/bin/bash
# The Android APK updater end to end: starts the E2E APK mirror
# (scripts/updater-e2e-server.mjs), which serves the installed E2E build's own
# APK as version 99.0.0, and runs .maestro/updater/update.yaml against that
# build (scripts/e2e-build.sh), which looks for updates there: allowing learnX
# to install apps, a download whose SHA-256 doesn't match refused, then the
# update installed (through Android's confirmation before Android 17). Then
# checks that Android replaced the app and now names learnX as its installer.
# On Android 12+ it updates once more with .maestro/updater/update-again.yaml,
# which Android installs without asking, since learnX installed the version it
# replaces.
#
#   scripts/e2e-updater.sh android [apk]
#
# The APK defaults to the one scripts/e2e-build.sh built
# (android/app/build/outputs/apk/github/release/app-github-<ANDROID_ABI>-release.apk);
# it must be the installed build. Boot one emulator (or set MAESTRO_DEVICE), as
# for scripts/e2e.sh. UPDATER_E2E_PORT (default 8198) must match the build's
# (helpers/update.ts).
set -euo pipefail

platform="${1:-}"
if [ "$platform" != android ]; then
  echo "usage: $0 android [apk]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

apk="${2:-android/app/build/outputs/apk/github/release/app-github-${ANDROID_ABI:-arm64-v8a}-release.apk}"
if [ ! -f "$apk" ]; then
  echo "No APK at $apk: build it with scripts/e2e-build.sh android <serial>" >&2
  exit 1
fi

adb_() {
  adb ${MAESTRO_DEVICE:+-s "$MAESTRO_DEVICE"} "$@"
}

package=io.robertying.learnx
port="${UPDATER_E2E_PORT:-8198}"
log=build/updater-e2e/server.log
mkdir -p build/updater-e2e
node scripts/updater-e2e-server.mjs "$apk" --port "$port" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if grep -q '^Serving' "$log"; then
    break
  fi
  if ! kill -0 "$server" 2>/dev/null; then
    cat "$log" >&2
    exit 1
  fi
  sleep 1
done
grep '^Serving' "$log"

# The app asks localhost; the emulator's localhost is its own.
adb_ reverse "tcp:$port" "tcp:$port"

# When Android last installed the app, and which app installed it.
last_update() {
  adb_ shell dumpsys package "$package" | sed -n 's/^ *lastUpdateTime=//p' | head -1
}
installer() {
  adb_ shell pm list packages -i "$package" | sed -n "s/^package:$package  *installer=//p" | tr -d '\r'
}

# A fresh start: Android asks to allow installing apps again.
adb_ shell appops set "$package" REQUEST_INSTALL_PACKAGES default

check_updated() {
  local before="$1" after
  after="$(last_update)"
  if [ "$after" = "$before" ]; then
    echo "The app wasn't updated (last update $after)" >&2
    return 1
  fi
  if [ "$(installer)" != "$package" ]; then
    echo "The app's installer is $(installer), not learnX" >&2
    return 1
  fi
  echo "Updated at $after by $(installer)"
}

sdk="$(adb_ shell getprop ro.build.version.sdk | tr -d '\r')"
# From Android 17 on, "Always allow" on the "Install unknown apps" page
# installs without a confirmation.
confirms=true
if [ "$sdk" -ge 37 ]; then
  confirms=false
fi
# Images with the Play Store have Google Play Protect, which offers to scan an
# app it hasn't seen before it installs.
play_protect=false
if adb_ shell pm path com.android.vending >/dev/null 2>&1; then
  play_protect=true
fi
flow_env=(-e UPDATER_SERVER="http://localhost:$port" -e CONFIRMS="$confirms"
  -e PLAY_PROTECT="$play_protect")

status=0
before="$(last_update)"
scripts/e2e.sh "$platform" "${flow_env[@]}" \
  .maestro/updater/update.yaml || status=$?
if [ "$status" = 0 ]; then
  check_updated "$before" || status=1
fi

if [ "$status" = 0 ] && [ "$sdk" -ge 31 ]; then
  before="$(last_update)"
  scripts/e2e.sh "$platform" "${flow_env[@]}" \
    .maestro/updater/update-again.yaml || status=$?
  if [ "$status" = 0 ]; then
    check_updated "$before" || status=1
  fi
fi

echo "Server log: $log"
exit "$status"
