#!/bin/bash
# Removes one linked git worktree of learnX and what was built for it outside
# it, to free the disk once the work in it is done. Dry run by default: it
# prints what it would remove and how much space that frees; pass --apply to
# remove it.
#
#   scripts/dev/clean-worktree.sh [--apply] [--discard-changes] <worktree>
#
# It removes:
# - the worktree folder, with everything built or installed in it
#   (node_modules, Pods, Android and Gradle outputs, build/, the Jest cache);
# - the Xcode DerivedData folders whose workspace is in that worktree, under
#   Xcode's DerivedData location ($DERIVED_DATA_ROOT overrides it), and the
#   temporary files Xcode keeps for them;
# - its local branch, when a remote branch has the branch's last commit.
# Apps built there are unregistered from Launch Services first, so the share
# sheet and learnx:// links don't keep pointing at a deleted copy
# (unregister-apps.sh unregisters every stray copy, wherever it was built).
#
# It takes exactly one worktree and never looks for others to clean: whether
# another worktree is still someone's work is not something a script can
# tell. It refuses the main checkout, a worktree that `git worktree lock`
# locked, one with uncommitted changes or commits on no remote branch (unless
# --discard-changes), one that a running process other than a shell or a
# Claude session has files open in, and one whose DerivedData folder a script
# is building or testing in (its lock, scripts/lib/derived-data.sh). Shared
# caches (~/.gradle, the pnpm store, CocoaPods' cache, DerivedData's
# ModuleCache.noindex and CompilationCache.noindex, simulators and emulators)
# are never touched.
set -euo pipefail

apply=0
discard=0
wt=""
for arg in "$@"; do
  case "$arg" in
  --apply) apply=1 ;;
  --discard-changes) discard=1 ;;
  -*)
    echo "unknown option: $arg" >&2
    exit 2
    ;;
  *)
    [ -z "$wt" ] || {
      echo "pass one worktree" >&2
      exit 2
    }
    wt="$arg"
    ;;
  esac
done
if [ -z "$wt" ]; then
  echo "usage: clean-worktree.sh [--apply] [--discard-changes] <worktree>" >&2
  exit 2
fi

refuse() {
  echo "refused: $*" >&2
  exit 1
}

[ -d "$wt" ] || refuse "$wt isn't a folder"
wt="$(cd "$wt" && pwd -P)"
top="$(git -C "$wt" rev-parse --show-toplevel 2>/dev/null)" ||
  refuse "$wt isn't in a git checkout"
top="$(cd "$top" && pwd -P)"
[ "$top" = "$wt" ] || refuse "$wt is inside $top; pass the worktree's own folder"
common="$(git -C "$wt" rev-parse --path-format=absolute --git-common-dir)"
gitdir="$(git -C "$wt" rev-parse --path-format=absolute --git-dir)"
[ "$common" != "$gitdir" ] ||
  refuse "$wt is the main checkout, not a linked worktree"
# Run git from the main checkout's .git, which outlives the worktree.
g() { git --git-dir="$common" "$@"; }

