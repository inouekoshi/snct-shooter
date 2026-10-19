#!/bin/sh
set -eu
cd "$(dirname "$0")"
CHROME="${CHROME:-$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell}"
PAGE="file://$PWD/banner.html"

render() {
  "$CHROME" --headless --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=8000 --window-size="$2,$3" \
    --screenshot="$PWD/$1" "$PAGE?w=$2&h=$3&layout=$4" 2>/dev/null
}

render card-16x9.png 1920 1080 card
