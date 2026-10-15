#!/bin/zsh
# cap.sh <display 1|3> <out.png> : capture one Duo display with a timeout (simctl screenshot can hang)
U=C02C726F-0A87-4AE8-987B-C382916C1F9C
rm -f "$2"
xcrun simctl io $U screenshot --display $1 "$2" >/dev/null 2>&1 &
p=$!
for i in {1..30}; do sleep 1; kill -0 $p 2>/dev/null || break; done
kill $p 2>/dev/null
ls -l "$2" 2>/dev/null | awk '{print $5}'
