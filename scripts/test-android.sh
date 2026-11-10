#!/bin/bash
# Run the local modules' Android unit tests (modules/*/android/src/test, JUnit
# with Robolectric and MockK) and print their line coverage.
#
#   scripts/test-android.sh
set -euo pipefail

cd "$(dirname "$0")/.."

projects=()
for tests in modules/*/android/src/test; do
  projects+=("$(basename "$(dirname "$(dirname "$(dirname "$tests")")")")")
done

tasks=()
for project in "${projects[@]}"; do
  tasks+=(":$project:testDebugUnitTest" ":$project:createDebugUnitTestCoverageReport")
done

(cd android && ./gradlew --console=plain "${tasks[@]}")

reports=()
for project in "${projects[@]}"; do
  reports+=("modules/$project/android/build/reports/coverage/test/debug/report.xml")
done
node scripts/android-coverage.mjs "${reports[@]}"
