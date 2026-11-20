#!/bin/bash
# Run the Maestro flows in .maestro/ against the installed app, logged in with
# the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD), and on iOS then
# the UI tests in ios/learnXUITests/iOS (XCUITest: what a flow can't see, such
# as where a split view's bars sit or whether a spinner is drawn). E2E runs use
# the Release build: install it with scripts/e2e/e2e-build.sh first.
#
#   scripts/e2e/e2e.sh ios|android [--live] [extra maestro test args, e.g. a single flow]
#   scripts/e2e/e2e.sh ios --ui [xcodebuild test args, e.g. -only-testing:learnXUITests/<class>]
#
# The UI tests run after the flows when every flow ran (no flow passed, no
# --live); --ui runs only them, E2E_UI_TESTS=0 skips them. Each is for a kind
# of device (an iPhone, an iPad, an iPad mini) and skips itself on others.
# xcodebuild builds the Release app with them, in scripts/e2e/e2e-build.sh's
# DerivedData ($DERIVED_DATA, default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e, which checkouts take turns
# with: scripts/lib/derived-data.sh) and with its build
# settings, so it reuses the app that script built instead of building it
# again. The result bundle goes to $E2E_UI_RESULT (default
# build/e2e/ios-ui.xcresult). A test that runs over 3 minutes is stopped and
# fails.
#
# --live logs in with the real test account from .env (LIVE_USERNAME /
# LIVE_PASSWORD / LIVE_FINGERPRINT) instead, and runs only the flows tagged
# `live`. Local only: it refuses to run in CI. The build from
# scripts/e2e/e2e-build.sh holds no live value: the flow passes the fingerprint
# as a launch argument, and the app signs the account in with it instead of
# opening the SSO page, which would add a device each run. Maestro's output,
# which has the password and fingerprint in it, goes to a temporary folder that
# is deleted afterwards, and the app's data is cleared at the end so the real
# login isn't left on the device.
#
# Boot one simulator/emulator first (or pass --device <id> via MAESTRO_DEVICE).
# E2E_ORIENTATION (PORTRAIT, LANDSCAPE_LEFT, ...) sets the orientation each
# flow starts in. scripts/e2e/e2e-devices.sh runs the flows on every device setup.
# E2E_LANGUAGE (e.g. zh-Hans) launches the iOS app in that language.
# E2E_CLOCK (an ISO 8601 moment) starts the app's clock there
# (services/launchOptions.ts), for the store screenshots.
# E2E_SCREENSHOTS=1 saves a screenshot of each tab, detail and settings page
# the flows reach, and of search results and failures (.maestro/subflows/
# shot.yaml), numbered in order, to build/e2e/screenshots/<run start time>/;
# E2E_SCREENSHOTS=<folder> saves them there instead. The UI tests' screenshots
# (their attachments) go to its ui-tests/ folder, with xcresulttool's
# manifest.json naming each test's.
# E2E_STATE_CLEARED=1 skips the reset (subflows/reset.yaml), for a caller that
# cleared the app's data itself (scripts/e2e/store-screenshots.sh on Android).
set -euo pipefail

platform="${1:-}"
shift || true

live=false
ui_only=false
case "${1:-}" in
--live)
  live=true
  shift
  ;;
--ui)
  ui_only=true
  shift
  ;;
esac

case "$platform" in
ios) app_id="io.robertying.learnX" ;;
android) app_id="io.robertying.learnx" ;;
*)
  echo "usage: $0 ios|android [--live] [maestro test args...] | ios --ui [xcodebuild test args...]" >&2
  exit 1
  ;;
esac

if [ "$ui_only" = true ] && [ "$platform" != ios ]; then
  echo "--ui is for ios only" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

if [ "$ui_only" = false ] && ! command -v maestro >/dev/null; then
  echo "maestro not found: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

