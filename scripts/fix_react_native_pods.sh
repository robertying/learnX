#!/bin/bash
set -euo pipefail

linkify_framework() {
  local framework_dir="$1"
  local version="$2"
  local fw_name
  fw_name="$(basename "$framework_dir" .framework)"

  pushd "$framework_dir" >/dev/null

  mkdir -p "Versions/$version/Resources"

  local item
  for item in *; do
    [ "$item" = "Versions" ] && continue

    case "$item" in
    "$fw_name" | Headers | Modules | Resources)
      # Recognized top-level bundle members: get their own symlink into
      # Versions/Current.
      [ -L "$item" ] && continue # already linked, nothing to do
      if [ -e "Versions/$version/$item" ]; then
        rm -rf "$item"
      else
        mv "$item" "Versions/$version/"
      fi
      ln -s "Versions/Current/$item" "$item"
      ;;
    *)
      # Anything else isn't part of the recognized top-level layout,
      # so nest it inside Resources instead of giving it its own symlink.
      [ -L "$item" ] && rm -f "$item" # stale top-level link from an older run
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

  pushd Versions >/dev/null
  rm -rf Current
  ln -s "$version" Current
  popd >/dev/null

  popd >/dev/null
}

linkify_framework ios/Pods/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64_x86_64-maccatalyst/hermesvm.framework 1
linkify_framework ios/Pods/React-Core-prebuilt/React.xcframework/ios-arm64_x86_64-maccatalyst/React.framework A
linkify_framework ios/Pods/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/ios-arm64_x86_64-maccatalyst/ReactNativeDependencies.framework A
