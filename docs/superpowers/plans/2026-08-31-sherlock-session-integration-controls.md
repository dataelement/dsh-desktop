# Sherlock Session Integration Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every implementation task, superpowers:verification-before-completion before every task commit, and either superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task-by-task.

**Goal:** Give every Sherlock feature session a commit-bound handoff, create one durable integration batch at a time, merge complete feature histories without silent loss, and promote only an explicitly accepted integration tip to local `main` with `--ff-only`.

**Architecture:** Extract repository inspection from the formal-release verifier into one shared Git library. Build validated JSON handoff cards and tracked batch manifests on top of that library. Keep the long-lived active-batch lease in the Git common directory, and expose a preflight-first executor whose mutating operations are explicit, recoverable, local-only, and bound to exact commits.

**Tech Stack:** Node.js 24 ESM, Git CLI, TypeScript declaration files, Vitest 4, JSON manifests, macOS/Linux filesystem primitives.

**Spec:** `docs/superpowers/specs/2026-08-31-sherlock-multi-session-integration-workflow-design.md`

## Global Constraints

- This is plan A of three. Complete it before `2026-08-31-sherlock-shared-build-provenance.md` and `2026-08-31-sherlock-feature-preview-isolation.md`.
- Execute this plan in a dedicated worktree branch `codex/feat/session-integration-controls-20260831` created from the approved planning commit on local `main`.
- Local `main` is the only daily integration baseline. No command in this plan may run `fetch`, `pull`, `push`, `rebase`, `reset`, force-update a ref, delete a branch, remove a worktree, or delete user files.
- Feature branches must match `codex/feat/<ascii-slug>-<YYYYMMDD>`. Integration branches must match `codex/integration/<YYYYMMDD-NN>`.
- Handoffs, manifests, checks, leases, and acceptance all bind to full lowercase 40-character commit IDs. A moved ref invalidates previous evidence.
- Check commands are argv arrays executed with `shell: false`. Never accept a shell command string from JSON.
- Conflicts remain visible for explicit resolution. Never use whole-tree `ours` or `theirs`.
- Only generated outputs on the coded allowlist may be ignored by source-clean checks. Unknown untracked paths fail closed.
- Do not run the full test suite. Run only the focused files named in each task.
- Every task that changes tracked files ends in a local Git commit with a Chinese message and contains no unrelated `dist-internal/` or `output/` files.

## Shared Interfaces Produced for Later Plans

`scripts/lib/sherlock-git-state.d.mts`:

```ts
export interface GitCommandResult {
  status: number
  stdout: string
  stderr: string
}

export interface RepositoryContext {
  worktreeRoot: string
  gitDirectory: string
  commonDirectory: string
  branch: string | null
  head: string
  linkedWorktree: boolean
}

export interface RepositoryStatus {
  trackedChanges: string[]
  untrackedSources: string[]
  untrackedOutputs: string[]
  sourceClean: boolean
}

export interface RegisteredWorktree {
  path: string
  head: string
  branch: string | null
  locked: boolean
  prunable: boolean
}

export interface RangeCommit {
  commit: string
  parents: string[]
  subject: string
}

export interface NameStatusChange {
  status: string
  path: string
  previousPath?: string
}

export function runGit(
  repository: string,
  args: readonly string[],
  options?: { allowFailure?: boolean }
): GitCommandResult
export function resolveRepositoryContext(repository: string): RepositoryContext
export function readRepositoryStatus(repository: string): RepositoryStatus
export function listRegisteredWorktrees(repository: string): RegisteredWorktree[]
export function resolveCommit(repository: string, revision: string): string
export function isAncestor(repository: string, ancestor: string, descendant: string): boolean
export function listRangeCommits(repository: string, base: string, tip: string): RangeCommit[]
export function diffNameStatus(repository: string, base: string, tip: string): NameStatusChange[]
```

`scripts/lib/sherlock-shared-source-gate.d.mts`:

```ts
export type Sha256Digest = string

export interface SharedSourceSnapshot {
  mode: 'local-main' | 'local-integration'
  worktreeRoot: string
  branch: string
  commit: string
  mainCommit: string
  sourceClean: true
  batchId: string | null
  manifestPath: string | null
  manifestDigest: Sha256Digest | null
  features: readonly { branch: string; commit: string }[]
  leaseRevision: number | null
}

export function verifySharedBuildSource(options: {
  repository: string
  ownerToken?: string
}): SharedSourceSnapshot

export function assertSharedBuildSourceUnchanged(
  before: SharedSourceSnapshot,
  after: SharedSourceSnapshot
): void
```

