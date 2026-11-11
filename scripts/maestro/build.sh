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

# Simulator driver only, Apple silicon only: enough for local runs.
ARCHS=arm64 ./maestro-ios-xctest-runner/build-maestro-ios-runner.sh >&2
./gradlew :maestro-cli:installDist >&2

echo "$dir/maestro-cli/build/install/maestro/bin"
