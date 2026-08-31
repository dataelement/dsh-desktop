# Sherlock Feature Preview Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:using-git-worktrees before implementation, superpowers:test-driven-development for every implementation task, superpowers:systematic-debugging for any unexpected package/runtime behavior, superpowers:verification-before-completion before every task commit, and either superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task-by-task.

**Goal:** Let a clean committed `codex/feat/*` worktree build and run its own unmistakable Sherlock preview without stopping shared Sherlock, touching formal user data, publishing updates, or hiding which feature commit is on screen.

**Architecture:** Derive a deterministic identity from the full feature branch and a validated slug. Reuse plans A and B for Git status, provenance parsing, dependency evidence, exact executable lifecycle, launch proof, runtime policy, and About formatting. A dynamic builder embeds the preview identity and feature provenance. The preview runner performs gate → build → package verification → second gate before it stops only the same preview executable and starts the new absolute App path.

**Tech Stack:** Electron 43, electron-builder 26, Node.js 24 ESM, TypeScript 5.9, macOS process/bundle tooling, Vitest 4, patch-package 8.

**Spec:** `docs/superpowers/specs/2026-08-31-sherlock-multi-session-integration-workflow-design.md`

## Global Constraints

- This is plan C of three. Start only after plans A and B have passed their completion gates and been accepted into local `main`.
- Execute this plan in dedicated worktree branch `codex/feat/feature-preview-isolation-20260831`. The final real preview verification uses slug `feature-preview-isolation` and this exact branch.
- Reuse `scripts/lib/sherlock-git-state.mjs`, `scripts/lib/sherlock-build-provenance.mjs`, `scripts/lib/sherlock-dependency-digest.mjs`, `scripts/lib/exact-executable-lifecycle.mjs`, and the runtime policy introduced by plans A/B. Do not create competing Git/provenance/update/process parsers.
- Historical commits `2f2ae4f4`, `57dce192`, and `94dc970c` are read-only reference material. Do not cherry-pick, merge, or restore the rejected Harness Preview experiment.
- Reusable historical patterns are limited to separate identity, `publish: null`, absence of `app-update.yml`, exact executable-path process matching, and sibling-survival tests.
- Do not reuse the historical “stop preview before build” order, fixed Harness identity, or auto-update-only switch.
- Preview source must be clean and committed on `codex/feat/*`. No dirty-preview escape hatch or `--force` flag is permitted.
- A preview cannot override its user-data path, migrate formal data, synchronize global skills, use a public feed, notarize, publish, or modify version numbers.
- Preview stop/run/status operates only on the absolute executable derived from its identity. Shared `Sherlock` and every other preview remain running.
- Never automatically delete preview data, App bundles, branches, or worktrees.
- Do not run the full test suite. Commit every task that changes tracked files separately with the listed Chinese message.

## Canonical Preview Identity

`scripts/lib/feature-preview-identity.d.mts`:

```ts
export interface FeaturePreviewIdentity {
  channel: 'feature-preview'
  branch: string
  slug: string
  displaySlug: string
  identityHash: string
  productName: string
  packageName: string
  appId: string
  outputDirectory: string
  userDataDirectoryName: string
  executableName: string
  appBundleName: string
}

export function assertNormalizedFeaturePreviewSlug(value: string): string
export function parseFeatureBranch(branch: string): {
  slug: string
  date: string
}
export function deriveFeaturePreviewIdentity(options: {
  branch: string
  requestedSlug: string
}): FeaturePreviewIdentity
```

Rules:

- Slug is lowercase ASCII, at most 40 characters, matches `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`, and contains no consecutive `--`.
- Branch is exactly `codex/feat/<slug>-<YYYYMMDD>` and requested slug equals the branch slug.
- `identityHash` is the first 10 lowercase hex characters of SHA-256 over the full branch name.
- For `codex/feat/research-canvas-20260831`, the hash is `e4213968c9`, App ID is `com.evanarts.sherlock.preview.research-canvas.e4213968c9`, output is `dist-feature-preview/research-canvas-e4213968c9`, and user data is `sherlock-preview-research-canvas-e4213968c9`.

## Task 1: Derive Preview Identity and Enforce the Feature Source Gate

**Files:**

- Create: `scripts/lib/feature-preview-identity.mjs`
- Create: `scripts/lib/feature-preview-identity.d.mts`
- Create: `scripts/lib/feature-preview-source-gate.mjs`
- Create: `scripts/lib/feature-preview-source-gate.d.mts`
- Create: `test/feature-preview-identity.test.ts`
- Create: `test/feature-preview-source-gate.test.ts`

