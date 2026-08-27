# Sherlock Formal Client Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the previously approved About page and make the signed Sherlock artifact install the same plugin baseline and attachment capability that is visible in the working formal client.

**Architecture:** Sherlock owns the About UI through the patched core settings bundle and a narrow preload bridge. Release packaging prepares a portable offline plugin profile from the formal `sherlock-desktop` profile, embeds it as an Electron resource, and installs it before Harness starts while leaving credentials and all non-profile user data untouched. Verification uses an isolated user-data directory and the actual signed artifact.

**Tech Stack:** Electron, TypeScript, React client bundles, electron-builder, Vitest, pnpm offline profile, macOS codesign/DMG.

**Spec:** `docs/sherlock-formal-parity-spec.md`

## Global Constraints

- Use only the formal `Sherlock.app` identity and `sherlock-desktop` as the release profile source.
- Do not publish, upload, tag, or commit during this task.
- Do not run the full test suite; run only directly affected tests and typecheck.
- Never package `.credentials.yaml`, model settings, sessions, workspaces, `.env`, or user API values.
- Preserve unrelated dirty-worktree changes.

---

### Task 1: Restore the approved About page

**Files:**
- Create: `src/preload/about-info.ts`
- Modify: `src/preload/index.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.0-rc.7.patch`
- Test: `test/settings-about.test.ts`

**Interfaces:**
- Produces: `createSherlockAboutBridge(readUpdateStatus, locale)` exposing `window.sherlockAbout.getInfo()`.
- Produces: settings section id `about`, order `11`, and `SherlockAboutContent({ info, t })`.

- [ ] **Step 1: Write the failing About regression tests**

Assert that the bundle registers `id: "about"`, renders `当前版本`, renders `更新日志`, and consumes `window.sherlockAbout.getInfo()`.

- [ ] **Step 2: Run the About tests and confirm the simplified page fails them**

Run: `npx vitest run test/settings-about.test.ts test/brand-migration.test.ts`

- [ ] **Step 3: Restore the prior About bridge and component**

Use the previously developed implementation already present at `/Users/heyafeng/Documents/ChatGPT/dsh/src/preload/about-info.ts` and `/Users/heyafeng/Documents/ChatGPT/dsh/patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.0-rc.7.patch`, preserving the interfaces above.

- [ ] **Step 4: Persist and verify the dependency patch**

Run `npx patch-package @deepseek-ai/dsh-client-ui-settings-general`, then verify reverse applicability with `git apply --check --reverse`.

### Task 2: Enforce public-mode navigation

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/developer-mode.ts`
- Test: `test/developer-mode.test.ts`
- Test: `test/brand-migration.test.ts`

**Interfaces:**
- Consumes: `initialDeveloperMode` from the renderer argument.
- Produces: hidden internal settings and internal conversation tabs whenever mode is false.

- [ ] **Step 1: Add a regression test for initialization order and label fallback**

Assert developer visibility is mounted before optional shell styling and that both stable ids and localized Memory labels are recognized.

- [ ] **Step 2: Run the developer-mode tests and confirm the regression**

Run: `npx vitest run test/developer-mode.test.ts test/brand-migration.test.ts`

- [ ] **Step 3: Mount developer visibility first and retain id plus label fallback**

Call `mountDeveloperModeUi()` before theme/shell helpers and hide stable ids; when an internal extension lacks an id, recognize its existing localized labels.

- [ ] **Step 4: Re-run focused tests**

Run: `npx vitest run test/developer-mode.test.ts test/developer-mode-state.test.ts test/brand-migration.test.ts`.

### Task 3: Embed the formal plugin baseline in release artifacts

**Files:**
- Create: `build/sherlock-bundled-plugins.json`
- Create: `scripts/prepare-bundled-plugin-profile.mjs`
- Create: `src/main/bundled-plugin-profile.ts`
- Modify: `src/main/index.ts`
- Modify: `electron-builder.notarized.cjs`
- Modify: `package.json`
- Test: `test/bundled-plugin-profile.test.ts`
- Test: `test/release.test.ts`

**Interfaces:**
- Produces: `installBundledPluginProfile({ userDataPath, bundledProfilePath, appVersion })`.
- Produces: `build/sherlock-plugin-profile` containing portable `modules`, manifest, lockfile, and Cordis patch.

- [ ] **Step 1: Add new-install, upgrade, idempotence, and secret-exclusion tests**

The tests must prove `dsh-file-drop` is mandatory, `.credentials.yaml` remains untouched, and no model settings enter the packaged profile.

- [ ] **Step 2: Run bundled-profile tests and confirm the implementation is absent**

Run: `npx vitest run test/bundled-plugin-profile.test.ts test/release.test.ts`.

- [ ] **Step 3: Add portable preparation from the formal profile**

Default `SHERLOCK_PLUGIN_PROFILE_SOURCE` to `~/Library/Application Support/sherlock-desktop/harness/profiles/web`; dereference plugin links, rewrite them as relative `file:vendor/...`, run production pnpm install, reject escaping symlinks and user-owned filenames, then rename `node_modules` to `modules` for electron-builder.

- [ ] **Step 4: Install the embedded profile before Harness boot**

Embed `build/sherlock-plugin-profile` as `Contents/Resources/sherlock-plugin-profile`; install it only in packaged builds, back up an older profile, and leave all paths outside `harness/profiles/web` unchanged.

- [ ] **Step 5: Make every formal package command prepare the profile**

Prefix both the formal directory build and macOS distribution build with `npm run prepare:bundled-plugin-profile`.

- [ ] **Step 6: Run focused profile, release, and type checks**

Run: `npx vitest run test/bundled-plugin-profile.test.ts test/release.test.ts test/plugin-profile-sync.test.js && npm run typecheck`.

### Task 4: Verify signed artifact and isolated-user parity

**Files:**
- Verify: `dist-notarized/mac-arm64/Sherlock.app`
- Verify: `dist-notarized/sherlock-mac-arm64.dmg`

**Interfaces:**
- Consumes: bundled profile resource and packaged app.
- Produces: evidence that formal local and isolated-user installs share the six-plugin baseline while credentials are absent.

- [ ] **Step 1: Build the signed formal artifact without public upload**

Run the formal prepare/build command with notarization explicitly disabled for local validation, then run strict `codesign --verify --deep --strict`.

- [ ] **Step 2: Inspect the artifact contents**

Verify the embedded manifest lists the policy plugins, includes `dsh-file-drop`, excludes `dsh-memory-evolve` and `dsh-update-checker`, contains no absolute publisher path, and contains no credential/model API file.

- [ ] **Step 3: Launch with an isolated user-data directory**

Start the exact signed `Sherlock.app` with a fresh temporary `--user-data-dir`; verify the installed profile and its receipt match the embedded manifest.

- [ ] **Step 4: Verify the real UI**

Use Computer Use to confirm public settings, the restored About release-notes page, only public conversation tabs, and the attachment button in the input composer.

- [ ] **Step 5: Restore the user's formal client and report**

Stop the isolated instance, relaunch the same signed app against `sherlock-desktop`, and report that no public upload occurred.
