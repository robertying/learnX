#!/bin/bash
# Run the Maestro flows in .maestro/ against the installed app, logged in with
# the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD), and on iOS then
# the UI tests in ios/learnXUITests/iOS (XCUITest: what a flow can't see, such
# as where a split view's bars sit or whether a spinner is drawn). E2E runs use
# the Release build: install it with scripts/e2e-build.sh first.
#
#   scripts/e2e.sh ios|android [--live] [extra maestro test args, e.g. a single flow]
#   scripts/e2e.sh ios --ui [xcodebuild test args, e.g. -only-testing:learnXUITests/<class>]
#
# The UI tests run after the flows when every flow ran (no flow passed, no
# --live); --ui runs only them, E2E_UI_TESTS=0 skips them. Each is for a kind
# of device (an iPhone, an iPad, an iPad mini) and skips itself on others.
# xcodebuild builds the Release app with them: DerivedData goes to
# $DERIVED_DATA (default ~/Library/Developer/Xcode/DerivedData/learnX-e2e-ui),
# the result bundle to $E2E_UI_RESULT (default build/e2e/ios-ui.xcresult). A
# test that runs over 3 minutes is stopped and fails.
#
# --live logs in with the real test account from .env (LIVE_USERNAME /
# LIVE_PASSWORD / LIVE_FINGERPRINT) instead, and runs only the flows tagged
# `live`. Local only: it refuses to run in CI. The build from
# scripts/e2e-build.sh holds no live value: the flow passes the fingerprint as a
# launch argument,
# and the app signs the account in with it instead of opening the SSO page,
# which would add a device each run. Maestro's output, which has the password
# and fingerprint in it, goes to a temporary folder that is deleted afterwards,
# and the app's data is cleared at the end so the real login isn't left on the
# device.
#
# Boot one simulator/emulator first (or pass --device <id> via MAESTRO_DEVICE).
# E2E_ORIENTATION (PORTRAIT, LANDSCAPE_LEFT, ...) sets the orientation each
# flow starts in. scripts/e2e-devices.sh runs the flows on every device setup.
# E2E_LANGUAGE (e.g. zh-Hans) launches the iOS app in that language.
# E2E_STATE_CLEARED=1 skips the reset (subflows/reset.yaml), for a caller that
# cleared the app's data itself (scripts/store-screenshots.sh on Android).
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
  echo "usage: $0 ios|android [--live] [maestro test args...]" >&2
  exit 1
  ;;
esac

if [ "$ui_only" = true ] && [ "$platform" != ios ]; then
  echo "--ui is for ios only" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if [ "$ui_only" = false ] && ! command -v maestro >/dev/null; then
  echo "maestro not found: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

# shellcheck source=scripts/lib/env.sh
. scripts/lib/env.sh
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
done < <(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e-env.mjs)
if [ "${#env_args[@]}" -eq 0 ]; then
  echo "scripts/e2e-env.mjs failed" >&2
  exit 1
fi

device_args=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  device_args=(--device "$MAESTRO_DEVICE")
fi

# IPAD=true on an iPad simulator (the booted one, or MAESTRO_DEVICE), whose
# paged tab bar subflows/tab.yaml handles; other devices skip that check.
ipad=false
if [ "$platform" = ios ]; then
  booted="$(xcrun simctl list devices booted 2>/dev/null || true)"
  if [ -n "${MAESTRO_DEVICE:-}" ]; then
    booted="$(grep -F "$MAESTRO_DEVICE" <<<"$booted" || true)"
  fi
  if grep -q 'iPad' <<<"$booted"; then
    ipad=true
  fi
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

test_args=(
  -e APP_ID="$app_id"
  -e ACCOUNT="$account"
  -e USERNAME="$username"
  -e PASSWORD="$password"
  -e LIVE_FINGERPRINT="$fingerprint"
  -e ORIENTATION="${E2E_ORIENTATION:-PORTRAIT}"
  -e APP_LANGUAGE="${E2E_LANGUAGE:-}"
  -e STATE_CLEARED="${E2E_STATE_CLEARED:-}"
  -e IPAD="$ipad"
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
  local device result derived
  device="$(ui_device)" || return 1
  result="${E2E_UI_RESULT:-build/e2e/ios-ui.xcresult}"
  derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e-ui}"
  rm -rf "$result"
  mkdir -p "$(dirname "$result")"
  # TEST_LOGIN=1 as in scripts/e2e-build.sh: the app xcodebuild installs
  # replaces that build, and the flows' login check needs it.
  # TEST_RUNNER_-prefixed variables reach the test runner without the prefix.
  TEST_LOGIN=1 TEST_RUNNER_E2E_USERNAME="$username" TEST_RUNNER_E2E_PASSWORD="$password" \
    xcodebuild test \
    -workspace ios/learnX.xcworkspace \
    -scheme learnXUITests \
    -configuration Release \
    -destination "id=$device" \
    -derivedDataPath "$derived" \
    -resultBundlePath "$result" \
    -test-timeouts-enabled YES \
    -default-test-execution-time-allowance 180 \
    "$@"
}

if [ "$ui_only" = true ]; then
  run_ui_tests "$@"
  exit
fi

if [ "$live" = false ]; then
  status=0
  maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
    "${test_args[@]}" "$@" || status=$?
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