# shellcheck source=scripts/e2e/lib/env.sh
. scripts/e2e/lib/env.sh
# shellcheck source=scripts/lib/derived-data.sh
. scripts/lib/derived-data.sh
if [ "$live" = true ]; then
  if [ -n "${CI:-}" ]; then
    echo "--live is for local runs only, never CI" >&2
    exit 1
  fi
  username="$(read_env LIVE_USERNAME)"
  password="$(read_env LIVE_PASSWORD)"
  fingerprint="$(read_env LIVE_FINGERPRINT)"
  if [ -z "$username" ] || [ -z "$password" ] || [ -z "$fingerprint" ]; then
    echo "LIVE_USERNAME / LIVE_PASSWORD / LIVE_FINGERPRINT missing from .env" >&2
    exit 1
  fi
  account=live
else
  username="$(read_env DUMMY_USERNAME)"
  password="$(read_env DUMMY_PASSWORD)"
  if [ -z "$username" ] || [ -z "$password" ]; then
    echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
    exit 1
  fi
  fingerprint=
  account=mock
fi

# Labels and mock texts the flows match, from the translations and mock data.
env_args=()
while IFS= read -r line; do
  env_args+=(-e "$line")
done < <(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e/e2e-env.mjs)
if [ "${#env_args[@]}" -eq 0 ]; then
  echo "scripts/e2e/e2e-env.mjs failed" >&2
  exit 1
fi

device_args=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  device_args=(--device "$MAESTRO_DEVICE")
fi

# IPAD=true on an iPad simulator (the booted one, or MAESTRO_DEVICE), whose
# paged tab bar subflows/tab.yaml handles; other devices skip that check.
# IOS_MAJOR is that simulator's iOS major version (0 on Android): before iOS 26
# the flows go back with the back button instead of a swipe (subflows/back.yaml).
# SPLIT=true where the app has the split layout, with a detail column beside
# the list: on an iPad, and on the open iPhone Duo, which
# scripts/e2e/e2e-devices.sh says with E2E_DUO_POSTURE (halfFold or flat).
ipad=false
ios_major=0
duo_posture=
if [ "$platform" = ios ]; then
  duo_posture="${E2E_DUO_POSTURE:-}"
  # Each device's line, after its runtime's "-- iOS <version> --" heading.
  booted="$(xcrun simctl list devices booted 2>/dev/null |
    awk '/^-- iOS / { version = $3; next } { print version " " $0 }' || true)"
  if [ -n "${MAESTRO_DEVICE:-}" ]; then
    booted="$(grep -F "$MAESTRO_DEVICE" <<<"$booted" || true)"
  fi
  if grep -q 'iPad' <<<"$booted"; then
    ipad=true
  fi
  version="$(head -n 1 <<<"$booted" | cut -d ' ' -f 1)"
  ios_major="${version%%.*}"
  if ! [[ "$ios_major" =~ ^[0-9]+$ ]]; then
    echo "Couldn't read the simulator's iOS version" >&2
    exit 1
  fi
fi

split=false
if [ "$ipad" = true ] || [ -n "$duo_posture" ]; then
  split=true
fi

# The patched Maestro (scripts/e2e/maestro) sends its touches and typing through
# scripts/e2e/sim-touch.swift while a display other than the main one is lit,
# such as the open iPhone Duo's inner display, which XCUITest's events don't
# reach, and loads scripts/e2e/sim-ax-frame.m into the app, so its tree there
# has the elements at the right of the screen. Built here when the source is
# newer.
if [ "$platform" = ios ] && [ "$ui_only" = false ]; then
  mkdir -p build/e2e
  sim_touch=build/e2e/sim-touch
  if [ ! -x "$sim_touch" ] || [ scripts/e2e/sim-touch.swift -nt "$sim_touch" ]; then
    xcrun swiftc -O scripts/e2e/sim-touch.swift -o "$sim_touch"
  fi
  export MAESTRO_IOS_SIM_TOUCH="$PWD/$sim_touch"
  ax_frame=build/e2e/sim-ax-frame.dylib
  if [ ! -f "$ax_frame" ] || [ scripts/e2e/sim-ax-frame.m -nt "$ax_frame" ]; then
    xcrun -sdk iphonesimulator clang -dynamiclib -arch "$(uname -m)" \
      -mios-simulator-version-min=17.0 -fobjc-arc -framework UIKit \
      scripts/e2e/sim-ax-frame.m -o "$ax_frame"
  fi
  export MAESTRO_IOS_INSERT_LIBRARIES="$PWD/$ax_frame"
