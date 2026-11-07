#!/bin/zsh
# duo-capture.sh <display 1|3> <out.png> [udid]
# Capture one iPhone Duo display with a timeout (simctl screenshot can hang).
# 1 = outer, 3 = inner. The device is, in order: the udid argument, $DUO_UDID,
# or the only booted simulator with "Duo" in its name.
if [[ $# -lt 2 ]]; then
  echo "usage: $0 <display 1|3> <out.png> [udid]" >&2
  exit 1
fi

U=${3:-$DUO_UDID}
if [[ -z $U ]]; then
  duos=$(xcrun simctl list devices booted | grep 'Duo' | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')
  count=$(print -r -- "$duos" | grep -c .)
  if [[ $count -ne 1 ]]; then
    echo "expected exactly one booted Duo simulator, found $count; pass a udid or set DUO_UDID" >&2
    exit 1
  fi
  U=$duos
fi

rm -f "$2"
xcrun simctl io $U screenshot --display $1 "$2" >/dev/null 2>&1 &
p=$!
for i in {1..30}; do sleep 1; kill -0 $p 2>/dev/null || break; done
kill $p 2>/dev/null
ls -l "$2" 2>/dev/null | awk '{print $5}'
