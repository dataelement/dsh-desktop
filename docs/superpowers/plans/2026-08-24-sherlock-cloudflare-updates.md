# Sherlock Cloudflare Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Sherlock 0.6.0 as the formal desktop build and provide a lower-right sidebar control that discovers, downloads, verifies, and installs later releases from Cloudflare without Apple Developer or notarization services.

**Architecture:** Keep `electron-updater` and Squirrel.Mac, but switch discovery to explicit download and render update state through a focused sidebar-control adapter. Sign every macOS formal build with one long-lived self-signed Sherlock identity, upload immutable versioned assets to Cloudflare R2, and promote only rewritten metadata that points at those immutable objects. Preserve GitHub Release and ModelScope so 0.5.0 clients using the legacy endpoint can migrate to 0.6.0.

**Tech Stack:** Electron 43, TypeScript 5.9, electron-updater 6.8, electron-builder 26, Vitest 4, happy-dom, YAML, Cloudflare R2/Wrangler, GitHub Actions, macOS codesign/Squirrel.Mac.

**Spec:** `docs/superpowers/specs/2026-08-24-sherlock-cloudflare-updates.md`

## Global Constraints

- The release must not depend on Apple Developer ID, Apple notarization, or the Mac App Store.
- The formal version is `0.6.0`; the public legacy feed currently advertises `0.5.0`.
- Preserve production ID `io.dsh.desktop`, product name `Sherlock`, and user-data directory `dsh-desktop`.
- Preserve the isolated `Sherlock Dev` identity and `dsh-desktop-dev` data directory.
- Never commit, print, package, or retain signing private keys, Cloudflare tokens, API credentials, sessions, workspaces, or private plugin profiles.
- Preserve every pre-existing working-tree change; exclude `.playwright-cli/`, `artifacts/`, generated packages, and other temporary evidence from the release commit.
- Use focused feature/release tests, typecheck, build, packaged-runtime checks, and real UI/update verification; do not run the full unit-test suite.
- Publish immutable binaries before mutable metadata; a failed release must leave the prior `latest` metadata active.
- The existing working tree is the source to promote, so do not create an isolated worktree that would omit its development changes.

---

### Task 1: Explicit updater state and main-process download action

**Files:**
- Modify: `src/main/update/update-state.ts`
- Modify: `src/main/update/update-manager.ts`
- Modify: `src/preload/update-view.ts`
- Modify: `src/shared/contracts.ts`
- Modify: `test/update.test.ts`

**Interfaces:**
- Consumes: existing `UpdateStatus`, `autoUpdater.checkForUpdates()`, and `autoUpdater.quitAndInstall(false, true)`.
- Produces: `UpdateAction`, `updateAction(status)`, exported `downloadAvailableUpdate(): Promise<UpdateStatus>`, and IPC route `updates:download`.

- [ ] **Step 1: Write failing state/action tests**

Add literal behavior cases to `test/update.test.ts`:

```ts
import { initialUpdateStatus, reduceUpdateStatus } from '../src/main/update/update-state'
import { updateAction } from '../src/preload/update-view'

it('offers download only after discovery and install only after download', () => {
  const idle = initialUpdateStatus('0.5.0')
  const available = reduceUpdateStatus(idle, { type: 'available', version: '0.6.0' })
  const downloading = reduceUpdateStatus(available, { type: 'progress', percent: 42.6 })
  const downloaded = reduceUpdateStatus(downloading, {
    type: 'downloaded',
    version: '0.6.0'
  })

  expect(updateAction(idle)).toEqual({ kind: 'hidden' })
  expect(updateAction(available)).toEqual({ kind: 'download', version: '0.6.0' })
  expect(updateAction(downloading)).toEqual({ kind: 'progress', percent: 42.6 })
  expect(updateAction(downloaded)).toEqual({ kind: 'install', version: '0.6.0' })
})

it('keeps automatic failures hidden and makes manual failures retryable', () => {
  const idle = initialUpdateStatus('0.5.0')
  const automatic = reduceUpdateStatus(idle, { type: 'error', message: 'offline' })
  const checking = reduceUpdateStatus(idle, { type: 'check', manual: true })
  const manual = reduceUpdateStatus(checking, { type: 'error', message: 'offline' })

  expect(updateAction(automatic)).toEqual({ kind: 'hidden' })
  expect(updateAction(manual)).toEqual({ kind: 'retry', message: 'offline' })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- test/update.test.ts`

