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
#   duo-half-open   .maestro/store/iphone.yaml       ios/iphone-duo/ (-half-open)
#   duo-open        .maestro/store/iphone.yaml       ios/iphone-duo/ (-open)
#
# duo-half-open and duo-open set each screen up on the closed Duo (nothing
# can tap on its inner display yet) and open the hinge for each shot, so they
# need the patched Maestro (scripts/maestro/build.sh) first on PATH.
#   ipad            .maestro/store/ipad.yaml         ios/ipad/ (landscape)
#   android-phone   .maestro/store/android-phone.yaml   android/phone/
#   android-tablet  .maestro/store/android-tablet.yaml  android/tablet/
#   mac             ios/learnXUITests/StoreScreenshots.swift  macos/windows/
#
# mac runs the Mac app's XCUITest (scripts/e2e-mac.sh: it takes over the
# pointer and keyboard, so start it by hand and leave the Mac alone) and saves
# the window shots, to be composed onto the store background.
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
# Android screen size, density, app locale and status bar (9:41; the other
# icons are painted over with the bar's color after the run). Which simulator
# or emulator model to use depends on the store's size rules: an iPhone of
# 1206x2622 pixels, a 13-inch iPad, the iPhone Duo, and any Android foldable
# or tablet emulator.
set -euo pipefail

target="${1:-}"
device="${2:-${MAESTRO_DEVICE:-}}"

usage() {
  echo "usage: $0 mac|iphone|duo-folded|duo-half-open|duo-open|ipad|android-phone|android-tablet [device]" >&2
  exit 1
}

suffix=""
posture=""
case "$target" in
iphone) platform=ios flow=iphone folder=ios/iphone ;;
duo-folded) platform=ios flow=iphone folder=ios/iphone-duo suffix=-folded ;;
duo-half-open)
  platform=ios flow=iphone folder=ios/iphone-duo suffix=-half-open
  posture=halfFold
  ;;
duo-open) platform=ios flow=iphone folder=ios/iphone-duo suffix=-open posture=flat ;;
ipad) platform=ios flow=ipad folder=ios/ipad ;;
mac) platform=mac folder=macos/windows ;;
android-phone)
  platform=android flow=android-phone folder=android/phone
  size="${STORE_ANDROID_SIZE:-1080x1920}" density="${STORE_ANDROID_DENSITY:-420}"
  bar_dp=33
  ;;
android-tablet)
  platform=android flow=android-tablet folder=android/tablet
  size="${STORE_ANDROID_SIZE:-2560x1440}" density="${STORE_ANDROID_DENSITY:-280}"
  bar_dp=62
  ;;
*) usage ;;
esac

cd "$(dirname "$0")/.."

out_root="${STORE_OUT_DIR:-build/store-screenshots}"
mkdir -p "$out_root/$folder"
out="$(cd "$out_root/$folder" && pwd)"

if [ "$platform" = mac ]; then
  status=0
  scripts/e2e-mac.sh -only-testing:learnXUITests/StoreScreenshots || status=$?
  # The shots are the test's attachments; name each file after its
  # attachment ("01-notices_0_<uuid>.png" -> 01-notices.png).
  export_dir="$(mktemp -d "${TMPDIR:-/tmp}/learnx-store-mac.XXXXXX")"
  xcrun xcresulttool export attachments --path build/e2e/mac.xcresult \
    --output-path "$export_dir"
  node scripts/lib/mac-store-shots.mjs "$export_dir" "$out"
  rm -rf "$export_dir"
  echo "Screenshots: $out"
  exit "$status"
fi

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

# shellcheck disable=SC2329 # run by the EXIT trap
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
    demo exit || true
    adb -s "$device" shell settings put global sysui_demo_allowed 0 || true
  fi
}

