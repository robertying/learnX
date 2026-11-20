#!/bin/bash
# Run the Maestro flows on each device setup, one device at a time, and the
# iOS UI tests (ios/learnXUITests/iOS) on the iPhone and the iPad.
#
#   scripts/e2e/e2e-devices.sh [profile ...]     (no profile: all of them)
#
# Profiles:
#   iphone          every flow and the iOS UI tests on the iPhone
#   ipad            every flow and the iOS UI tests on the iPad, portrait
#   ipad-landscape  every flow on the iPad, landscape
#   ipad-windowed   every flow on an iPad set to Windowed Apps, in the
#                   app's default window
#   duo-folded      every flow on the iPhone Duo, closed (outer display)
#   duo-half-open   every flow on the iPhone Duo, half open (90°)
#   duo-open        every flow on the iPhone Duo, fully open (180°), where
#                   the inner display has the split layout
#   fold-folded     every flow on the Android foldable, folded
#   fold-unfolded   every flow on the Android foldable, unfolded (the tablet
#                   layout: split views and a side rail)
#   iphone-min      every flow on an iPhone on the oldest iOS the app
#                   supports (IPHONEOS_DEPLOYMENT_TARGET; the closest
#                   simulator is iOS 17.5, which scripts/e2e/e2e-build.sh
#                   builds for), in Chinese
#   android-min     every flow on a phone emulator on the oldest Android the
#                   app supports (minSdkVersion, API 29), in Chinese
# The -min profiles aren't in the default run: name them. They're local only.
#
# The flows run on the Release app (what ships: bundled JS, Hermes, R8).
# Install it with scripts/e2e/e2e-build.sh first, or set E2E_BUILD=1 to have this
# script build and install it on each device it uses (one iOS build for every
# simulator; DERIVED_DATA as in e2e-build.sh). The script
# boots a device that isn't running and shuts down only the devices it
# booted. It refuses to boot one while E2E_MAX_BOOTED (3) simulators and
# emulators are already running.
#
# Devices, by simulator name or UDID and by AVD name, each needed only by the
# profiles that use it (a profile whose device isn't set fails):
#   E2E_IPHONE         an iPhone (iphone)
#   E2E_IPAD           an iPad (ipad, ipad-landscape)
#   E2E_IPAD_WINDOWED  a second iPad, set to Settings > Multitasking &
#                      Gestures > Windowed Apps (ipad-windowed)
#   E2E_DUO            an iPhone Duo (duo-*)
#   E2E_AVD            a foldable emulator, such as a Pixel Fold (fold-*)
#   E2E_IPHONE_MIN     an iPhone on the iOS 17.5 runtime (iphone-min)
#   E2E_AVD_MIN        a phone emulator on API 29 (android-min)
# The iOS profiles and android-min need the patched Maestro, and the fold
# profiles also zoom a PDF with it (scripts/e2e/maestro/README.md says what
# each patch is for): put its bin folder first on PATH.
#
# E2E_SCREENSHOTS=1 saves each profile's screenshots (scripts/e2e/e2e.sh) to
# its results' screenshots/ folder.
#
# E2E_PARALLEL=1 runs the Android profiles beside the iOS ones, one emulator
# and one simulator at a time, each line of output starting with its side
# ([ios], [android]). Maestro runs on both at once fine, unlike on two
# simulators. Not with E2E_BUILD=1: an emulator can stop answering while
# Xcode or Gradle builds beside it, so install the builds first.
#
# Results, with Maestro's output and a JUnit report:
# build/e2e/devices/<run start time>/<profile>/. A run keeps the earlier ones'
# results (failure screenshots included); only the latest $E2E_KEEP_RUNS
# (10) runs are kept.
set -euo pipefail

cd "$(dirname "$0")/../.."
# shellcheck source=scripts/lib/derived-data.sh
. scripts/lib/derived-data.sh

all_profiles="iphone ipad ipad-landscape ipad-windowed duo-folded duo-half-open duo-open fold-folded fold-unfolded"
profiles="${*:-$all_profiles}"

iphone="${E2E_IPHONE:-}"
ipad="${E2E_IPAD:-}"
ipad_windowed="${E2E_IPAD_WINDOWED:-}"
duo="${E2E_DUO:-}"
avd="${E2E_AVD:-}"
iphone_min="${E2E_IPHONE_MIN:-}"
avd_min="${E2E_AVD_MIN:-}"
build="${E2E_BUILD:-0}"
parallel="${E2E_PARALLEL:-0}"
max_booted="${E2E_MAX_BOOTED:-3}"
ios_app_id="io.robertying.learnX"
android_app_id="io.robertying.learnx"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
runs_root="build/e2e/devices"
out_root="$runs_root/$(date +%Y-%m-%d_%H%M%S)"
keep_runs="${E2E_KEEP_RUNS:-10}"

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
ios_built=false
# The UDID or serial of the device the current profile runs on.
device=""