## CLI Contracts

```bash
npm run git:handoff -- \
  --repo <feature-worktree> \
  --base <full-sha> \
  --metadata <metadata.json> \
  [--output <path>] \
  [--format text|json]

npm run git:integration:preflight -- \
  --repo <worktree> \
  --phase prepare|merge|continue|recover-owner|sync-main|accept|promote|cancel \
  [--manifest config/sherlock-integration-batches/<batch>.json] \
  [--feature codex/feat/<slug>-<date>] \
  [--main-worktree <path>] \
  [--json]

npm run git:integration -- create \
  --repo <canonical-main> \
  --batch <YYYYMMDD-NN> \
  --worktree .worktrees/integration-<batch> \
  --handoff <card.json> \
  [--handoff <card.json>] \
  --checks <integration-checks.json> \
  [--dry-run] [--json]

npm run git:integration -- adopt \
  --repo <integration-worktree> \
  --batch <YYYYMMDD-NN> \
  --handoff <card.json> \
  [--handoff <card.json>] \
  --checks <integration-checks.json> \
  [--dry-run] [--json]

npm run git:integration -- merge \
  --repo <integration-worktree> \
  --manifest config/sherlock-integration-batches/<batch>.json \
  --feature codex/feat/<slug>-<date> \
  [--dry-run] [--json]

npm run git:integration -- continue \
  --repo <integration-worktree> \
  --manifest <manifest> \
  --feature <branch> \
  [--dry-run] [--json]

npm run git:integration -- recover-owner \
  --repo <integration-worktree> \
  --manifest <manifest> \
  --confirm-batch <batch> \
  --confirm-tip <full-sha> \
  [--json]

npm run git:integration -- sync-main \
  --repo <integration-worktree> \
  --manifest <manifest> \
  [--dry-run] [--json]

npm run git:integration -- accept \
  --repo <integration-worktree> \
  --manifest <manifest> \
  --commit <full-sha> \
  --confirm-batch <batch> \
  [--json]

npm run git:integration -- promote \
  --repo <integration-worktree> \
  --manifest <manifest> \
  --main-worktree <canonical-main> \
  --confirm-batch <batch> \
  --confirm-tip <full-sha> \
  [--dry-run] [--json]

npm run git:integration -- cancel \
  --repo <integration-worktree> \
  --manifest <manifest> \
  --confirm-batch <batch> \
  --explicit-cancellation \
  [--dry-run] [--json]
```

Exit codes are `0` for success or a clean dry-run, `1` for policy/check failure with state restored, `2` for invalid CLI/schema, `3` for a deliberately retained merge conflict, and `4` for partial success requiring the printed recovery command. With `--json`, stdout contains exactly one report/result and diagnostics go to stderr.

## Task 1: Extract One Repository-State Library

**Files:**

- Create: `scripts/lib/sherlock-git-state.mjs`
- Create: `scripts/lib/sherlock-git-state.d.mts`
- Create: `test/helpers/git-workflow-fixture.ts`
- Create: `test/git-workflow-state.test.ts`
- Create: `vitest.config.ts`
- Modify: `scripts/verify-formal-git-state.mjs`
- Modify: `test/formal-git-state.test.ts`

**Interfaces:** Implement every export in “Shared Interfaces” above plus `runGit(repository, args, options)`. Preserve `verifyFormalGitState(repository)` and all current Chinese failure text.

