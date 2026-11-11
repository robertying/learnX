#!/bin/bash
# Build Maestro from source with the patches in this folder:
#   maestro-display.patch       element positions, taps and screenshots when
#                               the app is on another display (iPhone Duo
#                               open) or in a window (iPadOS windowed apps)
#   maestro-fold-posture.patch  the setFoldPosture command (closed, halfFold,
#                               flat) for foldable simulators, from upstream
#                               PR mobile-dev-inc/Maestro#3621
#
#   scripts/maestro/build.sh [maestro checkout]   (default: ~/repos/Maestro)
#
# Needs Xcode and JDK 17. Resets the checkout to the patched commits unless
# MAESTRO_KEEP=1. Prints the folder to put first on PATH:
#   PATH="$(scripts/maestro/build.sh | tail -n 1):$PATH" scripts/e2e.sh ios
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# Maestro's driver build script insists on a folder named "Maestro".
dir="${1:-$HOME/repos/Maestro}"
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
    "$here/maestro-fold-posture.patch" >&2
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
xcconfig="$(mktemp -t maestro-driver).xcconfig"
trap 'rm -f "$xcconfig"' EXIT
echo "IPHONEOS_DEPLOYMENT_TARGET = 15.0" > "$xcconfig"
XCODE_XCCONFIG_FILE="$xcconfig" ARCHS=arm64 \
  ./gradlew :maestro-ios-driver:buildIosDriver --rerun :maestro-cli:installDist >&2

# A failed driver build doesn't fail the Gradle task; it leaves no driver.
driver="maestro-ios-driver/src/main/resources/driver-iPhoneSimulator/Debug-iphonesimulator"
if [ ! -s "$driver/maestro-driver-iosUITests-Runner.zip" ]; then
  echo "The iOS driver didn't build; see the xcodebuild output above." >&2
  exit 1
fi

echo "$dir/maestro-cli/build/install/maestro/bin"
