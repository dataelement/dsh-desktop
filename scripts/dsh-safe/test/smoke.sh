#!/bin/sh
# smoke.sh — end-to-end tests for dsh-safe-update.mjs against a SYNTHETIC profile.
#
# Never touches your real DSH Desktop profile: it builds a throwaway profile in a
# temp dir and points the tool at it with DSH_PROFILE_DIR. Network is only used
# for npm lookups of deliberately nonexistent packages (404s are expected and
# handled).
#
# Usage: sh test/smoke.sh     (from the dsh-safe directory)
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/dsh-safe-update.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PROFILE="$TMP/profile"
mkdir -p "$PROFILE/node_modules/@deepseek-ai/dsh-smoke-incompat" "$PROFILE/node_modules/@deepseek-ai/dsh-smoke-ok"

# --- synthetic profile ------------------------------------------------------
cat > "$PROFILE/package.json" <<'EOF'
{
  "name": "synthetic-profile",
  "dependencies": {
    "@deepseek-ai/dsh-smoke-incompat": "1.0.0",
    "@deepseek-ai/dsh-smoke-ok": "1.0.0",
    "@deepseek-ai/dsh-smoke-gone": "1.0.0"
  }
}
EOF

# peers pin an old core -> INCOMPATIBLE, and no such version exists on npm
cat > "$PROFILE/node_modules/@deepseek-ai/dsh-smoke-incompat/package.json" <<'EOF'
{
  "name": "@deepseek-ai/dsh-smoke-incompat",
  "version": "1.0.0",
  "peerDependencies": { "@deepseek-ai/dsh-app-boot": "0.1.1-rc.2" }
}
EOF

# peers accept the current runtime -> OK
cat > "$PROFILE/node_modules/@deepseek-ai/dsh-smoke-ok/package.json" <<'EOF'
{
  "name": "@deepseek-ai/dsh-smoke-ok",
  "version": "1.0.0",
  "peerDependencies": { "@deepseek-ai/dsh-app-boot": ">=0.1.0" }
}
EOF

# declared but not installed -> NOT INSTALLED
# (no node_modules/@deepseek-ai/dsh-smoke-gone on purpose)

PASS=0
FAIL=0
check() { # check <description> <condition-exit-code(0=ok)>
  if [ "$2" -eq 0 ]; then PASS=$((PASS+1)); echo "ok   - $1";
  else FAIL=$((FAIL+1)); echo "FAIL - $1"; fi
}
run() { DSH_PROFILE_DIR="$PROFILE" node "$SCRIPT" "$@"; }
COMPAT="$PROFILE/compatibility.json"

echo "== 1. audit detects the incompatible plugin (exit 2) =="
OUT="$(run audit 2>&1)"; RC=$?
echo "$OUT" | grep -q "dsh-smoke-incompat" && echo "$OUT" | grep -q "INCOMPATIBLE"; check "audit reports INCOMPATIBLE" $?
[ $RC -eq 2 ]; check "audit exit code is 2 (incompatible present)" $?

echo "== 2. fix --dry-run writes nothing =="
OUT="$(run fix --dry-run 2>&1)"; RC=$?
[ ! -f "$COMPAT" ]; check "dry-run creates no compatibility.json" $?
echo "$OUT" | grep -q "dry-run"; check "dry-run announces intended grant" $?

echo "== 3. fix grants the exemption (atomic write + backup n/a first time) =="
OUT="$(run fix 2>&1)"; RC=$?
[ -f "$COMPAT" ]; check "fix writes compatibility.json" $?
node -e "
  const e = JSON.parse(require('fs').readFileSync('$COMPAT','utf8'));
  const k = '@deepseek-ai/dsh-smoke-incompat@1.0.0';
  process.exit(e[k] && e[k].length === 1 && /^\d+\.\d+\.\d+/.test(e[k][0]) ? 0 : 1)
"; check "exemption uses exact name@version -> [exact runtime]" $?

echo "== 4. idempotency: second fix is a no-op, no new backup =="
BEFORE="$(ls "$PROFILE" | sort | md5 2>/dev/null || ls "$PROFILE" | sort | cksum)"
OUT="$(run fix 2>&1)"; RC=$?
AFTER="$(ls "$PROFILE" | sort | md5 2>/dev/null || ls "$PROFILE" | sort | cksum)"
[ "$BEFORE" = "$AFTER" ]; check "second fix changes nothing (no backup spam)" $?
echo "$OUT" | grep -q "No exemptions needed"; check "second fix reports no-op" $?
[ $RC -eq 2 ]; check "second fix still exits 2 (incompatibility still present)" $?

echo "== 5. live lock is respected; stale lock is recovered =="
printf '%s\n' "{\"pid\":99999,\"at\":$(node -e "console.log(Date.now())")}" > "$COMPAT.lock"
OUT="$(run fix 2>&1)"; RC=$?
[ $RC -eq 1 ] && echo "$OUT" | grep -q "in progress"; check "fresh lock refuses the write (exit 1)" $?
printf '%s\n' "{\"pid\":99999,\"at\":$(node -e "console.log(Date.now()-3600000)")}" > "$COMPAT.lock"
OUT="$(run fix 2>&1)"; RC=$?
[ $RC -eq 2 ]; check "stale lock (1h old) is recovered, fix proceeds" $?
[ ! -f "$COMPAT.lock" ]; check "lock file released afterwards" $?

echo "== 6. verify validates the contract and marks exemptions active =="
OUT="$(run verify 2>&1)"; RC=$?
echo "$OUT" | grep -q "dsh-smoke-incompat@1.0.0"; check "verify lists the exemption" $?
echo "$OUT" | grep -q "active"; check "verify marks it active (plugin installed)" $?
echo "$OUT" | grep -q "valid"; check "verify confirms contract-valid format" $?

echo "== 7. a broken file is refused, never overwritten silently =="
printf 'not json' > "$PROFILE/compatibility.json"
OUT="$(run fix 2>&1)"; RC=$?
[ $RC -eq 1 ] && echo "$OUT" | grep -q "not valid JSON"; check "malformed file -> exit 1 with a clear message" $?
[ "$(cat "$PROFILE/compatibility.json")" = "not json" ]; check "malformed file left untouched" $?

echo
echo "result: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ]