# The screenshots folder for results folder $1, when E2E_SCREENSHOTS is on.
shots() {
  case "${E2E_SCREENSHOTS:-}" in
  "" | 0) ;;
  *) echo "$PWD/$1/screenshots" ;;
  esac
}

log() { printf '\n==> %s\n' "$*"; }

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

# Where e2e-build.sh builds the iOS app.
ios_derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}"

# With E2E_BUILD=1, build the Release app and install it on device $2 (once
# per run; the iOS build is reused for every simulator).
install_app() {
  if [ "$build" != 1 ] || [[ " $installed " == *" $2 "* ]]; then
    return 0
  fi
  log "Installing the Release app on $2"
  # Every simulator takes the iOS build e2e-build.sh made for the first,
  # unless another checkout has built over it since (scripts/lib/derived-data.sh).
  if [ "$1" = ios ] && [ "$ios_built" = true ] &&
    with_derived_lock "$ios_derived" install_built "$ios_derived" "$2"; then
    :
  else
    scripts/e2e/e2e-build.sh "$1" "$2" || return 1
    if [ "$1" = ios ]; then
      ios_built=true
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

# Boot simulator $1 (a name or UDID, from variable $2) if needed and set
# $device to its UDID. (Not printed: a command substitution's subshell would
# lose $booted.)
use_sim() {
  local udid
  if [ -z "$1" ]; then
    echo "set $2 to the simulator's name or UDID" >&2
    return 1
  fi
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
    echo "learnX isn't installed on \"$1\"; install the Release app with scripts/e2e/e2e-build.sh" >&2
    return 1
  fi
}

# Set the iPhone Duo $1's hinge to $2 (closed, halfFold or flat). The flows
# after it wait for the app's new layout themselves.
set_hinge() {
  local udid="$1" posture="$2"
  log "Hinge: $posture"
  MAESTRO_DEVICE="$udid" scripts/e2e/e2e.sh ios -e POSTURE="$posture" \
    --test-output-dir "$out_root/fold" .maestro/subflows/fold.yaml >/dev/null ||
    return 1
  if [ "$posture" = closed ]; then
    hinge_moved=""
  else
    hinge_moved="$udid"
  fi
}

# Every flow, on simulator $1 in orientation $2, then the UI tests
# (ios/learnXUITests/iOS) when $4 is 1: on the iPhone and the iPad, the
# devices they're for (they set the orientation themselves). E2E_DUO_POSTURE
# tells the flows the iPhone Duo is open (scripts/e2e/e2e.sh).
run_ios_suite() {
  local udid="$1" orientation="$2" out="$3" ui="${4:-0}"
  MAESTRO_DEVICE="$udid" E2E_ORIENTATION="$orientation" E2E_UI_TESTS="$ui" \
    E2E_SCREENSHOTS="$(shots "$out")" \
    E2E_UI_RESULT="$out/ui.xcresult" scripts/e2e/e2e.sh ios \
    --format junit --output "$out/report.xml" --test-output-dir "$out"
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

# Boot the AVD named $1 (from variable $2) if needed and set $device to its
# serial.
use_emulator() {
  local serial waited=0
  if [ -z "$1" ]; then
    echo "set $2 to the emulator's AVD name" >&2
    return 1
  fi
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
    echo "learnX isn't installed on $1; install the Release app with scripts/e2e/e2e-build.sh" >&2
    return 1
  fi
}

# Every flow on emulator $1, first folded or unfolded as $2 says (fold,
# unfold; empty for a phone).
run_android_suite() {
  local serial="$1" state="$2" out="$3"
  if [ -n "$state" ]; then
    log "Posture: $state"
    adb -s "$serial" emu "$state" >/dev/null || return 1
    sleep 3
  fi
  MAESTRO_DEVICE="$serial" E2E_SCREENSHOTS="$(shots "$out")" scripts/e2e/e2e.sh android \
    --format junit --output "$out/report.xml" --test-output-dir "$out"
}

# --- Profiles ----------------------------------------------------------------

run_profile() {
  local profile="$1" out="$out_root/$1"
  mkdir -p "$out"
  # set -e is off inside a function called from an if, so each step that
  # can fail ends the profile with || return.
  case "$profile" in
  iphone)
    use_sim "$iphone" E2E_IPHONE || return 1
    run_ios_suite "$device" PORTRAIT "$out" 1
    ;;
  ipad)
    use_sim "$ipad" E2E_IPAD || return 1
    run_ios_suite "$device" PORTRAIT "$out" 1
    ;;
  ipad-windowed)
    use_sim "$ipad_windowed" E2E_IPAD_WINDOWED || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  ipad-landscape)
    use_sim "$ipad" E2E_IPAD || return 1
    run_ios_suite "$device" LANDSCAPE_LEFT "$out"
    ;;
  duo-folded)
    use_sim "$duo" E2E_DUO || return 1
    set_hinge "$device" closed || return 1
    run_ios_suite "$device" PORTRAIT "$out"
    ;;
  duo-half-open)
    use_sim "$duo" E2E_DUO || return 1
    set_hinge "$device" halfFold || return 1
    E2E_DUO_POSTURE=halfFold run_ios_suite "$device" PORTRAIT "$out"
    ;;
  duo-open)
    use_sim "$duo" E2E_DUO || return 1
    set_hinge "$device" flat || return 1
    E2E_DUO_POSTURE=flat run_ios_suite "$device" PORTRAIT "$out"
    ;;
  fold-folded)
    use_emulator "$avd" E2E_AVD || return 1
    run_android_suite "$device" fold "$out"
    ;;
  fold-unfolded)
    use_emulator "$avd" E2E_AVD || return 1
    run_android_suite "$device" unfold "$out"
    ;;
  iphone-min)
    use_sim "$iphone_min" E2E_IPHONE_MIN || return 1
    E2E_LANGUAGE=zh-Hans run_ios_suite "$device" PORTRAIT "$out"
    ;;
  android-min)
    use_emulator "$avd_min" E2E_AVD_MIN || return 1
    MAESTRO_DEVICE="$device" scripts/e2e/android-locale.sh zh-CN || return 1
    run_android_suite "$device" "" "$out"
    ;;
  *)
    echo "unknown profile \"$profile\" (one of: $all_profiles iphone-min android-min)" >&2
    return 2
    ;;
  esac
}

