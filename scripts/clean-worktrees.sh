#!/bin/bash
# Free disk space taken by learnX worktrees. Dry run by default: it prints what
# it would delete and the size; pass --apply to delete.
#
#   scripts/clean-worktrees.sh [--apply] builds [worktree...]
#       Delete native build outputs (android/app/{build,.cxx}, android/build,
#       ios/build, and the Gradle outputs inside node_modules/*/android) of the
#       given worktrees, or of the current one. Keeps node_modules, Pods and
#       the release outputs in build/.
#   scripts/clean-worktrees.sh [--apply] stale
#       Remove worktrees under .claude/worktrees whose HEAD is in origin/main,
#       that have no uncommitted or untracked changes and that no process has
#       files open in.
#   scripts/clean-worktrees.sh [--apply] derived-data
#       Delete Xcode DerivedData of learnX workspaces that no longer exist.
#   scripts/clean-worktrees.sh [--apply] all
#       stale, then derived-data.
#
# A worktree that a process (Metro, Gradle, xcodebuild) still has files open
# in is always skipped.
set -euo pipefail

apply=0
if [ "${1:-}" = "--apply" ]; then
  apply=1
  shift
fi
cmd="${1:-}"
shift || true

repo="$(git rev-parse --path-format=absolute --git-common-dir)"
repo="${repo%/.git}"
derived_data="$HOME/Library/Developer/Xcode/DerivedData"

size() { du -shc "$@" 2>/dev/null | tail -1 | cut -f1; }

delete() {
  if [ "$apply" = 1 ]; then
    rm -rf "$@"
  fi
}

open_files=""
in_use() {
  # Paths that build tools (Metro, Gradle, Xcode, fastlane, Maestro) have open
  # or use as their working directory, listed once. Shells and Claude sessions
  # sitting in a worktree don't count.
  if [ -z "$open_files" ]; then
    open_files="$(lsof -nP -Fcn 2>/dev/null | awk '
      /^c/ { keep = ($0 ~ /^c(node|java|ruby|xcodebuild|XCBBuildService|swift-frontend|clang|ld|pnpm.*|npm|watchman|maestro)$/) }
      /^n\// && keep { print substr($0, 2) }' | sort -u)"
  fi
  # A file in the worktree, but not in another worktree nested under it (the
  # main checkout holds .claude/worktrees).
  printf '%s\n' "$open_files" | awk -v wt="$1" '
    (index($0, wt "/") == 1 || $0 == wt) && index($0, wt "/.claude/worktrees/") != 1 { found = 1 }
    END { exit !found }'
}

clean_builds() {
  local wt="$1"
  if in_use "$wt"; then
    echo "skip $wt: in use"
    return
  fi
  local paths=()
  local p
  for p in android/app/build android/app/.cxx android/build ios/build; do
    [ -e "$wt/$p" ] && paths+=("$wt/$p")
  done
  if [ -d "$wt/node_modules" ]; then
    while IFS= read -r p; do
      paths+=("$p")
    done < <(find "$wt/node_modules" -maxdepth 4 -type d \
      \( -path '*/android/build' -o -path '*/android/.cxx' \) -prune -print 2>/dev/null)
  fi
  if [ "${#paths[@]}" = 0 ]; then
    echo "$wt: nothing to clean"
    return
  fi
  echo "$wt: $(size "${paths[@]}") in ${#paths[@]} build folders"
  delete "${paths[@]}"
}

clean_stale() {
  git -C "$repo" fetch -q origin main || echo "warning: couldn't fetch origin/main"
  local wt
  while IFS= read -r wt; do
    case "$wt" in "$repo/.claude/worktrees/"*) ;; *) continue ;; esac
    [ -d "$wt" ] || continue
    if ! git -C "$repo" merge-base --is-ancestor "$(git -C "$wt" rev-parse HEAD)" origin/main; then
      echo "keep $wt: has commits not in main"
    elif [ -n "$(git -C "$wt" status --porcelain)" ]; then
      echo "keep $wt: has uncommitted changes"
    elif in_use "$wt"; then
      echo "keep $wt: in use"
    else
      echo "remove $wt ($(size "$wt"))"
      [ "$apply" = 1 ] && git -C "$repo" worktree remove --force "$wt"
    fi
  done < <(git -C "$repo" worktree list --porcelain | sed -n 's/^worktree //p')
  [ "$apply" = 1 ] && git -C "$repo" worktree prune
  return 0
}

clean_derived_data() {
  local d ws
  for d in "$derived_data"/learnX-*; do
    [ -d "$d" ] || continue
    ws="$(/usr/libexec/PlistBuddy -c 'Print WorkspacePath' "$d/info.plist" 2>/dev/null || true)"
    if [ -n "$ws" ] && [ -e "$ws" ]; then
      continue
    fi
    echo "delete $d (${ws:-unknown workspace}, $(size "$d"))"
    delete "$d"
  done
}

case "$cmd" in
builds)
  if [ "$#" = 0 ]; then
    set -- "$(git rev-parse --show-toplevel)"
  fi
  for wt in "$@"; do
    clean_builds "$(cd "$wt" && pwd)"
  done
  ;;
stale) clean_stale ;;
derived-data) clean_derived_data ;;
all)
  clean_stale
  clean_derived_data
  ;;
*)
  sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
  ;;
esac

if [ "$apply" = 0 ]; then
  echo "(dry run: pass --apply to delete)"
fi