Expected: FAIL because `updateAction`/`UpdateAction` do not exist and current automatic failures are presented as global cards.

- [ ] **Step 3: Implement the minimal action model**

Add a discriminated union to `src/preload/update-view.ts`:

```ts
export type UpdateAction =
  | { kind: 'hidden' }
  | { kind: 'download'; version: string }
  | { kind: 'progress'; percent: number }
  | { kind: 'install'; version: string }
  | { kind: 'retry'; message: string }

export function updateAction(status: UpdateStatus): UpdateAction {
  if (status.phase === 'available' && status.availableVersion) {
    return { kind: 'download', version: status.availableVersion }
  }
  if (status.phase === 'downloading') {
    return { kind: 'progress', percent: status.percent ?? 0 }
  }
  if (status.phase === 'downloaded' && status.availableVersion) {
    return { kind: 'install', version: status.availableVersion }
  }
  if (status.manual && status.phase === 'error') {
    return { kind: 'retry', message: status.message ?? '' }
  }
  return { kind: 'hidden' }
}
```

Keep the existing reducer clamping and version preservation. Update `shouldShowUpdate` to delegate to this model instead of showing automatic errors.

- [ ] **Step 4: Add explicit download IPC behavior**

In `src/main/update/update-manager.ts`:

```ts
export async function downloadAvailableUpdate(): Promise<UpdateStatus> {
  if (status.phase !== 'available') return getUpdateStatus()
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) }, true)
  }
  return getUpdateStatus()
}
```

Register `updates:download`, set `autoUpdater.autoDownload = false`, and keep `autoInstallOnAppQuit = true`. Do not call `downloadUpdate()` during discovery.

- [ ] **Step 5: Run focused tests and typecheck GREEN**

Run: `npm test -- test/update.test.ts && npm run typecheck`

Expected: all update tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the updater state change**

```bash
git add src/main/update/update-state.ts src/main/update/update-manager.ts src/preload/update-view.ts src/shared/contracts.ts test/update.test.ts
git commit -m "feat: make Sherlock update downloads explicit"
```

### Task 2: Sidebar update control at the requested lower-right position

**Files:**
- Create: `src/preload/sidebar-update-control.ts`
- Modify: `src/preload/index.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `test/sidebar-update-control.test.ts`

**Interfaces:**
- Consumes: `UpdateAction` and `updateMessage(status, locale)` from `src/preload/update-view.ts`, plus footer selector `[data-dsh-sidebar-footer]`.
- Produces: `SidebarUpdateControl` with `mount(): boolean`, `render(status: UpdateStatus): void`, and constructor callbacks `download`, `install`, and `retry`.

- [ ] **Step 1: Add the DOM test dependency**

Run: `npm install --save-dev happy-dom`

This is test scaffolding only; do not add it to production dependencies.

- [ ] **Step 2: Write failing real-DOM tests**

Create `test/sidebar-update-control.test.ts` using a real happy-dom document:

```ts
import { Window } from 'happy-dom'
import { describe, expect, it, vi } from 'vitest'
import { SidebarUpdateControl } from '../src/preload/sidebar-update-control'

function fixture() {
  const window = new Window()
  window.document.body.innerHTML = `
    <aside data-dsh-sidebar-root>
      <footer data-dsh-sidebar-footer><button>设置</button></footer>
    </aside>`
  return window.document
}

it('mounts a hidden control at the end of the sidebar footer', () => {
  const document = fixture()
  const control = new SidebarUpdateControl(document, 'zh', {
    download: vi.fn(), install: vi.fn(), retry: vi.fn()
  })

  expect(control.mount()).toBe(true)
  const footer = document.querySelector('[data-dsh-sidebar-footer]')!
  const button = footer.lastElementChild as HTMLButtonElement
  expect(button.id).toBe('sherlock-sidebar-update-button')
  expect(button.hidden).toBe(true)
})