# Drop the oldest runs' results, keeping the latest keep_runs with this one.
mkdir -p "$out_root"
find "$runs_root" -mindepth 1 -maxdepth 1 -type d | sort |
  awk -v keep="$keep_runs" '{ runs[NR] = $0 } END { for (i = 1; i <= NR - keep; i++) print runs[i] }' |
  while IFS= read -r old; do rm -rf "$old"; done

# Run profiles $@ one after another, adding each to passed or failed.
run_profiles() {
  local profile
  for profile in "$@"; do
    log "Profile: $profile"
    if run_profile "$profile"; then
      passed="$passed $profile"
    else
      failed="$failed $profile"
    fi
  done
}

if [ "$parallel" = 1 ]; then
  if [ "$build" = 1 ]; then
    echo "E2E_PARALLEL=1 doesn't build: install the builds with scripts/e2e/e2e-build.sh first" >&2
    exit 2
  fi
  ios_profiles=""
  android_profiles=""
  for profile in $profiles; do
    case "$profile" in
    fold-* | android-*) android_profiles="$android_profiles $profile" ;;
    *) ios_profiles="$ios_profiles $profile" ;;
    esac
  done
  # Each side in a subshell of its own, with its own booted device to shut
  # down, writing what passed and failed for the summary below.
  for side in ios android; do
    side_profiles="${side}_profiles"
    [ -n "${!side_profiles}" ] || continue
    (
      trap cleanup EXIT
      # Word splitting makes the list arguments.
      # shellcheck disable=SC2086
      run_profiles ${!side_profiles}
      printf '%s\n' "$passed" >"$out_root/.passed-$side"
      printf '%s\n' "$failed" >"$out_root/.failed-$side"
    ) > >(sed -u "s/^/[$side] /") 2>&1 &
  done
  wait
  for side in ios android; do
    side_profiles="${side}_profiles"
    [ -n "${!side_profiles}" ] || continue
    if [ -f "$out_root/.failed-$side" ]; then
      passed="$passed$(cat "$out_root/.passed-$side")"
      failed="$failed$(cat "$out_root/.failed-$side")"
    else
      # The side stopped before its summary: count all of it as failed.
      failed="$failed${!side_profiles}"
    fi
    rm -f "$out_root/.passed-$side" "$out_root/.failed-$side"
  done
else
  # Word splitting makes the list arguments.
  # shellcheck disable=SC2086
  run_profiles $profiles
fi

log "Passed:${passed:- none}"
if [ -n "$failed" ]; then
  echo "Failed:$failed (see $out_root/<profile>)" >&2
  exit 1
fi
