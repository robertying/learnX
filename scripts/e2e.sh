#!/bin/bash
# Run the Maestro flows in .maestro/ against the installed app, logged in with
# the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD). E2E runs use
# the Release build: install it with scripts/e2e-build.sh first.
#
#   scripts/e2e.sh ios|android [extra maestro test args, e.g. a single flow]
#
# Boot one simulator/emulator first (or pass --device <id> via MAESTRO_DEVICE).
set -euo pipefail

platform="${1:-}"
shift || true

case "$platform" in
ios) app_id="io.robertying.learnX" ;;
android) app_id="io.robertying.learnx" ;;
*)
  echo "usage: $0 ios|android [maestro test args...]" >&2
  exit 1
  ;;
esac

cd "$(dirname "$0")/.."

if ! command -v maestro >/dev/null; then
  echo "maestro not found: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

# Read only the two mock values; nothing else in .env leaves this script.
read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
username="$(read_env DUMMY_USERNAME)"
password="$(read_env DUMMY_PASSWORD)"
if [ -z "$username" ] || [ -z "$password" ]; then
  echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
  exit 1
fi

# Labels and mock texts the flows match, from the translations and mock data.
env_args=()
while IFS= read -r line; do
  env_args+=(-e "$line")
done < <(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e-env.mjs)
if [ "${#env_args[@]}" -eq 0 ]; then
  echo "scripts/e2e-env.mjs failed" >&2
  exit 1
fi

device_args=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  device_args=(--device "$MAESTRO_DEVICE")
fi

# IPAD=true on an iPad simulator (the booted one, or MAESTRO_DEVICE), whose
# paged tab bar subflows/tab.yaml handles; other devices skip that check.
ipad=false
if [ "$platform" = ios ]; then
  booted="$(xcrun simctl list devices booted 2>/dev/null || true)"
  if [ -n "${MAESTRO_DEVICE:-}" ]; then
    booted="$(grep -F "$MAESTRO_DEVICE" <<<"$booted" || true)"
  fi
  if grep -q 'iPad' <<<"$booted"; then
    ipad=true
  fi
fi

# Run every flow unless a flow file or folder was passed (options alone, e.g.
# --test-output-dir <dir>, still run them all).
has_flow=false
for arg in "$@"; do
  case "$arg" in
  *.yaml | *.yml | .maestro | .maestro/*) has_flow=true ;;
  esac
done
if [ "$has_flow" = false ]; then
  set -- "$@" .maestro
fi

exec maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
  -e APP_ID="$app_id" \
  -e USERNAME="$username" \
  -e PASSWORD="$password" \
  -e IPAD="$ipad" \
  "${env_args[@]}" \
  "$@"
