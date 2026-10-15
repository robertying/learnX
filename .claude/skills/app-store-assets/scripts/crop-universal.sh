#!/bin/zsh
# crop-universal.sh <universal-5244x2950.png> <header-out.png> <search-out.png>
# Centre-crops the universal 16:9 asset to the two placements and scales to the spec sizes:
#   header 21:9 -> 3840x1646, search results 3:2 -> 3840x2560. sips keeps no alpha for opaque PNGs.
set -e
in=$1
w=$(sips -g pixelWidth "$in" | awk '/pixelWidth/{print $2}'); h=$(sips -g pixelHeight "$in" | awk '/pixelHeight/{print $2}')
hh=$(( w * 1646 / 3840 )); sw=$(( h * 3840 / 2560 ))
sips -c $hh $w "$in" --out "$2" >/dev/null && sips -z 1646 3840 "$2" >/dev/null
sips -c $h $sw "$in" --out "$3" >/dev/null && sips -z 2560 3840 "$3" >/dev/null