it('shows the blue download action only for an available update', () => {
  const document = fixture()
  const download = vi.fn()
  const control = new SidebarUpdateControl(document, 'zh', {
    download, install: vi.fn(), retry: vi.fn()
  })
  control.mount()
  control.render({
    phase: 'available', currentVersion: '0.5.0', availableVersion: '0.6.0', manual: false
  })

  const button = document.querySelector<HTMLButtonElement>('#sherlock-sidebar-update-button')!
  expect(button.hidden).toBe(false)
  expect(button.dataset.action).toBe('download')
  expect(button.getAttribute('aria-label')).toBe('下载 Sherlock 0.6.0 更新')
  button.click()
  expect(download).toHaveBeenCalledOnce()
})
```

Add separate cases for determinate `aria-valuenow="43"`, downloaded confirmation, retry after manual error, and remount after the Harness footer is replaced.

- [ ] **Step 3: Run the DOM test and verify RED**

Run: `npm test -- test/sidebar-update-control.test.ts`

Expected: FAIL because `src/preload/sidebar-update-control.ts` does not exist.

- [ ] **Step 4: Implement the focused control**

Create `SidebarUpdateControl` so it:

- inserts one 36×36 blue circular button as the final footer child;
- uses an inline SVG download arrow for `download`, a progress ring for `progress`, and a restart arrow for `install`;
- remains hidden for the `hidden` action;
- renders one compact panel immediately above the footer for progress, errors, and restart confirmation;
- removes/recreates stale nodes when Harness replaces the sidebar DOM;
- never moves or restyles the existing Settings button.

Use stable IDs `sherlock-sidebar-update-button`, `sherlock-sidebar-update-panel`, and `sherlock-sidebar-update-style`.

- [ ] **Step 5: Replace the global update card adapter**

In `src/preload/index.ts`, construct one control:

```ts
const sidebarUpdateControl = new SidebarUpdateControl(document, locale, {
  download: () => void ipcRenderer.invoke('updates:download'),
  install: () => void ipcRenderer.invoke('updates:install'),
  retry: () => void ipcRenderer.invoke('desktop-menu:execute', 'check-for-updates')
})
```

Call `mount()` from initialization and the existing mutation observer, and call `render(status)` from `applyStatus`. Remove the fixed global lower-right card code and its closed shadow root.

- [ ] **Step 6: Run focused DOM/update tests and typecheck GREEN**

Run: `npm test -- test/sidebar-update-control.test.ts test/update.test.ts && npm run typecheck`

Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 7: Commit the sidebar control**

```bash
git add src/preload/sidebar-update-control.ts src/preload/index.ts package.json package-lock.json test/sidebar-update-control.test.ts
git commit -m "feat: add sidebar update control"
```

### Task 3: Atomic Cloudflare R2 release preparation and publication

**Files:**
- Create: `scripts/cloudflare-release-plan.mjs`
- Create: `scripts/publish-cloudflare-release.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `test/cloudflare-release.test.ts`

**Interfaces:**
- Consumes: electron-builder artifacts in `release-assets/` and a tag formatted `v<semver>`.
- Produces: `buildCloudflareReleasePlan({ version, assetDirectory, outputDirectory })`, rewritten `latest-mac.yml`/`latest.yml`, and ordered upload entries `{ phase, source, key, contentType, cacheControl }`.

- [ ] **Step 1: Write failing atomic-plan tests**

Create temp metadata/assets in `test/cloudflare-release.test.ts`, then assert literal results:

```ts
const plan = await buildCloudflareReleasePlan({
  version: '0.6.0',
  assetDirectory: fixtureDirectory,
  outputDirectory
})

expect(plan.filter((item) => item.phase === 'immutable').map((item) => item.key)).toContain(
  'releases/v0.6.0/sherlock-mac-arm64.zip'
)
expect(parse(await readFile(path.join(outputDirectory, 'latest-mac.yml'), 'utf8')).files[0].url)
  .toBe('../releases/v0.6.0/sherlock-mac-arm64.zip')
expect(plan.at(-1)?.key).toBe('latest/latest-mac.yml')
expect(plan.at(-1)?.cacheControl).toBe('no-cache, max-age=0, must-revalidate')
```

