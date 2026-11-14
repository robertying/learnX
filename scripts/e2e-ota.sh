#!/bin/bash
# Over-the-air updates end to end: starts the E2E update server
# (scripts/ota-e2e-server.mjs, which exports the app's JS as an update) and
# runs .maestro/ota/update-and-rollback.yaml against the installed E2E build
# (scripts/e2e-build.sh), which asks that server for updates: the update
# downloads and runs, a badly signed one is refused, a rollback brings back
# the bundle built into the app.
#
#   scripts/e2e-ota.sh ios|android
#
# Boot one simulator or emulator (or set MAESTRO_DEVICE), as for scripts/e2e.sh.
# OTA_E2E_PORT (default 8199) must match the build's, which is fixed on Android.
set -euo pipefail

platform="${1:-}"
if [ "$platform" != ios ] && [ "$platform" != android ]; then
  echo "usage: $0 ios|android" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

port="${OTA_E2E_PORT:-8199}"
log="build/ota-e2e/server-$platform.log"
mkdir -p build/ota-e2e
node scripts/ota-e2e-server.mjs "$platform" --port "$port" >"$log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

# The first run exports the bundle, which takes a minute or two.
for _ in $(seq 1 300); do
  if grep -q '^Serving update' "$log"; then
    break
  fi
  if ! kill -0 "$server" 2>/dev/null; then
    cat "$log" >&2
    exit 1
  fi
  sleep 1
done
grep '^Serving update' "$log"

if [ "$platform" = android ]; then
  # The app asks localhost; the emulator's localhost is its own.
  adb ${MAESTRO_DEVICE:+-s "$MAESTRO_DEVICE"} reverse "tcp:$port" "tcp:$port"
fi

status=0
scripts/e2e.sh "$platform" -e OTA_SERVER="http://localhost:$port" \
  .maestro/ota/update-and-rollback.yaml || status=$?
echo "Server log: $log"
exit "$status"
