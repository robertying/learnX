#!/bin/bash
# Copies a booted emulator's ANR traces (/data/anr) and native crash
# tombstones (/data/tombstones) into a folder, so a flow that failed because
# the app hung or crashed shows where. Android keeps them only under /data,
# which needs root: emulator images without Google Play (google_apis, aosp)
# allow `adb root`; on others this copies nothing.
#
#   scripts/e2e/android-crash-reports.sh <folder>
#
# Uses MAESTRO_DEVICE as the adb serial when set, else adb's one device.
# Never fails: it runs after the flows, whose result is what counts.
set -uo pipefail

out="${1:-}"
if [ -z "$out" ]; then
  echo "usage: $0 <folder>" >&2
  exit 1
fi

adb=(adb)
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  adb+=(-s "$MAESTRO_DEVICE")
fi

# adbd restarts as root, which drops the connection for a moment.
if ! "${adb[@]}" root >/dev/null 2>&1; then
  echo "no root on this device: no ANR traces or tombstones copied" >&2
  exit 0
fi
"${adb[@]}" wait-for-device

for dir in anr tombstones; do
  # Only folders with something in them, so a clean run adds nothing.
  if [ -n "$("${adb[@]}" shell ls -A "/data/$dir" 2>/dev/null)" ]; then
    mkdir -p "$out"
    "${adb[@]}" pull "/data/$dir" "$out/" >/dev/null && echo "copied /data/$dir to $out/$dir"
  fi
done
exit 0
