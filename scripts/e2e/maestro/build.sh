#!/bin/bash
# Build Maestro from source with the patches in this folder, applied in the
# order below (README.md says what each one changes and why).
#
#   scripts/e2e/maestro/build.sh <install folder>
#
# Clones Maestro's base commit (no history) into a temporary folder, applies
# the patches, builds it, puts the installed tool in <install folder> (replacing
# an earlier one there) and deletes the clone, so only what running needs is
# kept. Prints the folder to put first on PATH:
#   PATH="$(scripts/e2e/maestro/build.sh <install folder> | tail -n 1):$PATH" scripts/e2e/e2e.sh ios
#
# MAESTRO_SOURCE=<checkout> builds that checkout as it is instead, and keeps
# it, after cloning the base and applying the patches there if it doesn't
# exist: for changing the patches or moving them to a new Maestro release. Its
# folder must be named Maestro (the driver's build script insists on it).
#
# Needs Xcode, JDK 17 and the Android SDK (platform 37).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
install="${1:-}"
if [ -z "$install" ]; then
  echo "Usage: scripts/e2e/maestro/build.sh <install folder>" >&2
  exit 2
fi
install="$(cd "$(dirname "$install")" && pwd)/$(basename "$install")"
# Only an earlier install is replaced.
if [ -e "$install" ] && [ ! -x "$install/bin/maestro" ]; then
  echo "$install isn't an earlier Maestro install; choose another folder" >&2
  exit 2
fi
# The upstream commit the patches were written against.
base="${MAESTRO_BASE:-aaa248d7fd4ca4924444dc027af9c7a62a9be348}"

# The patches, in the order they apply.
patches=(
  "$here/maestro-display.patch"
  "$here/maestro-fold-posture.patch"
  "$here/maestro-hierarchy-fallback.patch"
  "$here/maestro-tiny-elements.patch"
  "$here/maestro-springboard-alerts.patch"
  "$here/maestro-instrumentation-shell.patch"
  "$here/maestro-sim-touch.patch"
  "$here/maestro-inner-display-tree.patch"
  "$here/maestro-inner-display-alerts.patch"
  "$here/maestro-pinch.patch"
)
# A checkout of the base with the patches applied, in folder $1.
patched_checkout() {
  git init -q "$1"
  git -C "$1" fetch -q --depth 1 https://github.com/mobile-dev-inc/Maestro.git "$base"
  git -C "$1" checkout -q -B learnx-patched FETCH_HEAD
  git -C "$1" -c commit.gpgsign=false am -q "${patches[@]}"
}

if [ -n "${MAESTRO_SOURCE:-}" ]; then
  dir="$MAESTRO_SOURCE"
  if [ "$(basename "$dir")" != Maestro ]; then
    echo "MAESTRO_SOURCE's folder must be named Maestro: $dir" >&2
    exit 2
  fi
  if [ ! -d "$dir" ]; then
    patched_checkout "$dir" >&2
  fi
else
  tmp="$(mktemp -d -t maestro-build)"
  trap 'rm -rf "$tmp"' EXIT
  dir="$tmp/Maestro"
  patched_checkout "$dir" >&2
fi
cd "$dir"

if [ -z "${JAVA_HOME:-}" ] && [ -x /usr/libexec/java_home ]; then
  JAVA_HOME="$(/usr/libexec/java_home -v 17)"
  export JAVA_HOME
fi

# grpc-java's protoc plugin is x86_64 only before 1.76, which needs Rosetta on
# Apple silicon. Build with 1.76.0, whose plugin is a universal binary.
if [ "$(uname -m)" = arm64 ]; then
  sed -i '' 's/^grpc = ".*"/grpc = "1.76.0"/' gradle/libs.versions.toml
fi

# Maestro ships its Android driver as prebuilt APKs, which maestro-pinch.patch
# changes, so they're built here and copied into the CLI's resources: the app by
# assemble, the instrumentation (the driver itself) by copyMaestroServer.
# Maestro's Android Gradle plugin finds SDK platforms by their old names
# (android-37), which newer SDKs install as android-37.0.
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -d "$sdk/platforms/android-37" ] && [ -d "$sdk/platforms/android-37.0" ]; then
  sed -i '' 's/^    compileSdk = 37$/    compileSdkVersion("android-37.0")/' maestro-android/build.gradle.kts
fi
ANDROID_HOME="$sdk" ./gradlew --no-daemon :maestro-android:assemble :maestro-android:copyMaestroServer >&2

# installDist bundles the iOS driver, which buildIosDriver builds (always, since
# Gradle can take a failed earlier build for up to date) with these settings:
# the simulator driver for Apple silicon only, enough for local runs, and
# iOS 15 instead of the project's iOS 14, which Xcode 27 no longer builds for.
# --no-daemon: a one-off build with its own Gradle version, whose daemon (and
# the Kotlin daemon it starts) would otherwise sit idle for hours.
xcconfig="$(mktemp -t maestro-driver).xcconfig"
trap 'rm -f "$xcconfig"; [ -z "${tmp:-}" ] || rm -rf "$tmp"' EXIT
echo "IPHONEOS_DEPLOYMENT_TARGET = 15.0" > "$xcconfig"
XCODE_XCCONFIG_FILE="$xcconfig" ARCHS=arm64 \
  ./gradlew --no-daemon :maestro-ios-driver:buildIosDriver --rerun :maestro-cli:installDist >&2

# A failed driver build doesn't fail the Gradle task; it leaves no driver.
driver="maestro-ios-driver/src/main/resources/driver-iPhoneSimulator/Debug-iphonesimulator"
if [ ! -s "$driver/maestro-driver-iosUITests-Runner.zip" ]; then
  echo "The iOS driver didn't build; see the xcodebuild output above." >&2
  exit 1
fi

# Swap the install in only once it is complete.
rm -rf "$install.new"
cp -R maestro-cli/build/install/maestro "$install.new"
# The patches it has, one name a line, for scripts/e2e/e2e.sh to know which
# commands it takes.
printf '%s\n' "${patches[@]##*/}" >"$install.new/learnx-patches"
rm -rf "$install"
mv "$install.new" "$install"
echo "$install/bin"
