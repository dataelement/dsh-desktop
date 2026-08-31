# Sherlock Shared Build Provenance and Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every implementation task, superpowers:systematic-debugging for any unexpected build/runtime failure, superpowers:verification-before-completion before every task commit, and either superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task-by-task.

**Goal:** Make every shared local Sherlock client provably originate from the exact clean local `main` or active integration tip, prevent concurrent worktrees from replacing it, disable public updating in local acceptance builds, and automatically reopen the previous verified generation if the new client fails to reach the real Harness UI.

**Architecture:** Consume plan A’s immutable Git source snapshot and active-batch lease. Enrich it with deterministic dependency evidence, emit a signed-in provenance resource, and package into a new immutable generation under the canonical checkout. A common-dir lock protects the full lifecycle. The runner validates twice before stopping anything, launches by exact App/executable path, waits for a main-window proof written only after Harness is visible, then atomically advances the active pointer or rolls back both the App and managed configuration mutations.

**Tech Stack:** Electron 43, electron-vite 5, electron-builder 26, Node.js 24 ESM, TypeScript 5.9, Bash, macOS `codesign`/`open`/`pgrep`, Vitest 4, patch-package 8.

**Spec:** `docs/superpowers/specs/2026-08-31-sherlock-multi-session-integration-workflow-design.md`

## Global Constraints

- This is plan B of three. Start only after every completion gate in `2026-08-31-sherlock-session-integration-controls.md` passes.
- Execute this plan in a dedicated worktree branch `codex/feat/shared-build-provenance-20260831` created from the accepted plan-A tip on local `main`.
- Preserve the existing `./script/build_and_run.sh --verify` user-facing command. It becomes a thin dispatcher to the new runner.
- `local-main` and `local-integration` use product name `Sherlock`, Bundle ID `com.evanarts.sherlock`, and the existing `sherlock-desktop` user-data directory. They must use channel `local-integration` and must not contact a public updater.
- Formal release remains a separate `formal` mode with channel `notarized` and the existing release gates. This plan does not publish, upload, bump the version, push, or tag.
- Source/provenance/lock/package checks must all pass before any existing Sherlock process is stopped.
- Never identify or stop a client by process name alone. Bind every operation to an absolute executable path and verified provenance.
- New packages live in immutable generations under the canonical checkout. Never overwrite a signed App bundle in place.
- An active pointer changes only after the new App reaches the real Harness main window and its proof matches the expected commit/channel/digest.
- A failed launch must leave the pointer unchanged, roll back managed startup mutations, and reopen the previous verified absolute App path.
- Local integration and feature preview must never synchronize bundled skills to global `~/.agents/skills`.
- Do not run the full test suite. Use only the focused tests in this plan and one real packaged UI verification.
- Commit every task that changes tracked files separately with the listed Chinese message; never stage existing `dist-internal/` or `output/`.

## Cross-Plan Inputs

Consume without duplicating:

- `resolveRepositoryContext()` and `listRegisteredWorktrees()` from `scripts/lib/sherlock-git-state.mjs`.
- `verifySharedBuildSource()` and `assertSharedBuildSourceUnchanged()` from `scripts/lib/sherlock-shared-source-gate.mjs`.
- `readActiveBatchLease()` and owner-token checks from `scripts/lib/sherlock-active-batch.mjs`.

## Canonical Provenance Interface

Create `scripts/lib/sherlock-build-provenance.mjs` as the only parser/validator and re-export it through `src/shared/build-provenance.ts`.

```ts
export type Sha256Digest = string
export type SherlockBuildMode =
  | 'local-main'
  | 'local-integration'
  | 'feature-preview'
  | 'formal'

export interface ProvenanceFeature {
  branch: string
  commit: string
}

export interface ProvenanceBase {
  schemaVersion: 1
  productVersion: string
  mode: SherlockBuildMode
  channel: 'local-integration' | 'feature-preview' | 'notarized'
  branch: string
  commit: string
  mainCommit: string
  sourceClean: true
  dependencyDigest: Sha256Digest
  builtAt: string
}

export type SherlockBuildProvenance =
  | (ProvenanceBase & {
      mode: 'local-main'
      channel: 'local-integration'
      batchId: null
      manifestDigest: null
      features: []
    })
  | (ProvenanceBase & {
      mode: 'local-integration'
      channel: 'local-integration'
      batchId: string
      manifestDigest: Sha256Digest
      features: [ProvenanceFeature, ...ProvenanceFeature[]]
    })
  | (ProvenanceBase & {
      mode: 'feature-preview'
      channel: 'feature-preview'
      batchId: null
      manifestDigest: null
      features: [ProvenanceFeature]
      preview: {
        slug: string
        identityHash: string
        baseCommit: string
        tipCommit: string
      }
    })
  | (ProvenanceBase & {
      mode: 'formal'
      channel: 'notarized'
      batchId: null
      manifestDigest: null
      features: []
    })

export function validateBuildProvenance(value: unknown): SherlockBuildProvenance
export function readBuildProvenance(file: string): SherlockBuildProvenance
export function parseBuildProvenanceJson(text: string): SherlockBuildProvenance
export function buildProvenanceArgument(value: SherlockBuildProvenance): string
export function buildProvenanceFromArguments(
  args: readonly string[]
): SherlockBuildProvenance | undefined
```

