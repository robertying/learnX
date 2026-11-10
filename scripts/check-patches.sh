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
done

exit $missing