Also assert rejection of a missing file, hashless metadata, tag/version mismatch, path traversal, and metadata scheduled before immutable assets.

- [ ] **Step 2: Run the release-plan test and verify RED**

Run: `npm test -- test/cloudflare-release.test.ts`

Expected: FAIL because the release-plan module does not exist.

- [ ] **Step 3: Implement release-plan generation**

`buildCloudflareReleasePlan` must:

1. parse source YAML without mutating GitHub/ModelScope copies;
2. validate that every referenced file exists and has a non-empty SHA-512;
3. write Cloudflare-specific metadata with `../releases/v0.6.0/...` URLs;
4. return immutable binaries first, stable `/download/` DMGs second, and `latest/*.yml` metadata last;
5. assign long-lived immutable caching only to versioned objects.

- [ ] **Step 4: Implement the publisher CLI**

`scripts/publish-cloudflare-release.mjs` accepts:

```text
--bucket sherlock-releases --version 0.6.0 --assets release-assets --prepared release-cloudflare
```

For each plan entry, invoke the locally pinned Wrangler binary with:

```text
r2 object put sherlock-releases/<key> --remote --file <source> --content-type <type> --cache-control <policy>
```

Support `--dry-run` to print only JSON plan data. Never print environment variables or authentication material.

- [ ] **Step 5: Run focused tests GREEN**

Run: `npm test -- test/cloudflare-release.test.ts test/update.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit Cloudflare release tooling**

```bash
git add scripts/cloudflare-release-plan.mjs scripts/publish-cloudflare-release.mjs test/cloudflare-release.test.ts package.json package-lock.json .gitignore
git commit -m "feat: publish immutable updates to Cloudflare R2"
```

### Task 4: Non-Apple self-signed macOS release identity and CI contract

**Files:**
- Modify: `scripts/prepare-macos-signing-keychain.mjs`
- Create: `scripts/verify-self-signed-update-identity.mjs`
- Modify: `.github/workflows/release.yml`
- Modify: `test/release.test.ts`
- Create: `test/macos-self-signed-update.test.ts`

**Interfaces:**
- Consumes: secrets `SHERLOCK_MACOS_CSC_LINK`, `SHERLOCK_MACOS_CSC_KEY_PASSWORD`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID`.
- Produces: temporary-keychain outputs `keychain`, `certificate`, `keychain_list`, and `identity`; two macOS packages signed with the same non-Apple designated requirement; Cloudflare publish after GitHub/ModelScope copies.

- [ ] **Step 1: Write a failing real-signature compatibility test**

Create `test/macos-self-signed-update.test.ts` that runs only on Darwin and executes:

```ts
const { stdout } = await execFile(process.execPath, [
  path.join(projectRoot, 'scripts', 'verify-self-signed-update-identity.mjs')
])
expect(stdout).toContain('SELF_SIGNED_UPDATE_IDENTITY_OK')
```

