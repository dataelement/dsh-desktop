# Sherlock Harness Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and launch an isolated `Sherlock Harness Preview.app` that runs official DeepSeek Harness `0.1.1-rc.2` without changing formal Sherlock, Sherlock Dev, or their data.

**Architecture:** Work in a dedicated Git worktree. Add a fourth desktop channel with an independent bundle identity, output, updater policy, and user-data path; upgrade the published Harness family coherently; remove rc.7 product-overlay patches; then port only the Electron directory-picker bridge and Sherlock search audit event needed for a usable preview.

**Tech Stack:** Electron 43, electron-vite 5, electron-builder 26, TypeScript 5.9, Node.js 24, npm/package-lock, patch-package 8, Vitest 4, macOS shell tooling.

**Spec:** `docs/superpowers/specs/2026-08-26-sherlock-harness-preview-design.md`

## Global Constraints

- Harness is exactly `0.1.1-rc.2`, matching tag `dsh-v0.1.1-rc.2` and commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.
- Product name is `Sherlock Harness Preview`; bundle ID is `io.dsh.desktop.harness-preview`.
- Output is `dist-harness-preview`; user data is `dsh-desktop-harness-preview`.
- Never read, copy, migrate, or modify `dsh-desktop`, `sherlock-desktop`, or `dsh-desktop-dev`.
- The preview has no publish provider and never starts the Sherlock updater.
- Preserve formal and development build/run behavior.
- Do not merge upstream `main`, publish, tag, sign/notarize, or upload.
- Preserve unrelated files in the original checkout.
- Do not run the full test suite; run only the focused files named below.

## File Map

- `electron-builder.harness-preview.cjs` — preview identity and disabled publishing.
- `src/main/app-identity.ts` / `src/main/index.ts` — preview channel and updater policy.
- `package.json` / `package-lock.json` — rc.2 graph and packaging commands.
- `scripts/verify-harness-version-family.mjs` — source/lock version gate.
- `scripts/verify-harness-preview.mjs` — packaged-bundle gate.
- `script/build_and_run.sh` — preview-only build/run modes.
- `patches/*+0.1.1-rc.2.patch` — two essential compatibility patches.
- `test/harness-preview-*.test.ts` — version, patch, composition, and package coverage.
- `docs/harness-preview-patch-inventory.md` — disposition of all 20 rc.7 patches.

---

### Task 1: Worktree and Preview Desktop Channel

**Files:**
- Create: `.worktrees/sherlock-harness-preview/`
- Create: `electron-builder.harness-preview.cjs`
- Modify: `src/main/app-identity.ts`
- Modify: `src/main/index.ts`
- Modify: `package.json`
- Modify: `test/app-identity.test.ts`
- Modify: `test/release.test.ts`

**Interfaces:**
- Consumes: committed `HEAD` and the base builder config.
- Produces: `DesktopChannel` with `harness-preview`, `desktopChannelUsesUpdates(channel)`, and `npm run package:harness-preview:dir`.

- [ ] **Step 1: Create the isolated worktree**

Read `superpowers:using-git-worktrees`, verify `.worktrees` is ignored, then run:

```bash
git check-ignore -q .worktrees
git branch --list codex/sherlock-harness-preview
git worktree add .worktrees/sherlock-harness-preview -b codex/sherlock-harness-preview
cd .worktrees/sherlock-harness-preview
```

Expected: it starts from the design/plan commit; original untracked files remain untouched.

- [ ] **Step 2: Write failing identity and builder tests**

Add to `test/app-identity.test.ts`:

```ts
expect(resolveDesktopIdentity(
  '/Users/test/Library/Application Support', 'harness-preview', ''
)).toEqual({
  name: 'Sherlock Harness Preview',
  userData: '/Users/test/Library/Application Support/dsh-desktop-harness-preview'
})
expect(desktopChannelUsesUpdates('harness-preview')).toBe(false)
expect(desktopChannelUsesUpdates('notarized')).toBe(true)
```

Add to the isolated-build test in `test/release.test.ts`:

