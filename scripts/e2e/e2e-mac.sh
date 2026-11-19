#!/bin/bash
# Run the Mac app's end-to-end tests (ios/learnXUITests/Mac, XCUITest: Maestro
# can't drive Mac Catalyst), logged in with the mock account from .env
# (DUMMY_USERNAME / DUMMY_PASSWORD).
#
#   scripts/e2e/e2e-mac.sh [-only-testing:learnXUITests/<class>[/<test>]]
#
# The tests move the pointer and type on the keyboard, so leave the Mac alone
# while they run. They run the Release app (bundled JS, as it ships) and log
# out whatever account the learnX Mac app has: they share its data, so quit
# any other learnX Mac app first.
# A test that runs over 3 minutes is stopped and fails: after a failure,
# XCUITest can hang quitting the app (in tearDown), which would otherwise stall
# the run.
# DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e-mac), the result bundle to
# build/e2e/mac.xcresult.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck source=scripts/e2e/lib/env.sh
. scripts/e2e/lib/env.sh
username="$(read_env DUMMY_USERNAME)"
password="$(read_env DUMMY_PASSWORD)"
if [ -z "$username" ] || [ -z "$password" ]; then
  echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
  exit 1
fi

if pgrep -f '/learnX\.app/Contents/MacOS/learnX( |$)' >/dev/null; then
  echo "A learnX Mac app is running; quit it first (the tests share its data)." >&2
  exit 1
fi

# Labels and mock texts the tests match (`value("T_<key>")`), from the
# translations and mock data, as the Maestro flows get them. TEST_RUNNER_-
# prefixed variables reach the test runner without the prefix.
count=0
while IFS= read -r line; do
  export "TEST_RUNNER_${line%%=*}=${line#*=}"
  count=$((count + 1))
done < <(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e/e2e-env.mjs)
if [ "$count" -eq 0 ]; then
  echo "scripts/e2e/e2e-env.mjs failed" >&2
  exit 1
fi

# As every E2E build (scripts/e2e/e2e-build.sh): takes a test login from launch
# arguments and puts a failed login's reason first in its toast, for the login
# server check (LoginServerUITests).
export TEST_LOGIN=1

derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e-mac}"
result="build/e2e/mac.xcresult"
rm -rf "$result"
mkdir -p build/e2e

# The store screenshots (StoreScreenshots, scripts/e2e/store-screenshots.sh mac)
# only run when asked for with -only-testing.
case " $* " in
*" -only-testing"*) ;;
*) set -- -skip-testing:learnXUITests/StoreScreenshots "$@" ;;
esac

# E2E_CLOCK: the moment the store screenshots' app clock starts from, and
# E2E_LANGUAGE their language (scripts/e2e/store-screenshots.sh).
TEST_RUNNER_E2E_USERNAME="$username" TEST_RUNNER_E2E_PASSWORD="$password" \
  TEST_RUNNER_E2E_CLOCK="${E2E_CLOCK:-}" \
  TEST_RUNNER_E2E_LANGUAGE="${E2E_LANGUAGE:-}" \
  xcodebuild test \
  -workspace ios/learnX.xcworkspace \
  -scheme learnXUITests \
  -configuration Release \
  -destination 'platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath "$derived" \
  -resultBundlePath "$result" \
  -allowProvisioningUpdates \
  -test-timeouts-enabled YES \
  -default-test-execution-time-allowance 180 \
  "$@"