The verifier must use a temporary directory/keychain, create a short-lived fixture identity, sign two different binaries with the same identifier, extract the first designated requirement, verify the second against it, restore the original keychain list, delete the temporary keychain/files, and print no private material.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- test/macos-self-signed-update.test.ts`

Expected: FAIL because the verifier script does not exist.

- [ ] **Step 3: Implement and pass the signature compatibility probe**

Implement with `node:child_process`, `node:fs/promises`, OpenSSL, `security`, and `codesign`. Validate the temp path prefix before cleanup. Use certificate extensions `keyUsage=digitalSignature` and `extendedKeyUsage=codeSigning`.

Run: `npm test -- test/macos-self-signed-update.test.ts`

Expected: PASS with `SELF_SIGNED_UPDATE_IDENTITY_OK`; afterward, `security list-keychains -d user` must match the pre-test list.

- [ ] **Step 4: Generalize temporary-keychain preparation**

Remove the hard-coded Apple Developer ID intermediate download from `prepare-macos-signing-keychain.mjs`. Import the supplied P12, trust it for code signing in the temporary keychain, select the exact `Sherlock Desktop Update Signing` identity, append its hash/name to `GITHUB_OUTPUT`, and retain the current always-cleanup behavior.

- [ ] **Step 5: Replace Apple CI gates with the self-signed contract**

In both macOS jobs:

- map `SHERLOCK_MACOS_CSC_LINK` and password into `CSC_LINK`/`CSC_KEY_PASSWORD`;
- remove Apple API key, team ID, `notarytool`, `stapler`, Developer ID lookup, and `spctl` success requirements;
- pass the temporary keychain and selected identity to electron-builder/codesign;
- keep `codesign --verify --deep --strict` for each app and `codesign --verify` for each DMG;
- run focused release/update/brand/runtime tests instead of `npm test` without a path;
- in the publish job, retain GitHub and ModelScope publication, then run the Cloudflare publisher with secrets;
- verify public metadata headers and one byte-range response before declaring the publish job successful.

- [ ] **Step 6: Update release-contract tests**

Replace the notarization assertions with literal contract assertions for the four Sherlock/Cloudflare secret names, zero Apple API/notary/stapler commands, two self-signed keychain preparations, deep/strict app verification, versioned Cloudflare publication, and legacy ModelScope mirroring.

- [ ] **Step 7: Run focused release tests and YAML parse GREEN**

Run:

```bash
npm test -- test/release.test.ts test/update.test.ts test/cloudflare-release.test.ts test/macos-self-signed-update.test.ts
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {parse} from 'yaml'; parse(readFileSync('.github/workflows/release.yml','utf8')); console.log('release workflow YAML OK')"
npm run typecheck
```

Expected: focused tests pass, workflow YAML parses, and typecheck exits 0.

- [ ] **Step 8: Commit signing and workflow changes**

```bash
git add scripts/prepare-macos-signing-keychain.mjs scripts/verify-self-signed-update-identity.mjs .github/workflows/release.yml test/release.test.ts test/macos-self-signed-update.test.ts
git commit -m "ci: sign and publish Sherlock without Apple services"
```

### Task 5: Formal version, stable run entrypoint, and current Dev-source promotion

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/main/app-identity.ts`
- Modify: `src/main/index.ts`
- Create: `test/app-identity.test.ts`
- Create: `script/build_and_run.sh`
- Create: `.codex/environments/environment.toml`
- Modify: current product/resource/patch/test files already present in the working tree
- Modify: `README.md`
- Modify: `README.zh.md`

**Interfaces:**
- Consumes: all verified current development source and the production builder configuration.
- Produces: source version `0.6.0`, formal `Sherlock.app`/DMG/ZIP, a Codex Run action for the Dev app, and installation instructions for the non-Apple first launch.

- [ ] **Step 1: Set and verify the formal semantic version**

Run: `npm version --no-git-tag-version 0.6.0`

Then run: `npm test -- test/release.test.ts`

Expected: package and lockfile root versions are both `0.6.0` and the release contract passes.

- [ ] **Step 2: Write a failing isolated-user-data resolver test**

Create `test/app-identity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveDesktopIdentity } from '../src/main/app-identity'

describe('desktop app identity', () => {
  it('keeps formal and development data isolated', () => {
    expect(resolveDesktopIdentity('/Users/test/Library/Application Support', false, '')).toEqual({
      name: 'Sherlock',
      userData: '/Users/test/Library/Application Support/dsh-desktop'
    })
    expect(resolveDesktopIdentity('/Users/test/Library/Application Support', true, '')).toEqual({
      name: 'Sherlock Dev',
      userData: '/Users/test/Library/Application Support/dsh-desktop-dev'
    })
  })

  it('allows only an absolute explicit user-data path for an isolated launch', () => {
    expect(resolveDesktopIdentity('/Applications', false, '/tmp/sherlock-update-fixture').userData)
      .toBe('/tmp/sherlock-update-fixture')
    expect(() => resolveDesktopIdentity('/Applications', false, 'relative/path'))
      .toThrow('absolute')
  })
})
```

- [ ] **Step 3: Run the resolver test and verify RED**

