#!/bin/bash
# Set the app version everywhere and bump the build number (fastlane's `bump` lane).
#   pnpm bump major|minor|patch   the next version (18.0.3: 19.0.0, 18.1.0, 18.0.4)
#   pnpm bump 19.0.0              that version
#   both move the build number to the next multiple of 10
#   pnpm bump [build]             a rebuild of the current version: build number + 1
#   both start above the highest build App Store Connect and Google Play already have
#   add --build <number> to any of these to set the build number yourself (it must be above the current one)
#   add --offline to skip asking the stores
set -euo pipefail
cd "$(dirname "$0")/../.."
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
usage() {
  echo "Usage: pnpm bump [major|minor|patch|build|x.y.z] [--build <number>] [--offline]" >&2
  exit 1
}
args=()
build=""
remote=""
while [ $# -gt 0 ]; do
  case "$1" in
    --build)
      [[ "${2:-}" =~ ^[0-9]+$ ]] || usage
      build="$2"
      shift 2
      ;;
    --offline)
      remote="false"
      shift
      ;;
    *)
      args+=("$1")
      shift
      ;;
  esac
done
[ ${#args[@]} -le 1 ] || usage
version="${args[0]:-build}"
case "$version" in
  build) version="" ;;
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
exec bundle exec fastlane bump ${version:+"version:$version"} ${build:+"build:$build"} ${remote:+"remote:$remote"}
