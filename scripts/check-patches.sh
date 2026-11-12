#!/bin/sh
# Fails when a patch in patches/ isn't applied to node_modules.
#
# A worktree's node_modules is cloned from another checkout, and
# `pnpm install` there can say "up to date" without applying patches added
# since, so native code can build without them (a Mac Catalyst build without
# the react-native-pager-view patch crashed in CourseDetail). The iOS app's
# "Check patches" build phase and Android's preBuild run this.

cd "$(dirname "$0")/.." || exit 1

# Not a git checkout (git apply needs one): nothing to check against.
git rev-parse --git-dir > /dev/null 2>&1 || exit 0

missing=0
for patch in patches/*.patch; do
  # pnpm names a patch <name>@<version>.patch, with a scoped package's "/" as
  # "__", and its paths are relative to the package folder.
  name=$(basename "$patch" .patch)
  package=$(echo "${name%@*}" | sed 's|__|/|')
  if ! git apply --reverse --check --directory="node_modules/$package" "$patch" > /dev/null 2>&1; then
    echo "error: $patch isn't applied to node_modules. Run 'pnpm install --force' to reinstall packages with every patch." >&2
    missing=1
  fi
  # Expo ships some modules' Android code prebuilt (local-maven-repo), and the
  # app links that instead of the patched sources unless the package is in
  # expo.autolinking.android.buildFromSource (package.json).
  if [ -d "node_modules/$package/local-maven-repo" ] && grep -q '^diff --git a/android/' "$patch" &&
    ! node -e 'process.exit(require("./package.json").expo.autolinking.android.buildFromSource.includes(process.argv[1]) ? 0 : 1)' "$package"; then
    echo "error: $patch changes Android code that $package ships prebuilt. Add it to expo.autolinking.android.buildFromSource in package.json." >&2
    missing=1
  fi
done

exit $missing