## Task 1: Define Provenance and Dependency Evidence

**Files:**

- Create: `scripts/lib/sherlock-build-provenance.mjs`
- Create: `scripts/lib/sherlock-build-provenance.d.mts`
- Create: `scripts/lib/sherlock-dependency-digest.mjs`
- Create: `scripts/lib/sherlock-dependency-digest.d.mts`
- Create: `scripts/create-build-provenance.mjs`
- Create: `src/shared/build-provenance.ts`
- Modify: `scripts/prepare-bundled-plugin-profile.mjs`
- Modify: `.gitignore`
- Create: `test/build-provenance.test.ts`
- Create: `test/dependency-provenance.test.ts`
- Modify: `test/bundled-plugin-profile.test.ts`

**Interfaces:**

```ts
export interface DependencyEvidence {
  schemaVersion: 1
  lockfileDigest: Sha256Digest
  patchSetDigest: Sha256Digest
  patchResultDigest: Sha256Digest
  bundledProfileManifestDigest: Sha256Digest
  workspaceNodeVersion: string
  digest: Sha256Digest
}

export function collectDependencyEvidence(options: {
  projectRoot: string
  bundledProfileManifest: string
  workspaceNodeExecutable: string
}): DependencyEvidence

export function createBuildProvenance(
  source: SharedSourceSnapshot,
  dependency: DependencyEvidence,
  options: { productVersion: string; builtAt: string }
): SherlockBuildProvenance

export function writeBuildProvenance(
  outputPath: string,
  value: SherlockBuildProvenance
): Promise<{ sha256: Sha256Digest }>
```

- [ ] Write failing table tests for all four provenance modes, including exact required-null/required-nonempty fields, full SHA values, SemVer product version, ISO-8601 time, SHA-256 digests, `sourceClean === true`, and channel/mode matching.
- [ ] Add rejection cases for unknown modes/channels, unknown top-level fields, absolute paths, usernames/home paths, credential-like keys, duplicate feature branches/tips, mismatched preview tip, and `mainCommit !== commit` in local-main/formal.
- [ ] Add encode/decode tests for the command-line argument and malformed/oversized argument rejection.
- [ ] Write dependency evidence tests with a fixture lockfile, two patches in lexical order, their exact patched target bytes under fixture `node_modules`, a bundled profile manifest, and a fake Node executable reporting a version.
- [ ] Add a repository check proving `.sherlock-build/` and `dist-local-integration/` are Git-ignored while integration manifests, handoffs, and source files are not.
- [ ] Extend bundled-profile tests to require deterministic `build/sherlock-plugin-profile/sherlock-build-manifest.json` containing schema version plus sorted repository-relative file paths and SHA-256 values for the complete portable profile except the manifest itself.
- [ ] Add mutation cases proving that changing the lockfile, patch bytes, patched target bytes, profile manifest, or Node version changes the final digest.
- [ ] Run `npx vitest run test/build-provenance.test.ts test/dependency-provenance.test.ts` and confirm failure because the modules do not exist.
- [ ] Implement canonical JSON validation with exact-key allowlists and deterministic serialization. Prefix every SHA-256 as `sha256:<64 lowercase hex>`.
- [ ] Compute `patchSetDigest` from sorted repository-relative patch paths plus raw bytes. Parse unified-diff target paths and compute `patchResultDigest` from the corresponding current `node_modules` target bytes; reject missing or escaping targets.
- [ ] Generate the bundled profile manifest only after the portable profile is complete, then make `bundledProfileManifestDigest` cover its exact bytes. A profile rebuild after provenance generation must therefore invalidate the package.
- [ ] Add only `.sherlock-build/` and `dist-local-integration/` to `.gitignore` for this plan’s generated provenance/context and canonical generations.
- [ ] Implement provenance creation for plan A’s `SharedSourceSnapshot`. Do not infer batch fields or modify the source snapshot.
- [ ] Re-export the canonical implementation and types from `src/shared/build-provenance.ts` so main/preload code cannot drift from build scripts.
- [ ] Implement CLI `--source-snapshot`, `--dependency-evidence`, `--output`, and test-only `--built-at`. Require the output to remain under ignored `.sherlock-build/`.
- [ ] Run `npx vitest run test/build-provenance.test.ts test/dependency-provenance.test.ts test/bundled-plugin-profile.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加可验证的 Sherlock 构建来源"`.