```ts
const previewConfig = await readFile(
  path.join(projectRoot, 'electron-builder.harness-preview.cjs'), 'utf8'
)
expect(packageJson.scripts['package:harness-preview:dir']).toContain('npm run build')
expect(previewConfig).toContain("appId: 'io.dsh.desktop.harness-preview'")
expect(previewConfig).toContain("productName: 'Sherlock Harness Preview'")
expect(previewConfig).toContain("output: 'dist-harness-preview'")
expect(previewConfig).toContain("dshDesktopChannel: 'harness-preview'")
expect(previewConfig).toContain('publish: null')
```

- [ ] **Step 3: Verify the tests fail**

Run: `npx vitest run test/app-identity.test.ts test/release.test.ts`

Expected: FAIL for the missing channel, helper, config, and script.

- [ ] **Step 4: Implement the typed identity**

Use these declarations in `src/main/app-identity.ts`:

```ts
export type DesktopChannel =
  | 'development'
  | 'harness-preview'
  | 'legacy'
  | 'legacy-bridge'
  | 'notarized'

export interface DesktopIdentity {
  name: 'Sherlock' | 'Sherlock Dev' | 'Sherlock Harness Preview'
  userData: string
}

export function desktopChannelUsesUpdates(channel: DesktopChannel): boolean {
  return channel !== 'development' && channel !== 'harness-preview'
}
```

Derive `Sherlock Harness Preview` and `dsh-desktop-harness-preview` in `resolveDesktopIdentity()`. In `src/main/index.ts`, accept `harness-preview` metadata and use:

```ts
const desktopChannel: DesktopChannel = resolveDesktopChannel()
const updatesEnabled = desktopChannelUsesUpdates(desktopChannel)
```

Guard `startUpdateManager()` with `if (updatesEnabled)`.

- [ ] **Step 5: Create builder config and script**

Create `electron-builder.harness-preview.cjs`:

```js
const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'io.dsh.desktop.harness-preview',
  productName: 'Sherlock Harness Preview',
  directories: { ...packageJson.build.directories, output: 'dist-harness-preview' },
  extraMetadata: {
    name: 'sherlock-harness-preview',
    productName: 'Sherlock Harness Preview',
    dshDesktopChannel: 'harness-preview'
  },
  artifactName: 'sherlock-harness-preview-${os}-${arch}.${ext}',
  publish: null
}
```

Add `"package:harness-preview:dir": "npm run build && electron-builder --dir --publish never --config electron-builder.harness-preview.cjs"`.

- [ ] **Step 6: Pass focused tests and commit**

```bash
npx vitest run test/app-identity.test.ts test/release.test.ts
git diff --check
git add electron-builder.harness-preview.cjs package.json src/main/app-identity.ts src/main/index.ts test/app-identity.test.ts test/release.test.ts
git commit -m "feat: add isolated Harness preview channel"
```

---

### Task 2: Upgrade the Harness Package Family

**Files:**
- Create: `scripts/verify-harness-version-family.mjs`
- Create: `test/harness-version-family.test.ts`
- Modify: `package.json`, `package-lock.json`
- Modify: both local `packages/*/package.json` manifests
- Delete: all 20 `patches/*+0.1.0-rc.7.patch` files

**Interfaces:**
- Consumes: root/local manifests and lockfile.
- Produces: `HARNESS_VERSION = '0.1.1-rc.2'` and `verifyHarnessVersionFamily(projectRoot)`.

- [ ] **Step 1: Write the failing verifier test**

Create `test/harness-version-family.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HARNESS_VERSION,
  verifyHarnessVersionFamily
} from '../scripts/verify-harness-version-family.mjs'

describe('Harness version family', () => {
  it('accepts one coherent rc.2 graph', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sherlock-family-'))
    await mkdir(join(root, 'packages', 'local'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': HARNESS_VERSION }
    }))
    await writeFile(join(root, 'package-lock.json'), JSON.stringify({
      packages: { 'node_modules/@deepseek-ai/dsh': { version: HARNESS_VERSION } }
    }))
    await writeFile(join(root, 'packages/local/package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh-session': `^${HARNESS_VERSION}` }
    }))
    await expect(verifyHarnessVersionFamily(root)).resolves.toEqual([
      '@deepseek-ai/dsh'
    ])
  })

  it('rejects an rc.7 lock entry', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sherlock-mixed-'))
    await mkdir(join(root, 'packages'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': HARNESS_VERSION }
    }))
    await writeFile(join(root, 'package-lock.json'), JSON.stringify({
      packages: { 'node_modules/@deepseek-ai/dsh': { version: '0.1.0-rc.7' } }
    }))
    await expect(verifyHarnessVersionFamily(root)).rejects.toThrow('0.1.0-rc.7')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run test/harness-version-family.test.ts`

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Implement the verifier**