- [ ] Add `createGitWorkflowFixture()` in `test/helpers/git-workflow-fixture.ts`. It must initialize disposable `main`, set local identity, set `commit.gpgSign=false`, isolate `GIT_CONFIG_GLOBAL=/dev/null`, create linked worktrees, commit files, and expose a byte-for-byte snapshot of refs/status/worktrees/common-dir integration files.
- [ ] Add failing cases in `test/git-workflow-state.test.ts` for linked worktree/common-directory resolution, detached HEAD, rename/copy `--name-status -z` parsing, filenames containing spaces, the distinction between `src/new.ts` and allowed `dist-local-integration/...` output, and a Vitest config that excludes `**/.worktrees/**` from default collection.
- [ ] Extend `test/formal-git-state.test.ts` with a regression proving that allowed generated output remains ignored while an unknown untracked root file fails as source.
- [ ] Run `npx vitest run test/git-workflow-state.test.ts test/formal-git-state.test.ts` and confirm failure because the shared module and the stricter unknown-path rule do not exist.
- [ ] Implement `runGit` with a 64 MiB output limit and explicit allowed-failure results. Parse all path-bearing Git output with NUL delimiters; do not line-split paths.
- [ ] Implement `resolveRepositoryContext` using `rev-parse --show-toplevel`, `--git-dir`, `--git-common-dir`, `branch --show-current`, and `rev-parse HEAD`. Return absolute normalized paths.
- [ ] Implement `readRepositoryStatus` with an exact top-level output allowlist: `dist/`, `dist-dev/`, `dist-internal/`, `dist-notarized/`, `dist-legacy/`, `dist-release/`, `dist-local-integration/`, `dist-feature-preview/`, `output/`, and `.sherlock-build/`. Do not use a broad `dist-*` wildcard; treat every other untracked path as source.
- [ ] Add `vitest.config.ts` using Vitest’s default exclusions plus `**/.worktrees/**` so linked checkouts never duplicate test collection.
- [ ] Implement worktree, ancestry, range-log, and name-status helpers; keep them read-only.
- [ ] Refactor `verify-formal-git-state.mjs` to consume the new library without changing existing formal-release behavior or messages.
- [ ] Run `npx vitest run test/git-workflow-state.test.ts test/formal-git-state.test.ts test/git-local-policy.test.ts` and confirm all focused cases pass.
- [ ] Run `npm run typecheck` and `git diff --check`.
- [ ] Commit only these files with `git commit -m "重构：统一 Sherlock Git 仓库状态检查"`.

## Task 2: Generate Commit-Bound Feature Handoffs

**Files:**

- Create: `scripts/lib/sherlock-integration-model.mjs`
- Create: `scripts/lib/sherlock-integration-model.d.mts`
- Create: `scripts/create-sherlock-session-handoff.mjs`
- Create: `test/session-handoff.test.ts`
- Modify: `package.json`

**Interfaces:**

```ts
export interface CheckEvidence {
  argv: [string, ...string[]]
  outcome: 'passed'
  summary: string
  verifiedCommit: string
  completedAt: string
  timeoutMs: number
}

export interface FeatureHandoff {
  schemaVersion: 1
  featureName: string
  branch: string
  baseCommit: string
  tipCommit: string
  commits: RangeCommit[]
  files: NameStatusChange[]
  checks: CheckEvidence[]
  uiVerification: { outcome: 'passed' | 'not-applicable'; summary: string }
  acceptanceCriteria: string[]
  risks: string[]
  generatedAt: string
}

export function validateFeatureHandoff(value: unknown): FeatureHandoff
export function buildFeatureHandoff(options: {
  repository: string
  baseCommit: string
  metadata: unknown
  generatedAt: string
}): FeatureHandoff
```

- [ ] Write `test/session-handoff.test.ts` cases for a two-commit feature, rename records, ordered full SHAs, multiple argv checks, and deterministic regeneration.
- [ ] Add rejection cases for a dirty feature worktree, a non-`codex/feat/*` branch, a base that is not an ancestor, empty commit ranges, check evidence bound to another tip, unsafe relative paths, duplicate commits, absolute paths, NUL bytes, and command strings.
- [ ] Add a CLI case asserting the default output is `<git-common-dir>/sherlock-integration/handoffs/<normalized-branch>-<tip12>.json`, identical regeneration is idempotent, and differing content is never overwritten.
- [ ] Run `npx vitest run test/session-handoff.test.ts` and confirm it fails because the model and CLI are absent.
- [ ] Implement strict validators: full SHA regex, feature-branch regex, normalized repository-relative paths, unique ordered commits, and `verifiedCommit === tipCommit` for every check.
- [ ] Implement `buildFeatureHandoff` from the exact current branch ref, declared base, range log, and three-dot name-status diff. Reject any source-dirty worktree.
- [ ] Implement CLI arguments `--repo`, `--base`, `--metadata`, optional `--output`, and `--format text|json`. JSON stdout must contain only the card; diagnostics go to stderr.
- [ ] Add `"git:handoff": "node scripts/create-sherlock-session-handoff.mjs"` to `package.json`.
- [ ] Run `npx vitest run test/session-handoff.test.ts test/git-workflow-state.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "工具：增加功能会话提交交接卡"`.

## Task 3: Validate Tracked Batch Manifests and Read-Only Preflight

**Files:**