**Interfaces:**

```ts
export interface FeaturePreviewSourceSnapshot {
  repositoryRoot: string
  worktreePath: string
  branch: string
  head: string
  baseCommit: string
  sourceClean: true
  identity: FeaturePreviewIdentity
}

export function assertFeaturePreviewSource(options: {
  repository: string
  requestedSlug: string
}): FeaturePreviewSourceSnapshot

export function sameFeaturePreviewSource(
  left: FeaturePreviewSourceSnapshot,
  right: FeaturePreviewSourceSnapshot
): boolean
```

- [ ] Write failing identity table tests for valid slugs at length boundaries, title-cased display labels, the exact research-canvas hash, App/package/executable names, Bundle ID, output directory, and user-data directory.
- [ ] Add rejection cases for uppercase, Unicode, underscores, dots, slashes, leading/trailing hyphens, consecutive hyphens, overlength, branch/requested-slug mismatch, invalid dates, path traversal, and two normalized-collision attempts.
- [ ] Write failing source-gate tests for a clean linked feature worktree with one commit ahead of local `main`.
- [ ] Add rejection cases for `main`, integration, detached, untracked source, staged/unstaged changes, branch ref differing from HEAD, no commits ahead, main not ancestral/ambiguous merge-base, and a checked-out branch name that fails the identity parser.
- [ ] Add a second-snapshot case proving HEAD, source status, base, branch, or identity changes cause `sameFeaturePreviewSource` to return false.
- [ ] Run `npx vitest run test/feature-preview-identity.test.ts test/feature-preview-source-gate.test.ts` and confirm failure because the modules are absent.
- [ ] Implement identity derivation with Node `crypto.createHash('sha256')` and explicit path-safe output components. Never derive identity from a display label.
- [ ] Implement the source gate only through `sherlock-git-state.mjs`. Require exact branch ref, source-clean status, one merge-base with local `main`, and at least one feature commit.
- [ ] Run the two focused test files, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加功能预览身份与源码门禁"`.

## Task 2: Bind Preview Identity to Runtime Data and Policy

**Files:**

- Modify: `src/main/app-identity.ts`
- Modify: `src/main/build-context.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/update/update-manager.ts`
- Modify: `src/preload/sidebar-update-control.ts`
- Modify: `test/app-identity.test.ts`
- Modify: `test/update-manager.test.ts`
- Modify: `test/sidebar-update-control.test.ts`
- Modify: `test/bundled-skill-upgrade.test.ts`

**Interfaces:** Extend plan B’s `resolveDesktopIdentity(options)` so `feature-preview` requires validated provenance with a `preview` object and returns `Sherlock Preview - <Display Slug>` plus the derived preview user-data directory.

- [ ] Add failing identity tests that compare provenance-derived name/userData with `deriveFeaturePreviewIdentity` and reject missing/mismatched slug, hash, branch, base, tip, and current commit.
- [ ] Add tests proving every `--sherlock-user-data-dir` value is rejected for feature preview, including an absolute path.
- [ ] Add startup-order tests proving build context/provenance is validated before `app.setName`, `app.setPath`, migration, plugin installation, skill sync, or `requestSingleInstanceLock()`.
- [ ] Add preview skill tests asserting the only target is `<preview-userData>/harness/skills` and `~/.agents/skills` is never passed.
- [ ] Add update tests proving automatic checks, IPC, menu, sidebar, and About manual checks remain disabled and never touch `autoUpdater`.
- [ ] Run `npx vitest run test/app-identity.test.ts test/update-manager.test.ts test/sidebar-update-control.test.ts test/bundled-skill-upgrade.test.ts` and confirm failures.
- [ ] Implement preview identity from the same validated provenance resource used by About and launch proof. Do not accept builder metadata alone as identity evidence.
- [ ] Enforce the runtime order: resolve context → derive identity → set name/userData → request single-instance lock → preview-local skill/profile setup → launch.
- [ ] Keep preview migration disabled and use its own plugin profile transaction directory. Preserve plan B behavior for local-integration/formal/development.
- [ ] Run the four focused tests, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "桌面端：隔离功能预览运行策略"`.

## Task 3: Build a Dynamic Preview Package and Verify Every Identity Surface

**Files:**

- Create: `electron-builder.feature-preview.cjs`
- Create: `scripts/lib/feature-preview-builder.mjs`
- Create: `scripts/lib/feature-preview-builder.d.mts`
- Create: `scripts/verify-feature-preview.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `test/feature-preview-builder.test.ts`
- Create: `test/feature-preview-verifier.test.ts`

