#!/bin/sh
# install.sh — install dsh-safe from this directory.
#
# Copies the payload (script + vendored semver) to /usr/local/lib/dsh-safe and
# drops a wrapper at /usr/local/bin/dsh-safe. Re-run any time after `git pull`
# to update the installed tool. Override the destinations with DEST=/BIN=.
#
#   sh install.sh
#   DEST=/opt/dsh-safe BIN=/usr/local/bin/dsh-safe sh install.sh
set -eu
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${DEST:-/usr/local/lib/dsh-safe}"
BIN="${BIN:-/usr/local/bin/dsh-safe}"

mkdir -p "$DEST"
cp "$SRC/dsh-safe-update.mjs" "$DEST/"
rm -rf "$DEST/vendor"
cp -R "$SRC/vendor" "$DEST/"

# build the wrapper atomically (tmp + rename) so a crash can't corrupt it
TMPBIN="$BIN.tmp.$$"
printf '#!/bin/sh\n# dsh-safe — audit/fix DSH Desktop plugins against the bundled core without breaking.\n# Usage: dsh-safe audit | fix | pre-update | spec <pkg> | verify\nexec node %s/dsh-safe-update.mjs "$@"\n' "$DEST" > "$TMPBIN"
chmod 755 "$TMPBIN"
mv "$TMPBIN" "$BIN"

echo "dsh-safe installed: $BIN  (payload: $DEST)"
echo "smoke tests: sh $SRC/test/smoke.sh"
