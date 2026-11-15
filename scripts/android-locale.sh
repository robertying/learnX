#!/bin/bash
# Sets a booted emulator's (or device's) system language without restarting
# Android. The emulator's -change-locale restarts Android's framework, and in
# CI the emulator sometimes exited during that restart. This asks Maestro's
# driver app instead, which changes the configuration at runtime as the
# Settings app does (what `maestro start-device --device-locale` uses).
#
#   scripts/android-locale.sh <language>-<country, such as zh-CN>
#
# Uses MAESTRO_DEVICE as the adb serial when set, else adb's one device.
# Needs maestro on PATH.
set -euo pipefail

locale="${1:-}"
case "$locale" in
  ?*-?*) ;;
  *)
    echo "usage: $0 <language>-<country, such as zh-CN>" >&2
    exit 1
    ;;
esac

adb=(adb)
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  adb+=(-s "$MAESTRO_DEVICE")
fi

language="${locale%%-*}"
country="${locale#*-}"

# The running configuration's language: zh-rCN, or b+zh+Hans+CN with a script.
configured() {
  "${adb[@]}" shell am get-config |
    grep -Eq "^config: .*-(${language}-r${country}|b\+${language}(\+[A-Za-z]+)?\+${country})-"
}

if configured; then
  exit 0
fi

# The driver app ships inside Maestro's client library. Maestro removes it at
# the end of each run and installs it again at the start of the next.
lib="$(dirname "$(command -v maestro)")/../lib"
jar="$(grep -l maestro-app.apk "$lib"/*.jar | head -n 1)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
unzip -q -o "$jar" maestro-app.apk -d "$tmp"
"${adb[@]}" install -r -g "$tmp/maestro-app.apk" >/dev/null
"${adb[@]}" shell pm grant dev.mobile.maestro android.permission.CHANGE_CONFIGURATION
"${adb[@]}" shell am broadcast -a dev.mobile.maestro.locale \
  -n dev.mobile.maestro/.receivers.LocaleSettingReceiver \
  --es lang "$language" --es country "$country" >/dev/null

# Android may add the language's script (zh-CN becomes zh-Hans-CN).
status=1
for _ in $(seq 30); do
  if configured; then
    status=0
    break
  fi
  sleep 1
done
"${adb[@]}" uninstall dev.mobile.maestro >/dev/null || true
if [ "$status" != 0 ]; then
  echo "the system language didn't change to $locale" >&2
fi
exit "$status"