- Modify: `scripts/lib/sherlock-integration-model.mjs`
- Modify: `scripts/lib/sherlock-integration-model.d.mts`
- Create: `scripts/lib/sherlock-integration-preflight.mjs`
- Create: `scripts/lib/sherlock-integration-preflight.d.mts`
- Create: `scripts/verify-sherlock-integration.mjs`
- Create: `test/integration-batch.test.ts`
- Modify: `package.json`

**Interfaces:**

```ts
export interface IntegrationBatchManifest {
  schemaVersion: 1
  batchId: string
  branch: string
  baseMainCommit: string
  expectedMainCommit: string
  createdAt: string
  features: Array<{
    handoff: FeatureHandoff
    merged?: {
      mergeCommit: string
      verificationCommit: string
      checks: CheckEvidence[]
      recordedAt: string
    }
  }>
  integrationChecks: Array<{ argv: [string, ...string[]]; timeoutMs: number }>
  mainSynchronizations: Array<{
    previousMainCommit: string
    mainCommit: string
    mergeCommit: string
    verificationCommit: string
    checks: CheckEvidence[]
    recordedAt: string
  }>
}

export type IntegrationPhase =
  | 'prepare'
  | 'merge'
  | 'continue'
  | 'recover-owner'
  | 'sync-main'
  | 'accept'
  | 'promote'
  | 'cancel'

export interface PreflightReport {
  schemaVersion: 1
  ok: boolean
  phase: IntegrationPhase
  branch: string | null
  head: string
  batchId?: string
  findings: Array<{
    code: string
    severity: 'info' | 'warning' | 'error'
    message: string
    details?: Record<string, unknown>
  }>
  plannedActions: Array<{ kind: string; description: string; argv?: string[] }>
}

export function validateIntegrationBatchManifest(value: unknown): IntegrationBatchManifest
export function createIntegrationBatchManifest(options: {
  batchId: string
  branch: string
  baseMainCommit: string
  handoffs: FeatureHandoff[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  createdAt: string
}): IntegrationBatchManifest
export function verifyFeatureHandoff(options: {
  repository: string
  handoff: FeatureHandoff
  batchMainCommit: string
}): PreflightReport
export function preflightIntegrationAction(options: {
  repository: string
  phase: IntegrationPhase
  manifestPath?: string
  featureBranch?: string
  mainWorktree?: string
  expectedAcceptedTip?: string
}): PreflightReport
```

- [ ] Write failing manifest tests for `YYYYMMDD-NN` batch IDs, exact branch derivation, unique branch/tip pairs, non-empty acceptance criteria, safe paths, argv-only checks, and full SHA fields.
- [ ] Write failing preflight tests for a moved feature ref, dirty registered feature worktree, undeclared history, base not ancestral to both feature tip and batch main, stale check evidence, a partially merged feature, and a feature already fully merged.
- [ ] Assert preflight collects every read-only finding, labels already-merged work as an idempotent info finding, and leaves the fixture snapshot byte-identical.
- [ ] Run `npx vitest run test/integration-batch.test.ts` and confirm failure because manifest and preflight exports are absent.
- [ ] Implement manifest validation and creation. The manifest path must be exactly `config/sherlock-integration-batches/<batchId>.json` when used by an executor.
- [ ] Implement `verifyFeatureHandoff` by comparing exact ref, exact commit list, exact three-dot name-status list, worktree status, ancestry, patch IDs for partially merged commits, and check-tip bindings.
- [ ] Implement phase-specific preflight reports without mutation. Never stop at the first finding.
- [ ] Implement CLI arguments `--repo`, `--phase`, optional `--manifest`, `--feature`, `--main-worktree`, and `--json`.
- [ ] Add `"git:integration:preflight": "node scripts/verify-sherlock-integration.mjs"`.
- [ ] Run `npx vitest run test/integration-batch.test.ts test/session-handoff.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "工具：增加集成批次清单与只读预检"`.

## Task 4: Add the Durable Active-Batch Lease

**Files:**

- Create: `scripts/lib/sherlock-active-batch.mjs`
- Create: `scripts/lib/sherlock-active-batch.d.mts`
- Create: `test/active-integration-lease.test.ts`

**Interfaces:**

