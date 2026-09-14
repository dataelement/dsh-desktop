# Testing

Four layers, mirroring the deepseek-harness conventions — everything runs on
vitest; playwright is used as a library, never as a separate runner.

| Layer | What | Where | Command | CI |
|---|---|---|---|---|
| 1. Behavioral specs | Pure/orchestration logic against real tmp-dir fixtures; flow suite drives every HTTP route through a programmable FakeDsh (real filesystem effects, scriptable npm state — update logic is testable **without publishing versions**) | `tests/*.spec.ts` | `npm test` | every push, ubuntu + windows |
| 2. Component specs | `// @vitest-environment jsdom` + testing-library against the REAL TSX components, REAL locale dicts, and the npm-published `@deepseek-ai/dsh-client-ui-primitives` | `tests/client/*.client.spec.tsx` | `npm test` (same lane) | every push |
| 3. Web e2e | A REAL dsh web composition booted in a throwaway `DSH_HOME` with the packed market installed. Two specs: the UI journey through real Chromium (console tripwire fails the run on any page error), and the **real install chain** — install route → registry check → real pnpm resolution → validation → patch layer → cordis hot mount | `tests/web/*.e2e.ts` + `tests/web/scaffold.ts` | `npm run test:web` | own job |
| 4. Perimeter | Real pnpm 9/10/11 behavior matrix (pins the failure signatures behind #20/#21/#22) and the packaging/restart smoke scripts | `tests/*.compat.spec.ts`, `scripts/*.mjs` | `npm run test:compat`, `npm run check` | own job / in check |

## Why layer 3 carries the install chain

Layer 1 drives the same chain against `FakeDsh`, a simulator written in this
repo. That can only show the code agrees with **our model** of pnpm and
cordis — and every install bug that actually shipped (#103, #122, #135, #147)
was a place where the model itself was wrong. More layer-1 specs cannot
close that gap; only real machinery can.

So `install.e2e.ts` uses the real pnpm, the real loader and the real patch
layer, and installs a fixture plugin that **proves its own liveness**: the
fixture registers an HTTP route from inside `apply()`, so the route can only
answer if cordis genuinely resolved the package, loaded the module and ran
it. The market's `activation[name].state` is an inference and is asserted
*against* that ground truth rather than trusted as one.

Fixtures live in `tests/web/fixtures/` and are served to pnpm by a local npm
registry (`tests/web/registry.ts`) — a real packument plus tarball over
localhost, so resolution is the ordinary code path with nothing published and
no network involved. Unknown packages redirect upstream so pnpm can still
replay the rest of the tree. Two traps worth knowing:

- `npm_config_registry` **outranks `.npmrc`**, and `npm run` puts the
  caller's registry there — the scaffold sets both.
- The registry server shares the test process, so anything that blocks the
  event loop (`execSync`) starves it and pnpm times out.

## Running layer 3 locally

The scaffold needs a dsh CLI. Either have `dsh` on PATH, or point it at a
source checkout:

```sh
DSHM_E2E_DSH="node --import tsx/esm /path/to/deepseek-harness/apps/cli/src/bin.ts" \
DSHM_E2E_DSH_CWD=/path/to/deepseek-harness \
npm run test:web
```

Without a reachable dsh the e2e specs skip (they never fail a machine that
cannot run them). CI sets `DSHM_E2E_REQUIRED=1`, which turns that skip into a
hard failure — the job installs the CLI itself, so a silent skip there would
report "e2e passed" for a run that asserted nothing. Browser download can use a mirror:
`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium`.

## The one check no lane can run: provisioning pnpm

Every automated lane has pnpm already — CI installs it, developer machines
have it — so `provisionPnpm` (the "one small component is needed" banner and
its one-click fix) is only ever exercised against mocks. It is also the
subject of a standing cluster of reports (#105, #108, #132), which makes the
gap worth naming rather than papering over.

Automating it would mean installing pnpm to set the profile up and then
removing it again, on a runner, before every run — fragile enough that it
would fail for its own reasons more often than for the product's. So this
one is a deliberate manual check, to repeat whenever `provisionPnpm`
changes:

1. Build a profile with the market installed, WHILE pnpm is available
   (`npm pack` + `dsh plugin --profile web add <tarball>`).
2. Make pnpm genuinely unreachable. Dropping it from PATH is not enough:
   `spawnEnv` deliberately re-adds `/opt/homebrew/bin`, `/usr/local/bin` and
   `~/.local/bin`, because a GUI-launched host (DSH Desktop) starts with a
   PATH that has none of them. Move the binary aside instead, and put it
   back afterwards.
3. Point `npm_config_prefix` at a throwaway directory so the install under
   test cannot touch the real toolchain.
4. Boot `dsh --profile web`, confirm `/dsh-market/status` reports
   `pnpm: false`, then POST `/dsh-market/setup-pnpm`.

What to assert, and why each one:

- `pnpm: false` before — otherwise the banner never appears and the rest
  proves nothing.
- `ok: true` from the route, and `pnpm: true` after.
- **pnpm really landed in the throwaway prefix.** A pass can otherwise come
  from the probe finding a leftover elsewhere; check the directory.
- The throwaway prefix's `bin` is NOT on PATH. That is the point: the probe
  can only succeed through the `npm prefix -g` lookup (#149), so this is the
  only check that covers it for real.

Last run: 2026-08-17 on macOS 15 (arm64), no pnpm and no corepack —
`pnpm: false` → one click → `ok: true` in 1.0 s → 39 MB of pnpm in the
throwaway prefix → `pnpm: true`. The corepack branch was not exercised (it
was absent); a machine that has corepack takes that path first.

## Both dsh versions, before shipping a host-facing change

The settings-card work assumed backward compatibility from reading the API
contract — installSettingsSection rides its own scoped fiber, the browser
half hides behind a nested inject — and reasoning is not evidence when the
failure mode is "the market's page disappears for everyone still on rc.6",
which is most reporters today.

Run the layer-3 lane against both:

```sh
npm install -g @deepseek-ai/dsh@0.1.0-rc.6 && npm run test:web
npm install -g @deepseek-ai/dsh@0.1.0-rc.7 && npm run test:web
```

Result on 2026-08-17, both green (18 specs). It also corrected the reasoning
behind the guard: rc.6 already HAS a settings service and serves the
market's namespace fine — what rc.7 opened is the browser-side allowlist
deciding whose card may render. So the Host half was never the compatibility
risk; the client half was, and the nested inject is what covers it.

## Conventions

- **Red first**: a bug fix lands with the failing test that reproduces it.
  Every issue number in a test title is a reproduced-then-fixed incident.
- **Mutation-audited**: the suites have been checked with targeted mutations
  (every mutation must kill ≥1 test; every test must be killable). Keep new
  tests killable — no assertion that can be satisfied by a fallback path.
- **Fake pnpm never invents behavior**: everything FakeDsh simulates is a
  signature pinned by the real-pnpm compat lane first.
