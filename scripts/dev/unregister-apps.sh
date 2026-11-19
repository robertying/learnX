#!/bin/bash
# Unregisters every copy of the learnX Mac app that Launch Services knows
# about, except the installed one, so the share sheet offers one learnX and
# learnx:// links open the app you expect. Dry run by default: it prints what
# it would unregister; pass --apply to unregister.
#
#   scripts/dev/unregister-apps.sh [--apply] [--keep <app>]... [--keep-none]
#
# Launch Services records every app bundle it has seen, and each build, from
# any worktree, DerivedData folder or archive, adds one, with its share
# extension. The records outlive the files, and the share sheet lists a share
# extension once per copy, until the record is removed. clean-worktree.sh
# unregisters only the apps it finds in the one worktree it removes; this
# finds them all from Launch Services' own list (`lsregister -dump`), so it
# also catches copies whose folder is already gone.
#
# It matches by bundle id: the app's ($LEARNX_BUNDLE_ID, io.robertying.learnX
# by default) and its extensions' (the same id and a dot), so the Electron
# app's io.robertying.learnXElectron is left to `pnpm electron:clean`. An
# extension is unregistered with the app it is inside. Kept are the apps
# passed with --keep (or listed in $LEARNX_KEEP_APPS, separated by colons),
# /Applications/learnX.app when neither is given, and the App Store's
# placeholders for an install or update in progress; --keep-none keeps none
# but the placeholders. Kept apps are registered again at the end, so one of
# them becomes the copy macOS picks.
#
# It only unregisters: it never deletes a file, a build or a worktree, and a
# copy still on disk is registered again the next time it is built or opened.
set -euo pipefail

apply=0
keep_none=0
keep=()
for arg in "$@"; do
  if [ "${expect_keep:-0}" = 1 ]; then
    keep+=("$arg")
    expect_keep=0
    continue
  fi
  case "$arg" in
  --apply) apply=1 ;;
  --keep) expect_keep=1 ;;
  --keep=*) keep+=("${arg#--keep=}") ;;
  --keep-none) keep_none=1 ;;
  *)
    echo "usage: unregister-apps.sh [--apply] [--keep <app>]... [--keep-none]" >&2
    exit 2
    ;;
  esac
done
if [ "${expect_keep:-0}" = 1 ]; then
  echo "--keep needs an app" >&2
  exit 2
fi
if [ "$keep_none" = 1 ]; then
  keep=()
elif [ "${#keep[@]}" = 0 ]; then
  if [ -n "${LEARNX_KEEP_APPS:-}" ]; then
    IFS=: read -r -a keep <<<"$LEARNX_KEEP_APPS"
  else
    keep=(/Applications/learnX.app)
  fi
fi
id="${LEARNX_BUNDLE_ID:-io.robertying.learnX}"

lsregister="${LSREGISTER:-/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister}"
[ -x "$lsregister" ] || {
  echo "Launch Services' lsregister isn't at $lsregister: this runs on a Mac" >&2
  exit 1
}

# Each record in the dump starts after a line of dashes; its first path and
# identifier are the bundle's own. Prints "<path>\t<identifier>" for the
# app's and its extensions' records.
records="$("$lsregister" -dump 2>/dev/null | awk -v id="$id" '
  function flush() {
    if (path != "" && (ident == id || index(ident, id ".") == 1))
      print path "\t" ident
    path = ""; ident = ""
  }
  /^-+$/ { flush(); next }
  path == "" && /^path:/ {
    sub(/^path:[ \t]+/, ""); sub(/ \(0x[0-9a-f]+\)$/, ""); path = $0
  }
  ident == "" && /^identifier:/ { ident = $2 }
  END { flush() }')"

kept() {
  local p="$1" k
  case "$p" in
  */Placeholders-v*.noindex/*) return 0 ;;
  esac
  for k in ${keep[@]+"${keep[@]}"}; do
    k="${k%/}"
    case "$p" in
    "$k" | "$k"/*) return 0 ;;
    esac
  done
  return 1
}

# The app each record belongs to: the outermost .app in its path, so an
# extension goes with the app that holds it.
apps=()
extensions=()
kept_apps=()
while IFS=$'\t' read -r path _; do
  [ -n "$path" ] || continue
  app="${path%%.app/*}"
  [ "$app" = "$path" ] || app="$app.app"
  if kept "$path"; then
    kept_apps+=("$app")
    continue
  fi
  apps+=("$app")
  [ "$app" = "$path" ] || extensions+=("$path")
done <<<"$records"

uniq_lines() { printf '%s\n' "$@" | awk 'NF && !seen[$0]++'; }

if [ "${#kept_apps[@]}" -gt 0 ]; then
  while IFS= read -r app; do
    echo "keeps $app"
  done < <(uniq_lines "${kept_apps[@]}")
fi
if [ "${#apps[@]}" = 0 ]; then
  echo "no other copy of $id is registered"
  exit 0
fi
count=0
while IFS= read -r app; do
  if [ -e "$app" ]; then
    echo "unregisters $app"
  else
    echo "unregisters $app (already deleted)"
  fi
  count=$((count + 1))
done < <(uniq_lines "${apps[@]}")

if [ "$apply" = 0 ]; then
  echo "(dry run: pass --apply to unregister these $count)"
  exit 0
fi

# The share sheet reads extensions from PlugInKit, which Launch Services
# updates when an app is unregistered; removing them there first as well
# drops a record either one would otherwise keep.
if [ "${#extensions[@]}" -gt 0 ] && command -v pluginkit >/dev/null; then
  while IFS= read -r ext; do
    pluginkit -r "$ext" >/dev/null 2>&1 || true
  done < <(uniq_lines "${extensions[@]}")
fi
while IFS= read -r app; do
  "$lsregister" -u "$app" >/dev/null 2>&1 || true
done < <(uniq_lines "${apps[@]}")
for app in ${keep[@]+"${keep[@]}"}; do
  if [ -d "$app" ]; then
    "$lsregister" -f "$app" >/dev/null 2>&1 || true
  fi
done
echo "unregistered $count"