```ts
export interface ActiveBatchLease {
  schemaVersion: 1
  revision: number
  batchId: string
  branch: string
  manifestPath: string
  baseMainCommit: string
  currentTip: string
  ownerTokenHash: string
  createdAt: string
  updatedAt: string
  acceptedTip?: string
  acceptedManifestDigest?: Sha256Digest
  acceptedAt?: string
}

export function readActiveBatchLease(repository: string): ActiveBatchLease | null
export function acquireActiveBatchLease(options: {
  repository: string
  lease: Omit<ActiveBatchLease, 'schemaVersion' | 'revision' | 'ownerTokenHash'>
  ownerToken: string
}): { lease: ActiveBatchLease; created: boolean }
export function updateActiveBatchTip(options: {
  repository: string
  ownerToken: string
  expectedRevision: number
  expectedTip: string
  nextTip: string
  updatedAt: string
}): ActiveBatchLease
export function markActiveBatchAccepted(options: {
  repository: string
  ownerToken: string
  expectedRevision: number
  acceptedTip: string
  acceptedManifestDigest: Sha256Digest
  acceptedAt: string
}): ActiveBatchLease
export function recoverActiveBatchOwnership(options: {
  repository: string
  expectedBatchId: string
  expectedTip: string
  expectedManifestDigest: Sha256Digest
}): { lease: ActiveBatchLease; ownerTokenFile: string }
export function archiveActiveBatchLease(options: {
  repository: string
  ownerToken?: string
  expectedBatchId: string
  outcome: 'promoted' | 'cancelled'
  archivedAt: string
  explicitCancellation?: boolean
}): { lease: ActiveBatchLease; archivePath: string }
```

- [ ] Write failing tests where two worktrees race to acquire the same common-dir lease and exactly one succeeds.
- [ ] Add cases for same-owner idempotency, mismatched batch refusal, wrong-token update/archive refusal, stale revision refusal, stale expected tip, acceptance invalidation after a tip change, and cancellation without explicit confirmation.
- [ ] Add explicit owner-recovery cases: the persisted mode-0600 token, batch, exact current tip, and current manifest digest must all match; a missing token file or any mismatch preserves the lease and refuses recovery.
- [ ] Assert the raw random token exists only in `<integration-git-dir>/sherlock-integration-owner.json` with mode `0600`; the common-dir lease stores only its SHA-256 digest.
- [ ] Assert archive creates `<common-dir>/sherlock-integration/history/<batch>-<outcome>-<timestamp>/lease.json` and never removes refs, worktrees, manifests, or files.
- [ ] Run `npx vitest run test/active-integration-lease.test.ts` and confirm failure because the lease module is absent.
- [ ] Implement acquisition by populating a staging directory and atomically renaming it to `<common-dir>/sherlock-integration/active`. Never overwrite or auto-delete an existing lease.
- [ ] Implement compare-and-swap revision/tip updates and owner-token digest checks using atomic temporary-file rename.
- [ ] Implement recovery, acceptance, and archival exactly as typed. Recovery validates but does not rotate the token or mutate the lease; only explicit cancellation may archive without the owner token.
- [ ] Run `npx vitest run test/active-integration-lease.test.ts test/git-workflow-state.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "工具：增加单一集成批次租约"`.

## Task 5: Create or Adopt an Integration Batch

**Files:**

- Create: `scripts/lib/sherlock-integration-executor.mjs`
- Create: `scripts/lib/sherlock-integration-executor.d.mts`
- Create: `scripts/manage-sherlock-integration.mjs`
- Create: `test/integration-executor.test.ts`
- Modify: `package.json`

**Interfaces:** Add `IntegrationExecutionResult` plus `createIntegrationBatch` and `adoptIntegrationBatch` from the signatures below.

```ts
export interface IntegrationExecutionResult {
  schemaVersion: 1
  status:
    | 'planned'
    | 'prepared'
    | 'merged'
    | 'conflict'
    | 'ownership-recovered'
    | 'main-synchronized'
    | 'accepted'
    | 'promoted'
    | 'cancelled'
    | 'recovery-required'
  batchId: string
  branch: string
  beforeCommit: string
  afterCommit: string
  actions: Array<{ kind: string; description: string; argv?: string[] }>
  recoveryCommand?: string
}

export function createIntegrationBatch(options: {
  mainRepository: string
  worktreePath: string
  batchId: string
  handoffPaths: string[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  dryRun: boolean
  now: string
}): IntegrationExecutionResult

export function adoptIntegrationBatch(options: {
  integrationRepository: string
  batchId: string
  handoffPaths: string[]
  integrationChecks: IntegrationBatchManifest['integrationChecks']
  dryRun: boolean
  now: string
}): IntegrationExecutionResult
```