fi

# Run every flow unless a flow file or folder was passed (options alone, e.g.
# --test-output-dir <dir>, still run them all).
has_flow=false
for arg in "$@"; do
  case "$arg" in
  *.yaml | *.yml | .maestro | .maestro/*) has_flow=true ;;
  esac
done
if [ "$has_flow" = false ] && [ "$ui_only" = false ]; then
  set -- "$@" .maestro
fi

# Android: scripts/e2e/e2e-calendar.mjs reads the device's calendar for
# 08-settings (subflows/calendar-provider.yaml), at CALENDAR_URL.
calendar_url=
if [ "$platform" = android ] && [ "$ui_only" = false ]; then
  serial="${MAESTRO_DEVICE:-$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')}"
  calendar_port="${E2E_CALENDAR_PORT:-$((17000 + $$ % 1000))}"
  node scripts/e2e/e2e-calendar.mjs "$serial" "$calendar_port" $$ &
  calendar_url="http://127.0.0.1:$calendar_port/events"
fi

# Screenshots (E2E_SCREENSHOTS). Never on live runs, whose screens show the
# real account. Maestro only saves takeScreenshot's files inside the run's
# output folder (--test-output-dir: the caller's, else one in the screenshots
# folder), from which number_shots moves them. With --ui the arguments are
# xcodebuild's, so only export_ui_shots applies.
shots_dir=
if [ "$live" = false ]; then
  case "${E2E_SCREENSHOTS:-}" in
  "" | 0) ;;
  1) shots_dir="build/e2e/screenshots/$(date +%Y-%m-%d_%H%M%S)" ;;
  *) shots_dir="$E2E_SCREENSHOTS" ;;
  esac
fi
test_out=
shots_test_out=
if [ -n "$shots_dir" ] && [ "$ui_only" = false ]; then
  mkdir -p "$shots_dir"
  previous=
  for arg in "$@"; do
    if [ "$previous" = --test-output-dir ]; then
      test_out="$arg"
    fi
    previous="$arg"
  done
  if [ -z "$test_out" ]; then
    test_out="$shots_dir/.maestro"
    shots_test_out="$test_out"
    set -- --test-output-dir "$test_out" "$@"
  fi
fi

# shot.yaml names each file <milliseconds>-<screen>; move them to the
# screenshots folder, numbered in order after any an earlier run saved there.
number_shots() {
  local name file n
  [ -n "$shots_dir" ] || return 0
  n="$(find "$shots_dir" -maxdepth 1 -name '[0-9][0-9][0-9]-*.png' | grep -c . || true)"
  while IFS=$'\t' read -r name file; do
    n=$((n + 1))
    mv "$file" "$shots_dir/$(printf '%03d' "$n")-${name#*-}"
  done < <(find "$test_out" -path '*takeScreenshot*' -name '*.png' |
    while IFS= read -r file; do
      name="$(basename "$file")"
      if [[ "$name" =~ ^[0-9]{13}- ]]; then
        printf '%s\t%s\n' "$name" "$file"
      fi
    done | sort)
  if [ -n "$shots_test_out" ]; then
    rm -rf "$shots_test_out"
  fi
  echo "Screenshots: $shots_dir" >&2
}

test_args=(
  -e APP_ID="$app_id"
  -e ACCOUNT="$account"
  -e USERNAME="$username"
  -e PASSWORD="$password"
  -e LIVE_FINGERPRINT="$fingerprint"
  -e ORIENTATION="${E2E_ORIENTATION:-PORTRAIT}"
  -e APP_LANGUAGE="${E2E_LANGUAGE:-}"
  -e STATE_CLEARED="${E2E_STATE_CLEARED:-}"
  -e APP_CLOCK="${E2E_CLOCK:-}"
  -e IPAD="$ipad"
  -e SPLIT="$split"
  -e IOS_MAJOR="$ios_major"
  -e CALENDAR_URL="$calendar_url"
  -e SHOTS_DIR="${shots_dir:+shots}"
  "${env_args[@]}"
)
# The simulator the UI tests run on: MAESTRO_DEVICE, else the one booted.
ui_device() {
  if [ -n "${MAESTRO_DEVICE:-}" ]; then
    echo "$MAESTRO_DEVICE"
    return
  fi
  local udids
  udids="$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}')" || true
  if [ "$(grep -c . <<<"$udids")" != 1 ]; then
    echo "Boot exactly one simulator, or set MAESTRO_DEVICE, for the UI tests" >&2
    return 1
  fi
  echo "$udids"
}

run_ui_tests() {
  local device result derived status
  device="$(ui_device)" || return 1
  result="${E2E_UI_RESULT:-build/e2e/ios-ui.xcresult}"
  derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}"
  rm -rf "$result"
  mkdir -p "$(dirname "$result")"
  # TEST_LOGIN=1 as in scripts/e2e/e2e-build.sh: the app xcodebuild installs
  # replaces that build, and the flows' login check needs it.
  # TEST_RUNNER_-prefixed variables reach the test runner without the prefix.
  # The DerivedData folder is shared with other checkouts, which take turns
  # (scripts/lib/derived-data.sh).
  with_derived_lock "$derived" env TEST_LOGIN=1 \
    TEST_RUNNER_E2E_USERNAME="$username" TEST_RUNNER_E2E_PASSWORD="$password" \
    xcodebuild test \
    -workspace ios/learnX.xcworkspace \
    -scheme learnXUITests \
    -configuration Release \
    -destination "id=$device" \
    -derivedDataPath "$derived" \
    -resultBundlePath "$result" \
    -test-timeouts-enabled YES \
    -default-test-execution-time-allowance 180 \
    DEBUG_INFORMATION_FORMAT=dwarf \
    COMPILER_INDEX_STORE_ENABLE=NO \
    "$@" || status=$?
  export_ui_shots "$result"
  return "${status:-0}"
}

# The UI tests' attachments (screenshots they keep), from the result bundle.
export_ui_shots() {
  [ -n "$shots_dir" ] && [ -d "$1" ] || return 0
  mkdir -p "$shots_dir/ui-tests"
  if xcrun xcresulttool export attachments --path "$1" --output-path "$shots_dir/ui-tests" >/dev/null; then
    echo "UI test screenshots: $shots_dir/ui-tests" >&2
  else
    echo "Couldn't export the UI tests' screenshots from $1" >&2
  fi
}

if [ "$ui_only" = true ]; then
  run_ui_tests "$@"
  exit
fi

if [ "$live" = false ]; then
  status=0
  maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
    "${test_args[@]}" "$@" || status=$?
  number_shots
  if [ "$platform" = ios ] && [ "$has_flow" = false ] && [ "${E2E_UI_TESTS:-1}" != 0 ]; then
    run_ui_tests || status=$?
  fi
  exit "$status"
fi

debug_dir="$(mktemp -d)"
cleanup() {
  maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
    -e APP_ID="$app_id" --debug-output "$debug_dir" \
    .maestro/subflows/clear-state.yaml >/dev/null ||
    echo "Couldn't clear the app's data: log out of the live account by hand" >&2
  rm -rf "$debug_dir"
}
trap cleanup EXIT
maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
  "${test_args[@]}" \
  --include-tags live \
  --debug-output "$debug_dir" \
  "$@"
