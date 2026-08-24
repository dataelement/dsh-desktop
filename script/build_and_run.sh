#!/bin/bash

set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

mode="${1:---run}"
machine_arch="$(uname -m)"
if [ "$machine_arch" = "arm64" ]; then
  dev_app="$project_root/dist-dev/mac-arm64/Sherlock Dev.app"
  formal_app="$project_root/dist/mac-arm64/Sherlock.app"
else
  dev_app="$project_root/dist-dev/mac/Sherlock Dev.app"
  formal_app="$project_root/dist/mac/Sherlock.app"
fi
dev_executable="$dev_app/Contents/MacOS/Sherlock Dev"

stop_development_app() {
  pkill -x 'Sherlock Dev' 2>/dev/null || true
}

build_development_app() {
  stop_development_app
  npm run package:dev:dir
  test -x "$dev_executable" || {
    echo "Sherlock Dev executable was not built at: $dev_executable" >&2
    exit 1
  }
}

open_development_app() {
  open "$dev_app"
}

case "$mode" in
  --run)
    build_development_app
    open_development_app
    ;;
  --verify)
    build_development_app
    open_development_app
    for _attempt in $(seq 1 60); do
      if pgrep -x 'Sherlock Dev' >/dev/null; then
        echo 'Sherlock Dev is running.'
        exit 0
      fi
      sleep 0.5
    done
    echo 'Sherlock Dev did not stay running.' >&2
    exit 1
    ;;
  --debug)
    build_development_app
    exec /usr/bin/lldb -- "$dev_executable"
    ;;
  --logs)
    build_development_app
    open_development_app
    exec /usr/bin/log stream --style compact --predicate 'process == "Sherlock Dev"'
    ;;
  --telemetry)
    build_development_app
    open_development_app
    exec /usr/bin/log stream --style compact --predicate 'subsystem == "io.dsh.desktop.dev"'
    ;;
  --formal)
    signing_identity="$(security find-identity -v -p codesigning | awk '/"Sherlock Desktop Update Signing"/ { print $2; exit }')"
    test -n "$signing_identity" || {
      echo 'The Sherlock Desktop Update Signing identity is not prepared.' >&2
      exit 1
    }
    CSC_NAME="$signing_identity" npm run package:mac:arm64
    codesign \
      --sign "$signing_identity" \
      --timestamp=none \
      --force \
      "$project_root/dist/sherlock-mac-arm64.dmg"
    codesign --verify --verbose=2 "$project_root/dist/sherlock-mac-arm64.dmg"
    test -d "$formal_app" || {
      echo "Formal Sherlock app was not built at: $formal_app" >&2
      exit 1
    }
    open "$formal_app"
    ;;
  *)
    echo 'Usage: ./script/build_and_run.sh [--run|--verify|--debug|--logs|--telemetry|--formal]' >&2
    exit 2
    ;;
esac
