#!/bin/bash
# Gives React Native's prebuilt Mac Catalyst frameworks (hermesvm, React and
# ReactNativeDependencies) the versioned macOS bundle layout.
#
# Their maccatalyst slices ship flat, like iOS frameworks. A Mac app needs
# Versions/<version>/ with Versions/Current and top-level symlinks, or the
# Catalyst build fails to embed and sign them. The Podfile runs this after
# `pod install` for all three, and after each "Replace … for the right
# configuration" build phase for that pod's framework, since the phase
# extracts a fresh flat copy when the configuration changes.
#
# Usage: fix-catalyst-frameworks.sh [Pods folder] [framework...]
# (default: ios/Pods, all three frameworks)

set -euo pipefail

pods_root="${1:-$(dirname "$0")/../ios/Pods}"
[ $# -gt 0 ] && shift
[ $# -gt 0 ] || set -- hermesvm React ReactNativeDependencies

# Xcode runs the three pods' build phases in parallel; take turns. A lock
# older than a minute was left by a cancelled build.
lock="$pods_root/.fix-catalyst-frameworks.lock"
waited=0
until mkdir "$lock" 2> /dev/null; do
  if [ "$waited" -ge 600 ]; then
    rmdir "$lock" 2> /dev/null || true
    waited=0
  fi
  sleep 0.1
  waited=$((waited + 1))
done
trap 'rmdir "$lock" 2> /dev/null || true' EXIT

versionize() {
  local framework_dir="$1" version="$2"
  # Not downloaded (built from source, or this pod isn't installed).
  [ -d "$framework_dir" ] || return 0

  local name
  name="$(basename "$framework_dir" .framework)"
  (
    cd "$framework_dir"

    # Already versioned: Versions/Current is a link and the top level holds
    # only links, Resources among them.
    if [ -L Versions/Current ] && [ -L Resources ]; then
      local flat=0 item
      for item in *; do
        [ "$item" = Versions ] || [ -L "$item" ] || flat=1
      done
      [ "$flat" = 0 ] && return 0
    fi

    mkdir -p "Versions/$version/Resources"

    local item
    for item in *; do
      [ "$item" = Versions ] && continue
      case "$item" in
      "$name" | Headers | Modules | Resources)
        # Top-level bundle members get a symlink into Versions/Current.
        [ -L "$item" ] && continue
        if [ -d "$item" ] && [ -d "Versions/$version/$item" ]; then
          cp -R "$item/." "Versions/$version/$item/"
          rm -rf "$item"
        elif [ -e "Versions/$version/$item" ]; then
          rm -rf "$item"
        else
          mv "$item" "Versions/$version/"
        fi
        ln -s "Versions/Current/$item" "$item"
        ;;
      *)
        # Anything else (Info.plist, privacy manifests) belongs in Resources.
        [ -L "$item" ] && rm -f "$item"
        if [ -e "$item" ]; then
          if [ -e "Versions/$version/Resources/$item" ]; then
            rm -rf "$item"
          else
            mv "$item" "Versions/$version/Resources/"
          fi
        elif [ -e "Versions/$version/$item" ] && [ ! -e "Versions/$version/Resources/$item" ]; then
          mv "Versions/$version/$item" "Versions/$version/Resources/"
        fi
        ;;
      esac
    done

    # Info.plist now lives in Resources, which needs its top-level link too.
    [ -e Resources ] || ln -s Versions/Current/Resources Resources

    # Some releases ship Versions/Current as a real folder; replace it with
    # the link (ln -sfn alone would put the link inside that folder).
    [ -L Versions/Current ] || rm -rf Versions/Current
    ln -sfn "$version" Versions/Current
  )
}

slice=ios-arm64_x86_64-maccatalyst
for framework in "$@"; do
  case "$framework" in
  hermesvm)
    versionize "$pods_root/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/$slice/hermesvm.framework" 1
    ;;
  React)
    versionize "$pods_root/React-Core-prebuilt/React.xcframework/$slice/React.framework" A
    ;;
  ReactNativeDependencies)
    versionize "$pods_root/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/$slice/ReactNativeDependencies.framework" A
    ;;
  *)
    echo "Unknown framework: $framework" >&2
    exit 1
    ;;
  esac
done
