#!/bin/bash
# Gives React Native's prebuilt Mac Catalyst frameworks (Hermes, React and
# ReactNativeDependencies) the versioned macOS bundle layout.
#
# Their maccatalyst slices ship flat, like iOS frameworks. A Mac app needs
# Versions/<version>/ with Versions/Current and top-level symlinks, or the
# Catalyst build fails to embed and sign them. The Podfile runs this after
# `pod install` and after each "Replace … for the right configuration" build
# phase, which extracts a fresh flat copy when the configuration changes.
#
# Usage: fix-catalyst-frameworks.sh [Pods folder] (default: ios/Pods)

set -euo pipefail

pods_root="${1:-$(dirname "$0")/../ios/Pods}"

versionize() {
  local framework_dir="$1" version="$2"
  # Not downloaded (built from source, or this pod isn't installed).
  [ -d "$framework_dir" ] || return 0

  local name
  name="$(basename "$framework_dir" .framework)"
  (
    cd "$framework_dir"
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

    rm -rf Versions/Current
    ln -s "$version" Versions/Current
  )
}

slice=ios-arm64_x86_64-maccatalyst
versionize "$pods_root/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/$slice/hermesvm.framework" 1
versionize "$pods_root/React-Core-prebuilt/React.xcframework/$slice/React.framework" A
versionize "$pods_root/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/$slice/ReactNativeDependencies.framework" A