## Task 2: Fail Closed on Runtime Channel and Disable Every Update Entry

**Files:**

- Create: `src/main/build-context.ts`
- Modify: `src/main/app-identity.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/update/update-policy.ts`
- Modify: `src/main/update/update-manager.ts`
- Modify: `src/shared/contracts.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/sidebar-update-control.ts`
- Modify: `test/app-identity.test.ts`
- Modify: `test/update.test.ts`
- Modify: `test/update-manager.test.ts`
- Modify: `test/sidebar-update-control.test.ts`

**Interfaces:**

```ts
export type DesktopChannel =
  | 'development'
  | 'legacy'
  | 'legacy-bridge'
  | 'notarized'
  | 'local-integration'
  | 'feature-preview'

export interface DesktopRuntimePolicy {
  updates: 'enabled' | 'disabled'
  synchronizeGlobalSkills: boolean
  migrateLegacyUserData: boolean
  allowExplicitUserDataPath: boolean
}

export interface DesktopBuildContext {
  channel: DesktopChannel
  provenance?: SherlockBuildProvenance
  policy: DesktopRuntimePolicy
}

export function desktopRuntimePolicy(channel: DesktopChannel): DesktopRuntimePolicy
export function resolveDesktopBuildContext(options: {
  packaged: boolean
  appPath: string
  resourcesPath: string
}): DesktopBuildContext
export function resolveDesktopIdentity(options: {
  appDataPath: string
  channel: DesktopChannel
  explicitUserDataPath: string
  provenance?: SherlockBuildProvenance
}): DesktopIdentity
export function bundledSkillOverrideDirectories(options: {
  userData: string
  agentsHome: string
  policy: DesktopRuntimePolicy
}): string[]
```