- [ ] Write failing tests for fallback `create` from a clean canonical `main` and preferred `adopt` after a Codex-created linked worktree.
- [ ] Add rejection cases for a noncanonical main path, dirty main, existing batch ref/path/manifest, wrong branch, nonlinked adopt checkout, HEAD differing from `main`, malformed handoff, and an existing incompatible lease.
- [ ] Add dry-run cases that assert refs, index, worktrees, status, and common-dir integration state stay byte-identical.
- [ ] Capture every Git argv in executor fixtures and assert no phase invokes `fetch`, `pull`, `push`, `rebase`, `reset`, forced ref updates, branch deletion, worktree removal, or garbage collection.
- [ ] Run `npx vitest run test/integration-executor.test.ts` and confirm failure because executor and CLI are absent.
- [ ] Implement `create` with `git worktree add -b` only after checking `.worktrees/` is ignored and every target is absent. Never reset or reuse a preexisting target.
- [ ] Implement `adopt` without moving the worktree or branch. Require a clean linked worktree at the exact local `main` tip.
- [ ] Acquire the active lease before writing the tracked manifest. Write `config/sherlock-integration-batches/<batchId>.json` and make it the first Chinese commit on the integration branch.
- [ ] If any post-lease step fails, return recovery-required and preserve the lease/worktree for explicit recovery.
- [ ] Implement CLI subcommands `create` and `adopt`, repeated `--handoff`, `--checks`, `--dry-run`, and `--json`.
- [ ] Add `"git:integration": "node scripts/manage-sherlock-integration.mjs"`.
- [ ] Run `npx vitest run test/integration-executor.test.ts test/integration-batch.test.ts test/active-integration-lease.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "工具：增加集成批次创建与接管"`.

## Task 6: Merge Complete Feature Histories with Recovery

**Files:**

- Modify: `scripts/lib/sherlock-integration-executor.mjs`
- Modify: `scripts/lib/sherlock-integration-executor.d.mts`
- Modify: `scripts/manage-sherlock-integration.mjs`
- Modify: `test/integration-executor.test.ts`

**Interfaces:**

```ts
export function mergeIntegrationFeature(options: {
  integrationRepository: string
  manifestPath: string
  featureBranch: string
  ownerToken: string
  dryRun: boolean
  now: string
}): IntegrationExecutionResult

export function continueIntegrationFeature(options: {
  integrationRepository: string
  manifestPath: string
  featureBranch: string
  ownerToken: string
  dryRun: boolean
  now: string
}): IntegrationExecutionResult
```

- [ ] Add a failing successful-merge case that proves all feature commits become ancestors, `--no-ff` creates a boundary merge commit, the declared checks run at the staged merge state, a Chinese merge message is used, and the manifest records exact merge/check commits.
- [ ] Add a check-failure case that asserts `git merge --abort` restores the pre-merge snapshot byte-for-byte.
- [ ] Add a conflict case that expects exit/status `conflict`, preserves `MERGE_HEAD` and unmerged files, prints both-side context, and never changes the manifest or lease tip.
- [ ] Add recovery cases for “merge commit exists but manifest record is missing” and prove `continue` records it without creating a duplicate merge.
- [ ] Add tests that check argv execution uses `shell: false`, timeout is enforced, a moved feature ref invalidates the operation, and a wrong owner token cannot mutate state.
- [ ] Run `npx vitest run test/integration-executor.test.ts` and confirm the new cases fail.
- [ ] Implement `merge` as preflight → `git merge --no-ff --no-commit <feature>` → declared argv checks → Chinese merge commit → manifest record commit → lease tip update after each commit.
- [ ] On check failure call only `git merge --abort`. On conflict retain state and return exit code 3. Never auto-resolve.
- [ ] Implement idempotent `continue` for the exact expected parent/tip and return a printed recovery command when partial success occurs.
- [ ] Ensure CLI exit codes are `0` success/dry-run, `1` policy or restored check failure, `2` invalid CLI/schema, `3` retained conflict, and `4` recovery required.
- [ ] Run `npx vitest run test/integration-executor.test.ts test/integration-batch.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "集成：按完整功能历史合并并支持恢复"`.

## Task 7: Synchronize Main, Record Acceptance, and Promote Fast-Forward Only

**Files:**

- Modify: `scripts/lib/sherlock-integration-executor.mjs`
- Modify: `scripts/lib/sherlock-integration-executor.d.mts`
- Modify: `scripts/manage-sherlock-integration.mjs`
- Modify: `test/integration-executor.test.ts`

