#!/bin/bash
# CI only: say whether this run's changes touch any of the given paths, so a
# job's later steps can skip themselves. The job still runs and passes, so it
# can be a required check (a workflow-level `paths:` filter would leave it
# pending instead).
#
#   scripts/changed-files.sh <extended regex> >> "$GITHUB_OUTPUT"
#
# Prints `changed=true` or `changed=false`. Pull requests compare the merge
# commit with its base (checkout's default); pushes compare with the previous
# head. Anything it can't diff (a new branch, a manual run) counts as changed.
# Needs actions/checkout with fetch-depth: 2.
set -euo pipefail

pattern="${1:?usage: $0 <extended regex>}"

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
echo "$files" | sed 's/^/  /' >&2
if echo "$files" | grep -Eq "$pattern"; then
  echo "changed=true"
else
  echo "changed=false"
fi
