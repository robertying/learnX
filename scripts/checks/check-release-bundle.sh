#!/bin/bash
# Build the release JS bundles (Android and iOS) as the release builds do, and
# fail if either contains a .env value it must not: anything but the mock
# login (DUMMY_*), with scripts/checks/check-bundle-env.mjs, which fastlane's
# build lanes also run; or another platform's code (the Electron app's, or
# Android's Compose components in the iOS bundle), with
# scripts/checks/check-bundle-platform.mjs. It catches what Jest can't: a
# Babel or Metro config change that breaks the production build, a broken
# import in a file no test loads, and a .env value leaking into a release
# bundle (babel/inline-env.js).
#
#   scripts/checks/check-release-bundle.sh
#
# Checks the values in .env, which needs at least the mock login. CI writes a
# .env with a made-up value for every key, so a leak of any of them fails.
set -euo pipefail

cd "$(dirname "$0")/../.."

if [ -n "${TEST_LOGIN:-}" ]; then
  echo "TEST_LOGIN is set: unset it; release bundles never take a test login" >&2
  exit 1
fi
if [ ! -f .env ]; then
  echo "No .env: copy .env.example and fill in at least the mock login" >&2
  exit 1
fi

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

# --reset-cache: a check shouldn't trust output Metro cached from another
# build (BABEL_ENV, for one, isn't in its cache key).
for platform in android ios; do
  echo "▸ $platform release bundle"
  pnpm exec expo export:embed \
    --platform "$platform" \
    --dev false \
    --reset-cache \
    --entry-file index.js \
    --bundle-output "$out/$platform.bundle" \
    --assets-dest "$out/assets-$platform" \
    >"$out/$platform.log" 2>&1 || {
    cat "$out/$platform.log" >&2
    exit 1
  }
done

node scripts/checks/check-bundle-env.mjs "$out/android.bundle" "$out/ios.bundle"
for platform in android ios; do
  node scripts/checks/check-bundle-platform.mjs "$platform" "$out/$platform.bundle"
done
