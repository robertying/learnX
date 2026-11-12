#!/bin/bash
# Run the Maestro flows in .maestro/ against the installed app, logged in with
# the mock account from .env (DUMMY_USERNAME / DUMMY_PASSWORD). E2E runs use
# the Release build: install it with scripts/e2e-build.sh first.
#
#   scripts/e2e.sh ios|android [--live] [extra maestro test args, e.g. a single flow]
#
# --live logs in with the real test account from .env (LIVE_USERNAME /
# LIVE_PASSWORD / LIVE_FINGERPRINT) instead, and runs only the flows tagged
# `live`. Local only: it refuses to run in CI. Install a build made with
# E2E_LIVE=1 (`E2E_LIVE=1 scripts/e2e-build.sh ios|android <device>`), which
# holds no live value: the flow passes the fingerprint as a launch argument,
# and the app signs the account in with it instead of opening the SSO page,
# which would add a device each run. Maestro's output, which has the password
# and fingerprint in it, goes to a temporary folder that is deleted afterwards,
# and the app's data is cleared at the end so the real login isn't left on the
# device.
#
# Boot one simulator/emulator first (or pass --device <id> via MAESTRO_DEVICE).
# E2E_ORIENTATION (PORTRAIT, LANDSCAPE_LEFT, ...) sets the orientation each
# flow starts in. scripts/e2e-devices.sh runs the flows on every device setup.
# E2E_LANGUAGE (e.g. zh-Hans) launches the iOS app in that language.
# E2E_STATE_CLEARED=1 launches the app without clearing its data first, for a
# caller that cleared it itself (scripts/store-screenshots.sh on Android).
set -euo pipefail

platform="${1:-}"
shift || true

live=false
if [ "${1:-}" = "--live" ]; then
  live=true
  shift
fi

case "$platform" in
ios) app_id="io.robertying.learnX" ;;
android) app_id="io.robertying.learnx" ;;
*)
  echo "usage: $0 ios|android [--live] [maestro test args...]" >&2
  exit 1
  ;;
esac

cd "$(dirname "$0")/.."

if ! command -v maestro >/dev/null; then
  echo "maestro not found: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

# Read only the values the flows need; nothing else in .env leaves this script.
read_env() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
if [ "$live" = true ]; then
  if [ -n "${CI:-}" ]; then
    echo "--live is for local runs only, never CI" >&2
    exit 1
  fi
  username="$(read_env LIVE_USERNAME)"
  password="$(read_env LIVE_PASSWORD)"
  fingerprint="$(read_env LIVE_FINGERPRINT)"
  if [ -z "$username" ] || [ -z "$password" ] || [ -z "$fingerprint" ]; then
    echo "LIVE_USERNAME / LIVE_PASSWORD / LIVE_FINGERPRINT missing from .env" >&2
    exit 1
  fi
  account=live
else
  username="$(read_env DUMMY_USERNAME)"
  password="$(read_env DUMMY_PASSWORD)"
  if [ -z "$username" ] || [ -z "$password" ]; then
    echo "DUMMY_USERNAME / DUMMY_PASSWORD missing from .env" >&2
    exit 1
  fi
  fingerprint=
  account=mock
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

test_args=(
  -e APP_ID="$app_id"
  -e ACCOUNT="$account"
  -e USERNAME="$username"
  -e PASSWORD="$password"
  -e LIVE_FINGERPRINT="$fingerprint"
  -e ORIENTATION="${E2E_ORIENTATION:-PORTRAIT}"
  -e APP_LANGUAGE="${E2E_LANGUAGE:-}"
  -e STATE_CLEARED="${E2E_STATE_CLEARED:-}"
  "${env_args[@]}"
)
if [ "$live" = false ]; then
  exec maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
    "${test_args[@]}" "$@"
fi

debug_dir="$(mktemp -d)"
cleanup() {
  maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
    -e APP_ID="$app_id" --debug-output "$debug_dir" \
    .maestro/subflows/clear_state.yaml >/dev/null ||
    echo "Couldn't clear the app's data: log out of the live account by hand" >&2
  rm -rf "$debug_dir"
}
trap cleanup EXIT
maestro "${device_args[@]+"${device_args[@]}"}" --platform "$platform" test \
  "${test_args[@]}" \
  --include-tags live \
  --debug-output "$debug_dir" \
  "$@"
