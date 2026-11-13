#!/bin/bash
# CI only: say whether a pull request touches what CI's Android job builds or
# tests, so its later steps can skip themselves. The job still runs and
# passes, so it can be a required check (a workflow-level `paths:` filter
# would leave it pending instead).
#
#   scripts/changed-files.sh >> "$GITHUB_OUTPUT"
#
# Prints `changed=true` or `changed=false`, comparing the merge commit with its
# base (checkout's default). Anything else (a push, a manual run) counts as
# changed. Needs actions/checkout with fetch-depth: 2.
set -euo pipefail

# Android sources and what they build from: native code, patches, the JS
# dependencies, app config and the Node version; the scripts and workflow that
# build and test them, and the shared JS setup.
pattern='^(android/|modules/([^/]+/(android/|expo-module\.config\.json$)|unit-tests\.gradle$)|patches/|package\.json$|pnpm-(lock|workspace)\.yaml$|app\.json$|\.node-version$|scripts/(changed-files\.sh|test-android\.sh|android-coverage\.mjs)$|\.github/(workflows/ci\.yml|actions/setup-js/))'

if [ "${GITHUB_EVENT_NAME:-}" != pull_request ]; then
  echo "changed=true"
  exit 0
fi

files="$(git diff --name-only HEAD^1 HEAD)"
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
