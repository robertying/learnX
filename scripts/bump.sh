#!/bin/bash
# Set the app version everywhere and bump the build number (fastlane's `bump` lane).
#   pnpm bump 19.0.0   a new version: build number to the next multiple of 10
#   pnpm bump          a rebuild of the current version: build number + 1
set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
if [ $# -gt 1 ]; then
  echo "Usage: pnpm bump [x.y.z]" >&2
  exit 1
fi
exec bundle exec fastlane bump ${1:+"version:$1"}
