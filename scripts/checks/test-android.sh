#!/bin/bash
# Run the local modules' Android unit tests (modules/*/android/src/test, JUnit
# with Robolectric and MockK) and the app's (android/app/src/test: its
# Material 3 dialog module), and print their line coverage, failing below the
# minimum set at the end. Also runs the tests of what the patches in patches/
# change (android/patch-tests), which test libraries' code, so they have no
# coverage of their own.
#
#   scripts/checks/test-android.sh [gradle option...]
#
# Extra arguments go to Gradle, e.g. --build-cache on CI.
set -euo pipefail

cd "$(dirname "$0")/../.."

projects=()
for tests in modules/*/android/src/test; do
  projects+=("$(basename "$(dirname "$(dirname "$(dirname "$tests")")")")")
done

tasks=()
for project in "${projects[@]}"; do
  tasks+=(":$project:testDebugUnitTest" ":$project:createDebugUnitTestCoverageReport")
done

# The app's tests run in one flavor; its report counts the dialog module alone.
tasks+=(":app:testGooglePlayDebugUnitTest" ":app:createGooglePlayDebugUnitTestCoverageReport")
tasks+=(":patch-tests:testDebugUnitTest")

(cd android && ./gradlew --console=plain "$@" "${tasks[@]}")

reports=()
for project in "${projects[@]}"; do
  reports+=("modules/$project/android/build/reports/coverage/test/debug/report.xml")
done
reports+=("android/app/build/reports/coverage/test/googlePlay/debug/report.xml#io/robertying/learnx/dialog")
# Fails below this line coverage of the modules' and the dialog module's
# Kotlin. Keep it just under the current total; raise it as coverage grows.
node scripts/checks/android-coverage.mjs --min=99 "${reports[@]}"