- [ ] Add failing tests proving unknown/missing packaged channel metadata throws before identity selection; a corrupted or mismatched provenance file also throws.
- [ ] Add local-integration identity tests for `Sherlock` plus `sherlock-desktop`, disabled updates, idempotent legacy-to-Sherlock migration, no explicit user-data override, and no global skill destination.
- [ ] Preserve current development/legacy/legacy-bridge/notarized identity expectations; add explicit policy table assertions for every channel.
- [ ] Change update policy tests to `supportsAutoUpdates(isPackaged, platform, channel)` and prove both local-integration and feature-preview return false on macOS/Windows.
- [ ] Add update-manager tests proving disabled channels register safe `unsupported` IPC responses but never call `autoUpdater`, schedule timers, listen for resume, expose download/install actions, or run direct manual checks.
- [ ] Add sidebar/menu tests proving the update control and menu item are absent, not merely disabled, for update-disabled channels.
- [ ] Run `npx vitest run test/app-identity.test.ts test/update.test.ts test/update-manager.test.ts test/sidebar-update-control.test.ts` and confirm the new cases fail.
- [ ] Implement `resolveDesktopBuildContext` and remove `resolveDesktopChannel()`’s silent `legacy` fallback from `src/main/index.ts`. Resolve the context before `app.setName`, `app.setPath`, migration, or skill/profile synchronization.
- [ ] Implement one policy table. `local-integration` disables updates/global skills/explicit userData but retains the same idempotent legacy-to-Sherlock migration as `notarized`; `feature-preview` disables all four; `notarized` retains updates, global skill synchronization, and formal migration.
- [ ] Pass channel/policy through update manager, IPC, menu, preload bridge, and sidebar control. Disabled manual checks must return `phase: 'unsupported'` without touching updater state.
- [ ] Make `stopUpdateManager()` reset timers, listeners, callbacks, started state, and install state for deterministic tests.
- [ ] Run the same four focused test files, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "桌面端：按构建通道隔离身份与更新策略"`.

## Task 3: Package and Verify the Local-Integration Channel

**Files:**

- Create: `electron-builder.local-integration.cjs`
- Modify: `electron-builder.notarized.cjs`
- Modify: `package.json`
- Modify: `scripts/verify-packaged-macos.mjs`
- Create: `test/local-integration-builder.test.ts`
- Create: `test/macos-package-provenance.test.ts`
- Modify: `test/release.test.ts`

**Interfaces:**

```ts
export function verifyPackagedMacApp(options: {
  appPath: string
  expectedBundleId: string
  expectedChannel: DesktopChannel
  expectedCommit: string
  expectedProvenanceSha256: Sha256Digest
  forbidUpdateConfig: boolean
}): void
```

- [ ] Write a failing config test requiring `com.evanarts.sherlock`, `Sherlock`, `local-integration`, `publish: null`, `mac.notarize: false`, and an absolute output from `SHERLOCK_PACKAGE_OUTPUT_DIR`.
- [ ] Add a regression requiring the base builder metadata in `package.json` to declare `dshDesktopChannel: 'legacy'` explicitly; missing packaged channel metadata must never regain the old silent fallback.
- [ ] Assert the builder refuses missing/relative output and provenance environment paths, includes `sherlock-build-provenance.json` plus the bundled plugin profile, and never includes `app-update-notarized.yml`.
- [ ] Add verifier fixture tests for Bundle ID/name/executable, packaged `dshDesktopChannel`, provenance raw-byte digest and expected commit, no `app-update.yml`, bundled Node, bundled skill/profile, and deep-strict signature command.
- [ ] Add one negative case per invariant, including a provenance file changed after signing and an updater config hidden in Resources.
- [ ] Extend release tests so `electron-builder.notarized.cjs` also requires a formal provenance path but retains its existing feed/sign/notarize behavior.
- [ ] Run `npx vitest run test/local-integration-builder.test.ts test/macos-package-provenance.test.ts test/release.test.ts` and confirm failures.
- [ ] Implement the local builder config as a function that validates its environment before returning config. Keep `package:local-integration:dir` internal and require the orchestrator to prepare profile/provenance first.
- [ ] Add explicit `legacy` channel metadata to the base builder configuration so every packaged build has a declared channel.
- [ ] Update the formal builder to embed provenance without changing its public feed. Ensure the formal runner will provide the required file before invoking it.
- [ ] Refactor `verify-packaged-macos.mjs` to export `verifyPackagedMacApp` while preserving existing CLI compatibility, then add the six explicit expected-value flags.
- [ ] Run the three focused tests, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加本地集成打包通道与包校验"`.

## Task 4: Add the Common-Directory Build Lock and Immutable Generations

**Files:**

- Create: `scripts/lib/shared-build-lock.mjs`
- Create: `scripts/lib/shared-build-lock.d.mts`
- Create: `scripts/lib/local-integration-generations.mjs`
- Create: `scripts/lib/local-integration-generations.d.mts`
- Create: `scripts/lib/exact-executable-lifecycle.mjs`
- Create: `scripts/lib/exact-executable-lifecycle.d.mts`
- Create: `scripts/recover-sherlock-build-lock.mjs`
- Create: `test/shared-build-lock.test.ts`
- Create: `test/local-integration-generations.test.ts`
- Create: `test/shared-client-lifecycle.test.ts`

**Interfaces:**

```ts
export interface SharedBuildLockOwner {
  schemaVersion: 1
  pid: number
  processStartedAt: string
  nonce: string
  worktree: string
  branch: string
  commit: string
  batchId: string | null
  acquiredAt: string
}

export function acquireSharedBuildLock(options: {
  gitCommonDir: string
  owner: SharedBuildLockOwner
}): Promise<{ lockDirectory: string; owner: SharedBuildLockOwner }>
export function releaseSharedBuildLock(lease: {
  lockDirectory: string
  owner: SharedBuildLockOwner
}): Promise<void>
export function recoverStaleSharedBuildLock(options: {
  gitCommonDir: string
  expectedNonce: string
}): Promise<void>

export interface ActiveGeneration {
  schemaVersion: 1
  appPath: string
  executablePath: string
  mode: 'local-main' | 'local-integration'
  commit: string
  provenanceDigest: Sha256Digest
  activatedAt: string
}

export function promoteVerifiedGeneration(options: {
  stagedApp: string
  generationApp: string
}): Promise<void>
export function readActiveGeneration(stateRoot: string): Promise<ActiveGeneration | undefined>
export function writeActiveGenerationAtomic(
  stateRoot: string,
  generation: ActiveGeneration
): Promise<void>

export function fullExecutableArgumentPattern(executablePath: string): string
export interface RunningSherlockApp {
  pid: number
  appPath: string
  executablePath: string
  bundleId: string
}
export function discoverRunningSherlockApps(): Promise<RunningSherlockApp[]>
export function findExactExecutablePids(executablePath: string): number[]
export function stopExactExecutable(
  executablePath: string,
  options?: { graceMs?: number }
): Promise<number[]>
export function waitForExactExecutable(
  executablePath: string,
  options?: { timeoutMs?: number; intervalMs?: number; stableSamples?: number }
): Promise<number[]>
```

