#!/bin/bash
# Strips the local symbols out of the frameworks embedded in an archive.
#
# Xcode strips what it builds when it archives (the app, the extensions; the
# pods' frameworks keep their exported symbols only), but prebuilt frameworks
# go in as they were downloaded or built, with every local symbol: React
# Native's React, ReactNativeDependencies and hermesvm, and Expo's
# ExpoModulesJSI (9.8 MB of the iOS app, 19.5 MB of the Mac app's).
# Nothing reads local symbols at run time, and crash reports are
# symbolicated from dSYMs, which stripping leaves matching (same UUID).
# Each framework that gets smaller is signed again as "[CP] Embed Pods
# Frameworks" signed it.
#
# Runs as the app target's "Strip frameworks" build phase, after the
# frameworks are embedded. Archives only (the release lanes), as the "Upload
# dSYM files" phase: the Release builds that E2E and UI tests run stay as
# they are.

set -euo pipefail

[ "${ACTION}" = "install" ] || exit 0

frameworks="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
[ -d "$frameworks" ] || exit 0

stripped="$(mktemp -t strip-frameworks)"
trap 'rm -f "$stripped"' EXIT

for framework in "$frameworks"/*.framework; do
  # On the Mac the top-level binary is a symlink into Versions/Current.
  binary="$(realpath "$framework/$(basename "$framework" .framework)")"
  strip -x -o "$stripped" "$binary"
  before="$(stat -f %z "$binary")"
  after="$(stat -f %z "$stripped")"
  # Already stripped (Firebase's): strip writes the same size, though not
  # always the same bytes.
  [ "$after" -lt "$before" ] || continue
  echo "Stripped $(basename "$framework"): $before -> $after bytes"
  cat "$stripped" > "$binary"
  # As CocoaPods' code_sign_if_enabled (Pods-learnX-frameworks.sh).
  if [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" ] && [ "${CODE_SIGNING_REQUIRED:-}" != "NO" ] && [ "${CODE_SIGNING_ALLOWED:-}" != "NO" ]; then
    # shellcheck disable=SC2086 # OTHER_CODE_SIGN_FLAGS is a list of flags.
    /usr/bin/codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" ${OTHER_CODE_SIGN_FLAGS:-} --preserve-metadata=identifier,entitlements "$framework"
  fi
done
