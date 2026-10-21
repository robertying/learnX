#!/bin/bash
# Usage: scripts/publish_android_release.sh <version>   e.g. 18.0.0 (a leading "v" is optional)
#
# Removes APKs of older versions from the release folder, copies the new release APKs there
# under their learnX names, then refreshes latest.json with the new version, filenames and
# sha256 sums.

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="/Users/rying/Downloads/learnX release"
APK_DIR="${DIR}/../android/app/build/outputs/apk/release"
ABIS=(x86_64 arm64-v8a armeabi-v7a x86 universal)

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="${1#v}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid version '$1': expected x.y.z" >&2
  exit 1
fi
VERSION_TAG="v${VERSION}"

GRADLE_VERSION="$(sed -n 's/^[[:space:]]*versionName "\(.*\)"$/\1/p' "${DIR}/../android/app/build.gradle" | head -n 1)"
if [ "$GRADLE_VERSION" != "$VERSION" ]; then
  echo "Version $VERSION does not match versionName '$GRADLE_VERSION' in android/app/build.gradle" >&2
  exit 1
fi

mkdir -p "$DEST"

for abi in "${ABIS[@]}"; do
  src="${APK_DIR}/app-${abi}-release.apk"
  if [ ! -f "$src" ]; then
    echo "Missing release APK: $src" >&2
    exit 1
  fi
done

shopt -s nullglob
for abi in "${ABIS[@]}"; do
  for old in "${DEST}/learnX-${abi}-v"*.apk; do
    if [ "$(basename "$old")" != "learnX-${abi}-${VERSION_TAG}.apk" ]; then
      rm "$old"
      echo "Removed old APK: $(basename "$old")"
    fi
  done
done
shopt -u nullglob

FILE_ARGS=()
for abi in "${ABIS[@]}"; do
  src="${APK_DIR}/app-${abi}-release.apk"
  name="learnX-${abi}-${VERSION_TAG}.apk"
  cp "$src" "${DEST}/${name}"
  sha="$(shasum -a 256 "${DEST}/${name}" | awk '{print $1}')"
  echo "${name}  ${sha}"
  FILE_ARGS+=("${name}:${sha}")
done

python3 -I - "${DEST}/latest.json" "$VERSION" "${FILE_ARGS[@]}" <<'PY'
import json
import sys

path, version = sys.argv[1], sys.argv[2]
files = []
for arg in sys.argv[3:]:
    name, sha256 = arg.split(":", 1)
    files.append({"name": name, "sha256": sha256})

with open(path, "w") as f:
    json.dump({"version": version, "files": files}, f, indent=2)
    f.write("\n")
PY
echo "Updated ${DEST}/latest.json"
