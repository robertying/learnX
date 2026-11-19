#!/bin/bash
# CI only: say whether a pull request touches what a required job builds or
# tests, so its later steps can skip themselves. The job still runs and
# passes, so it can be a required check (a workflow-level `paths:` filter
# would leave it pending instead).
#
#   scripts/ci/changed-files.sh android >> "$GITHUB_OUTPUT"
#   scripts/ci/changed-files.sh electron >> "$GITHUB_OUTPUT"
#
# Prints `changed=true` or `changed=false`, comparing the merge commit with its
# base (checkout's default). Anything else (a push, a manual run) counts as
# changed. Needs actions/checkout with fetch-depth: 2.
set -euo pipefail

case "${1:-}" in
android)
  # Android sources and what they build from: native code, patches, the JS
  # dependencies, app config and the Node version; the scripts and workflow
  # that build and test them (the build's preBuild runs check-patches.sh),
  # and the shared JS setup. Changed when any file
  # matches.
  pattern='^(android/|modules/([^/]+/(android/|expo-module\.config\.json$)|unit-tests\.gradle$)|patches/|package\.json$|pnpm-(lock|workspace)\.yaml$|app\.json$|\.node-version$|scripts/(ci/(changed-files|write-e2e-env)\.sh|checks/(test-android\.sh|check-patches\.sh|android-coverage\.mjs|coverage-table\.mjs)|e2e/ota-e2e-cert\.sh)$|\.github/(workflows/android\.yml|actions/setup-js/))'
  match=any
  ;;
electron)
  # The Windows and Linux app runs the shared JS, so almost any change can
  # affect it. Unchanged only when every file is one it never uses: native
  # code, the Maestro flows, fastlane, docs, and the other platforms'
  # workflows.
  pattern='^(ios/|android/|modules/[^/]+/(ios|android)/|\.maestro/|fastlane/|docs/|\.github/workflows/(js|android|apple|caches)\.yml$)|\.md$'
  match=outside
  ;;
*)
  echo "Usage: $0 android|electron" >&2
  exit 2
  ;;
esac

if [ "${GITHUB_EVENT_NAME:-}" != pull_request ]; then
  echo changed=true
  exit 0
fi

files="$(git diff --name-only HEAD^1 HEAD)"
echo "Changed files:" >&2
echo "  ${files//$'\n'/$'\n  '}" >&2
# grep exits 1 for no match and 2 for a bad pattern, which must fail the job
# rather than skip it. -v selects the files outside the pattern.
flags=-Eq
[ "$match" = outside ] && flags=-Eqv
status=0
echo "$files" | grep "$flags" "$pattern" || status=$?
case $status in
0) echo changed=true ;;
1) echo changed=false ;;
*) exit "$status" ;;
esac
