# dsh-safe — update DSH Desktop without breaking plugins

## Why plugins break on updates

Your DSH Desktop app bundles a DSH **core** (e.g. `0.1.7-rc.2` inside app 0.10.0).
Every plugin declares `peerDependencies` on `@deepseek-ai/dsh-*` core packages.
At profile boot, `@deepseek-ai/dsh-app-boot` checks each plugin:

- peer range `workspace:^|~|*` → always OK (plugin moves with the core)
- any other range must satisfy the bundled runtime (`semver` with prereleases)
- **one failing peer → plugin is DENIED at profile startup** until an exact-version
  exemption exists in `profiles/web/compatibility.json`

Plugin authors usually pin peers to the core release they tested on, so the *latest*
plugin version is frequently incompatible with the core your app bundles. That is the
"plugin versions are always later" problem.

## Install

```sh
sh install.sh            # payload → /usr/local/lib/dsh-safe, wrapper → /usr/local/bin/dsh-safe
```

Re-run after `git pull` to update. `DEST=` / `BIN=` override the destinations.
No install needed to just test: `node dsh-safe-update.mjs audit` (needs node ≥ 18).

## Commands

| Command | What it does |
|---|---|
| `dsh-safe audit` | Report every installed plugin: installed / safe-latest / npm-latest, incompatible peers. Read-only. |
| `dsh-safe fix` | For installed plugins the core no longer satisfies: print the safe `name@version` to install in the plugin market, **or** (no compatible version exists) grant an exemption in `profiles/web/compatibility.json` so the plugin keeps loading. Timestamped backup first. |
| `dsh-safe pre-update` | Run **after** updating the DSH Desktop app: auto-grants exemptions for plugins the new core now rejects (so nothing breaks at boot), then lists compatible upgrades. |
| `dsh-safe spec <pkg>` | Print the newest version of `<pkg>` compatible with the bundled core — paste `name@version` into the plugin market UI to install/upgrade safely. |
| `dsh-safe verify` | Validate `compatibility.json` against the exact contract app-boot enforces; lists active vs stale exemptions. Read-only. |

Flags: `--dry-run` (fix/pre-update print intended writes, touch nothing),
`--json` (machine-readable audit/verify output).

Exit codes: `0` all compatible · `2` incompatible plugins present (handled or listed) ·
`1` error (bad state, fetch failure, refused write, lock held by a live run).

## Update recipe

**Update the app** (normal auto-update in the app):
1. Update DSH Desktop to the newest version.
2. `dsh-safe pre-update` → grants exemptions for anything the new core now rejects;
   app keeps working, no crash, plugins keep loading (advisory compat).
3. `dsh-safe audit` → install the listed safe upgrades via the plugin market UI
   (pick the exact `name@version` from the output), then drop stale exemptions if
   you like (`dsh-safe verify` shows which are stale).

**Update a single plugin:**
```sh
dsh-safe spec <plugin-name>     # e.g. dsh-safe spec dsh-context → dsh-context@0.57.0
```
Install that exact spec in the plugin market. Never install a version newer than
this — it is incompatible with the bundled core.

## Safety model

- `audit`, `spec`, `verify` are **strictly read-only**.
- The **only** file the tool ever writes is `<profile>/compatibility.json`;
  plugin installs are never touched (the market UI owns generation links).
- Writes are atomic (tmp + rename) under an `O_EXCL` advisory lock
  (`compatibility.json.lock`, stale locks > 60 s are recovered automatically).
- The file is re-read immediately before writing; if it changed since our read
  (app or a second `dsh-safe` run), the write is **refused**, never clobbered.
- A timestamped backup (`compatibility.json.bak-<utc>`) is taken right before
  every real write; a no-op run (nothing to grant) creates no backup.
- Exemptions use the exact contract app-boot validates:
  `{ "<name>@<exactVersion>": ["<exactRuntime>", …] }`.
- A malformed `compatibility.json` is reported and left untouched, never rewritten.
- The profile can be overridden with `DSH_PROFILE_DIR` (this is what the tests use).

## Files

- `dsh-safe-update.mjs` — the tool (no dependencies beyond node; `semver` is vendored)
- `vendor/semver/` — vendored semver 7.x
- `test/smoke.sh` — 17 end-to-end tests against a synthetic profile (never touches
  the real profile): audit detection, dry-run, grant, idempotency, live + stale
  lock, verify, malformed-file refusal. Run: `sh test/smoke.sh`
- Exemptions live in: `~/Library/Application Support/dsh-desktop/harness/profiles/web/compatibility.json`

## Notes

- If the plugin you want only exists in incompatible versions, `fix` grants the
  exemption and the plugin loads (peers are advisory). If it then fails actual
  import/activation, DSH Desktop's own recovery disables just that plugin — the app
  keeps running.
- Your shell `node` may be DSH Desktop's Electron node; the tool detects this and
  re-spawns itself with `ELECTRON_NO_ASAR=1` to read the app bundle.
- The bundled core version is detected straight from `app.asar`
  (`@deepseek-ai/dsh-app-boot`), so the tool tracks app updates automatically —
  no hardcoded versions.
