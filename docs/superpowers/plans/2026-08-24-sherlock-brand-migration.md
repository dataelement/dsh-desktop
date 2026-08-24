# Sherlock Brand Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every user-visible DeepSeek and DSH client-brand reference to Sherlock while preserving required upstream and persisted-data compatibility identifiers.

**Architecture:** Treat branding as a presentation and packaging contract. Update Electron-owned surfaces directly, patch bundled upstream UI only at its user-visible strings, and keep a narrow allowlisted compatibility layer for package names, protocol fields, runtime environment variables, and existing data paths.

**Tech Stack:** Electron 43, TypeScript, Vitest, patch-package, electron-builder

**Spec:** `docs/superpowers/specs/2026-08-24-sherlock-brand-migration.md`

## Global Constraints

- User-visible product branding is exactly `Sherlock` or `Sherlock Dev`.
- External `@deepseek-ai/*` packages and DSH protocol/data identifiers remain compatible.
- Existing `dsh-desktop` user-data directories remain in use so sessions and settings survive the migration.
- Verification is focused; the full unit-test suite is out of scope.

---

### Task 1: Brand migration regression contract

**Files:**
- Create: `test/brand-migration.test.ts`

**Interfaces:**
- Consumes: package/build configuration, Electron source, HTML assets, installed upstream UI bundles, and reproducible patch files.
- Produces: a focused Vitest contract that rejects known user-visible legacy brand strings while allowing compatibility identifiers.

- [ ] **Step 1: Write the failing test**

Add assertions for Sherlock app/package names, Electron-owned UI copy, embedded web metadata, onboarding copy/provider list, preset copy, and plugin-market copy.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/brand-migration.test.ts`

Expected: FAIL on current DSH Desktop/DeepSeek Harness strings.

### Task 2: Electron and package surfaces

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `electron-builder.dev.cjs`
- Modify: `src/main/index.ts`
- Modify: `src/main/runtime/harness-runtime.ts`
- Modify: `src/main/runtime/profile-plugin-command.ts`
- Modify: `src/main/plugin-recovery-view.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/update-view.ts`
- Modify: `src/preload/windows-titlebar.ts`
- Modify: `src/main/mobile/lan-mobile-pages.ts`
- Modify: `build/splash.html`
- Modify: `build/plugin-recovery.html`
- Modify: `scripts/verify-packaged-macos.mjs`

**Interfaces:**
- Consumes: existing compatibility app ID and user-data paths.
- Produces: Sherlock application names, artifacts, menus, dialogs, status copy, and fallback pages.

- [ ] **Step 1: Replace the Electron-owned presentation strings**

Use `Sherlock`/`Sherlock Dev` for app names and copy, and `sherlock-*` for new artifact filenames while retaining the existing bundle ID and user-data directories.

- [ ] **Step 2: Run focused Electron tests**

Run: `npx vitest run test/brand-migration.test.ts test/release.test.ts test/update.test.ts test/windows-titlebar.test.ts test/plugin-recovery-view.test.ts test/lan-mobile-pages.test.ts`

Expected: PASS with no legacy user-facing names.

### Task 3: Embedded web and patched UI surfaces

**Files:**
- Modify: `scripts/install-brand-assets.mjs`
- Modify: `packages/dsh-desktop-market-installer/client.js`
- Modify: relevant `patches/@deepseek-ai+*.patch` files
- Modify mechanically: corresponding installed `node_modules/@deepseek-ai/*/lib/client.js` files
- Modify: tests covering onboarding, presets, directory/workspace messages, and brand assets

**Interfaces:**
- Consumes: patch-package's pinned upstream bundle layout.
- Produces: Sherlock-branded document metadata and visible UI copy with reproducible patches.

- [ ] **Step 1: Replace visible legacy copy in the installed UI bundles**

Remove the DeepSeek row from Sherlock's first-run provider list, make OpenAI the initial route, and change DSH product copy to Sherlock without renaming protocol fields such as `sourceDshVersion`.

- [ ] **Step 2: Regenerate the affected patch-package files**

Run patch-package only for changed pinned packages so unrelated dirty patches remain intact.

- [ ] **Step 3: Re-run the focused brand tests**

Run: `npx vitest run test/brand-migration.test.ts test/branding-patch.test.ts test/onboarding-patch.test.ts test/preset-transfer-patch.test.ts test/directory-picker.test.ts test/sherlock-composer-workspace-ui.test.ts test/market-installer.test.js`

Expected: PASS.

### Task 4: Build, package, and rendered-client verification

**Files:**
- Verify: generated `out/**`
- Verify: `dist-dev/mac-arm64/Sherlock Dev.app`

**Interfaces:**
- Consumes: all migrated source and patches.
- Produces: a runnable Sherlock development client.

- [ ] **Step 1: Verify static correctness**

Run: `npm run typecheck && npm run build`

Expected: both commands exit 0.

- [ ] **Step 2: Build the macOS development app**

Run: `npm run package:dev:dir -- --mac --arm64`

Expected: `dist-dev/mac-arm64/Sherlock Dev.app` exists and passes strict code-sign verification.

- [ ] **Step 3: Launch and inspect the client**

Close only an existing Sherlock development instance, launch the new bundle,
bring it to the foreground, and verify the window/app name plus visible
Sherlock branding on the real rendered path.
