#!/bin/bash
# CI only (electron.yml's Linux E2E job): installs Weston, the headless
# Wayland compositor, from the .deb files cached in $1, with no network and
# no package lists, if they are exactly the packages this runner image lacks.
# Otherwise (no cache yet, or an image that has or needs other packages) it
# downloads them from Ubuntu's mirror into $1, which can take over 15
# minutes, and writes `downloaded=true` to $GITHUB_OUTPUT so main saves them.
set -euo pipefail

debs=$1

# The package names of the cached files, sorted.
cached_names() {
  for deb in "$debs"/*.deb; do
    dpkg-deb --field "$deb" Package
  done | sort
}

# Whether installing the cached files adds exactly those packages: none
# missing (apt would take it from the lists), none replacing an installed
# version (an `Inst name [installed]` line).
cache_fits() {
  compgen -G "$debs/*.deb" > /dev/null || return 1
  local plan
  plan=$(apt-get install --simulate --no-install-recommends "$debs"/*.deb 2> /dev/null) || return 1
  if grep -q '^Inst [^ ]* \[' <<< "$plan"; then
    return 1
  fi
  [ "$(grep '^Inst ' <<< "$plan" | cut -d' ' -f2 | sort)" = "$(cached_names)" ]
}

if cache_fits; then
  echo "Installing Weston from the cache"
else
  echo "The cache doesn't fit this image: downloading Weston"
  sudo rm -rf "$debs"
  mkdir -p "$debs/partial"
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends --download-only \
    -o Dir::Cache::archives="$debs" weston
  sudo rm -rf "$debs/partial" "$debs/lock"
  sudo chmod -R a+r "$debs"
  echo 'downloaded=true' >> "${GITHUB_OUTPUT:-/dev/null}"
fi
sudo dpkg -i "$debs"/*.deb