- [ ] Write failing lock tests where two processes/worktrees race and one wins, a live owner blocks immediately without queuing, a dead owner still blocks ordinary acquisition, the wrong nonce cannot release, and exit/signal cleanup releases only the caller’s lock.
- [ ] Write explicit recovery tests requiring both a dead recorded PID and the exact nonce. A live PID, reused PID with different start time, or mismatched nonce must refuse recovery.
- [ ] Write generation tests for staging under `<canonical>/dist-local-integration/staging/<uuid>`, atomic promotion to `generations/<mode>-<short-sha>-<build-id>/Sherlock.app`, no overwrite, absolute-path active pointer, and pointer unchanged on failure.
- [ ] Write lifecycle tests with two executable symlinks containing spaces/regex characters. Stopping one must leave the other and an unrelated `Sherlock`-named process alive.
- [ ] Add discovery tests for an already-running pre-governance Sherlock: resolve its absolute executable/App path and Bundle ID, reject ambiguous multiple shared identities, and never require a process-name-only kill.
- [ ] Run `npx vitest run test/shared-build-lock.test.ts test/local-integration-generations.test.ts test/shared-client-lifecycle.test.ts` and confirm failures.
- [ ] Implement the lock with atomic `mkdir` under `<git-common-dir>/sherlock-local-integration/build-lock` and owner JSON written before acquisition is reported.
- [ ] Derive the canonical root from the registered `main` worktree; reject ambiguity or absence. Never infer it from the calling feature/integration directory.
- [ ] Implement staging-to-generation atomic rename and active pointer at `<git-common-dir>/sherlock-local-integration/active.json`. Never automatically prune generations.
- [ ] Implement discovery from absolute process executable paths and bundle metadata, then exact matching using an escaped full-argument pattern with `/usr/bin/pgrep -f -x`. Never call `pkill -x Sherlock`.
- [ ] Add a recovery CLI that only invokes `recoverStaleSharedBuildLock` with `--repo` and `--expected-nonce`.
- [ ] Run the same three focused tests, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加跨工作树锁与不可变客户端代次"`.

## Task 5: Journal and Roll Back Managed Startup Mutations

**Files:**

- Create: `scripts/lib/managed-launch-transaction.mjs`
- Create: `scripts/lib/managed-launch-transaction.d.mts`
- Create: `scripts/rollback-managed-launch.mjs`
- Modify: `src/main/bundled-skill-sync.ts`
- Modify: `src/main/bundled-plugin-profile.ts`
- Modify: `src/main/app-data-migration.ts`
- Modify: `src/main/index.ts`
- Create: `test/managed-launch-transaction.test.ts`
- Modify: `test/bundled-plugin-profile.test.ts`
- Modify: `test/bundled-skill-upgrade.test.ts`
- Modify: `test/app-identity.test.ts`

**Interfaces:**

```ts
export interface ManagedLaunchJournal {
  schemaVersion: 1
  nonce: string
  state: 'open' | 'committed' | 'rolled-back'
  userDataPath: string
  createdAt: string
  operations: Array<
    | { kind: 'created'; targetPath: string }
    | { kind: 'replaced'; targetPath: string; backupPath: string }
    | { kind: 'retired'; targetPath: string; backupPath: string }
  >
}

export function beginManagedLaunchTransaction(options: {
  userDataPath: string
  nonce: string
  journalPath: string
  createdAt: string
}): ManagedLaunchJournal
export function recordManagedLaunchOperation(
  journalPath: string,
  nonce: string,
  operation: ManagedLaunchJournal['operations'][number]
): ManagedLaunchJournal
export function commitManagedLaunchTransaction(
  journalPath: string,
  nonce: string
): ManagedLaunchJournal
export function rollbackManagedLaunchTransaction(
  journalPath: string,
  nonce: string
): ManagedLaunchJournal
```

