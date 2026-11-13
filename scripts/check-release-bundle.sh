#!/bin/bash
# Build the release JS bundles (Android and iOS) as the release builds do, and
# fail if either contains a .env value it must not: anything but the mock
# login (DUMMY_*), as fastlane's release lanes also check. It catches what Jest
# can't: a Babel or Metro config change that breaks the production build, a
# broken import in a file no test loads, and a .env value leaking into a
# release bundle (babel/inline-env.js). It also fails if a bundle would replace
# React Native's fetch with expo/fetch.
#
#   scripts/check-release-bundle.sh
#
# Checks the values in .env, which needs at least the mock login. CI writes a
# .env with a made-up value for every key, so a leak of any of them fails.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "${E2E_LIVE:-}" ]; then
  echo "E2E_LIVE is set: unset it; release bundles never take a live login" >&2
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
  pnpm exec react-native bundle \
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

# Every .env value but the mock login's, as fastlane checks it: values shorter
# than 4 characters would match by chance.
node --input-type=module - "$out/android.bundle" "$out/ios.bundle" <<'JS'
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const env = dotenv.parse(readFileSync('.env'));
const secrets = Object.entries(env).filter(
  ([key, value]) => !key.startsWith('DUMMY_') && value.length >= 4,
);
let leaked = false;
for (const bundle of process.argv.slice(2)) {
  const code = readFileSync(bundle, 'utf8');
  for (const [key, value] of secrets) {
    if (code.includes(value)) {
      console.error(`${bundle} contains the .env value of ${key}`);
      leaked = true;
    }
  }
  // Expo's runtime installs expo/fetch unless EXPO_PUBLIC_USE_RN_FETCH was
  // set when the bundle was built (babel.config.js); its install code is left
  // in only when it runs. expo/fetch can't send the SSO login's form.
  if (code.includes('expo/fetch expected')) {
    console.error(`${bundle} replaces React Native's fetch with expo/fetch`);
    leaked = true;
  }
  if (!code.includes(env.DUMMY_USERNAME ?? '\0')) {
    console.error(`${bundle} doesn't contain the mock login: .env wasn't inlined`);
    leaked = true;
  }
}
if (leaked) process.exit(1);
console.log(`No .env secrets in the release bundles (checked ${secrets.length} values)`);
JS
