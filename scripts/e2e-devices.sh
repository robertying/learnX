#!/bin/bash
# Run the Maestro flows on each device setup, one device at a time.
#
#   scripts/e2e-devices.sh [profile ...]     (no profile: all of them)
#
# Profiles:
#   iphone          every flow on the iPhone
#   ipad            every flow on the iPad, portrait
#   ipad-landscape  every flow on the iPad, landscape
#   ipad-windowed   every flow on an iPad set to Windowed Apps, in the
#                   app's default window
#   duo-folded      every flow on the iPhone Duo, closed (outer display)
#   duo-half-open   the posture flows on the iPhone Duo, half open (90°)
#   duo-open        the posture flows on the iPhone Duo, fully open (180°)
#   fold-folded     every flow on the Android foldable, folded
#   fold-unfolded   every flow on the Android foldable, unfolded (the tablet
#                   layout: split views and a side rail)
#
# The flows run on the Release app (what ships: bundled JS, Hermes, R8).
# Install it with scripts/e2e-build.sh first, or set E2E_BUILD=1 to have this
# script build and install it on each device it uses (one iOS build for every
# simulator; DERIVED_DATA as in e2e-build.sh). The script
# boots a device that isn't running and shuts down only the devices it
# booted. It refuses to boot one while E2E_MAX_BOOTED (3) simulators and
# emulators are already running.
#
# Devices, by simulator name or UDID and by AVD name:
#   E2E_IPHONE (learnX iPhone 18 Pro), E2E_IPAD (learnX iPad Pro 11),
#   E2E_IPAD_WINDOWED (learnX iPad Pro 11 Windowed), E2E_DUO (learnX iPhone
#   Duo), E2E_AVD (Pixel_10_Pro_Fold)
# The ipad-windowed and iPhone Duo profiles need the patched Maestro
# (scripts/maestro/build.sh: it finds an app outside the full screen and folds
# the Duo with setFoldPosture): put its bin folder first on PATH.
#
# Results, with Maestro's output and a JUnit report: build/e2e/<profile>/
set -euo pipefail

cd "$(dirname "$0")/.."

all_profiles="iphone ipad ipad-landscape ipad-windowed duo-folded duo-half-open duo-open fold-folded fold-unfolded"
profiles="${*:-$all_profiles}"

iphone="${E2E_IPHONE:-learnX iPhone 18 Pro}"
ipad="${E2E_IPAD:-learnX iPad Pro 11}"
# A second iPad, set to Settings › Multitasking & Gestures › Windowed Apps.
ipad_windowed="${E2E_IPAD_WINDOWED:-learnX iPad Pro 11 Windowed}"
duo="${E2E_DUO:-learnX iPhone Duo}"
avd="${E2E_AVD:-Pixel_10_Pro_Fold}"
build="${E2E_BUILD:-0}"
max_booted="${E2E_MAX_BOOTED:-3}"
ios_app_id="io.robertying.learnX"
android_app_id="io.robertying.learnx"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
out_root="build/e2e"

# The device this script booted ("ios <udid>" or "android <serial>"), shut
# down before the next device boots and on exit.
booted=""
# The iPhone Duo whose hinge this script moved, closed again on exit.
hinge_moved=""
failed=""
passed=""
# Devices the Release app was installed on in this run (E2E_BUILD=1).
installed=""
# The Release app built for the simulators in this run.
ios_app=""
# The UDID or serial of the device the current profile runs on.
device=""

log() { printf '\n==> %s\n' "$*"; }

# Run a command, killing it after $1 seconds (simctl io screenshot can hang).
with_timeout() {
  local secs="$1"
  shift
  "$@" &
  local pid=$!
  local waited=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$waited" -ge "$secs" ]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
    waited=$((waited + 1))
  done
  wait "$pid"
}

booted_count() {
  local sims emulators
  sims="$(xcrun simctl list devices 2>/dev/null | grep -c '(Booted)' || true)"
  emulators="$(adb devices 2>/dev/null | grep -c '^emulator-' || true)"
  echo $((sims + emulators))
}

check_room() {
  if [ "$(booted_count)" -ge "$max_booted" ]; then
    echo "$max_booted simulators/emulators are running already; shut one down or set E2E_MAX_BOOTED" >&2
    return 1
  fi
}

release_device() {
  case "$booted" in
  ios\ *) xcrun simctl shutdown "${booted#ios }" || true ;;
  android\ *) adb -s "${booted#android }" emu kill >/dev/null || true ;;
  esac
  booted=""
}