- [ ] Write failing transaction tests for newly created targets, replaced files/directories, retired plugins, an interrupted open journal, exact reverse-order rollback, idempotent commit/rollback, and wrong nonce/path-escape rejection.
- [ ] Extend bundled-profile tests to prove replaced receipts and retired plugins are moved aside, recorded, and recoverable until commit.
- [ ] Extend migration/skill tests so only changes made by this launch are journaled; existing sessions, settings, caches, and user-created skills are never deleted or reverted.
- [ ] Run `npx vitest run test/managed-launch-transaction.test.ts test/bundled-plugin-profile.test.ts test/bundled-skill-upgrade.test.ts test/app-identity.test.ts` and confirm failures.
- [ ] Implement a write-ahead journal with atomic file replacement and backups below the same user-data filesystem. Validate every target remains below the declared user-data root.
- [ ] Add an optional transaction recorder to bundled skill synchronization, bundled profile installation, and legacy migration. Local integration passes it; ordinary development/formal behavior remains compatible.
- [ ] Defer permanent backup cleanup until commit. Rollback restores only journaled managed mutations in exact reverse order.
- [ ] Add `rollback-managed-launch.mjs --journal <absolute> --nonce <value>` for the orchestrator’s crash path. Do not expose a broad directory target.
- [ ] Run the same four focused tests, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "运行时：增加启动配置事务与失败回滚"`.

## Task 6: Prove the Real Harness Window Is Ready

**Files:**

- Create: `src/main/local-launch-proof.ts`
- Modify: `src/main/index.ts`
- Create: `test/local-launch-proof.test.ts`
- Modify: `test/runtime.test.ts`

**Interfaces:**

```ts
export interface LocalLaunchProof {
  schemaVersion: 1
  nonce: string
  pid: number
  executablePath: string
  appPath: string
  channel: DesktopChannel
  commit: string
  provenanceDigest: Sha256Digest
  readyAt: string
}

export function resolveLaunchProofRequest(
  commandLine: Electron.CommandLine
): { path: string; nonce: string } | undefined
export function writeLaunchProofOnce(
  request: { path: string; nonce: string },
  proof: LocalLaunchProof
): void
```

- [ ] Write failing tests for absent args, relative proof path, missing nonce, duplicate writes, symlink/path escape, wrong provenance, and a proof file already owned by another launch.
- [ ] Add a runtime test proving no proof is written at process creation, splash display, backend `ready`, or failed navigation.
- [ ] Add the positive case only after `openHarness()` has loaded the expected Harness URL, synchronized theme, shown/focused the real main window, and confirmed the window is not destroyed.
- [ ] Run `npx vitest run test/local-launch-proof.test.ts test/runtime.test.ts` and confirm failures.
- [ ] Implement exclusive `wx` proof creation with mode `0600` and exact nonce, PID, `process.execPath`, App path, channel, commit, provenance digest, and timestamp.
- [ ] Place the write after the real-window checks in `openHarness()`. Leave the managed launch transaction open after proof creation; the orchestrator commits it only after independently validating the proof. On handled startup failure, roll it back.
- [ ] Run the two focused tests, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "运行时：以真实主界面生成本地启动证明"`.

## Task 7: Orchestrate Gate, Build, Switch, and Rollback

**Files:**

- Create: `scripts/run-local-integration.mjs`
- Create: `scripts/run-formal-with-lock.mjs`
- Modify: `script/build_and_run.sh`
- Modify: `package.json`
- Create: `test/local-integration-runner.test.ts`
- Modify: `test/build-and-run.test.ts`
- Modify: `test/release.test.ts`

**CLI:**

```text
node scripts/run-local-integration.mjs
  --repo <path>
  --mode run|verify|debug|logs|telemetry
  [--batch-manifest <path>]
  [--lease-owner-token-file <absolute-path>]

node scripts/run-formal-with-lock.mjs --repo <canonical-main> -- <existing formal args>
```