**Interfaces:**

```ts
export interface FeaturePreviewBuildContext {
  schemaVersion: 1
  identity: FeaturePreviewIdentity
  provenancePath: string
  provenanceDigest: Sha256Digest
}

export function readFeaturePreviewBuildContext(
  contextPath: string,
  projectRoot: string
): FeaturePreviewBuildContext

export function createFeaturePreviewBuilderConfig(options: {
  packageJson: Record<string, unknown>
  projectRoot: string
  context: FeaturePreviewBuildContext
}): Record<string, unknown>

export function verifyFeaturePreviewBundle(options: {
  appPath: string
  expectedProvenancePath: string
}): Promise<{
  executablePath: string
  identity: FeaturePreviewIdentity
  provenanceDigest: Sha256Digest
}>
```

- [ ] Write failing context tests requiring one absolute `SHERLOCK_FEATURE_PREVIEW_CONTEXT` below the calling worktree’s ignored `.sherlock-build/`; reject missing, relative, symlink-escaping, malformed, or provenance-digest-mismatched contexts.
- [ ] Write builder tests for dynamic App ID/name/executable/output, `dshDesktopChannel: 'feature-preview'`, embedded identity metadata, `publish: null`, `mac.notarize: false`, bundled plugin profile, and embedded `sherlock-build-provenance.json`.
- [ ] Assert neither builder resources nor the final config include `app-update-notarized.yml` or any update feed.
- [ ] Write verifier fixtures covering `CFBundleIdentifier`, `CFBundleName`, `CFBundleExecutable`, App filename, packaged name/product/channel/identity, user-data directory name, provenance raw digest/mode/base/tip/hash, no sensitive paths, absent `app-update.yml`, bundled Node/profile, and deep-strict signature.
- [ ] Add one negative verifier case for every identity surface so changing only one field fails.
- [ ] Run `npx vitest run test/feature-preview-builder.test.ts test/feature-preview-verifier.test.ts` and confirm failure.
- [ ] Implement the builder config as a fail-closed function reading only `SHERLOCK_FEATURE_PREVIEW_CONTEXT`. Derive every identity/output field from the validated context.
- [ ] Implement `verifyFeaturePreviewBundle` by composing plan B’s packaged verifier with preview-specific Info.plist/metadata/provenance checks.
- [ ] Add `"package:feature-preview:dir": "npm run build && electron-builder --dir --publish never --config electron-builder.feature-preview.cjs"`.
- [ ] Add only `dist-feature-preview/` to the plan-B `.gitignore` entries; keep `.sherlock-build/` ignored and do not ignore manifests, handoffs, or source.
- [ ] Run the two focused tests plus `test/macos-package-provenance.test.ts` and `test/release.test.ts`, then `npm run typecheck` and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加功能预览动态打包与校验"`.

## Task 4: Show Persistent Preview Provenance

**Files:**

- Create: `src/preload/build-provenance-badge.ts`
- Modify: `src/shared/app-info.ts`
- Modify: `src/preload/about-info.ts`
- Modify: `src/preload/index.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.0-rc.7.patch`
- Create: `test/build-provenance-badge.test.ts`
- Modify: `test/app-info.test.ts`
- Modify: `test/settings-about.test.ts`

**Interfaces:**

```ts
export interface BuildProvenanceDisplay {
  mode: SherlockBuildMode
  label: string
  branch: string
  shortCommit: string
  builtAt: string
  slug?: string
}

export function buildProvenanceDisplayArgument(
  value: BuildProvenanceDisplay
): string
export function buildProvenanceDisplayFromArguments(
  args: readonly string[]
): BuildProvenanceDisplay | undefined
export function mountBuildProvenanceBadge(
  document: Document,
  display: BuildProvenanceDisplay
): HTMLElement | undefined
```

