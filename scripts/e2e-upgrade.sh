#!/bin/bash
# Test the upgrade from 18.0.3, the last release before the data moved to the
# new stores: install a Release build of 18.0.3, use it with the mock account
# (.maestro/upgrade/1_use_18.0.3.yaml), install the current Release build over
# it without clearing anything, and check that everything came along
# (.maestro/upgrade/2_after_upgrade.yaml). Both builds write and read the
# data with their own native modules, as on a user's phone.
#
#   scripts/e2e-upgrade.sh ios <simulator udid>
#   scripts/e2e-upgrade.sh android <emulator serial>
#
# The 18.0.3 build is made once from the tag in a temporary worktree and kept
# in $BASELINE_DIR (default ~/Library/Caches/learnX-e2e/18.0.3). Its mock
# login (18.0.3's "persistent" mock account) is set to .env's DUMMY_USERNAME /
# DUMMY_PASSWORD, so the current build still treats the saved login as the
# mock account. Android signs it with the debug key, like -PciRelease, so the
# current build installs over it.
#
# Set SKIP_CURRENT_BUILD=1 to install the current build already built by
# scripts/e2e-build.sh instead of building it again.
set -euo pipefail

platform="${1:-}"
device="${2:-}"
if [ -z "$platform" ] || [ -z "$device" ]; then
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
repo="$(pwd)"
tag="v18.0.3"
baseline="${BASELINE_DIR:-$HOME/Library/Caches/learnX-e2e/18.0.3}"

read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
username="$(read_env DUMMY_USERNAME)"
password="$(read_env DUMMY_PASSWORD)"
if [ -z "$username" ] || [ -z "$password" ]; then
  echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
  exit 1
fi

case "$platform" in
ios) artifact="$baseline/learnX.app" ;;
android) artifact="$baseline/learnX-${ANDROID_ABI:-arm64-v8a}.apk" ;;
*)
  echo "usage: $0 ios <simulator udid> | android <emulator serial>" >&2
  exit 1
  ;;
esac

build_baseline() {
  local worktree
  worktree="$(mktemp -d "${TMPDIR:-/tmp}/learnX-18.0.3.XXXXXX")"
  git fetch --quiet origin "refs/tags/$tag:refs/tags/$tag" || true
  git worktree add --quiet --detach "$worktree" "$tag"
  # shellcheck disable=SC2064
  trap "git -C '$repo' worktree remove --force '$worktree'" EXIT

  # 18.0.3 inlines the whole .env. Its persistent mock account keeps its data
  # and login across launches, like the mock account now.
  printf 'DUMMY_PERSIST_USERNAME=%s\nDUMMY_PERSIST_PASSWORD=%s\nDUMMY_USERNAME=e2e-ephemeral\nDUMMY_PASSWORD=e2e-ephemeral\n' \
    "$username" "$password" >"$worktree/.env"
  (cd "$worktree" && pnpm install --frozen-lockfile)

  mkdir -p "$baseline"
  case "$platform" in
  ios)
    # 18.0.3 predates the Gemfile: use the current one for the locked CocoaPods.
    (cd "$worktree/ios" && LANG=en_US.UTF-8 BUNDLE_GEMFILE="$repo/Gemfile" bundle exec pod install)
    local derived="$worktree/ios/build"
    # No dSYM, so 18.0.3's Crashlytics phase uploads nothing.
    xcodebuild build \
      -workspace "$worktree/ios/learnX.xcworkspace" \
      -scheme learnX \
      -configuration Release \
      -destination "id=$device" \
      -derivedDataPath "$derived" \
      -quiet \
      DEBUG_INFORMATION_FORMAT=dwarf \
      COMPILER_INDEX_STORE_ENABLE=NO
    rm -rf "$artifact"
    cp -R "$derived/Build/Products/Release-iphonesimulator/learnX.app" "$artifact"
    ;;
  android)
    local abi="${ANDROID_ABI:-arm64-v8a}"
    local gradle="$worktree/android/app/build.gradle"
    # Debug key instead of the release keystore, and no Crashlytics uploads.
    perl -pi \
      -e 's/signingConfig signingConfigs\.release/signingConfig signingConfigs.debug/;' \
      -e 's/nativeSymbolUploadEnabled true/nativeSymbolUploadEnabled false; mappingFileUploadEnabled false/' \
      "$gradle"
    echo "sdk.dir=${ANDROID_HOME:-$HOME/Library/Android/sdk}" >"$worktree/android/local.properties"
    (cd "$worktree/android" && ./gradlew app:assembleRelease -PreactNativeArchitectures="$abi")
    cp "$worktree/android/app/build/outputs/apk/release/app-$abi-release.apk" "$artifact"
    ;;
  esac
  echo "Built 18.0.3 into $artifact"
}

if [ ! -e "$artifact" ]; then
  build_baseline
fi

# A clean start: no app, no data. On iOS the flow also clears the keychain.
case "$platform" in
ios)
  xcrun simctl uninstall "$device" io.robertying.learnX || true
  xcrun simctl install "$device" "$artifact"
  ;;
android)
  adb -s "$device" uninstall io.robertying.learnx || true
  adb -s "$device" install "$artifact"
  ;;
esac

export MAESTRO_DEVICE="$device"
scripts/e2e.sh "$platform" .maestro/upgrade/1_use_18.0.3.yaml

# Over it, keeping the data.
if [ "${SKIP_CURRENT_BUILD:-}" = 1 ]; then
  case "$platform" in
  ios)
    app="${DERIVED_DATA:-$HOME/Library/Developer/Xcode/DerivedData/learnX-e2e}/Build/Products/Release-iphonesimulator/learnX.app"
    xcrun simctl install "$device" "$app"
    ;;
  android)
    adb -s "$device" install -r -d "android/app/build/outputs/apk/release/app-${ANDROID_ABI:-arm64-v8a}-release.apk"
    ;;
  esac
else
  scripts/e2e-build.sh "$platform" "$device"
fi

scripts/e2e.sh "$platform" .maestro/upgrade/2_after_upgrade.yaml