- [ ] Write a failing call-order test asserting `verifySharedBuildSource` occurs before lock acquisition and both occur before dependency preparation, packaging, stopping, or opening.
- [ ] Add failures at gate, lock, dependency preparation, provenance generation, build, staging verification, and post-build source recheck; assert none invokes stop/open or changes the active pointer.
- [ ] Assert every gate failure reports the calling worktree, branch, full commit, and the concrete failed invariant.
- [ ] Add a success case proving the runner prepares the bundled profile before dependency evidence, builds a unique staging path, verifies it, rechecks the source snapshot, promotes and re-verifies the generation, then stops the exact old executable and opens the exact new App.
- [ ] Add dependency-isolation cases proving the runner uses the calling integration/main worktree’s own `node_modules` and bundled-profile preparation; reject a dependency tree symlinked to or resolved inside another registered worktree.
- [ ] Add launch-failure cases for timeout, wrong PID/path, wrong commit/channel/digest, destroyed window, and crash. Assert the new executable is stopped, managed configuration is rolled back, the pointer remains old, and the old absolute App path is reopened and reverified.
- [ ] Add a rollback-failure case that reports both old/new absolute App and executable paths plus verification diagnostics and never claims a usable client remains.
- [ ] Add first-run behavior with no old generation: report failure honestly and leave the pointer absent.
- [ ] Add `debug`, `logs`, and `telemetry` cases proving they activate normally first, then use the exact PID rather than a process-name predicate.
- [ ] Extend shell tests to prove all five local modes dispatch to this runner, the old `pkill -x` functions are gone, and `--formal` checks formal Git state plus active-batch conflict and acquires the shared lock before stopping an App.
- [ ] Run `npx vitest run test/local-integration-runner.test.ts test/build-and-run.test.ts test/release.test.ts` and confirm failures.
- [ ] Implement the exact 14-stage lifecycle from the spec. Before stopping, discover and verify the current absolute shared App even when no active pointer exists. Hold the lock across build, launch proof, managed-transaction commit, pointer update/rollback, and cleanup using nonce-checked `finally`.
- [ ] After validating the launch proof, commit the managed transaction, atomically update the active pointer, and reverify the generation’s signature/provenance/executable path. Any failure before pointer success follows the same rollback path.
- [ ] Pass provenance to the App through both the signed resource and command-line display argument. Require byte-for-byte digest agreement among expected file, packaged file, and launch proof.
- [ ] Make `script/build_and_run.sh` a strict mode/argument dispatcher. Keep the existing `--formal` release commands behind `run-formal-with-lock.mjs` without changing signing/notarization/upload semantics.
- [ ] Make `--formal` prepare dependency evidence and a `formal` provenance file for the exact clean `main` commit before invoking the notarized builder; keep the public feed and all later release gates unchanged.
- [ ] Add `package:local-integration:dir` and any internal runner scripts to `package.json`. Do not add a user-facing command that bypasses the orchestrator.
- [ ] Run the same three focused tests plus `test/shared-source-gate.test.ts`, `test/shared-build-lock.test.ts`, `test/local-integration-generations.test.ts`, and `test/local-launch-proof.test.ts`; then run `npm run typecheck` and `git diff --check`.
- [ ] Commit with `git commit -m "构建：安全切换并回滚本地 Sherlock 客户端"`.

## Task 8: Display the Exact Build Source in About

**Files:**

- Modify: `src/shared/app-info.ts`
- Modify: `src/preload/about-info.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.0-rc.7.patch`
- Modify: `test/app-info.test.ts`
- Modify: `test/settings-about.test.ts`

**Interfaces:**

```ts
export interface SherlockAboutBuildInfo {
  mode: SherlockBuildMode
  label: string
  branch: string
  shortCommit: string
  batchId: string | null
  builtAt: string
  features: readonly { branch: string; shortCommit: string }[]
}

export interface SherlockAboutInfo {
  productName: 'Sherlock'
  version: string
  build: SherlockAboutBuildInfo
  updatesEnabled: boolean
  releaseNotes: SherlockReleaseNote[]
}

export function formatSherlockBuildInfo(
  provenance: SherlockBuildProvenance,
  locale: SherlockAboutLocale
): SherlockAboutBuildInfo
```

- [ ] Write failing formatter cases for `Local Main`, `Integration <batch>`, `Feature Preview <slug>`, and `Formal <version>` with short SHA and localized build time.
- [ ] Extend About bridge tests to accept `{ readUpdateStatus, checkForUpdates, locale, provenance, updatesEnabled }` and return exactly the same provenance fields embedded in the App.
- [ ] Extend patched UI tests to assert `data-about-build-provenance`, batch/mode label, `branch @ shortSHA`, build time, feature list, and complete absence of the check-update button when `updatesEnabled === false`.
- [ ] Add native About/menu tests using the same formatter; do not construct a second source string in `src/main/index.ts`.
- [ ] Run `npx vitest run test/app-info.test.ts test/settings-about.test.ts` and confirm failures.
- [ ] Implement the formatter and bridge, then patch the installed settings bundle using `apply_patch`.
- [ ] Regenerate only `patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.0-rc.7.patch` with patch-package and verify a clean dependency reinstall reapplies it.
- [ ] Run `npx vitest run test/app-info.test.ts test/settings-about.test.ts test/update-manager.test.ts test/sidebar-update-control.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "界面：在关于页展示精确构建来源"`.

## Task 9: Document, Verify, and Hand Off the Feature Branch