Run: `npm test -- test/app-identity.test.ts`

Expected: FAIL because `src/main/app-identity.ts` does not exist.

- [ ] **Step 4: Implement and wire the resolver**

Create the pure `resolveDesktopIdentity(appDataPath, developmentBuild, explicitUserDataPath)` function. In `configureAppIdentity()`, pass `app.commandLine.getSwitchValue('sherlock-user-data-dir')`; validate it through the resolver before calling `app.setPath`. This enables a disposable end-to-end update fixture without changing normal formal/Dev directories.

Run: `npm test -- test/app-identity.test.ts test/release.test.ts && npm run typecheck`

Expected: identity tests pass, existing identity contract passes, and typecheck exits 0.

- [ ] **Step 5: Create the Electron build/run entrypoint**

Create executable `script/build_and_run.sh` with these modes:

- default/run: stop only `Sherlock Dev`, run `npm run package:dev:dir`, and open `dist-dev/mac-arm64/Sherlock Dev.app`;
- `--verify`: do the same and confirm `pgrep -x 'Sherlock Dev'`;
- `--debug`: build then launch the packaged executable through LLDB;
- `--logs`: build/open then stream logs for process `Sherlock Dev`;
- `--telemetry`: build/open then stream logs for subsystem/application ID `io.dsh.desktop.dev`;
- `--formal`: require the prepared release identity, build `npm run package:mac:arm64`, and open `dist/mac-arm64/Sherlock.app`.

Do not delete user data or kill the production app during the default Dev flow.

- [ ] **Step 6: Wire the Codex Run action**

Create `.codex/environments/environment.toml` exactly as:

```toml
# THIS IS AUTOGENERATED. DO NOT EDIT MANUALLY
version = 1
name = "Sherlock Desktop"

[setup]
script = ""

[[actions]]
name = "Run"
icon = "run"
command = "./script/build_and_run.sh"
```

- [ ] **Step 7: Add non-Apple installation guidance**

Document the Apple Silicon DMG route, the one-time Finder right-click → Open step, the sidebar update behavior, and the fact that no App Store/Apple notarization is involved. Do not expose raw R2 object names as the primary human download link.

- [ ] **Step 8: Audit and stage the current Dev source deliberately**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Inspect every untracked path. Stage product code, patches, bundled skills, scripts, focused tests, and accepted design docs. Explicitly leave `.playwright-cli/`, `artifacts/`, build outputs, logs, caches, and private/local state untracked. Do not discard or overwrite any current change.

- [ ] **Step 9: Run the lean formal-source gate**

Run only the affected groups:

```bash
npm test -- \
  test/update.test.ts \
  test/sidebar-update-control.test.ts \
  test/cloudflare-release.test.ts \
  test/macos-self-signed-update.test.ts \
  test/release.test.ts \
  test/brand-migration.test.ts \
  test/bundled-ppt-skill.test.ts \
  test/harness-bundled-package-resolution.test.ts \
  test/macos-package-runtime.test.ts \
  test/developer-mode.test.ts \
  test/developer-mode-state.test.ts \
  test/desktop-shell-controls.test.ts \
  test/app-identity.test.ts
npm run typecheck
npm run build
git diff --cached --check
```

Expected: every selected test passes, typecheck/build exit 0, and the staged diff has no whitespace errors.

- [ ] **Step 10: Commit the promoted formal source**

```bash
git add package.json package-lock.json src/main/app-identity.ts src/main/index.ts test/app-identity.test.ts script/build_and_run.sh .codex/environments/environment.toml README.md README.zh.md
git commit -m "release: promote Sherlock development source to 0.6.0"
```

Include any remaining deliberately staged current-Dev files in this commit; never use `git add -A` until temporary paths have been explicitly excluded.

### Task 6: Package, publish, and prove the real update path

**Files:**
- Generated, not committed: `dist/mac-arm64/Sherlock.app`
- Generated, not committed: `dist/sherlock-mac-arm64.dmg`
- Generated, not committed: `dist/sherlock-mac-arm64.zip`
- Generated, not committed: `release-assets/`
- Generated, not committed: `release-cloudflare/`

