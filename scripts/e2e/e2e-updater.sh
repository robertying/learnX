#!/bin/bash
# The Android APK updater end to end: updates the installed E2E build
# (scripts/e2e/e2e-build.sh) to newer E2E builds of the same checkout, served by
# the E2E APK mirror (scripts/e2e/updater-e2e-server.mjs), which the build looks
# for updates at. .maestro/updater/notification.yaml first checks the new
# version's notification: none while logged out, then posted on logging in,
# and tapping it opens Settings. .maestro/updater/update.yaml updates to
# 99.0.0: allowing learnX to install apps, a download whose SHA-256 doesn't
# match refused, then the update, with the app in the background while it
# downloads, installed (through Android's confirmation before Android 17). On
# Android 12+,
# .maestro/updater/update-again.yaml then updates to 99.0.1, which Android
# installs without asking, since learnX installed the version it replaces.
# After each, it checks that Android installed that version and names learnX
# as its installer. At the end it puts back the build that was installed
# (reinstalling it, without its data, where Android won't downgrade).
#
#   scripts/e2e/e2e-updater.sh android [dir]
#
# The newer builds are learnX-99.0.0.apk and learnX-99.0.1.apk in dir; without
# one, they're built (-Pe2eVersion, for the ABI of $ANDROID_ABI, default
# arm64-v8a) into build/updater-e2e/apks. Boot one emulator (or set
# MAESTRO_DEVICE), as for scripts/e2e/e2e.sh. UPDATER_E2E_PORT (default 8198) must
# match the build's (services/updateFeed.ts).
set -euo pipefail

platform="${1:-}"
if [ "$platform" != android ]; then
  echo "usage: $0 android [dir]" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

versions=(99.0.0 99.0.1)
apks="${2:-}"
if [ -z "$apks" ]; then
  apks=build/updater-e2e/apks
  abi="${ANDROID_ABI:-arm64-v8a}"
  mkdir -p "$apks"
  # As scripts/e2e/e2e-build.sh builds: TEST_LOGIN, which Gradle doesn't know the
  # JS bundle depends on, so the bundle is made again.
  export TEST_LOGIN=1
  scripts/e2e/ota-e2e-cert.sh
  for version in "${versions[@]}"; do
    (cd android && ./gradlew app:createBundleGithubReleaseJsAndAssets --rerun \
      app:assembleGithubRelease -PciRelease -PreactNativeArchitectures="$abi" \
      -Pe2eVersion="$version")
    cp "android/app/build/outputs/apk/github/release/app-github-$abi-release.apk" \
      "$apks/learnX-$version.apk"
  done
fi
for version in "${versions[@]}"; do
  if [ ! -f "$apks/learnX-$version.apk" ]; then
    echo "No APK at $apks/learnX-$version.apk" >&2
    exit 1
  fi
done

adb_() {
  adb ${MAESTRO_DEVICE:+-s "$MAESTRO_DEVICE"} "$@"
}

package=io.robertying.learnx
port="${UPDATER_E2E_PORT:-8198}"
log=build/updater-e2e/server.log
mkdir -p build/updater-e2e
: >"$log"
server=

# The installed build, to put back afterwards.
original=build/updater-e2e/original.apk
adb_ pull "$(adb_ shell pm path "$package" | sed -n 's/^package://p' | head -1 | tr -d '\r')" "$original" >/dev/null
# shellcheck disable=SC2329 # run by the EXIT trap
restore() {
  kill "$server" 2>/dev/null || true
  if ! adb_ install -r -d "$original" >/dev/null 2>&1; then
    adb_ uninstall "$package" >/dev/null
    adb_ install "$original" >/dev/null
  fi
  echo "Put back the build that was installed"
}
trap restore EXIT

# Serves learnX-<version>.apk as <version>, in place of the one served before.
serve() {
  local version="$1"
  if [ -n "$server" ]; then
    kill "$server" 2>/dev/null || true
    wait "$server" 2>/dev/null || true
  fi
  local lines
  lines="$(wc -l <"$log")"
  node scripts/e2e/updater-e2e-server.mjs "$apks/learnX-$version.apk" \
    --port "$port" --version "$version" >>"$log" 2>&1 &
  server=$!
  for _ in $(seq 1 30); do
    if tail -n +"$((lines + 1))" "$log" | grep -q '^Serving'; then
      break
    fi
    if ! kill -0 "$server" 2>/dev/null; then
      cat "$log" >&2
      exit 1
    fi
    sleep 1
  done
  tail -n +"$((lines + 1))" "$log" | grep '^Serving'
}

# The app asks localhost; the emulator's localhost is its own.
adb_ reverse "tcp:$port" "tcp:$port"

# When Android last installed the app, its version, and which app installed
# it.
last_update() {
  adb_ shell dumpsys package "$package" | sed -n 's/^ *lastUpdateTime=//p' | head -1
}
installed_version() {
  adb_ shell dumpsys package "$package" | sed -n 's/^ *versionName=//p' | head -1 | tr -d '\r'
}
installer() {
  adb_ shell pm list packages -i "$package" | sed -n "s/^package:$package  *installer=//p" | tr -d '\r'
}

# A fresh start: Android asks to allow installing apps again.
adb_ shell appops set "$package" REQUEST_INSTALL_PACKAGES default

check_updated() {
  local before="$1" version="$2" after
  after="$(last_update)"
  if [ "$after" = "$before" ]; then
    echo "The app wasn't updated (last update $after)" >&2
    return 1
  fi
  if [ "$(installed_version)" != "$version" ]; then
    echo "The installed version is $(installed_version), not $version" >&2
    return 1
  fi
  if [ "$(installer)" != "$package" ]; then
    echo "The app's installer is $(installer), not learnX" >&2
    return 1
  fi
  echo "Updated to $version at $after by $(installer)"
}

sdk="$(adb_ shell getprop ro.build.version.sdk | tr -d '\r')"
# From Android 17 on, "Always allow" on the "Install unknown apps" page
# installs without a confirmation.
confirms=true
if [ "$sdk" -ge 37 ]; then
  confirms=false
fi
# Images with the Play Store (Phonesky; google_apis images only have a
# com.android.vending stub, LicenseChecker) have Google Play Protect, which
# offers to scan an app it hasn't seen before it installs. Once the Play Store
# has updated itself, its path only names its split_phonesky_* splits.
play_protect=false
if adb_ shell pm path com.android.vending | grep -qi phonesky; then
  play_protect=true
fi
flow_env=(-e UPDATER_SERVER="http://localhost:$port" -e CONFIRMS="$confirms"
  -e PLAY_PROTECT="$play_protect")

# Updates with the flow `$1` to `$2`.
update() {
  local flow="$1" version="$2" before status=0
  serve "$version"
  before="$(last_update)"
  scripts/e2e/e2e.sh "$platform" "${flow_env[@]}" -e VERSION="$version" \
    "$flow" || status=$?
  if [ "$status" = 0 ]; then
    check_updated "$before" "$version" || status=1
  fi
  return "$status"
}

status=0
serve "${versions[0]}"
scripts/e2e/e2e.sh "$platform" "${flow_env[@]}" -e VERSION="${versions[0]}" \
  .maestro/updater/notification.yaml || status=1
if [ "$status" = 0 ]; then
  update .maestro/updater/update.yaml "${versions[0]}" || status=1
fi
if [ "$status" = 0 ] && [ "$sdk" -ge 31 ]; then
  update .maestro/updater/update-again.yaml "${versions[1]}" || status=1
fi

echo "Server log: $log"
exit "$status"
