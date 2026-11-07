#!/bin/bash
# Run the Maestro flows in .maestro/ against the installed debug app, logged
# in with the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD).
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

device_args=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  device_args=(--device "$MAESTRO_DEVICE")
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
  "$@"
