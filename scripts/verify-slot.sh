#!/bin/bash
# Long-lived worktrees for building and checking a branch on the shared Mac,
# reused between checks so their Pods and Xcode DerivedData stay warm.
#
#   scripts/verify-slot.sh claim <ref> [note]
#       Take a free slot (.claude/worktrees/verify-<n>, created on first use),
#       check out <ref> (a branch, tag, commit or origin/<branch>; fetched
#       from origin first) detached, discarding what the last check left, and
#       bring node_modules and Pods up to date. Prints the slot's path and its
#       DerivedData path; build with -derivedDataPath set to the latter.
#   scripts/verify-slot.sh release <n>
#       Give slot <n> back. Its worktree and builds are kept for the next check.
#   scripts/verify-slot.sh status
#       List the slots, who holds them and what they have checked out.
#
# A slot's DerivedData is ~/Library/Developer/Xcode/DerivedData/learnX-verify-<n>.
set -euo pipefail

slots=3

repo="$(git rev-parse --path-format=absolute --git-common-dir)"
repo="${repo%/.git}"

slot_dir() { echo "$repo/.claude/worktrees/verify-$1"; }
lock_dir() { echo "$repo/.claude/worktrees/verify-$1.lock"; }
derived_data() { echo "$HOME/Library/Developer/Xcode/DerivedData/learnX-verify-$1"; }

claim() {
  local ref="$1" note="${2:-}" n wt
  # Global, for the EXIT trap.
  lock="" ready=0
  for n in $(seq 1 "$slots"); do
    lock="$(lock_dir "$n")"
    # mkdir is atomic, so two sessions can't take the same slot.
    if mkdir "$lock" 2>/dev/null; then
      printf '%s\n%s\n' "$(date '+%Y-%m-%d %H:%M')" "${note:-$ref}" > "$lock/owner"
      break
    fi
    lock=""
  done
  if [ -z "$lock" ]; then
    echo "No free slot. Held by:" >&2
    status >&2
    exit 1
  fi
  # Give the slot back if setting it up fails.
  trap '[ "$ready" = 1 ] || rm -rf "$lock"' EXIT

  wt="$(slot_dir "$n")"
  git -C "$repo" fetch -q origin || echo "warning: couldn't fetch origin" >&2
  if [ ! -e "$wt/.git" ]; then
    git -C "$repo" worktree add -q --detach "$wt" "$ref"
  else
    git -C "$wt" reset -q --hard
    git -C "$wt" clean -qfd
    git -C "$wt" checkout -q --detach "$ref"
  fi

  # Not --force: reinstalling every package would touch every file and make
  # Xcode rebuild everything. The "Check patches" build phase fails if a patch
  # isn't applied; run `pnpm install --force` in the slot then.
  (cd "$wt" && pnpm install --frozen-lockfile >/dev/null)
  # pod install only when what it reads changed since the slot last ran it.
  local stamp pods_key
  stamp="$wt/ios/Pods/.verify-slot"
  pods_key="$(git -C "$wt" rev-parse HEAD:ios/Podfile HEAD:ios/Podfile.lock HEAD:pnpm-lock.yaml HEAD:patches | paste -sd ' ' -)"
  if [ "$(cat "$stamp" 2>/dev/null)" != "$pods_key" ]; then
    (cd "$wt/ios" && LANG=en_US.UTF-8 bundle exec pod install > "$lock/pod-install.log" 2>&1) || {
      tail -n 30 "$lock/pod-install.log" >&2
      exit 1
    }
    echo "$pods_key" > "$stamp"
  else
    # ExpoWidgets' checksum in Podfile.lock depends on the checkout's path, so
    # the committed one never matches the Pods; put back what pod install wrote
    # here, or the build fails with "The sandbox is not in sync".
    cp "$wt/ios/Pods/Manifest.lock" "$wt/ios/Podfile.lock"
  fi
  ready=1

  echo "slot $n: $wt"
  echo "DerivedData: $(derived_data "$n")"
  echo "HEAD: $(git -C "$wt" log -1 --format='%h %s')"
}

release() {
  local n="$1"
  [ -d "$(lock_dir "$n")" ] || {
    echo "slot $n isn't claimed" >&2
    exit 1
  }
  rm -rf "$(lock_dir "$n")"
  echo "released slot $n"
}

status() {
  local n lock wt head
  for n in $(seq 1 "$slots"); do
    lock="$(lock_dir "$n")"
    wt="$(slot_dir "$n")"
    head="not created"
    [ -e "$wt/.git" ] && head="$(git -C "$wt" log -1 --format='%h %s')"
    if [ -d "$lock" ]; then
      echo "slot $n: held since $(paste -sd ' ' - < "$lock/owner" | sed 's/ /, for /2') ($head)"
    else
      echo "slot $n: free ($head)"
    fi
  done
}

case "${1:-}" in
claim)
  [ -n "${2:-}" ] || {
    echo "usage: $0 claim <ref> [note]" >&2
    exit 1
  }
  claim "$2" "${3:-}"
  ;;
release)
  [ -n "${2:-}" ] || {
    echo "usage: $0 release <n>" >&2
    exit 1
  }
  release "$2"
  ;;
status) status ;;
*)
  sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
  ;;
esac