**Interfaces:** Implement `recoverIntegrationOwnership`, `synchronizeIntegrationMain`, `acceptIntegrationBatch`, `promoteIntegrationBatch`, and `cancelIntegrationBatch` with the exact option shapes documented in `scripts/lib/sherlock-integration-executor.d.mts`.

```ts
export function recoverIntegrationOwnership(options: {
  integrationRepository: string
  manifestPath: string
  confirmBatchId: string
  confirmTip: string
}): IntegrationExecutionResult
```

- [ ] Add a failing `recover-owner` case that validates the persisted owner token, exact lease tip, tracked manifest path/digest, and current integration branch without changing Git or lease state.
- [ ] Add failing tests where `main` advances and `sync-main` merges it without rebase, reruns integration checks, records `expectedMainCommit`, advances the lease tip, and invalidates prior acceptance.
- [ ] Add acceptance tests proving only an exact current tip and manifest SHA-256 can be marked accepted and `accept` creates no Git commit.
- [ ] Add promotion rejection tests for a dirty canonical main worktree, stale expected main, stale accepted tip/digest, non-fast-forward history, missing feature ancestor, and the wrong canonical main path.
- [ ] Add the successful promotion case: execute `git -C <canonical-main> merge --ff-only <integration-branch>`, verify every declared feature tip is now a `main` ancestor, run minimal integration confirmation, and archive the lease as promoted.
- [ ] Add cancellation tests proving `--confirm-batch` plus `--explicit-cancellation` archives only the lease and preserves every branch, worktree, manifest, tracked file, and untracked file.
- [ ] Run `npx vitest run test/integration-executor.test.ts` and confirm failures for missing lifecycle operations.
- [ ] Implement `sync-main`, running only manifest-declared argv checks and recording the exact synchronization commit/check evidence.
- [ ] Implement `accept` as lease metadata only. Bind it to current integration tip and current manifest digest.
- [ ] Implement `promote` from the canonical main worktree with source-clean and exact-HEAD checks, ancestry assertions, and `--ff-only`. Never switch or reset the main worktree.
- [ ] Implement explicit `cancel` archival without any cleanup.
- [ ] Extend the CLI with `recover-owner`, `sync-main`, `accept`, `promote`, and `cancel` arguments exactly as described by `--help`.
- [ ] Run `npx vitest run test/integration-executor.test.ts test/active-integration-lease.test.ts test/formal-git-state.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "集成：增加验收绑定与主分支安全推进"`.

## Task 8: Expose the Shared-Build Source Gate

**Files:**

- Create: `scripts/lib/sherlock-shared-source-gate.mjs`
- Create: `scripts/lib/sherlock-shared-source-gate.d.mts`
- Create: `test/shared-source-gate.test.ts`
- Modify: `scripts/verify-formal-git-state.mjs`
- Modify: `test/formal-git-state.test.ts`

**Interfaces:** Implement `SharedSourceSnapshot`, `verifySharedBuildSource`, and `assertSharedBuildSourceUnchanged` exactly as declared near the top of this plan.

- [ ] Write failing local-main cases requiring canonical `main`, exact `mainCommit === commit`, source cleanliness, no active lease, null batch fields, and no features.
- [ ] Write failing local-integration cases requiring the exact active lease branch/tip, owner-token match, tracked manifest path, manifest digest, reachable feature tips, current `main` ancestry, and a nonempty feature list.
- [ ] Add cases proving a lease blocks `main` builds and every other integration branch even when they run sequentially.
- [ ] Add a local-main case proving a clean unmerged feature worktree does not block daily local builds; keep that stricter “all branches/worktrees landed” rule only in `verifyFormalGitState`.
- [ ] Add snapshot-change cases for HEAD movement, new source dirt, manifest edits, lease revision/tip change, feature ref movement, and `main` advancement.
- [ ] Add formal-gate regression cases proving an active batch blocks formal build before any release mutation.
- [ ] Run `npx vitest run test/shared-source-gate.test.ts test/formal-git-state.test.ts` and confirm failures.
- [ ] Implement the source gate only from shared Git/model/lease helpers. Do not compute dependency state in this module; plan B enriches the immutable snapshot after dependency preparation.
- [ ] Compare all fields in `assertSharedBuildSourceUnchanged` and report the first mismatched field with before/after values.
- [ ] Make `verifyFormalGitState` reject an active integration lease while preserving its existing stricter checks for all dirty worktrees and unmerged branches.
- [ ] Run `npx vitest run test/shared-source-gate.test.ts test/formal-git-state.test.ts test/git-workflow-state.test.ts`, `npm run typecheck`, and `git diff --check`.
- [ ] Commit with `git commit -m "构建：增加共享客户端来源门禁"`.

