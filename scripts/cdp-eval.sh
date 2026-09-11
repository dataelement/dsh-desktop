#!/bin/bash
# Evaluate one JavaScript expression inside the running DSH Desktop renderer
# over the Chrome DevTools Protocol, and print its value.
#
# Start the app with --remote-debugging-port=9222 and this gives a live view of
# the real window: the composer, the model selector, and the status line can all
# be measured here instead of being guessed at from a screenshot.
#
# Usage:
#   cdp-eval.sh 'document.title'
#   cdp-eval.sh --eval-file /path/to/expression.js
#   cdp-eval.sh --watch 8000        # stream console output for 8s
#
# Env: DSH_CDP_PORT (default 9222), DSH_NODE (default: node on PATH).
set -u

NODE="${DSH_NODE:-$(command -v node || true)}"
if [ -z "$NODE" ]; then
  echo "no node on PATH; set DSH_NODE to a node binary" >&2
  exit 1
fi

PORT="${DSH_CDP_PORT:-9222}"
ENDPOINT="$(curl -s -m 5 "http://127.0.0.1:${PORT}/json/list" \
  | "$NODE" -e 'let raw="";process.stdin.on("data",(c)=>raw+=c).on("end",()=>{const targets=JSON.parse(raw);const page=targets.find((t)=>t.type==="page");if(page)console.log(page.webSocketDebuggerUrl)})')"

if [ -z "$ENDPOINT" ]; then
  echo "no debuggable page on 127.0.0.1:${PORT}; start the app with --remote-debugging-port=${PORT}" >&2
  exit 1
fi

exec "$NODE" "$(dirname "$0")/cdp-eval.mjs" "$ENDPOINT" "$@"