**Interfaces:**
- Consumes: release certificate in secure storage, Cloudflare authentication, GitHub authentication, tag `v0.6.0`, and the committed release workflow.
- Produces: public formal installer, live Cloudflare metadata, legacy migration feed, and end-to-end evidence from an older signed fixture to 0.6.0.

- [ ] **Step 1: Prepare release secrets without exposing them**

Create/import the long-lived self-signed `Sherlock Desktop Update Signing` identity. Store its encrypted P12 and password in GitHub Actions secrets, then securely delete transient export files. Authenticate Wrangler through the user's browser only if no existing Cloudflare session/token is available; never ask the user to paste tokens into chat.

- [ ] **Step 2: Create R2 storage and custom domain**

Create private bucket `sherlock-releases`, bind the Cloudflare custom domain `updates.evanarts.com`, and confirm DNS/TLS. Configure metadata to revalidate and immutable objects to allow long caching. The user selected the accessible `evanarts.com` zone after the signed-in Cloudflare account was found not to contain `dshdesktop.com`.

- [ ] **Step 3: Build and validate the local formal Apple Silicon package**

Run: `./script/build_and_run.sh --formal`

Then run:

```bash
npm run verify:package:mac -- --app "dist/mac-arm64/Sherlock.app"
codesign --verify --deep --strict --verbose=2 "dist/mac-arm64/Sherlock.app"
codesign -d -r- "dist/mac-arm64/Sherlock.app"
hdiutil verify "dist/sherlock-mac-arm64.dmg"
```

Expected: package/runtime verification passes, nested code signatures are valid, the designated requirement names the Sherlock self-signed identity, and the DMG verifies.

- [ ] **Step 4: Verify the user-visible formal app**

Launch `dist/mac-arm64/Sherlock.app`, wait for Harness readiness, confirm the production name/version, confirm existing formal data is preserved, confirm no update button appears while 0.6.0 is current, and confirm Settings remains interactive. Do not infer UI state from source or process existence alone.

- [ ] **Step 5: Push the release commit and tag**

Run:

```bash
git push origin main
git tag -a v0.6.0 -m "Sherlock 0.6.0"
git push origin v0.6.0
```

Wait for the release workflow. If any platform/package job fails, fix the narrow cause, rerun its focused gate, and do not promote Cloudflare metadata manually.

- [ ] **Step 6: Verify all public release gates**

Confirm separately:

- GitHub Release contains the expected formal artifacts and update metadata;
- ModelScope `releases/latest` advertises 0.6.0 for legacy 0.5.0 clients;
- `https://updates.evanarts.com/latest/latest-mac.yml` advertises 0.6.0 and versioned ZIP URLs;
- immutable ZIP/DMG URLs support byte ranges and match local sizes/hashes;
- stable human download returns the formal DMG;
- Cloudflare headers have revalidating metadata and immutable versioned payloads.

- [ ] **Step 7: Exercise a real signed upgrade**

Build or retrieve an older writable-location fixture signed with the same Sherlock identity and version lower than 0.6.0. Launch it with isolated disposable user data containing a sentinel workspace/session marker. Verify in the rendered client:

1. the blue download button appears at the right side of the sidebar footer;
2. clicking it starts download and exposes progress;
3. downloaded state offers restart/install;
4. the app relaunches as 0.6.0;
5. the sentinel data remains;
6. the update button is absent after relaunch.

If the install directory is not writable, verify the documented DMG fallback instead of claiming automatic replacement.

- [ ] **Step 8: Run the final evidence gate**

Run fresh:

```bash
npm test -- test/update.test.ts test/sidebar-update-control.test.ts test/cloudflare-release.test.ts test/macos-self-signed-update.test.ts test/release.test.ts
npm run typecheck
npm run build
npm run verify:package:mac -- --app "dist/mac-arm64/Sherlock.app"
git diff --check
git status --short --branch
```

Report separately: source/tests, local formal package, code signature (not Gatekeeper/notarization), Cloudflare promotion, legacy feed, and real old→0.6.0 update. Do not mark the task complete if any required public or user-visible gate remains unresolved.
