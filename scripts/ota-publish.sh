#!/bin/bash
# Publishes the current commit's JS as an over-the-air update to every build
# with app.json's runtime version, or rolls the last one back (AGENTS.md,
# "Over-the-air updates").
#
#   scripts/ota-publish.sh [--platform ios|android|all] [-m "message"]
#   scripts/ota-publish.sh --rollback [--platform ios|android|all]
#
# The update server's publish API isn't public: this tunnels to it over SSH
# (OTA_SSH_HOST in the repo-root .env, a host your ~/.ssh/config can reach,
# port 3001 on it) and runs eoas against the tunnel. eoas signs in with
# EXPO_TOKEN (an Expo access token, from the environment or .env) or a
# `npx eas-cli login` session. It builds the update with `expo export`
# from a clean tree, inlining .env's mock login as a store build does, and
# keeps each platform's source map in build/ota/updates/<update id>/ for
# metro-symbolicate (crash reports name the update in `js_bundle`).
# Other arguments go to eoas as they are.
set -euo pipefail

cd "$(dirname "$0")/.."

EOAS="eoas@3.2.7" # the server's version
PORT=3001

if [ -n "${TEST_LOGIN:-}" ]; then
  echo "TEST_LOGIN is set: unset it; it's for E2E builds only" >&2
  exit 1
fi
env_value() {
  [ -f .env ] || return 0
  sed -n "s/^$1=//p" .env | tail -1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
host="$(env_value OTA_SSH_HOST)"
if [ -z "$host" ]; then
  echo "No OTA_SSH_HOST in .env: the SSH host that runs the update server (see .env.example)" >&2
  exit 1
fi
if [ -z "${EXPO_TOKEN:-}" ] && [ -n "$(env_value EXPO_TOKEN)" ]; then
  EXPO_TOKEN="$(env_value EXPO_TOKEN)"
  export EXPO_TOKEN
fi
if [ -z "$(env_value DUMMY_USERNAME)" ]; then
  echo "No mock login in .env: updates inline it as store builds do (.env.example)" >&2
  exit 1
fi

rollback=false
args=()
while [ $# -gt 0 ]; do
  case "$1" in
  --rollback) rollback=true ;;
  *) args+=("$1") ;;
  esac
  shift
done

# The tunnel lives as long as this script.
ssh -N -o ExitOnForwardFailure=yes -L "$PORT:127.0.0.1:$PORT" "$host" &
tunnel=$!
trap 'kill "$tunnel" 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do
  curl -sf "http://localhost:$PORT/hc" >/dev/null && break
  sleep 1
done
curl -sf "http://localhost:$PORT/hc" >/dev/null || {
  echo "The update server isn't reachable through the tunnel to $host" >&2
  exit 1
}

if [ "$rollback" = true ]; then
  npx --yes "$EOAS" rollback --branch production --serverUrl "http://localhost:$PORT" \
    --nonInteractive "${args[@]+"${args[@]}"}"
  exit 0
fi

out=build/ota/dist
rm -rf "$out"
# Uploads go through the tunnel too (scripts/ota-publish-tunnel.cjs).
url="$(node -p "require('./app.json').updates.url")"
OTA_PUBLIC_ORIGIN="$(node -p "new URL(process.argv[1]).origin" "$url")" \
OTA_LOCAL_ORIGIN="http://localhost:$PORT" \
OTA_APP_ID="$(node -p "require('./app.json').updates.requestHeaders['expo-app-id']")" \
NODE_OPTIONS="${NODE_OPTIONS:-} --require $PWD/scripts/ota-publish-tunnel.cjs" \
npx --yes "$EOAS" publish --branch production --serverUrl "http://localhost:$PORT" \
  --nonInteractive --emitMetadata --outputDir "$out" "${args[@]+"${args[@]}"}"

# Keep each platform's source map by its update id.
node --input-type=module - "$out" <<'JS'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const metadata = JSON.parse(readFileSync(join(out, 'xprem-update-metadata.json'), 'utf8'));
// One entry per platform: { id, platform, runtimeVersion, branch, message }.
for (const { platform, id: updateId } of metadata) {
  const dir = join(out, '_expo/static/js', platform);
  const map = existsSync(dir) && readdirSync(dir).find(name => name.endsWith('.map'));
  if (!updateId || !map) {
    console.warn(`No source map kept for ${platform} (${updateId ?? 'no update id'})`);
    continue;
  }
  const dest = join('build/ota/updates', updateId);
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(dir, map), join(dest, `${platform}.map`));
  console.log(`${platform}: update ${updateId}, source map ${join(dest, `${platform}.map`)}`);
}
JS