Create `scripts/verify-harness-version-family.mjs`:

```js
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HARNESS_VERSION = '0.1.1-rc.2'

const isHarnessPackage = (name) =>
  name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
const normalizedVersion = (value) =>
  typeof value === 'string' ? value.replace(/^[~^]/u, '') : ''

export async function verifyHarnessVersionFamily(projectRoot) {
  const source = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
  const lock = JSON.parse(await readFile(join(projectRoot, 'package-lock.json'), 'utf8'))
  const failures = []
  for (const [name, version] of Object.entries(source.dependencies ?? {})) {
    if (isHarnessPackage(name) && normalizedVersion(version) !== HARNESS_VERSION) {
      failures.push(`${name} source=${version}`)
    }
  }
  for (const [location, metadata] of Object.entries(lock.packages ?? {})) {
    const match = location.match(/node_modules\/(?:.+\/node_modules\/)?(@deepseek-ai\/dsh(?:-[^/]+)?)/u)
    if (match && normalizedVersion(metadata?.version) !== HARNESS_VERSION) {
      failures.push(`${match[1]} lock=${metadata?.version}`)
    }
  }
  for (const entry of await readdir(join(projectRoot, 'packages'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifest = JSON.parse(await readFile(
      join(projectRoot, 'packages', entry.name, 'package.json'), 'utf8'
    ))
    for (const group of ['dependencies', 'peerDependencies']) {
      for (const [name, version] of Object.entries(manifest[group] ?? {})) {
        if (isHarnessPackage(name) && normalizedVersion(version) !== HARNESS_VERSION) {
          failures.push(`${entry.name}:${name}=${version}`)
        }
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Mixed Harness package family:\n${failures.join('\n')}`)
  }
  return Object.keys(source.dependencies ?? {}).filter(isHarnessPackage).sort()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const packages = await verifyHarnessVersionFamily(root)
  process.stdout.write(`Harness ${HARNESS_VERSION}: ${packages.length} direct packages verified\n`)
}
```

- [ ] **Step 4: Replace rc.7 and regenerate the lock**

Set every root direct `@deepseek-ai/dsh*` dependency to exact `0.1.1-rc.2`. Set the local package ranges for credentials, launch-environment, settings, web, and host-webserver to `^0.1.1-rc.2`. Change postinstall to:

```json
"postinstall": "patch-package && node scripts/install-brand-assets.mjs && install-electron --no"
```

Then run:

```bash
git rm patches/*+0.1.0-rc.7.patch
npm install
```

Expected: no rc.7 patch attempt; official loading UI remains; title/icon/manifest branding succeeds.

- [ ] **Step 5: Pass the family gate and commit**

```bash
npx vitest run test/harness-version-family.test.ts
node scripts/verify-harness-version-family.mjs
node -p "require('./node_modules/@deepseek-ai/dsh/package.json').version"
git diff --check
git add package.json package-lock.json packages scripts/verify-harness-version-family.mjs test/harness-version-family.test.ts patches
git commit -m "build: upgrade preview to Harness 0.1.1-rc.2"
```

Expected version: `0.1.1-rc.2`.

---

### Task 3: Port the Two Essential rc.2 Patches

**Files:**
- Create: `patches/@deepseek-ai+dsh-client-ui-directory-picker-native+0.1.1-rc.2.patch`
- Create: `patches/@deepseek-ai+dsh-session+0.1.1-rc.2.patch`
- Create: `test/harness-preview-patches.test.ts`
- Modify temporarily, never stage: matching files under `node_modules/`

**Interfaces:**
- Consumes: `window.dshDesktopDirectoryPicker.pick()` and event `web/session-model-search-llm-request`.
- Produces: two reproducible patch-package files.

- [ ] **Step 1: Write the failing behavior test**

Create `test/harness-preview-patches.test.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Harness preview essential patches', () => {
  it('uses the Electron directory picker bridge', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-directory-picker-native/lib/client.js',
      'utf8'
    )
    expect(source).toContain('window.dshDesktopDirectoryPicker')
    expect(source).toContain('Sherlock directory picker bridge is unavailable')
    expect(source).not.toContain('pick: () => ctx.workspaces.pickDirectory()')
  })

  it('allows the Sherlock search request event', async () => {
    const sources = await Promise.all([
      readFile('node_modules/@deepseek-ai/dsh-session/lib/index.js', 'utf8'),
      readFile('node_modules/@deepseek-ai/dsh-session/lib/types/known-event-types.js', 'utf8')
    ])
    for (const source of sources) {
      expect(source).toContain('web/session-model-search-llm-request')
    }
  })
})
```

Run `npx vitest run test/harness-preview-patches.test.ts`; expect both tests to FAIL on clean rc.2.

- [ ] **Step 2: Port the directory picker bridge**

Replace rc.2's `ctx.workspaces.pickDirectory()` injection with:

```js
const injected = () => ({ pick: () => {
  const bridge = window.dshDesktopDirectoryPicker;
  if (!bridge || typeof bridge.pick !== "function") {
    return Promise.reject(new Error("Sherlock directory picker bridge is unavailable"));
  }
  return bridge.pick();
} });
```

Run `npx patch-package @deepseek-ai/dsh-client-ui-directory-picker-native`.

- [ ] **Step 3: Port the known search event**

In both rc.2 session event sets, append `"web/session-model-search-llm-request"` immediately after `web/deepseek-search-llm-request`, preserving each file's quote style. Run:

```bash
npx patch-package @deepseek-ai/dsh-session
```

- [ ] **Step 4: Verify clean patch application and commit**

```bash
npx vitest run test/harness-preview-patches.test.ts
npx patch-package --error-on-fail
git add patches test/harness-preview-patches.test.ts
git commit -m "fix: port essential desktop bridges to Harness rc.2"
```

Do not stage `node_modules`.

---

### Task 4: Prove the Sherlock Overlay Composes on rc.2

**Files:**
- Create: `test/harness-preview-composition.test.ts`
- Modify only after a reproduced incompatibility: `build/dsh-desktop.patch.yml`
- Modify only after a reproduced incompatibility: local packages under `packages/`

**Interfaces:**
- Consumes: rc.2 CLI, `build/dsh-desktop.patch.yml`, and the two bundled resolver entries.
- Produces: a boot-free config composition gate.

- [ ] **Step 1: Write the composition test**

Spawn bundled Node with:

```ts
[
  '--expose-internals',
  resolve('build/harness-node-entry.mjs'),
  resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'),
  'web',
  '--patch',
  resolve('build/dsh-desktop.patch.yml'),
  '--dump-config'
]
```

Use a fresh temporary `DSH_HOME`, set `DSH_DESKTOP_WEB_SEARCH_ENTRY` and `DSH_DESKTOP_MARKET_INSTALLER_ENTRY` to the local package file URLs, and assert exit code zero plus these output fragments:

```text
@deepseek-ai/dsh-client-ui-directory-picker-native
dsh-web-search-session-model
dsh-desktop-market-installer
id: llm-deepseek
disabled: true
id: web-search-deepseek
disabled: true
```

- [ ] **Step 2: Run directly affected integration tests**

```bash
npx vitest run \
  test/harness-preview-composition.test.ts \
  test/harness-bundled-package-resolution.test.ts \
  test/session-model-web-search.test.js \
  test/market-installer.test.js \
  test/runtime.test.ts \
  test/directory-picker.test.ts
```

Expected: PASS. If one exact rc.2 contract fails, invoke `superpowers:systematic-debugging`, preserve the observed failure in its focused test, and change only the affected row, import, or call.

- [ ] **Step 3: Run an independent config dump**

```bash
preview_home="$(mktemp -d /tmp/sherlock-harness-preview-compose.XXXXXX)"
DSH_HOME="$preview_home" node_modules/node/bin/node --expose-internals \
  build/harness-node-entry.mjs \
  node_modules/@deepseek-ai/dsh/lib/bin.js \
  web --patch "$(pwd)/build/dsh-desktop.patch.yml" --dump-config \
  > /tmp/sherlock-harness-preview-config.txt
rg -n 'directory-picker-electron-desktop-surface|web-search-session-model|sherlock-market-installer' \
  /tmp/sherlock-harness-preview-config.txt
```

- [ ] **Step 4: Commit the compatibility gate**

```bash
git diff --check
git add test/harness-preview-composition.test.ts build/dsh-desktop.patch.yml packages
git commit -m "test: verify Sherlock overlay on Harness rc.2"
```

If no adapter file changed, only the test is committed.

---

### Task 5: Repeatable Preview Packaging and Verification

**Files:**
- Create: `scripts/verify-harness-preview.mjs`
- Modify: `script/build_and_run.sh`
- Modify: `test/release.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: preview builder config and packaged app.
- Produces: `--harness-preview`, `--harness-preview-verify`, and `npm run verify:harness-preview`.

- [ ] **Step 1: Add failing script-contract assertions**

Add to `test/release.test.ts`:

```ts
expect(buildAndRun).toContain('--harness-preview')
expect(buildAndRun).toContain('--harness-preview-verify')
expect(buildAndRun).toContain("pkill -x 'Sherlock Harness Preview'")
expect(buildAndRun).toContain(
  'dist-harness-preview/mac-arm64/Sherlock Harness Preview.app'
)
expect(packageJson.scripts['verify:harness-preview']).toContain(
  'scripts/verify-harness-preview.mjs'
)
```

Run `npx vitest run test/release.test.ts`; expect FAIL.

- [ ] **Step 2: Implement the package verifier**

`scripts/verify-harness-preview.mjs` accepts `--app <path>` and uses:

```js
const expected = {
  bundleId: 'io.dsh.desktop.harness-preview',
  bundleName: 'Sherlock Harness Preview',
  channel: 'harness-preview',
  harnessVersion: '0.1.1-rc.2'
}
```

Read `Contents/Info.plist` with `/usr/bin/plutil -convert json -o -`. Require:

- `CFBundleIdentifier === expected.bundleId`
- `CFBundleName === expected.bundleName`
- packaged `package.json` has `dshDesktopChannel === expected.channel`
- packaged `@deepseek-ai/dsh/package.json` has `version === expected.harnessVersion`
- `Contents/MacOS/Sherlock Harness Preview` exists
- `Contents/Resources/dsh-desktop.patch.yml` exists
- importing `electron-builder.harness-preview.cjs` returns `publish === null`
- `Contents/Resources/app-update.yml` does not exist

Add `"verify:harness-preview": "node scripts/verify-harness-preview.mjs"`.

- [ ] **Step 3: Add preview build/run helpers**

Resolve the bundle by architecture:

```bash
if [ "$machine_arch" = "arm64" ]; then
  preview_app="$project_root/dist-harness-preview/mac-arm64/Sherlock Harness Preview.app"
else
  preview_app="$project_root/dist-harness-preview/mac/Sherlock Harness Preview.app"
fi
preview_executable="$preview_app/Contents/MacOS/Sherlock Harness Preview"
```

Add helpers that stop only `Sherlock Harness Preview`, run `npm run package:harness-preview:dir`, call the verifier, and launch with `open -n`. Add modes:

- `--harness-preview` — build and open.
- `--harness-preview-verify` — build, open, poll `pgrep -x 'Sherlock Harness Preview'` for 45 seconds, then print success or fail nonzero.

Do not call the existing development stop helper or kill Sherlock/Sherlock Dev.

- [ ] **Step 4: Run focused checks and commit**

```bash
npx vitest run test/release.test.ts test/app-identity.test.ts
bash -n script/build_and_run.sh
node --check scripts/verify-harness-preview.mjs
git diff --check
git add package.json package-lock.json scripts/verify-harness-preview.mjs script/build_and_run.sh test/release.test.ts
git commit -m "build: package and verify Harness preview app"
```

---

### Task 6: Package, Launch, Inspect, and Record

**Files:**
- Create: `docs/harness-preview-patch-inventory.md`
- Create locally, do not commit: `artifacts/sherlock-harness-preview.png`
- Generate locally, do not commit: `dist-harness-preview/`

**Interfaces:**
- Consumes: all previous tasks and the real packaged app.
- Produces: running app, focused evidence, screenshot, and patch inventory.

- [ ] **Step 1: Create the patch inventory**

Create columns for rc.7 patch, disposition, reason, and evidence. Use these dispositions:

- **Ported:** `dsh-client-ui-directory-picker-native` and `dsh-session`.
- **Omitted to expose upstream rc.2:** `dsh`, `dsh-agent-presets`, `dsh-client-runtime`, `dsh-client-ui-agent-preset`, `dsh-client-ui-conversation`, `dsh-client-ui-deliverables`, `dsh-client-ui-layout`, `dsh-client-ui-primitives`, `dsh-client-ui-settings-general`, `dsh-client-ui-settings-models`, `dsh-client-ui-settings-plugins`, `dsh-client-ui-sidebar`, `dsh-client-ui-workspace`, `dsh-credentials-local`, `dsh-host-apiproxy`, `dsh-llm-deepseek`, `dsh-llm-pi-ai`, and `dsh-session-log-export`.

For each row, record the exact rc.2 package file, focused test, or visible surface used as evidence.

- [ ] **Step 2: Run the complete focused verification set**

```bash
npx vitest run \
  test/app-identity.test.ts \
  test/release.test.ts \
  test/harness-version-family.test.ts \
  test/harness-preview-patches.test.ts \
  test/harness-preview-composition.test.ts \
  test/harness-bundled-package-resolution.test.ts \
  test/session-model-web-search.test.js \
  test/market-installer.test.js \
  test/runtime.test.ts \
  test/directory-picker.test.ts
npm run typecheck
node scripts/verify-harness-version-family.mjs
```

Expected: all named tests and typecheck PASS. Do not run `npm test`.

- [ ] **Step 3: Build and launch the packaged preview**

Run: `./script/build_and_run.sh --harness-preview-verify`

Expected: the verifier reports bundle `io.dsh.desktop.harness-preview` and Harness `0.1.1-rc.2`; the preview process stays running.

- [ ] **Step 4: Verify runtime isolation and readiness**

```bash
pgrep -fl 'Sherlock Harness Preview'
test -d "$HOME/Library/Application Support/dsh-desktop-harness-preview/harness"
test -f "$HOME/Library/Logs/Sherlock Harness Preview/harness.log"
rg -n '\[desktop\] endpoint|DSH entry loaded|plugin tree failed|uncaught exception' \
  "$HOME/Library/Logs/Sherlock Harness Preview/harness.log" | tail -n 30
```

Expected: only preview paths are used; the current launch contains a loopback endpoint and successful entry load, with no plugin-tree or uncaught failure.

- [ ] **Step 5: Inspect the actual UI and capture evidence**

Inspect the packaged preview window:

1. Harness Web UI replaces the startup surface.
2. Sidebar/New Session uses current upstream layout.
3. Composer uses current upstream controls.
4. Models and Plugins settings open without loader errors.
5. Workspace add opens the macOS chooser; cancel returns cleanly.
6. Record one visible rc.2 behavior, prioritizing subagent header switching, model-picker bulk selection, file/session references, or the upstream loading state.

Read the loopback endpoint from the preview log, capture only that UI to `artifacts/sherlock-harness-preview.png`, and visually inspect it before reporting.

- [ ] **Step 6: Commit inventory and verify before completion**

```bash
git diff --check
git status --short
git add docs/harness-preview-patch-inventory.md
git commit -m "docs: record Harness preview patch migration"
```

Read and apply `superpowers:verification-before-completion`. Report app path, branch/worktree, exact Harness version, focused tests, typecheck/build, readiness, screenshot, and limitations. Leave the preview app running.
