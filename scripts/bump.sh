#!/bin/bash
# Set the app version everywhere and bump the build number (fastlane's `bump` lane).
#   pnpm bump major|minor|patch   the next version (18.0.3: 19.0.0, 18.1.0, 18.0.4)
#   pnpm bump 19.0.0              that version
#   both move the build number to the next multiple of 10
#   pnpm bump                     a rebuild of the current version: build number + 1
set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
usage() {
  echo "Usage: pnpm bump [major|minor|patch|x.y.z]" >&2
  exit 1
}
[ $# -le 1 ] || usage
version="${1:-}"
case "$version" in
  "") ;;
  major | minor | patch)
    IFS=. read -r x y z < <(node -p 'require("./package.json").version')
    case "$version" in
      major) version="$((x + 1)).0.0" ;;
      minor) version="$x.$((y + 1)).0" ;;
      patch) version="$x.$y.$((z + 1))" ;;
    esac
    ;;
  v[0-9]* | [0-9]*) ;;
  *) usage ;;
esac
exec bundle exec fastlane bump ${version:+"version:$version"}