cleanup() {
  if [ -n "$hinge_moved" ]; then
    set_hinge "$hinge_moved" closed >/dev/null 2>&1 || true
  fi
  release_device
}
trap cleanup EXIT

# With E2E_BUILD=1, build the Release app and install it on device $2 (once
# per run; the iOS build is reused for every simulator).
install_app() {
  if [ "$build" != 1 ] || [[ " $installed " == *" $2 "* ]]; then
    return 0
  fi
  log "Installing the Release app on $2"
  if [ "$1" = ios ] && [ -n "$ios_app" ]; then
    xcrun simctl install "$2" "$ios_app" || return 1
  else
    scripts/e2e-build.sh "$1" "$2" || return 1
    if [ "$1" = ios ]; then
      # Where e2e-build.sh puts it; every simulator takes the same build.
      ios_app="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}/Build/Products/Release-iphonesimulator/learnX.app"
    fi
  fi
  installed="$installed $2"
}

# --- iOS ---------------------------------------------------------------------

sim_udid() {
  if [[ "$1" =~ ^[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}$ ]]; then
    echo "$1"
    return
  fi
  xcrun simctl list devices available | grep -F "    $1 (" |
    grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' | head -n 1
}

# Boot the simulator named $1 if needed and set $device to its UDID. (Not
# printed: a command substitution's subshell would lose $booted.)
use_sim() {
  local udid
  udid="$(sim_udid "$1")"
  device="$udid"
  if [ -z "$udid" ]; then
    echo "no simulator named \"$1\"" >&2
    return 1
  fi
  # One device at a time: shut down the one booted for an earlier profile.
  if [ -n "$booted" ] && [ "$booted" != "ios $udid" ]; then
    release_device
  fi
  if ! xcrun simctl list devices | grep -F "$udid" | grep -q '(Booted)'; then
    check_room || return 1
    log "Booting $1 ($udid)"
    xcrun simctl boot "$udid" || return 1
    booted="ios $udid"
  fi
  xcrun simctl bootstatus "$udid" -b >/dev/null || return 1
  install_app ios "$udid" || return 1
  if ! xcrun simctl get_app_container "$udid" "$ios_app_id" >/dev/null 2>&1; then
    echo "learnX isn't installed on \"$1\"; install the Release app with scripts/e2e-build.sh" >&2
    return 1
  fi
}

# Set the iPhone Duo $1's hinge to $2 (closed, halfFold or flat). The flows
# after it wait for the app's new layout themselves.
set_hinge() {
  local udid="$1" posture="$2"
  log "Hinge: $posture"
  MAESTRO_DEVICE="$udid" scripts/e2e.sh ios -e POSTURE="$posture" \
    --test-output-dir "$out_root/fold" .maestro/subflows/fold.yaml >/dev/null ||
    return 1
  if [ "$posture" = closed ]; then
    hinge_moved=""
  else
    hinge_moved="$udid"
  fi
}

app_running() {
  # Not piped into grep -q: it stops reading at the match, and with pipefail
  # launchctl's SIGPIPE would fail the check.
  local list
  list="$(xcrun simctl spawn "$1" launchctl list 2>/dev/null)" || return 1
  grep -q "UIKitApplication:$ios_app_id" <<<"$list"
}

# Every flow, on simulator $1 in orientation $2.
run_ios_suite() {
  local udid="$1" orientation="$2" out="$3"
  MAESTRO_DEVICE="$udid" E2E_ORIENTATION="$orientation" scripts/e2e.sh ios \
    --format junit --output "$out/report.xml" --test-output-dir "$out"
}

