#!/bin/bash
# Build the Release app for the E2E flows and install it on a simulator or
# emulator. E2E runs always use Release, never a debug build: it bundles the
# JS (no Metro), starts faster and is what ships, so the flows run on what R8
# and Hermes made.
# It asks the local test server (scripts/e2e/ota-e2e-server.mjs) for over-the-air
# updates, never the real one, so it always runs the JS it was built with
# (scripts/e2e/e2e-ota.sh tests updates against that server).
# The bundle inlines .env, so its mock login works as in debug builds. It's
# built with TEST_LOGIN=1, so it takes a test login from launch arguments (the
# login check flow, scripts/e2e/e2e.sh --live) and says why a login failed; no live
# value goes into the build, and the fastlane lanes refuse to build with it.
#
#   scripts/e2e/e2e-build.sh ios <simulator udid>
#   scripts/e2e/e2e-build.sh android <emulator serial>
#
# iOS: DerivedData goes to $DERIVED_DATA (default
# ~/Library/Developer/Xcode/DerivedData/learnX-e2e, which every checkout
# shares, taking turns: scripts/lib/derived-data.sh); the build is for that
# simulator's architecture and makes no dSYM, so nothing goes to Crashlytics.
# One build serves every simulator of that architecture (iPhone, iPad, Duo):
# install it on another with `xcrun simctl install <udid> <app>`. A simulator
# older than the deployment target (17.6, which has no simulator: the oldest
# is 17.5) gets a build that targets its version, so the flows can run on the
# oldest iOS the app supports (scripts/e2e/e2e-devices.sh iphone-min); install
# that build only on simulators as old.
# Android: -PciRelease (R8, signed with the debug key, no Crashlytics uploads),
# for the ABI of $ANDROID_ABI (default arm64-v8a, as on Apple silicon).
set -euo pipefail

platform="${1:-}"
device="${2:-}"
if [ -z "$platform" ] || [ -z "$device" ]; then
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
# shellcheck source=scripts/lib/derived-data.sh
. scripts/lib/derived-data.sh

export TEST_LOGIN=1
# The key E2E builds trust for over-the-air updates (scripts/e2e/e2e-ota.sh).
scripts/e2e/ota-e2e-cert.sh

case "$platform" in
ios)
  derived="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}"
  # The simulator's iOS version, from its runtime.
  runtime_version="$(xcrun simctl list devices runtimes --json |
    node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const { devices, runtimes } = JSON.parse(s);
      for (const [id, list] of Object.entries(devices))
        if (list.some((d) => d.udid === process.argv[1]))
          console.log(runtimes.find((r) => r.identifier === id)?.version ?? "");
    })' "$device")"
  target="$(grep -m 1 -oE 'IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+' ios/learnX.xcodeproj/project.pbxproj | grep -oE '[0-9.]+$')"
  destination=(-destination "id=$device")
  if [ -n "$runtime_version" ] &&
    [ "$(printf '%s\n%s\n' "$runtime_version" "$target" | sort -V | head -n 1)" != "$target" ]; then
    # xcodebuild won't build for a simulator older than the deployment target,
    # even with the target lowered here, so build for any simulator of this
    # Mac's architecture.
    echo "iOS $runtime_version is older than the deployment target ($target): building for it"
    destination=(-destination "generic/platform=iOS Simulator" ARCHS="$(uname -m)"
      IPHONEOS_DEPLOYMENT_TARGET="$runtime_version")
  fi
  # Built and installed in one turn with the folder, which other checkouts
  # share (scripts/lib/derived-data.sh). `&&`: errexit is off in a function
  # whose status is tested.
  build_and_install() {
    xcodebuild build \
      -workspace ios/learnX.xcworkspace \
      -scheme learnX \
      -configuration Release \
      "${destination[@]}" \
      -derivedDataPath "$derived" \
      -quiet \
      DEBUG_INFORMATION_FORMAT=dwarf \
      COMPILER_INDEX_STORE_ENABLE=NO &&
      xcrun simctl install "$device" "$derived/Build/Products/Release-iphonesimulator/learnX.app"
  }
  with_derived_lock "$derived" build_and_install
  echo "Installed $derived/Build/Products/Release-iphonesimulator/learnX.app"
  ;;
android)
  abi="${ANDROID_ABI:-arm64-v8a}"
  # Gradle doesn't know the JS bundle depends on TEST_LOGIN (see
  # babel/inline-env.js), so the task always reruns rather than reuse a bundle
  # made without it. The github flavor: the APKs that update themselves, which
  # the updater flows test.
  (cd android && ./gradlew app:createBundleGithubReleaseJsAndAssets --rerun \
    app:assembleGithubRelease -PciRelease -PreactNativeArchitectures="$abi")
  apk="android/app/build/outputs/apk/github/release/app-github-$abi-release.apk"
  # -d: a newer debug build may be installed; both are signed with the debug key.
  adb -s "$device" install -r -d "$apk"
  echo "Installed $apk"
  ;;
*)
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
  ;;
esac
