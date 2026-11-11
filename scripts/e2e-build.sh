#!/bin/bash
# Build the Release app for the E2E flows and install it on a simulator or
# emulator. E2E runs always use Release, never a debug build: it bundles the
# JS (no Metro), starts faster and is what ships, so the flows run on what R8
# and Hermes made.
# The bundle inlines .env, so its mock login works as in debug builds.
#
#   scripts/e2e-build.sh ios <simulator udid>
#   scripts/e2e-build.sh android <emulator serial>
#
# iOS: DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e); the build is for that
# simulator's architecture and makes no dSYM, so nothing goes to Crashlytics.
# One build serves every simulator of that architecture (iPhone, iPad, Duo):
# install it on another with `xcrun simctl install <udid> <app>`.
# Android: -PciRelease (R8, signed with the debug key, no Crashlytics uploads),
# for the ABI of $ANDROID_ABI (default arm64-v8a, as on Apple silicon).
set -euo pipefail

platform="${1:-}"
device="${2:-}"
if [ -z "$platform" ] || [ -z "$device" ]; then
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

case "$platform" in
ios)
  derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}"
  xcodebuild build \
    -workspace ios/learnX.xcworkspace \
    -scheme learnX \
    -configuration Release \
    -destination "id=$device" \
    -derivedDataPath "$derived" \
    -quiet \
    DEBUG_INFORMATION_FORMAT=dwarf \
    COMPILER_INDEX_STORE_ENABLE=NO
  app="$derived/Build/Products/Release-iphonesimulator/learnX.app"
  xcrun simctl install "$device" "$app"
  echo "Installed $app"
  ;;
android)
  abi="${ANDROID_ABI:-arm64-v8a}"
  (cd android && ./gradlew app:assembleRelease -PciRelease -PreactNativeArchitectures="$abi")
  apk="android/app/build/outputs/apk/release/app-$abi-release.apk"
  # -d: a newer debug build may be installed; both are signed with the debug key.
  adb -s "$device" install -r -d "$apk"
  echo "Installed $apk"
  ;;
*)
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
  ;;
esac