# Other worktrees, which must not be under this one.
while IFS= read -r other; do
  other="$(cd "$other" 2>/dev/null && pwd -P)" || continue
  [ "$other" = "$wt" ] && continue
  case "$other/" in
  "$wt"/*) refuse "another worktree, $other, is inside $wt" ;;
  esac
done < <(g worktree list --porcelain | sed -n 's/^worktree //p')

[ ! -e "$gitdir/locked" ] ||
  refuse "$wt is locked ($(cat "$gitdir/locked")); git worktree unlock it first if it's yours"

if [ "$discard" = 0 ]; then
  changes="$(git -C "$wt" status --porcelain)"
  [ -z "$changes" ] ||
    refuse "$wt has uncommitted changes (--discard-changes drops them):
$changes"
  unpushed="$(git -C "$wt" log --oneline HEAD --not --remotes | head -5)"
  [ -z "$unpushed" ] ||
    refuse "$wt has commits on no remote branch (push them, or --discard-changes drops them):
$unpushed"
fi

command -v lsof >/dev/null ||
  refuse "lsof isn't installed, so it can't tell whether anything still uses $wt"
# Processes with a file, folder or executable in the worktree. A shell or a
# Claude session sitting in it is the one cleaning up; anything else (Metro,
# Gradle, Xcode, an app built there) is still using it. The pipeline runs from
# / so its own commands don't count when this runs from inside the worktree.
holders="$(cd / && lsof -nP -Fpcn 2>/dev/null | awk -v wt="$wt" '
  /^p/ { pid = substr($0, 2) }
  /^c/ { cmd = substr($0, 2) }
  /^n\// {
    path = substr($0, 2)
    if ((index(path, wt "/") == 1 || path == wt) &&
        cmd !~ /^(-?(ba|z|fi|da|k)?sh|claude|disclaimer|lsof|awk|mds.*|mdworker.*|StorageManagementService)$/)
      print pid " " cmd
  }' | sort -u)" || true
[ -z "$holders" ] ||
  refuse "these processes still use $wt (stop the ones you started):
$holders"

# Xcode's DerivedData location: its setting, else the default.
dd_root="${DERIVED_DATA_ROOT:-}"
if [ -z "$dd_root" ] && command -v defaults >/dev/null; then
  dd_root="$(defaults read com.apple.dt.Xcode IDECustomDerivedDataLocation 2>/dev/null || true)"
fi
dd_root="${dd_root:-$HOME/Library/Developer/Xcode/DerivedData}"

# DerivedData folders whose workspace is in the worktree. Xcode records the
# workspace in each one's info.plist; read as text, so no macOS tool is needed.
derived=()
for d in "$dd_root"/*/; do
  d="${d%/}"
  [ -f "$d/info.plist" ] || continue
  ws="$(awk '
    found { sub(/.*<string>/, ""); sub(/<\/string>.*/, ""); print; exit }
    /<key>WorkspacePath<\/key>/ { found = 1 }' "$d/info.plist")"
  case "$ws" in
  "$wt"/*) derived+=("$d") ;;
  esac
done

# The scripts' named DerivedData folders (learnX-e2e, ...) are shared by
# every checkout, the worktree's only if it built there last; a run holding
# one's lock (scripts/lib/derived-data.sh) is building or testing in it.
for d in ${derived[@]+"${derived[@]}"}; do
  pid="$(cat "$d.lock/pid" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    refuse "a run from $(cat "$d.lock/checkout" 2>/dev/null || echo "another checkout") is using $d"
  fi
done

# Xcode's temporary files for those DerivedData folders, named after their
# path with / as _.
temp=()
tmp_root="${TMPDIR:-/tmp}"
tmp_root="${tmp_root%/}"
for d in ${derived[@]+"${derived[@]}"}; do
  prefix="$(printf '%s' "$d" | tr / _)"
  for t in "$tmp_root/$prefix" "$tmp_root/$prefix".* "$tmp_root/$prefix"_*; do
    [ -e "$t" ] && temp+=("$t")
  done
done

branch="$(git -C "$wt" symbolic-ref -q --short HEAD || true)"
drop_branch=0
if [ -n "$branch" ] && [ -n "$(g branch -r --contains "refs/heads/$branch" 2>/dev/null)" ]; then
  drop_branch=1
fi

size() { du -skc "$@" 2>/dev/null | tail -1 | cut -f1; }
human() { awk -v k="$1" 'BEGIN { if (k >= 1048576) printf "%.1f GB", k / 1048576; else printf "%.0f MB", k / 1024 }'; }

echo "worktree $wt: $(human "$(size "$wt")")"
for d in ${derived[@]+"${derived[@]}"}; do
  echo "DerivedData $d: $(human "$(size "$d")")"
done
if [ "${#temp[@]}" -gt 0 ]; then
  echo "Xcode's temporary files for it in $tmp_root: ${#temp[@]}, $(human "$(size "${temp[@]}")")"
fi
if [ -n "$branch" ]; then
  if [ "$drop_branch" = 1 ]; then
    echo "branch $branch (also on a remote)"
  else
    echo "keeps branch $branch: no remote branch has its last commit"
  fi
fi
echo "total: $(human "$(size "$wt" ${derived[@]+"${derived[@]}"} ${temp[@]+"${temp[@]}"})")"

if [ "$apply" = 0 ]; then
  echo "(dry run: pass --apply to remove these)"
  exit 0
fi

# Launch Services keeps a record for every app it has seen, built ones
# included; one left for a deleted build can be the one macOS picks.
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
if [ -x "$lsregister" ]; then
  find "$wt" ${derived[@]+"${derived[@]}"} -name node_modules -prune -o \
    -type d -name '*.app' -prune -print 2>/dev/null |
    while IFS= read -r app; do
      "$lsregister" -u "$app" >/dev/null 2>&1 || true
    done
fi

# Leave the worktree before removing it, in case this runs from inside it.
cd "$common"
g worktree remove --force --force "$wt"
g worktree prune
for d in ${derived[@]+"${derived[@]}"} ${temp[@]+"${temp[@]}"}; do
  rm -rf "$d"
done
if [ "$drop_branch" = 1 ]; then
  g branch -q -D "$branch"
fi
echo "removed"
