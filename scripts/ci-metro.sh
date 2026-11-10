#!/bin/bash
# CI only: start Metro in the background (log in build/metro.log) and build the
# platform's bundle once, so the app's first launch in a flow doesn't time out.
#
#   scripts/ci-metro.sh ios|android
set -euo pipefail

platform="${1:?usage: $0 ios|android}"

cd "$(dirname "$0")/.."
mkdir -p build
nohup pnpm start > build/metro.log 2>&1 &

for _ in $(seq 60); do
  if curl -fsS http://localhost:8081/status 2>/dev/null | grep -q packager-status:running; then
    break
  fi
  sleep 2
done

curl -fsS -o /dev/null --max-time 600 \
  "http://localhost:8081/index.bundle?platform=$platform&dev=true&minify=false"
echo "Metro is up and the $platform bundle is built."
