#!/bin/bash
# CI only: say whether this run's changes touch any of the given paths, so a
# job's later steps can skip themselves. The job still runs and passes, so it
# can be a required check (a workflow-level `paths:` filter would leave it
# pending instead).
#
#   scripts/changed-files.sh <set> >> "$GITHUB_OUTPUT"
#
# Sets (each also counts its own workflow file, this script and the shared JS
# setup action):
#   android-unit   what the modules' Android unit tests build (ci.yml)
#   android-build  what the Android release build builds (native.yml)
#
# Prints `changed=true` or `changed=false`. Pull requests compare the merge
# commit with its base (checkout's default); pushes compare with the previous
# head. Anything it can't diff (a new branch, a manual run) counts as changed.
# Needs actions/checkout with fetch-depth: 2.
set -euo pipefail

# Android sources and what they build from: native code, patches, the JS
# dependencies, app config and the Node version.
android='android/|modules/([^/]+/(android/|expo-module\.config\.json$)|unit-tests\.gradle$)|patches/|package\.json$|pnpm-(lock|workspace)\.yaml$|app\.json$|\.node-version$'
shared='scripts/changed-files\.sh$|\.github/actions/setup-js/'
case "${1:-}" in
android-unit)
  pattern="^($android|$shared|scripts/(test-android\.sh|android-coverage\.mjs)$|\.github/workflows/ci\.yml$)"
  ;;
android-build)
  pattern="^($android|$shared|\.github/workflows/native\.yml$)"
  ;;
*)
  echo "usage: $0 android-unit|android-build" >&2
  exit 2
  ;;
esac

case "${GITHUB_EVENT_NAME:-}" in
pull_request) base=HEAD^1 ;;
push)
  base="$(jq -r .before "$GITHUB_EVENT_PATH")"
  if [[ "$base" =~ ^0+$ ]] || ! git fetch --quiet --depth=1 origin "$base"; then
    base=""
  fi
  ;;
*) base="" ;;
esac

if [ -z "$base" ]; then
  echo "changed=true"
  exit 0
fi

files="$(git diff --name-only "$base" HEAD)"
echo "Changed files:" >&2
echo "  ${files//$'\n'/$'\n  '}" >&2
# grep exits 1 for no match and 2 for a bad pattern, which must fail the job
# rather than skip it.
status=0
echo "$files" | grep -Eq "$pattern" || status=$?
case $status in
0) echo "changed=true" ;;
1) echo "changed=false" ;;
*) exit "$status" ;;
esac