# A SystemUI demo mode command (Android).
demo() {
  local command="$1"
  shift
  adb -s "$device" shell am broadcast -a com.android.systemui.demo \
    -e command "$command" "$@" >/dev/null
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
  # From the default size: straight from another override (the previous
  # target), SystemUI can leave the clock out of demo mode.
  adb -s "$device" shell wm size reset
  adb -s "$device" shell wm density reset
  sleep 3
  adb -s "$device" shell wm size "$size"
  adb -s "$device" shell wm density "$density"
  sleep 3
  # Demo mode, entered after the size change (before it, SystemUI keeps the
  # real clock), sets the clock to 9:41 and hides notification icons. The
  # other status bar icons are painted over after the run.
  adb -s "$device" shell settings put global sysui_demo_allowed 1
  demo exit
  demo enter
  sleep 1
  demo clock -e hhmm 0941
  demo notifications -e visible false
fi

# Maestro (2.12+) writes takeScreenshot files only inside the run's own
# output folder, so the flows save relative names and the PNGs are copied out
# of it, also after a failed run.
run_dir="$(mktemp -d "${TMPDIR:-/tmp}/learnx-store.XXXXXX")"
copy_shots() {
  find "$run_dir" -path '*takeScreenshot*' -name '*.png' -exec cp {} "$out"/ \;
}
flows=.maestro
if [ -n "$posture" ]; then
  # A copy of the flows whose shots open the hinge (see
  # .maestro/store/subflows/screenshot-posture.yaml).
  flows="$run_dir/flows"
  cp -R .maestro "$flows"
  cp .maestro/store/subflows/screenshot-posture.yaml "$flows/subflows/screenshot.yaml"
  # Maestro's takeScreenshot of the inner display is black, so the flow asks
  # this server for each shot, which saves the inner display (3) with simctl.
  shot_port_file="$run_dir/shot-port"
  node scripts/lib/inner-display-shots.mjs "$device" "$out" "$shot_port_file" &
  shot_server=$!
  trap 'kill "$shot_server" 2>/dev/null || true; cleanup' EXIT
  while [ ! -s "$shot_port_file" ]; do sleep 0.2; done
  shot_url="http://127.0.0.1:$(cat "$shot_port_file")/shot"
fi
status=0
MAESTRO_DEVICE="$device" scripts/e2e.sh "$platform" \
  --test-output-dir "$run_dir" \
  -e STORE_OUT=store \
  -e STORE_SUFFIX="$suffix" \
  -e STORE_POSTURE="$posture" \
  -e STORE_SHOT_URL="${shot_url:-}" \
  "$flows/store/$flow.yaml" || status=$?
if [ -n "$posture" ]; then
  # Leave the Duo closed, as the next run expects.
  MAESTRO_DEVICE="$device" scripts/e2e.sh ios -e POSTURE=closed \
    --test-output-dir "$run_dir/close" .maestro/subflows/fold.yaml || true
fi
copy_shots
if [ "$platform" = android ]; then
  # Paint the status bar's icons (network, battery, system and notification
  # icons; the screen lock shield) with the bar's own color, keeping only the
  # clock on the left. On a tablet the painted band also covers the window
  # handle under the bar. STORE_ANDROID_STATUS_BAR_DP (default 33 phone, 62
  # tablet) is the band's height, STORE_ANDROID_CLOCK_DP (48) the clock's
  # width.
  bar_height=$(((${STORE_ANDROID_STATUS_BAR_DP:-$bar_dp} * density + 159) / 160))
  clock_width=$(((${STORE_ANDROID_CLOCK_DP:-48} * density + 159) / 160))
  for png in "$out"/*.png; do
    width="$(ffprobe -v error -select_streams v:0 -show_entries stream=width \
      -of csv=p=0 "$png")"
    # The bar's color, from its top edge in the middle (above any icon). RGB
    # throughout: drawbox would otherwise shift every pixel's color a little.
    color="$(ffmpeg -v error -i "$png" -vf "crop=1:1:$((width / 2)):1,format=rgb24" \
      -f rawvideo -pix_fmt rgb24 - | od -An -tx1 | tr -d ' \n')"
    ffmpeg -v error -y -i "$png" -frames:v 1 -vf \
      "format=rgb24,drawbox=x=$clock_width:y=0:w=$((width - clock_width)):h=$bar_height:color=0x$color:t=fill,format=rgb24" \
      "$run_dir/painted.png"
    mv "$run_dir/painted.png" "$png"
  done
fi
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
