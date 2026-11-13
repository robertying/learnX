#!/bin/bash
# CI only (caches.yml, after each main run): delete superseded GitHub Actions caches so the repo stays
# under its 10 GB limit. Every dependency change makes new Gradle entries
# (~1.3 GB of dependencies, ~0.9 GB of transforms) and each main commit can
# save new ccache, Pods and Xcode entries; the old ones would otherwise sit
# there until GitHub evicts the least recently used cache, which is usually
# the Xcode compilation cache, since iOS only runs by hand.
#
# Caches are grouped by key without its trailing hash, commit or timestamp.
# Each group keeps its 2 most recently used entries; the ~1.4 GB Xcode
# compilation cache keeps 1. Then it prints what's left.
#
#   GH_TOKEN=... scripts/prune-caches.sh   (needs `actions: write`)
set -euo pipefail

# The awk program uses no {n} regex intervals: Ubuntu's awk (mawk) lacks them.

repo="${GITHUB_REPOSITORY:?}"

gh cache list --repo "$repo" --limit 1000 --sort last_accessed_at --order desc \
  --json id,key,sizeInBytes \
  --jq '.[] | "\(.id)\t\(.sizeInBytes)\t\(.key)"' |
  awk -F '\t' '
    {
      group = $3
      sub(/-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9:.]+Z$/, "", group)
      if (match(group, /-[0-9a-f]+$/) && RLENGTH > 32) group = substr(group, 1, RSTART - 1)
      keep = group ~ /^xcode-cas-/ ? 1 : 2
      if (++seen[group] > keep) print $1 "\t" $2 "\t" $3
    }' |
  while IFS=$'\t' read -r id size key; do
    echo "Deleting $((size / 1048576)) MB  $key"
    gh cache delete --repo "$repo" "$id" || true
  done

gh cache list --repo "$repo" --limit 1000 --sort size_in_bytes --json key,sizeInBytes \
  --jq '.[] | "\(.sizeInBytes / 1048576 | floor) MB  \(.key)"'
gh api "repos/$repo/actions/cache/usage" \
  --jq '"Total: \(.active_caches_size_in_bytes / 1048576 | floor) MB in \(.active_caches_count) caches"'