- [ ] Write failing argument round-trip tests and reject malformed/oversized/unknown-mode display payloads.
- [ ] Write DOM tests proving feature preview mounts exactly one persistent badge containing `Feature Preview <slug> @ <short SHA>` plus `data-build-mode`, `data-build-branch`, and `data-build-commit`.
- [ ] Add accessibility/interaction tests: badge has readable contrast, does not intercept ordinary canvas clicks, survives route changes without duplication, and exposes full branch/build time through accessible text or tooltip.
- [ ] Add non-preview tests proving formal/local-main/local-integration do not receive the persistent preview badge.
- [ ] Extend About tests to show the same slug/branch/commit/time from plan B’s formatter and to omit the update button.
- [ ] Run `npx vitest run test/build-provenance-badge.test.ts test/app-info.test.ts test/settings-about.test.ts` and confirm failures.
- [ ] Implement display argument parsing from validated provenance only; never trust an arbitrary renderer-provided string.
- [ ] Mount the badge from preload after DOM readiness and remount safely when Harness replaces the document root.
- [ ] Patch the installed settings About view with `apply_patch`, regenerate only its patch-package patch, and verify reinstall parity.
- [ ] Run the three focused tests plus `test/update-manager.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "界面：持续展示功能预览构建来源"`.

## Task 5: Add Exact Preview Lifecycle and CLI

**Files:**

- Create: `scripts/feature-preview.mjs`
- Modify: `package.json`
- Create: `test/feature-preview-lifecycle.test.ts`
- Create: `test/feature-preview-command.test.ts`

**CLI:**

```text
npm run preview:feature -- build  --slug feature-preview-isolation [--repo <path>]
npm run preview:feature -- run    --slug feature-preview-isolation [--repo <path>]
npm run preview:feature -- verify --slug feature-preview-isolation [--repo <path>]
npm run preview:feature -- status --slug feature-preview-isolation [--repo <path>]
npm run preview:feature -- stop   --slug feature-preview-isolation [--repo <path>]
```

- [ ] Write failing CLI parser tests for the five commands and the only two options. Reject `--force`, user-data, publish, notarize, version, output, and arbitrary environment identity overrides.
- [ ] Write a strict call-order test:

  ```text
  source gate
  → prepare isolated worktree dependencies and bundled profile
  → apply/verify committed patches
  → compute dependency evidence
  → generate feature-preview provenance and build context
  → package
  → verify package
  → repeat source gate and compare snapshot
  → stop exact same preview executable
  → open exact App path
  → wait for exact executable and matching Harness launch proof
  ```

- [ ] Inject a failure at every pre-stop stage and prove there is no stop/open call.
- [ ] Add lifecycle tests with shared Sherlock plus two preview identities. `stop` or replacement of one preview must leave shared Sherlock and the sibling preview alive.
- [ ] Add launch-proof failures for wrong path/PID/channel/commit/digest and assert the previous same-identity preview is reopened if it existed; never touch the shared active-generation pointer.
- [ ] Add `status` tests returning branch, commit, App/executable paths, PID list, and provenance match without mutation.
- [ ] Run `npx vitest run test/feature-preview-lifecycle.test.ts test/feature-preview-command.test.ts` and confirm failure.
- [ ] Implement `build` through the second source snapshot but without stopping/opening. Implement `run`/`verify` with the full switch sequence; `verify` requires stable executable samples and a matching real Harness proof.
- [ ] Implement `stop` with `stopExactExecutable` and no data deletion. Implement `status` read-only.
- [ ] Add `"preview:feature": "node scripts/feature-preview.mjs"`.
- [ ] Run:

  ```bash
  npx vitest run \
    test/feature-preview-identity.test.ts \
    test/feature-preview-source-gate.test.ts \
    test/feature-preview-builder.test.ts \
    test/feature-preview-verifier.test.ts \
    test/build-provenance-badge.test.ts \
    test/feature-preview-lifecycle.test.ts \
    test/feature-preview-command.test.ts \
    test/app-identity.test.ts \
    test/update-manager.test.ts \
    test/sidebar-update-control.test.ts \
    test/app-info.test.ts \
    test/settings-about.test.ts
  npm run typecheck
  git diff --check
  ```

- [ ] Commit command, runner, and tests with `git commit -m "脚本：增加功能预览精确启动与停止"`.

## Task 6: Document and Verify the Real Feature Preview

**Files:**

- Modify: `docs/sherlock-multi-session-integration-runbook.md`
- Modify: `AGENTS.md`
- Create: `test/feature-preview-runbook.test.ts`

