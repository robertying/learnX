#!/bin/bash
# Run the UI tests on an iOS simulator (ios/learnXUITests/Simulator, XCUITest):
# what the Maestro flows can't check, such as where a split view's bars sit,
# whether a spinner is drawn, or a setting surviving a relaunch. They log in
# with the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD) and run the
# Release app, as the Maestro flows do.
#
#   scripts/e2e-simulator.sh <simulator udid> [-only-testing:learnXUITests/<class>[/<test>]]
#
# Each test is for a kind of device (an iPhone, an iPad, the iPhone Duo) and
# skips itself on others, so run the script on each. The tests use the
# simulator's own touch and keyboard, not the Mac's.
# A test that runs over 3 minutes is stopped and fails.
# DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e-simulator), the result
# bundle to build/e2e/simulator.xcresult.
set -euo pipefail

device="${1:-}"
if [ -z "$device" ]; then
  echo "usage: $0 <simulator udid> [xcodebuild test args...]" >&2
  exit 1
fi
shift

cd "$(dirname "$0")/.."

# shellcheck source=scripts/lib/env.sh
. scripts/lib/env.sh
username="$(read_env DUMMY_USERNAME)"
password="$(read_env DUMMY_PASSWORD)"
if [ -z "$username" ] || [ -z "$password" ]; then
  echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
  exit 1
fi

derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e-simulator}"
result="build/e2e/simulator.xcresult"
rm -rf "$result"
mkdir -p build/e2e

# TEST_RUNNER_-prefixed variables reach the test runner without the prefix.
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
  "$@"
