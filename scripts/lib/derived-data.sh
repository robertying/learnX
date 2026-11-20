# shellcheck shell=bash
# The Xcode DerivedData folders the scripts build in (learnX-e2e,
# learnX-e2e-mac, learnX-tests) are named, not per checkout, so every
# checkout and worktree shares one copy of each: on a Mac with several, one
# build each instead of one per checkout. Two runs from different checkouts
# must then take turns with a folder, or they build over each other and one
# installs or tests the other's app. Sourced by the scripts that use them.

# Runs the command after it ($2...) while holding folder $1's lock, a
# `<folder>.lock` folder next to it, waiting while another run holds it. A
# lock whose run has ended without letting go (it was killed) is taken over.
# Don't call it again inside the command, from this run or a script it
# starts: it would wait for itself. The command runs with errexit off (bash
# turns it off in a command whose status is tested), so a function given here
# must stop at its own failures (`&&`, `|| return`).
with_derived_lock() {
  local folder="$1" lock="$1.lock" holder waiting=0 status=0
  shift
  mkdir -p "$(dirname "$folder")"
  until mkdir "$lock" 2>/dev/null; do
    holder="$(cat "$lock/pid" 2>/dev/null || true)"
    # No pid yet: the holder is between taking the lock and writing it.
    if [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; then
      rm -rf "$lock"
      continue
    fi
    if [ "$waiting" = 0 ]; then
      echo "Waiting for $(cat "$lock/checkout" 2>/dev/null || echo "another run") to finish with $folder (its lock: $lock)" >&2
      waiting=1
    fi
    sleep "${DERIVED_LOCK_POLL:-5}"
  done
  echo "$$" >"$lock/pid"
  pwd -P >"$lock/checkout"
  "$@" || status=$?
  rm -rf "$lock"
  return "$status"
}

# Whether folder $1 holds the build of this checkout (the current folder): the
# workspace its info.plist names, which Xcode updates on every build. Another
# checkout may have built there since this one did.
derived_built_here() {
  local ws
  [ -f "$1/info.plist" ] || return 1
  ws="$(awk '
    found { sub(/.*<string>/, ""); sub(/<\/string>.*/, ""); print; exit }
    /<key>WorkspacePath<\/key>/ { found = 1 }' "$1/info.plist")"
  [ "$ws" = "$(pwd -P)/ios/learnX.xcworkspace" ]
}

# Installs the Release simulator app built in folder $1 on simulator $2, if
# this checkout built it (`derived_built_here`). Run it with the folder's lock.
install_built() {
  derived_built_here "$1" &&
    xcrun simctl install "$2" "$1/Build/Products/Release-iphonesimulator/learnX.app"
}