**Files:**

- Modify: `docs/sherlock-local-test-runbook.md`
- Modify: `docs/sherlock-multi-session-integration-runbook.md`
- Modify: `AGENTS.md`
- Create: `test/local-integration-runbook.test.ts`

- [ ] Write a failing documentation test requiring the exact local `--verify` flow, shared-source gate, active lease behavior, lock recovery command, generation path, rollback semantics, About provenance checks, and “leave App open” instruction.
- [ ] Update both runbooks and `AGENTS.md` so the transition note from plan A becomes fully effective. Explicitly ban direct `npm run package:formal:dir` as a local-test shortcut.
- [ ] Run `npx vitest run test/local-integration-runbook.test.ts test/build-and-run.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Inspect `git status --short`, stage only documentation/test changes, and commit with `git commit -m "文档：启用 Sherlock 共享客户端安全构建流程"`.
- [ ] Run the focused regression set:

  ```bash
  npx vitest run \
    test/build-provenance.test.ts \
    test/dependency-provenance.test.ts \
    test/app-identity.test.ts \
    test/update.test.ts \
    test/update-manager.test.ts \
    test/sidebar-update-control.test.ts \
    test/local-integration-builder.test.ts \
    test/macos-package-provenance.test.ts \
    test/shared-build-lock.test.ts \
    test/local-integration-generations.test.ts \
    test/shared-client-lifecycle.test.ts \
    test/managed-launch-transaction.test.ts \
    test/local-launch-proof.test.ts \
    test/local-integration-runner.test.ts \
    test/build-and-run.test.ts \
    test/app-info.test.ts \
    test/settings-about.test.ts \
    test/local-integration-runbook.test.ts \
    test/shared-source-gate.test.ts \
    test/formal-git-state.test.ts
  npm run typecheck
  git diff --check
  ```

- [ ] If the regression requires a tracked fix, return to its owning TDD task, create a separate Chinese fix commit, and rerun the entire focused set.
- [ ] Confirm `codex/feat/shared-build-provenance-20260831` is source-clean and generate its commit-bound handoff with `npm run git:handoff`, using the plan-A-accepted `main` commit as `--base`.

## Task 10: Integrate and Accept the Real Shared Client

**Files:** No direct source edits. The plan-A executor creates and updates the tracked batch manifest and merge commits.

- [ ] In the dedicated integration session, create or adopt `codex/integration/<YYYYMMDD-NN>` from the unchanged plan-A `main` tip and include the exact plan-B handoff card.
- [ ] Run read-only preflight, merge the complete feature branch with `npm run git:integration -- merge`, and let the manifest-declared focused regression command run before the Chinese merge commit.
- [ ] Confirm the integration worktree is source-clean, its exact tip matches the active-batch lease, and the canonical `main` checkout remains at `expectedMainCommit`.
- [ ] From the integration worktree, run `./script/build_and_run.sh --verify` with the lease owner token. This is a local build only: no version bump, notarization, upload, update-feed change, push, or tag.
- [ ] Run the packaged verifier against the exact active generation and compare its commit/channel/provenance digest with the active pointer.
- [ ] Use `computer-use:computer-use` to read the real Sherlock main window, open About, and verify product version, `Integration <batch>`, exact integration branch/tip, build time, feature list, absent update controls, and a usable Harness conversation view.
- [ ] Leave the verified Sherlock generation open for the user.
- [ ] Pause for explicit user acceptance bound to this exact tip. Do not promote or clean anything while acceptance is pending.
- [ ] After acceptance, record it with `npm run git:integration -- accept` and promote from the canonical main worktree with `npm run git:integration -- promote`. Verify `main` now equals the accepted integration tip and every plan-B feature commit is an ancestor.
- [ ] Run the minimal post-promotion source/provenance check without rebuilding. Keep feature and integration worktrees until the user no longer needs iteration; do not auto-delete them.

## Plan B Completion Gate

- Every shared local App contains signed provenance matching the exact source/dependency snapshot and visible About information.
- All local update paths are disabled in main process, IPC, menus, sidebar, About, builder metadata, and packaged resources.
- One common-dir lock covers the entire build/switch/rollback lifecycle across all worktrees.
- A bad source, dependency, package, signature, or post-build snapshot never stops the currently running client.
- A failed new launch restores managed startup state, leaves the active pointer unchanged, and reopens the previous exact generation.
- `./script/build_and_run.sh --verify` proves the real Harness main window and leaves it open.
- Formal release behavior stays separate and unchanged except for the shared lock, active-batch conflict, and formal provenance resource.
