#!/bin/bash
# Build Maestro from source with the patches in this folder:
#   maestro-display.patch       element positions, taps and screenshots when
#                               the app is on another display (iPhone Duo
#                               open) or in a window (iPadOS windowed apps)
#   maestro-fold-posture.patch  the setFoldPosture command (closed, halfFold,
#                               flat) for foldable simulators, from upstream
#                               PR mobile-dev-inc/Maestro#3621
#   maestro-hierarchy-fallback.patch
#                               the hierarchy of an app whose accessibility
#                               tree is too deep for one snapshot (only the
#                               status bar came back)
#   maestro-tiny-elements.patch  no taps on an element under 8 points
#                               across or high, such as the copies of a
#                               sheet's bar buttons UIKit leaves outside it
#   maestro-springboard-alerts.patch
#                               SpringBoard's alerts over an app (a
#                               notifications request, Save Password) in its
#                               hierarchy, so flows see and answer them
#   maestro-instrumentation-shell.patch
#                               the Android driver's instrumentation in the
#                               foreground of its adb shell, which otherwise
#                               stays a zombie until llkd kills adbd (API 29)
#   maestro-sim-touch.patch     touches and typing through scripts/e2e/
#                               sim-touch.swift (MAESTRO_IOS_SIM_TOUCH) when a
#                               display other than the main one is lit, which
#                               XCUITest's events don't reach (iPhone Duo open)
#   maestro-inner-display-tree.patch
#                               the open iPhone Duo's right side in the app's
#                               hierarchy: loads scripts/e2e/sim-ax-frame.m into
#                               the app (MAESTRO_IOS_INSERT_LIBRARIES) and starts
#                               a new runner after setFoldPosture
#
#   scripts/e2e/maestro/build.sh <maestro checkout>
#
# The checkout is the argument, or MAESTRO_DIR when there is none; one of them
# is required. It is cloned there if it doesn't exist, and its folder must be
# named Maestro (the driver's build script insists on it).
#
# Needs Xcode and JDK 17. Resets the checkout to the patched commits unless
# MAESTRO_KEEP=1. Prints the folder to put first on PATH:
#   PATH="$(scripts/e2e/maestro/build.sh <checkout> | tail -n 1):$PATH" scripts/e2e/e2e.sh ios
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dir="${1:-${MAESTRO_DIR:-}}"
if [ -z "$dir" ]; then
  echo "Usage: scripts/e2e/maestro/build.sh <maestro checkout> (or set MAESTRO_DIR)" >&2
  exit 2
fi
if [ "$(basename "$dir")" != Maestro ]; then
  echo "The checkout's folder must be named Maestro: $dir" >&2
  exit 2
fi
# The upstream commit the patch was written against.
base="${MAESTRO_BASE:-aaa248d}"

if [ ! -d "$dir/.git" ]; then
  git clone https://github.com/mobile-dev-inc/Maestro.git "$dir" >&2
fi
cd "$dir"
# MAESTRO_KEEP=1 builds the checkout as it is (for trying driver changes).
if [ "${MAESTRO_KEEP:-}" != 1 ]; then
  git fetch origin main >&2
  git checkout -q -B learnx-patched "$base" >&2
  git -c commit.gpgsign=false am -q "$here/maestro-display.patch" \
    "$here/maestro-fold-posture.patch" \
    "$here/maestro-hierarchy-fallback.patch" \
    "$here/maestro-tiny-elements.patch" \
    "$here/maestro-springboard-alerts.patch" \
    "$here/maestro-instrumentation-shell.patch" \
    "$here/maestro-sim-touch.patch" \
    "$here/maestro-inner-display-tree.patch" >&2
fi

if [ -z "${JAVA_HOME:-}" ] && [ -x /usr/libexec/java_home ]; then
  JAVA_HOME="$(/usr/libexec/java_home -v 17)"
  export JAVA_HOME
fi

# grpc-java's protoc plugin is x86_64 only before 1.76, which needs Rosetta on
# Apple silicon. Build with 1.76.0, whose plugin is a universal binary.
if [ "$(uname -m)" = arm64 ]; then
  sed -i '' 's/^grpc = ".*"/grpc = "1.76.0"/' gradle/libs.versions.toml
fi

# installDist bundles the iOS driver, which buildIosDriver builds (always, since
# Gradle can take a failed earlier build for up to date) with these settings:
# the simulator driver for Apple silicon only, enough for local runs, and
# iOS 15 instead of the project's iOS 14, which Xcode 27 no longer builds for.
# --no-daemon: a one-off build with its own Gradle version, whose daemon (and
# the Kotlin daemon it starts) would otherwise sit idle for hours.
xcconfig="$(mktemp -t maestro-driver).xcconfig"
trap 'rm -f "$xcconfig"' EXIT
echo "IPHONEOS_DEPLOYMENT_TARGET = 15.0" > "$xcconfig"
XCODE_XCCONFIG_FILE="$xcconfig" ARCHS=arm64 \
  ./gradlew --no-daemon :maestro-ios-driver:buildIosDriver --rerun :maestro-cli:installDist >&2

# A failed driver build doesn't fail the Gradle task; it leaves no driver.
driver="maestro-ios-driver/src/main/resources/driver-iPhoneSimulator/Debug-iphonesimulator"
if [ ! -s "$driver/maestro-driver-iosUITests-Runner.zip" ]; then
  echo "The iOS driver didn't build; see the xcodebuild output above." >&2
  exit 1
fi

echo "$dir/maestro-cli/build/install/maestro/bin"
