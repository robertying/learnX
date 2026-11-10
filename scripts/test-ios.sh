#!/bin/bash
# Run the native iOS tests on a simulator and print the line coverage of
# learnX's own Swift: each local module's tests (modules/*/ios/Tests, CocoaPods
# test specs, hosted in an app CocoaPods makes) and the app's (ios/learnXTests,
# hosted in learnX).
#
#   scripts/test-ios.sh <simulator udid> [scheme...]
#
# DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-tests), result bundles to
# $DERIVED_DATA/results. Run `pod install` first after adding a module's tests.
set -euo pipefail

device="${1:-}"
if [ -z "$device" ]; then
  echo "usage: $0 <simulator udid> [scheme...]" >&2
  exit 1
fi
shift

cd "$(dirname "$0")/.."

derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-tests}"
results="$derived/results"

schemes=("$@")
if [ ${#schemes[@]} -eq 0 ]; then
  for podspec in modules/*/ios/*.podspec; do
    if [ -d "$(dirname "$podspec")/Tests" ]; then
      schemes+=("$(basename "$podspec" .podspec)-Unit-Tests")
    fi
  done
  schemes+=(learnX)
fi

rm -rf "$results"
mkdir -p "$results"

failed=()
for scheme in "${schemes[@]}"; do
  echo "▸ $scheme"
  if ! xcodebuild test \
    -workspace ios/learnX.xcworkspace \
    -scheme "$scheme" \
    -configuration Debug \
    -destination "id=$device" \
    -derivedDataPath "$derived" \
    -enableCodeCoverage YES \
    -resultBundlePath "$results/$scheme.xcresult" \
    -quiet; then
    failed+=("$scheme")
  fi
done

# Coverage of the app's and the modules' own Swift (not their tests, not pods),
# each file from the run that covers it best.
for result in "$results"/*.xcresult; do
  xcrun xccov view --report --json "$result" 2>/dev/null || true
done | node scripts/native-coverage.mjs "$PWD"

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed: ${failed[*]}" >&2
  exit 1
fi