# Log in on the closed Duo, then run each posture flow: it opens its screen
# while closed (iOS asks before opening a link, and nothing can tap on the
# inner display) and opens the Duo to $2. Saves the inner display after each.
run_duo_postures() {
  local udid="$1" posture="$2" out="$3" flow name status=0
  set_hinge "$udid" closed || return 1
  # A fresh install first where the login subflow doesn't make one itself.
  if [ -f .maestro/00_reset.yaml ]; then
    MAESTRO_DEVICE="$udid" scripts/e2e.sh ios --test-output-dir "$out/reset" \
      .maestro/00_reset.yaml || return 1
  fi
  MAESTRO_DEVICE="$udid" scripts/e2e.sh ios --test-output-dir "$out/login" \
    .maestro/subflows/login.yaml || return 1
  hinge_moved="$udid"
  for flow in .maestro/postures/*.yaml; do
    name="$(basename "$flow" .yaml)"
    log "$name"
    if ! MAESTRO_DEVICE="$udid" scripts/e2e.sh ios -e OPEN_POSTURE="$posture" \
      --test-output-dir "$out/$name" "$flow"; then
      status=1
    fi
    # Display 3 is the inner display (1 is the outer one).
    with_timeout 30 xcrun simctl io "$udid" screenshot --display=3 \
      "$out/$name.png" >/dev/null 2>&1 ||
      echo "screenshot of $name failed" >&2
    if ! app_running "$udid"; then
      echo "learnX stopped running after $name" >&2
      return 1
    fi
  done
  set_hinge "$udid" closed || return 1
  # A failed flow can leave the system's "Open in learnX?" prompt up, which
  # Maestro can't see; restart the simulator so the next run starts clean.
  if [ "$status" != 0 ]; then
    xcrun simctl shutdown "$udid" || true
    xcrun simctl boot "$udid" || return 1
    xcrun simctl bootstatus "$udid" >/dev/null || return 1
  fi
  return "$status"
}

# --- Android -----------------------------------------------------------------

emulator_serial() {
  local serial
  for serial in $(adb devices | awk '/^emulator-[0-9]+\tdevice$/ { print $1 }'); do
    if [ "$(adb -s "$serial" emu avd name 2>/dev/null | head -n 1 | tr -d '\r')" = "$1" ]; then
      echo "$serial"
      return
    fi
  done
}

# Boot the AVD named $1 if needed and set $device to its serial.
use_emulator() {
  local serial waited=0
  serial="$(emulator_serial "$1")"
  if [ -n "$booted" ] && [ "$booted" != "android $serial" ]; then
    release_device
  fi
  if [ -z "$serial" ]; then
    check_room || return 1
    log "Booting $1"
    mkdir -p "$out_root"
    "$sdk/emulator/emulator" -avd "$1" -no-snapshot-save -no-boot-anim \
      >"$out_root/emulator.log" 2>&1 &
    while [ -z "$serial" ]; do
      if [ "$waited" -ge 180 ]; then
        echo "$1 didn't start; see $out_root/emulator.log" >&2
        return 1
      fi
      sleep 2
      waited=$((waited + 2))
      serial="$(emulator_serial "$1")"
    done
    booted="android $serial"
  fi
  device="$serial"
  # Expanded on the device, not here.
  # shellcheck disable=SC2016
  adb -s "$serial" wait-for-device shell \
    'while [ "$(getprop sys.boot_completed)" != 1 ]; do sleep 1; done' ||
    return 1
  install_app android "$serial" || return 1
  if ! adb -s "$serial" shell pm path "$android_app_id" | grep -q '^package:'; then
    echo "learnX isn't installed on $1; install the Release app with scripts/e2e-build.sh" >&2
    return 1
  fi
}

run_android_suite() {
  local serial="$1" state="$2" out="$3"
  log "Posture: $state"
  adb -s "$serial" emu "$state" >/dev/null || return 1
  sleep 3
  MAESTRO_DEVICE="$serial" scripts/e2e.sh android \
    --format junit --output "$out/report.xml" --test-output-dir "$out"
}

# --- Profiles ----------------------------------------------------------------

run_profile() {
  local profile="$1" out="$out_root/$1"
  rm -rf "$out"
  mkdir -p "$out"
  # set -e is off inside a function called from an if, so each step that
  # can fail ends the profile with || return.
  case "$profile" in
  iphone)
    use_sim "$iphone" || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  ipad)
    use_sim "$ipad" || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  ipad-windowed)
    use_sim "$ipad_windowed" || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  ipad-landscape)
    use_sim "$ipad" || return 1
    run_ios_suite "$device" LANDSCAPE_LEFT "$out"
    ;;
  duo-folded)
    use_sim "$duo" || return 1
    set_hinge "$device" closed || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  duo-half-open)
    use_sim "$duo" || return 1
    run_duo_postures "$device" halfFold "$out"
    ;;
  duo-open)
    use_sim "$duo" || return 1
    run_duo_postures "$device" flat "$out"
    ;;
  fold-folded)
    use_emulator "$avd" || return 1
    run_android_suite "$device" fold "$out"
    ;;
  fold-unfolded)
    use_emulator "$avd" || return 1
    run_android_suite "$device" unfold "$out"
    ;;
  *)
    echo "unknown profile \"$profile\" (one of: $all_profiles)" >&2
    return 2
    ;;
  esac
}

for profile in $profiles; do
  log "Profile: $profile"
  if run_profile "$profile"; then
    passed="$passed $profile"
  else
    failed="$failed $profile"
  fi
done

log "Passed:${passed:- none}"
if [ -n "$failed" ]; then
  echo "Failed:$failed (see $out_root/<profile>)" >&2
  exit 1
fi
