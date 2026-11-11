#!/bin/bash
# Take the App Store / Google Play screenshots with the Maestro flows in
# .maestro/store/, from the mock account, on a booted simulator or emulator
# with the app installed (scripts/e2e-build.sh).
#
#   scripts/store-screenshots.sh <target> [device]
#
# Targets (each runs one flow; the folder is under STORE_OUT_DIR):
#   iphone          .maestro/store/iphone.yaml       ios/iphone/
#   duo-folded      .maestro/store/iphone.yaml       ios/iphone-duo/ (-folded)
#   ipad            .maestro/store/ipad.yaml         ios/ipad/ (landscape)
#   android-phone   .maestro/store/android_phone.yaml   android/phone/
#   android-tablet  .maestro/store/android_tablet.yaml  android/tablet/
#
# device: the simulator UDID or emulator serial. Defaults to MAESTRO_DEVICE,
# else the one booted simulator (iOS) or connected emulator (Android).
#
# Settings, all optional:
#   STORE_OUT_DIR          where the shots go (default build/store-screenshots)
#   STORE_LANGUAGE         iOS app language (default zh-Hans)
#   STORE_ANDROID_LOCALE   Android app locale (default zh-CN)
#   STORE_ANDROID_SIZE     Android screen size while shooting (default
#                          1080x1920 for phone, 2560x1440 for tablet)
#   STORE_ANDROID_DENSITY  Android density (default 420 phone, 280 tablet)
#
# The script sets the device up for the shots and puts it back on exit: the
# iOS status bar (9:41, full battery and signal) and light mode, or the
# Android screen size, density, signal and app locale. Which simulator or emulator model to use
# depends on the store's size rules: an iPhone of 1206x2622 pixels, a 13-inch
# iPad, the iPhone Duo, and any Android foldable or tablet emulator.
set -euo pipefail

target="${1:-}"
device="${2:-${MAESTRO_DEVICE:-}}"

usage() {
  echo "usage: $0 iphone|duo-folded|ipad|android-phone|android-tablet [device]" >&2
  exit 1
}

suffix=""
case "$target" in
iphone) platform=ios flow=iphone folder=ios/iphone ;;
duo-folded) platform=ios flow=iphone folder=ios/iphone-duo suffix=-folded ;;
ipad) platform=ios flow=ipad folder=ios/ipad ;;
android-phone)
  platform=android flow=android_phone folder=android/phone
  size="${STORE_ANDROID_SIZE:-1080x1920}" density="${STORE_ANDROID_DENSITY:-420}"
  ;;
android-tablet)
  platform=android flow=android_tablet folder=android/tablet
  size="${STORE_ANDROID_SIZE:-2560x1440}" density="${STORE_ANDROID_DENSITY:-280}"
  ;;
*) usage ;;
esac

cd "$(dirname "$0")/.."

out_root="${STORE_OUT_DIR:-build/store-screenshots}"
mkdir -p "$out_root/$folder"
out="$(cd "$out_root/$folder" && pwd)"

if [ -z "$device" ]; then
  if [ "$platform" = ios ]; then
    booted="$(xcrun simctl list devices booted |
      grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
  else
    booted="$(adb devices | awk '$2 == "device" { print $1 }')"
  fi
  if [ "$(printf '%s\n' "$booted" | grep -c .)" -ne 1 ]; then
    echo "Pass the device (or set MAESTRO_DEVICE): $(printf '%s\n' "$booted" | grep -c .) are running" >&2
    exit 1
  fi
  device="$booted"
fi

android_app_id="io.robertying.learnx"
restore_locales=""
restore_appearance=""

cleanup() {
  if [ "$platform" = ios ]; then
    xcrun simctl status_bar "$device" clear || true
    if [ -n "$restore_appearance" ]; then
      xcrun simctl ui "$device" appearance "$restore_appearance" || true
    fi
  else
    adb -s "$device" shell wm size reset || true
    adb -s "$device" shell wm density reset || true
    adb -s "$device" shell cmd locale set-app-locales "$android_app_id" \
      --locales "$restore_locales" || true
  fi
}
trap cleanup EXIT

if [ "$platform" = ios ]; then
  export E2E_LANGUAGE="${STORE_LANGUAGE:-zh-Hans}"
  # The shots are in light mode.
  restore_appearance="$(xcrun simctl ui "$device" appearance)"
  xcrun simctl ui "$device" appearance light
  xcrun simctl status_bar "$device" override --time 9:41 \
    --batteryState discharging --batteryLevel 100 \
    --wifiBars 3 --cellularMode active --cellularBars 4
else
  # "Locales for <app> for user 0 are [zh-CN]": keep what's in the brackets.
  restore_locales="$(adb -s "$device" shell cmd locale get-app-locales "$android_app_id" |
    sed -n 's/.*\[\(.*\)\].*/\1/p' | tr -d ' ')"
  # Clearing the app's data (the flows' fresh start) also clears its locale:
  # clear it here, before setting the locale, and have the flows keep it.
  adb -s "$device" shell pm clear "$android_app_id" >/dev/null
  export E2E_STATE_CLEARED=1
  adb -s "$device" shell cmd locale set-app-locales "$android_app_id" \
    --locales "${STORE_ANDROID_LOCALE:-zh-CN}"
  adb -s "$device" shell wm size "$size"
  adb -s "$device" shell wm density "$density"
  # Full signal; mobile data must stay on, or the bar shows a "!".
  adb -s "$device" emu gsm signal-profile 4 >/dev/null || true
fi

# Maestro (2.12+) writes takeScreenshot files only inside the run's own
# output folder, so the flows save relative names and the PNGs are copied out
# of it, also after a failed run.
run_dir="$(mktemp -d "${TMPDIR:-/tmp}/learnx-store.XXXXXX")"
copy_shots() {
  find "$run_dir" -path '*takeScreenshot*' -name '*.png' -exec cp {} "$out"/ \;
}
status=0
MAESTRO_DEVICE="$device" scripts/e2e.sh "$platform" \
  --test-output-dir "$run_dir" \
  -e STORE_OUT=store \
  -e STORE_SUFFIX="$suffix" \
  ".maestro/store/$flow.yaml" || status=$?
copy_shots
if [ "$flow" = ipad ]; then
  # Maestro saves a landscape iPad shot as portrait pixels with an EXIF
  # rotation, which App Store Connect doesn't apply: draw the pixels upright
  # (ffmpeg rotates by the tag and leaves it out).
  for png in "$out"/*.png; do
    ffmpeg -loglevel error -y -i "$png" -frames:v 1 "$run_dir/upright.png"
    mv "$run_dir/upright.png" "$png"
  done
fi
if [ "$status" -eq 0 ]; then
  rm -rf "$run_dir"
else
  echo "Maestro's logs: $run_dir" >&2
fi

echo "Screenshots: $out"
exit "$status"