## Task 9: Document the Operational Contract

**Files:**

- Create: `docs/sherlock-multi-session-integration-runbook.md`
- Modify: `docs/git-version-management.md`
- Modify: `AGENTS.md`
- Create: `test/integration-runbook.test.ts`

- [ ] Write a failing source-level test requiring the runbook to contain exact `handoff`, `adopt`, `preflight`, `merge`, `continue`, `sync-main`, `accept`, `promote`, and `cancel` examples, plus the stable exit codes.
- [ ] Add assertions that `AGENTS.md` forbids shared builds from feature worktrees and directs local test requests to the future shared-build runner delivered by plan B.
- [ ] Run `npx vitest run test/integration-runbook.test.ts` and confirm it fails before the documentation is updated.
- [ ] Write the runbook from feature creation through post-acceptance retention. State that the integration tooling is effective now, while the shared-client build portion becomes effective only after plan B lands.
- [ ] Document explicit recovery for retained merge conflicts, partial manifest recording, interrupted active-batch ownership, a stale build lock, cancelled batches, and old pre-governance worktrees. Never prescribe forced deletion.
- [ ] Update `docs/git-version-management.md` with local-main authority, no automatic upstream synchronization, the separate `codex/upstream-sync/<YYYYMMDD>` review flow, Chinese commit boundaries, and the separation between integration, acceptance, and formal release.
- [ ] Update `AGENTS.md` with concise mandatory triggers and the three-plan transition note. Preserve all existing formal-release rules.
- [ ] Run:

  ```bash
  npx vitest run \
    test/git-workflow-state.test.ts \
    test/session-handoff.test.ts \
    test/integration-batch.test.ts \
    test/active-integration-lease.test.ts \
    test/integration-executor.test.ts \
    test/shared-source-gate.test.ts \
    test/integration-runbook.test.ts \
    test/formal-git-state.test.ts \
    test/git-local-policy.test.ts
  npm run typecheck
  git diff --check
  ```

- [ ] Inspect `git status --short` and ensure `dist-internal/` and `output/` are not staged.
- [ ] Commit with `git commit -m "文档：落地 Sherlock 多会话集成规范"`.

## Task 10: Bootstrap This Feature Through Its Own Integration Executor

**Files:** No direct source edits. The new executor creates the tracked batch manifest and Chinese integration commits.

- [ ] Confirm `codex/feat/session-integration-controls-20260831` is source-clean and all task commits are descendants of the recorded planning `main` base.
- [ ] Generate a handoff card with `npm run git:handoff` whose checks are the complete focused command from Task 9 and whose UI verification is `not-applicable` with the reason “local Git workflow tooling has no client UI”.
- [ ] Create a clean integration worktree from the unchanged planning `main` tip. Invoke `scripts/manage-sherlock-integration.mjs` by absolute path from the feature worktree to `adopt` that integration worktree; this one-time bootstrap is allowed because the executor code is not yet present on `main`.
- [ ] Run preflight and merge the complete plan-A feature branch. Verify the executor creates the tracked manifest, Chinese merge boundary, verification record, and active lease without reset/rebase/ref deletion.
- [ ] Exercise one read-only handoff/preflight dry-run fixture from the integration worktree and confirm no state changes.
- [ ] Present the exact integration tip, focused results, and manifest to the user for acceptance. Do not promote while acceptance is pending.
- [ ] After explicit acceptance, use the integration worktree’s own executor to record acceptance and `--ff-only` promote to canonical `main`.
- [ ] Verify canonical `main` equals the accepted tip, all plan-A commits are ancestors, the lease is archived as promoted, and both worktrees remain available.

## Plan A Completion Gate

- Every mutating CLI has a preceding read-only preflight and deterministic dry-run.
- Handoff, merge, acceptance, and promotion refer to the same exact feature and integration commits.
- One common-dir active lease blocks every competing shared build source until promotion or explicit cancellation.
- Check failure restores the merge state; conflict and recovery-required states remain inspectable.
- Promotion is possible only as a clean canonical-main `--ff-only` update.
- No task performs upstream synchronization, destructive cleanup, formal publishing, or a full test run.
