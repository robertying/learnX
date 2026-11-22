#!/bin/bash
# The app version on main, and the release build number (fastlane's `bump` lane).
#   pnpm bump major|minor|patch   move main's app version (18.0.3: 19.0.0, 18.1.0, 18.0.4)
#   pnpm bump 19.0.0              to that version
#     on every platform, for a pull request (with the runtime version when
#     native code changed); only once the current version has shipped to
#     production (its v<version> tag), so betas of a coming release keep it
#   pnpm bump [build]             this version's next release build number, which
#                                 stays out of the repo: a version's first build
#                                 starts at the next multiple of 10, later ones
#                                 add 1, both above the highest build App Store
#                                 Connect and Google Play already have
#   add --build <number> to set the build number yourself
#   add --offline to skip asking the stores
set -euo pipefail
cd "$(dirname "$0")/../.."
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
usage() {
  echo "Usage: pnpm bump major|minor|patch|x.y.z | pnpm bump [build] [--build <number>] [--offline]" >&2
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
[ -z "$version" ] || [ -z "$build$remote" ] || usage
exec bundle exec fastlane bump ${version:+"version:$version"} ${build:+"build:$build"} ${remote:+"remote:$remote"}
