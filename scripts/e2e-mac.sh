#!/bin/bash
# Run the Mac app's end-to-end tests (ios/learnXUITests, XCUITest: Maestro
# can't drive Mac Catalyst), logged in with the mock account from .env
# (DUMMY_USERNAME / DUMMY_PASSWORD).
#
#   scripts/e2e-mac.sh [-only-testing:learnXUITests/LearnXUITests/<test>]
#
# The tests move the pointer and type on the keyboard, so leave the Mac alone
# while they run. They log out whatever account the debug Mac app has. Start
# Metro first. Quit any other learnX Mac app: they share their data.
# DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e-mac), the result bundle to
# build/e2e/mac.xcresult.
set -euo pipefail

cd "$(dirname "$0")/.."

read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
username="$(read_env DUMMY_USERNAME)"
password="$(read_env DUMMY_PASSWORD)"
if [ -z "$username" ] || [ -z "$password" ]; then
  echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
  exit 1
fi

if pgrep -f '/learnX\.app/Contents/MacOS/learnX$' >/dev/null; then
  echo "A learnX Mac app is running; quit it first (the tests share its data)." >&2
  exit 1
fi

derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e-mac}"
result="build/e2e/mac.xcresult"
rm -rf "$result"
mkdir -p build/e2e

# TEST_RUNNER_-prefixed variables reach the test runner without the prefix.
TEST_RUNNER_E2E_USERNAME="$username" TEST_RUNNER_E2E_PASSWORD="$password" \
  xcodebuild test \
  -workspace ios/learnX.xcworkspace \
  -scheme learnXUITests \
  -configuration Debug \
  -destination 'platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath "$derived" \
  -resultBundlePath "$result" \
  -allowProvisioningUpdates \
  "$@"