- [ ] Write a failing documentation test requiring the five preview commands, source-clean feature restriction, identity derivation, no-update/no-migration/no-global-skill rules, exact-process behavior, persistent provenance, and explicit no-cleanup rule.
- [ ] Run `npx vitest run test/feature-preview-runbook.test.ts` and confirm it fails before the runbook changes.
- [ ] Update the runbook and `AGENTS.md`: feature worktrees may only use `npm run preview:feature` for pre-merge UI preview; shared `./script/build_and_run.sh` remains forbidden there.
- [ ] Run `npx vitest run test/feature-preview-runbook.test.ts test/feature-preview-command.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "文档：启用 Sherlock 隔离功能预览流程"`.
- [ ] Confirm the branch is now source-clean. If any real-preview failure requires a tracked fix, return to its owning TDD task, create a separate Chinese fix commit, and restart this task.
- [ ] From clean branch `codex/feat/feature-preview-isolation-20260831`, run `npm run preview:feature -- verify --slug feature-preview-isolation`.
- [ ] Use `computer-use:computer-use` to inspect the real preview window. Confirm the persistent badge and About show the exact branch/tip, the target feature UI works, shared Sherlock is still running, and its About/provenance did not change.
- [ ] Leave both clients open for user comparison. Do not clean preview data, output, branch, or worktree.

## Task 7: Hand Off, Integrate, and Promote the Accepted Preview Tooling

**Files:** No direct source edits. The plan-A executor creates and updates the tracked integration manifest and merge commits.

- [ ] After the user accepts the exact preview tip, generate a handoff card for `codex/feat/feature-preview-isolation-20260831` with the focused command from Task 5 and the real preview verification from Task 6.
- [ ] In a dedicated integration session based on the unchanged plan-B `main` tip, create/adopt a new batch containing that exact handoff, run read-only preflight, and merge the complete feature history.
- [ ] Rerun the manifest-declared focused preview tests and `npm run typecheck` on the staged/merged integration tree.
- [ ] Build the shared integration client with `./script/build_and_run.sh --verify`. Verify its provenance lists the feature tip, its About has no preview badge, and feature-preview/update/runtime regressions are absent.
- [ ] Keep the shared integration client open and pause for explicit user acceptance of the exact integration tip. Do not treat the earlier isolated preview acceptance as approval of a changed integration tip.
- [ ] After acceptance, record the exact tip/manifest digest and promote to canonical `main` with `--ff-only`.
- [ ] Verify `main` contains every plan-C commit, the active lease is archived, and preview/shared worktrees and preview data remain intact until the user explicitly authorizes cleanup.

## Task 8: Rehearse One Two-Feature Parallel Batch End to End

**Files:**

- Create on branch A: `docs/superpowers/rehearsals/2026-08-31-handoff-example.md`
- Create on branch B: `docs/superpowers/rehearsals/2026-08-31-provenance-example.md`

- [ ] From the same exact final plan-C `main` commit, create two linked worktrees and branches `codex/feat/workflow-handoff-example-20260831` and `codex/feat/workflow-provenance-example-20260831`.
- [ ] In branch A, document one fully concrete handoff card using synthetic SHA values clearly labeled as examples; run `git diff --check` and commit with `git commit -m "文档：增加功能交接卡示例"`.
- [ ] In branch B, document one fully concrete four-mode provenance matrix with no local paths or credentials; run `git diff --check` and commit with `git commit -m "文档：增加构建来源示例"`.
- [ ] Generate independent handoff cards from both clean worktrees. Assert each card contains only its own commit/file and binds its check evidence to its exact tip.
- [ ] In a third integration worktree, create one batch with both handoffs, run preflight/dry-run, merge A then B, and verify two separate no-ff feature boundaries plus a manifest feature list in that order.
- [ ] Run only `npx vitest run test/integration-runbook.test.ts test/local-integration-runbook.test.ts test/feature-preview-runbook.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Run `./script/build_and_run.sh --verify` from the exact leased integration tip. Verify the signed provenance and About feature list include both branches/tips and the real main window remains usable.
- [ ] Leave the client open and pause for explicit user acceptance. After acceptance, record the exact tip/digest and promote with `--ff-only`.
- [ ] Verify canonical `main` contains both example commits. Retain the three rehearsal worktrees/branches until the user explicitly authorizes cleanup; do not push or publish.

## Plan C Completion Gate

- Every preview identity is a deterministic function of an exact valid feature branch plus stable hash.
- Preview source, package metadata, Info.plist, userData, launch proof, persistent badge, and About all agree on slug/branch/commit.
- Preview never uses formal user data, global skills, migration, updater, notarization, publish, or shared active-generation state.
- Build/package/post-build failures leave the currently running preview and shared Sherlock untouched.
- Switching/stopping one preview targets one exact absolute executable and preserves every sibling process.
- The real preview Harness window and shared Sherlock can remain open concurrently for user acceptance.
- The final two-feature rehearsal proves independent handoffs, ordered complete merges, multi-feature provenance, real shared-client acceptance, and `--ff-only` promotion without remote or destructive operations.
