#!/bin/bash

set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

mode="${1:---run}"
machine_arch="$(uname -m)"
if [ "$machine_arch" = "arm64" ]; then
  formal_app="$project_root/dist-notarized/mac-arm64/Sherlock.app"
else
  formal_app="$project_root/dist-notarized/mac/Sherlock.app"
fi
formal_executable="$formal_app/Contents/MacOS/Sherlock"
formal_runtime_node="$formal_app/Contents/Resources/app/node_modules/node/bin/node"

stop_sherlock_apps() {
  pkill -x 'Sherlock Dev' 2>/dev/null || true
  pkill -x 'Sherlock' 2>/dev/null || true
}

build_formal_app() {
  stop_sherlock_apps
  npm run package:formal:dir
  test -x "$formal_executable" || {
    echo "Sherlock executable was not built at: $formal_executable" >&2
    exit 1
  }
  test -x "$formal_runtime_node" || {
    echo "Bundled Node.js runtime was not built at: $formal_runtime_node" >&2
    exit 1
  }
  codesign --verify --deep --strict --verbose=2 "$formal_app"
}

open_formal_app() {
  open -na "$formal_app"
}

case "$mode" in
  --run)
    build_formal_app
    open_formal_app
    ;;
  --verify)
    build_formal_app
    open_formal_app
    stable_checks=0
    for _attempt in $(seq 1 80); do
      if pgrep -x 'Sherlock' >/dev/null; then
        stable_checks=$((stable_checks + 1))
        if [ "$stable_checks" -ge 4 ]; then
          echo 'Sherlock is running.'
          exit 0
        fi
      else
        stable_checks=0
      fi
      sleep 0.5
    done
    echo 'Sherlock did not stay running.' >&2
    exit 1
    ;;
  --debug)
    build_formal_app
    exec /usr/bin/lldb -- "$formal_executable"
    ;;
  --logs)
    build_formal_app
    open_formal_app
    exec /usr/bin/log stream --style compact --predicate 'process == "Sherlock"'
    ;;
  --telemetry)
    build_formal_app
    open_formal_app
    exec /usr/bin/log stream --style compact --predicate 'subsystem == "com.evanarts.sherlock"'
    ;;
  --formal)
    stop_sherlock_apps
    test "$machine_arch" = "arm64" || {
      echo 'The local formal release currently supports Apple Silicon only.' >&2
      exit 1
    }
    node "$project_root/scripts/verify-formal-git-state.mjs" --repo "$project_root"
    legacy_identity='8B8FCCFB659D94D5C9A9CE2B735EB0FAE457CC7B'
    developer_identity='DDFBC7F4DA5EC49721E454BB06329C6D1E8A7B9F'
    signing_identities="$(security find-identity -v -p codesigning)"
    printf '%s\n' "$signing_identities" | grep -F "$legacy_identity" | grep -F 'Sherlock Desktop Update Signing' >/dev/null || {
      echo 'The Sherlock Desktop Update Signing identity is not prepared.' >&2
      exit 1
    }
    printf '%s\n' "$signing_identities" | grep -F "$developer_identity" | grep -F 'Developer ID Application: yafeng he (FAV8TLDK73)' >/dev/null || {
      echo 'The Developer ID Application identity is not prepared.' >&2
      exit 1
    }
    APPLE_API_KEY="${APPLE_API_KEY:-/Users/heyafeng/Downloads/AuthKey_KSJ7725349.p8}"
    APPLE_API_KEY_ID="${APPLE_API_KEY_ID:-KSJ7725349}"
    APPLE_API_ISSUER="${APPLE_API_ISSUER:-840d0b5c-4924-4f62-8a86-6201e832a4d6}"
    export APPLE_API_KEY APPLE_API_KEY_ID APPLE_API_ISSUER
    test -f "$APPLE_API_KEY" || {
      echo "The App Store Connect API key is missing: $APPLE_API_KEY" >&2
      exit 1
    }

    CSC_NAME="$developer_identity" npm run package:mac:notarized:arm64

    notarized_dmg="$project_root/dist-notarized/sherlock-mac-arm64.dmg"
    release_version="$(node -p "require('./package.json').version")"
    xcrun stapler validate "$formal_app"
    node "$project_root/scripts/build-legacy-migration-bridge.mjs" \
      --version "$release_version" \
      --app "$formal_app" \
      --output "$project_root/dist-legacy" \
      --identity "$legacy_identity"
    xcrun notarytool submit "$notarized_dmg" \
      --key "$APPLE_API_KEY" \
      --key-id "$APPLE_API_KEY_ID" \
      --issuer "$APPLE_API_ISSUER" \
      --wait
    xcrun stapler staple "$notarized_dmg"
    xcrun stapler validate "$formal_app"
    xcrun stapler validate "$notarized_dmg"
    node "$project_root/scripts/refresh-mac-update-metadata.mjs" \
      --metadata "$project_root/dist-notarized/latest-mac.yml" \
      --dmg "$notarized_dmg"
    codesign --verify --deep --strict --verbose=2 "$formal_app"
    codesign --verify --verbose=2 "$notarized_dmg"
    spctl --assess --type execute --verbose=2 "$formal_app"
    spctl --assess --type open --context context:primary-signature --verbose=2 "$notarized_dmg"
    hdiutil verify "$notarized_dmg"
    node "$project_root/scripts/prepare-macos-dual-release.mjs" \
      --version "$release_version" \
      --arch arm64 \
      --legacy "$project_root/dist-legacy" \
      --notarized "$project_root/dist-notarized" \
      --output "$project_root/dist-release"
    test -d "$formal_app" || {
      echo "Formal Sherlock app was not built at: $formal_app" >&2
      exit 1
    }
    formal_smoke_user_data="$(mktemp -d /tmp/sherlock-formal-smoke.XXXXXX)"
    open -na "$formal_app" --args "--sherlock-user-data-dir=$formal_smoke_user_data"
    ;;
  *)
    echo 'Usage: ./script/build_and_run.sh [--run|--verify|--debug|--logs|--telemetry|--formal]' >&2
    exit 2
    ;;
esac
