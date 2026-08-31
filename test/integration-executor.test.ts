import { createHash } from 'node:crypto'
import fs, { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildFeatureHandoff } from '../scripts/lib/sherlock-integration-model.mjs'
import { acquireActiveBatchLease, readActiveBatchLease, updateActiveBatchTip } from '../scripts/lib/sherlock-active-batch.mjs'
import { resolveRepositoryContext } from '../scripts/lib/sherlock-git-state.mjs'
import {
  adoptIntegrationBatch,
  acceptIntegrationBatch,
  cancelIntegrationBatch,
  continueIntegrationFeature,
  createIntegrationBatch,
  formatIntegrationRecoveryCommand,
  mergeIntegrationFeature,
  promoteIntegrationBatch,
  recoverIntegrationOwnership,
  synchronizeIntegrationMain
} from '../scripts/lib/sherlock-integration-executor.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const fixtures: GitWorkflowFixture[] = []
const projectRoot = path.resolve(import.meta.dirname, '..')
const integrationCli = path.join(projectRoot, 'scripts', 'manage-sherlock-integration.mjs')

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function checks(): Array<{ argv: [string, ...string[]]; timeoutMs: number }> {
  return [{ argv: ['npx', 'vitest', 'run', 'test/integration-executor.test.ts'], timeoutMs: 120000 }]
}

function prepareIntegrationRoot(repository: GitWorkflowFixture) {
  repository.write(repository.main, '.gitignore', '.worktrees/\n')
  repository.commit(repository.main, '忽略集成 worktree')
}

function handoffFile(repository: GitWorkflowFixture, name: string): string {
  const feature = repository.createWorktree(name, `codex/feat/${name}-20260831`)
  const base = repository.git(feature, 'rev-parse', 'HEAD')
  repository.write(feature, `src/${name}.ts`, 'export const integration = true\n')
  const tip = repository.commit(feature, '增加可集成功能')
  const handoff = buildFeatureHandoff({
    repository: feature,
    baseCommit: base,
    metadata: {
      featureName: '集成执行器',
      checks: [{
        argv: ['npx', 'vitest', 'run', 'test/session-handoff.test.ts'],
        outcome: 'passed',
        summary: 'feature handoff check',
        verifiedCommit: tip,
        completedAt: '2026-08-31T05:00:00.000Z',
        timeoutMs: 120000
      }],
      uiVerification: { outcome: 'not-applicable', summary: 'Git workflow tooling has no client UI.' },
      acceptanceCriteria: ['交接卡绑定当前功能提交'],
      risks: ['功能引用必须保持不变']
    },
    generatedAt: '2026-08-31T05:01:00.000Z'
  })
  const card = path.join(repository.root, `${name}.json`)
  writeFileSync(card, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8')
  return card
}

function acceptedPromotion(repository: GitWorkflowFixture, name: string, batchId: string) {
  prepareIntegrationRoot(repository)
  const handoff = handoffFile(repository, name)
  const integration = repository.createWorktree(`integration-${name}`, `codex/integration/${batchId}`)
  const integrationChecks = [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }] as [{ argv: [string, ...string[]]; timeoutMs: number }]
  adoptIntegrationBatch({ integrationRepository: integration, batchId, handoffPaths: [handoff], integrationChecks, dryRun: false, now: '2026-08-31T06:00:00.000Z' })
  const context = resolveRepositoryContext(integration)
  const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
  const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', `${batchId}.json`)
  const merged = mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: `codex/feat/${name}-20260831`, ownerToken, dryRun: false, now: '2026-08-31T06:01:00.000Z' })
  acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: merged.afterCommit, confirmBatchId: batchId, ownerToken, now: '2026-08-31T06:02:00.000Z' })
  return { integration, manifestPath, ownerToken, tip: merged.afterCommit, branch: `codex/feat/${name}-20260831` }
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
})

describe('integration batch executor', () => {
  it('creates a clean canonical-main batch, records the first manifest commit, and owns its lease', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'create')
    const before = repository.git(repository.main, 'rev-parse', 'HEAD')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-01')

    const result = createIntegrationBatch({
      mainRepository: repository.main,
      worktreePath: worktree,
      batchId: '20260831-01',
      handoffPaths: [handoff],
      integrationChecks: checks(),
      dryRun: false,
      now: '2026-08-31T05:02:00.000Z'
    })

    const manifestPath = path.join(worktree, 'config', 'sherlock-integration-batches', '20260831-01.json')
    expect(result).toMatchObject({ status: 'prepared', batchId: '20260831-01', beforeCommit: before })
    expect(result.afterCommit).toMatch(/^[0-9a-f]{40}$/)
    expect(repository.git(worktree, 'branch', '--show-current')).toBe('codex/integration/20260831-01')
    expect(repository.git(worktree, 'rev-parse', 'HEAD^')).toBe(before)
    expect(repository.git(worktree, 'show', '--format=%s', '--no-patch', 'HEAD')).toMatch(/^集成：创建批次 20260831-01$/)
    expect(repository.git(worktree, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD')).toBe('config/sherlock-integration-batches/20260831-01.json')
    expect(JSON.parse(readFileSync(manifestPath, 'utf8'))).toMatchObject({ batchId: '20260831-01', baseMainCommit: before })
    expect(readActiveBatchLease(worktree)).toMatchObject({ batchId: '20260831-01', currentTip: result.afterCommit })
  })

  it('adopts a clean linked integration worktree at the exact main tip without moving it', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'adopt')
    const integration = repository.createWorktree('integration-adopt', 'codex/integration/20260831-02')
    const before = repository.git(integration, 'rev-parse', 'HEAD')

    const result = adoptIntegrationBatch({
      integrationRepository: integration,
      batchId: '20260831-02',
      handoffPaths: [handoff],
      integrationChecks: checks(),
      dryRun: false,
      now: '2026-08-31T05:03:00.000Z'
    })

    expect(result).toMatchObject({ status: 'prepared', beforeCommit: before })
    expect(repository.git(integration, 'rev-parse', 'HEAD^')).toBe(before)
    expect(repository.git(integration, 'branch', '--show-current')).toBe('codex/integration/20260831-02')
  })

  it('rejects noncanonical or dirty create inputs, stale adopt heads, malformed handoffs, and existing target state before mutation', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'reject')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-03')
    const before = repository.snapshot()
    const options = { worktreePath: worktree, batchId: '20260831-03', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:04:00.000Z' }

    expect(() => createIntegrationBatch({ ...options, mainRepository: path.dirname(repository.main) })).toThrow(/main|主|规范/)
    expect(() => createIntegrationBatch({ ...options, mainRepository: repository.main, worktreePath: path.join(repository.root, 'outside-integration') })).toThrow(/\.worktrees|worktree 路径/)
    repository.write(repository.main, 'src/dirty.ts', 'export const dirty = true\n')
    expect(() => createIntegrationBatch({ ...options, mainRepository: repository.main })).toThrow(/干净|未提交/)
    expect(existsSync(worktree)).toBe(false)
    expect(readActiveBatchLease(repository.main)).toBeNull()
    expect(repository.snapshot().equals(before)).toBe(false)

    const clean = fixture()
    prepareIntegrationRoot(clean)
    const cleanHandoff = handoffFile(clean, 'reject-clean')
    const cleanBefore = clean.snapshot()
    expect(() => createIntegrationBatch({ ...options, mainRepository: clean.main, worktreePath: path.join(clean.main, '.worktrees', 'integration-20260831-03'), handoffPaths: [path.join(clean.root, 'missing.json')] })).toThrow(/交接|handoff|ENOENT/)
    expect(clean.snapshot().equals(cleanBefore)).toBe(true)
    const integration = clean.createWorktree('integration-stale', 'codex/integration/20260831-04')
    clean.write(clean.main, 'src/main-advanced.ts', 'export const advanced = true\n')
    clean.commit(clean.main, '推进 main')
    expect(() => adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-04', handoffPaths: [cleanHandoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:04:00.000Z' })).toThrow(/main|HEAD|精确/)
  })

  it('plans create and adopt byte-identically without temporary lease or worktree side effects', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'dry-run')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-05')
    const beforeCreate = repository.snapshot()
    const plannedCreate = createIntegrationBatch({ mainRepository: repository.main, worktreePath: worktree, batchId: '20260831-05', handoffPaths: [handoff], integrationChecks: checks(), dryRun: true, now: '2026-08-31T05:05:00.000Z' })
    expect(plannedCreate).toMatchObject({ status: 'planned', beforeCommit: repository.git(repository.main, 'rev-parse', 'HEAD') })
    expect(repository.snapshot().equals(beforeCreate)).toBe(true)
    expect(existsSync(worktree)).toBe(false)

    const integration = repository.createWorktree('integration-dry-adopt', 'codex/integration/20260831-06')
    const beforeAdopt = repository.snapshot()
    const plannedAdopt = adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-06', handoffPaths: [handoff], integrationChecks: checks(), dryRun: true, now: '2026-08-31T05:06:00.000Z' })
    expect(plannedAdopt).toMatchObject({ status: 'planned', beforeCommit: repository.git(integration, 'rev-parse', 'HEAD') })
    expect(repository.snapshot().equals(beforeAdopt)).toBe(true)
    expect(existsSync(path.join(resolveRepositoryContext(integration).gitDirectory, 'sherlock-integration-owner.json'))).toBe(false)
  })

  it('refuses an incompatible active lease before creating another branch or worktree', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'lease-conflict')
    const blocker = repository.createWorktree('integration-blocker', 'codex/integration/20260831-07')
    const base = repository.git(blocker, 'rev-parse', 'HEAD')
    acquireActiveBatchLease({
      repository: blocker,
      ownerToken: 'owner-token-for-conflict',
      lease: {
        batchId: '20260831-07',
        branch: 'codex/integration/20260831-07',
        manifestPath: 'config/sherlock-integration-batches/20260831-07.json',
        baseMainCommit: base,
        currentTip: base,
        createdAt: '2026-08-31T05:07:00.000Z',
        updatedAt: '2026-08-31T05:07:00.000Z'
      }
    })
    const target = path.join(repository.main, '.worktrees', 'integration-20260831-08')
    const before = repository.snapshot()

    expect(() => createIntegrationBatch({ mainRepository: repository.main, worktreePath: target, batchId: '20260831-08', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:08:00.000Z' })).toThrow(/活动集成租约/)
    expect(repository.snapshot().equals(before)).toBe(true)
    expect(existsSync(target)).toBe(false)
  })

  it('retains a newly created worktree when an incompatible lease appears before acquisition', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'create-race')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-11')
    const base = repository.git(repository.main, 'rev-parse', 'HEAD')
    const activeLease = path.join(repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const originalRealpath = fs.realpathSync
    let injected = false
    fs.realpathSync = ((...args: any[]) => {
      const resolved = (originalRealpath as (...values: any[]) => string)(...args)
      if (!injected && path.resolve(resolved) === worktree) {
        injected = true
        fs.mkdirSync(path.dirname(activeLease), { recursive: true })
        writeFileSync(activeLease, `${JSON.stringify({
          schemaVersion: 1,
          revision: 1,
          batchId: '20260831-99',
          branch: 'codex/integration/20260831-99',
          manifestPath: 'config/sherlock-integration-batches/20260831-99.json',
          baseMainCommit: base,
          currentTip: base,
          ownerTokenHash: 'a'.repeat(64),
          createdAt: '2026-08-31T05:10:00.000Z',
          updatedAt: '2026-08-31T05:10:00.000Z'
        })}\n`, 'utf8')
      }
      return resolved
    }) as typeof fs.realpathSync
    syncBuiltinESMExports()
    let result
    try {
      result = createIntegrationBatch({ mainRepository: repository.main, worktreePath: worktree, batchId: '20260831-11', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:10:00.000Z' })
    } finally {
      fs.realpathSync = originalRealpath
      syncBuiltinESMExports()
    }

    expect(injected).toBe(true)
    expect(result).toMatchObject({ status: 'recovery-required', batchId: '20260831-11', beforeCommit: base, afterCommit: base })
    expect(repository.git(worktree, 'branch', '--show-current')).toBe('codex/integration/20260831-11')
    expect(repository.git(worktree, 'rev-parse', 'HEAD')).toBe(base)
    expect(repository.git(worktree, 'status', '--porcelain=v1')).toBe('')
    expect(readActiveBatchLease(worktree)).toMatchObject({ batchId: '20260831-99' })
    expect(existsSync(path.join(worktree, 'config', 'sherlock-integration-batches', '20260831-11.json'))).toBe(false)
    expect(JSON.stringify(result)).not.toContain(worktree)
    expect(JSON.stringify(result)).not.toMatch(/npm run|recover-owner|--repo|\$\(|`/)
  })

  it('exits 4 from the CLI for the create/acquire race without emitting an executable recovery command', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'cli-race')
    const checksPath = path.join(repository.root, 'checks.json')
    writeFileSync(checksPath, `${JSON.stringify(checks())}\n`, 'utf8')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-12')
    const base = repository.git(repository.main, 'rev-parse', 'HEAD')
    const helper = path.join(repository.root, 'inject-lease.mjs')
    const shim = path.join(repository.root, 'git')
    const realGit = spawnSync('which', ['git'], { encoding: 'utf8' }).stdout.trim()
    writeFileSync(helper, `#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const common = process.env.SHERLOCK_RACE_COMMON
const base = process.env.SHERLOCK_RACE_BASE
const active = path.join(common, 'sherlock-integration', 'active')
mkdirSync(active, { recursive: true })
writeFileSync(path.join(active, 'lease.json'), JSON.stringify({ schemaVersion: 1, revision: 1, batchId: '20260831-99', branch: 'codex/integration/20260831-99', manifestPath: 'config/sherlock-integration-batches/20260831-99.json', baseMainCommit: base, currentTip: base, ownerTokenHash: 'a'.repeat(64), createdAt: '2026-08-31T05:11:00.000Z', updatedAt: '2026-08-31T05:11:00.000Z' }) + '\\n')
`, 'utf8')
    writeFileSync(shim, `#!/bin/sh
"$SHERLOCK_REAL_GIT" "$@"
status=$?
if [ "$status" -eq 0 ] && [ "$1" = "-C" ] && [ "$3" = "worktree" ] && [ "$4" = "add" ] && [ "$5" = "-b" ]; then
  "$SHERLOCK_RACE_HELPER"
fi
exit "$status"
`, 'utf8')
    chmodSync(helper, 0o755)
    chmodSync(shim, 0o755)

    const result = spawnSync(process.execPath, [integrationCli, 'create', '--repo', repository.main, '--worktree', worktree, '--batch', '20260831-12', '--handoff', handoff, '--checks', checksPath, '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${repository.root}${path.delimiter}${process.env.PATH}`,
        SHERLOCK_REAL_GIT: realGit,
        SHERLOCK_RACE_HELPER: helper,
        SHERLOCK_RACE_COMMON: repository.commonDirectory,
        SHERLOCK_RACE_BASE: base
      }
    })

    expect(result.status).toBe(4)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'recovery-required', batchId: '20260831-12' })
    expect(result.stdout).not.toMatch(/npm run|recover-owner|--repo|\$\(|`|integration-20260831-12/)
    expect(repository.git(worktree, 'branch', '--show-current')).toBe('codex/integration/20260831-12')
    expect(repository.git(worktree, 'rev-parse', 'HEAD')).toBe(base)
  })

  it('returns recovery-required after lease acquisition and preserves the worktree, branch, lease, and absent manifest for explicit recovery', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'recovery')
    const worktree = path.join(repository.main, '.worktrees', 'integration-20260831-09')
    const originalWrite = fs.writeFileSync
    fs.writeFileSync = ((file: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options?: fs.WriteFileOptions) => {
      if (typeof file === 'string' && file.endsWith('/config/sherlock-integration-batches/20260831-09.json')) {
        throw new Error('controlled manifest write failure')
      }
      return originalWrite(file, data, options)
    }) as typeof fs.writeFileSync
    syncBuiltinESMExports()
    let result
    try {
      result = createIntegrationBatch({ mainRepository: repository.main, worktreePath: worktree, batchId: '20260831-09', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:09:00.000Z' })
    } finally {
      fs.writeFileSync = originalWrite
      syncBuiltinESMExports()
    }

    expect(result).toMatchObject({ status: 'recovery-required', batchId: '20260831-09', branch: 'codex/integration/20260831-09' })
    expect(result).not.toHaveProperty('recoveryCommand')
    expect(result.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'recovery-state-preserved' })
    ]))
    expect(result.actions.find((item) => item.kind === 'recovery-state-preserved')).not.toHaveProperty('argv')
    expect(repository.git(worktree, 'branch', '--show-current')).toBe('codex/integration/20260831-09')
    expect(readActiveBatchLease(worktree)).toMatchObject({ batchId: '20260831-09' })
    expect(existsSync(path.join(worktree, 'config', 'sherlock-integration-batches', '20260831-09.json'))).toBe(false)
  })

  it('emits exactly one JSON execution result for a dry-run CLI invocation', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'cli')
    const checksPath = path.join(repository.root, 'checks.json')
    writeFileSync(checksPath, `${JSON.stringify(checks())}\n`, 'utf8')
    const target = path.join(repository.main, '.worktrees', 'integration-20260831-10')
    const before = repository.snapshot()
    const result = spawnSync(process.execPath, [integrationCli, 'create', '--repo', repository.main, '--worktree', target, '--batch', '20260831-10', '--handoff', handoff, '--checks', checksPath, '--dry-run', '--json'], { cwd: projectRoot, encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout.split('\n').filter(Boolean)).toHaveLength(1)
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'planned', batchId: '20260831-10' })
    expect(repository.snapshot().equals(before)).toBe(true)
  })

  it('merges the declared complete feature history, runs checks before the boundary commit, and records evidence', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'merge-complete')
    const integration = repository.createWorktree('integration-merge-complete', 'codex/integration/20260831-13')
    adoptIntegrationBatch({
      integrationRepository: integration,
      batchId: '20260831-13',
      handoffPaths: [handoff],
      integrationChecks: [{ argv: [process.execPath, '-e', "process.exit(0)"], timeoutMs: 1000 }],
      dryRun: false,
      now: '2026-08-31T05:13:00.000Z'
    })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-13.json')

    const result = mergeIntegrationFeature({
      integrationRepository: integration,
      manifestPath,
      featureBranch: 'codex/feat/merge-complete-20260831',
      ownerToken,
      dryRun: false,
      now: '2026-08-31T05:14:00.000Z'
    })

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const mergeCommit = manifest.features[0].merged.mergeCommit
    expect(result).toMatchObject({ status: 'merged', beforeCommit: context.head })
    expect(repository.git(integration, 'merge-base', '--is-ancestor', 'codex/feat/merge-complete-20260831', mergeCommit)).toBe('')
    expect(repository.git(integration, 'show', '-s', '--format=%P', mergeCommit).split(' ')).toHaveLength(2)
    expect(repository.git(integration, 'show', '-s', '--format=%s', mergeCommit)).toBe('集成：合并功能 codex/feat/merge-complete-20260831')
    expect(manifest.features[0].merged.checks[0]).toMatchObject({
      argv: [process.execPath, '-e', "process.exit(0)"],
      verifiedCommit: mergeCommit
    })
    expect(readActiveBatchLease(integration)).toMatchObject({ currentTip: result.afterCommit })
  })

  it('aborts only the staged merge when a declared check fails and restores the pre-merge snapshot', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'merge-check-failure')
    const integration = repository.createWorktree('integration-merge-check-failure', 'codex/integration/20260831-14')
    adoptIntegrationBatch({
      integrationRepository: integration,
      batchId: '20260831-14',
      handoffPaths: [handoff],
      integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(9)'], timeoutMs: 1000 }],
      dryRun: false,
      now: '2026-08-31T05:14:00.000Z'
    })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const before = repository.snapshot()

    expect(() => mergeIntegrationFeature({
      integrationRepository: integration,
      manifestPath: path.join(integration, 'config', 'sherlock-integration-batches', '20260831-14.json'),
      featureBranch: 'codex/feat/merge-check-failure-20260831',
      ownerToken,
      dryRun: false,
      now: '2026-08-31T05:15:00.000Z'
    })).toThrow(/检查失败|check/)
    expect(repository.snapshot().equals(before)).toBe(true)
    expect(spawnSync('git', ['-C', integration, 'rev-parse', '-q', '--verify', 'MERGE_HEAD'], { encoding: 'utf8' }).status).toBe(1)
  })

  it('continues an unrecorded exact boundary merge without creating a duplicate merge commit', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'merge-recovery')
    const integration = repository.createWorktree('integration-merge-recovery', 'codex/integration/20260831-15')
    adoptIntegrationBatch({
      integrationRepository: integration,
      batchId: '20260831-15',
      handoffPaths: [handoff],
      integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }],
      dryRun: false,
      now: '2026-08-31T05:15:00.000Z'
    })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    repository.git(integration, 'merge', '--no-ff', '--no-edit', 'codex/feat/merge-recovery-20260831')
    const boundary = repository.git(integration, 'rev-parse', 'HEAD')
    const result = continueIntegrationFeature({
      integrationRepository: integration,
      manifestPath: path.join(integration, 'config', 'sherlock-integration-batches', '20260831-15.json'),
      featureBranch: 'codex/feat/merge-recovery-20260831',
      ownerToken,
      dryRun: false,
      now: '2026-08-31T05:16:00.000Z'
    })

    expect(repository.git(integration, 'rev-parse', `${result.afterCommit}^`)).toBe(boundary)
    expect(repository.git(integration, 'show', '-s', '--format=%P', boundary).split(' ')).toHaveLength(2)
  })

  it('commits only an exact staged manifest record after a boundary merge interruption', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'staged-record')
    const integration = repository.createWorktree('integration-staged-record', 'codex/integration/20260831-16')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-16', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:16:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-16.json')
    repository.git(integration, 'merge', '--no-ff', '--no-edit', 'codex/feat/staged-record-20260831')
    const boundary = repository.git(integration, 'rev-parse', 'HEAD')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.features[0].merged = {
      mergeCommit: boundary,
      verificationCommit: boundary,
      checks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], outcome: 'passed', summary: `已在暂存合并树执行：${process.execPath} -e process.exit(0)`, verifiedCommit: boundary, completedAt: '2026-08-31T05:17:00.000Z', timeoutMs: 1000 }],
      recordedAt: '2026-08-31T05:17:00.000Z'
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    repository.git(integration, 'add', '--', 'config/sherlock-integration-batches/20260831-16.json')

    const result = continueIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/staged-record-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:18:00.000Z' })

    expect(repository.git(integration, 'rev-parse', `${result.afterCommit}^`)).toBe(boundary)
    expect(repository.git(integration, 'status', '--porcelain=v1')).toBe('')
    expect(readActiveBatchLease(integration)).toMatchObject({ currentTip: result.afterCommit })
  })

  it('performs only the outstanding lease CAS after an exact manifest record commit', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'record-cas')
    const integration = repository.createWorktree('integration-record-cas', 'codex/integration/20260831-17')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-17', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:17:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-17.json')
    const before = context.head
    repository.git(integration, 'merge', '--no-ff', '--no-edit', 'codex/feat/record-cas-20260831')
    const boundary = repository.git(integration, 'rev-parse', 'HEAD')
    const lease = readActiveBatchLease(integration)!
    updateActiveBatchTip({ repository: integration, ownerToken, expectedRevision: lease.revision, expectedTip: before, nextTip: boundary, updatedAt: '2026-08-31T05:18:00.000Z' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.features[0].merged = {
      mergeCommit: boundary,
      verificationCommit: boundary,
      checks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], outcome: 'passed', summary: `已在暂存合并树执行：${process.execPath} -e process.exit(0)`, verifiedCommit: boundary, completedAt: '2026-08-31T05:18:00.000Z', timeoutMs: 1000 }],
      recordedAt: '2026-08-31T05:18:00.000Z'
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    repository.git(integration, 'add', '--', 'config/sherlock-integration-batches/20260831-17.json')
    repository.git(integration, 'commit', '-m', '集成：记录功能 codex/feat/record-cas-20260831 合并验证')
    const record = repository.git(integration, 'rev-parse', 'HEAD')

    const result = continueIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/record-cas-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:19:00.000Z' })

    expect(result.afterCommit).toBe(record)
    expect(repository.git(integration, 'rev-parse', 'HEAD')).toBe(record)
    expect(readActiveBatchLease(integration)).toMatchObject({ currentTip: record })
  })

  it('retains a real conflict and prints both-side commit context with CLI exit 3', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'conflict-output')
    const integration = repository.createWorktree('integration-conflict-output', 'codex/integration/20260831-18')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-18', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:18:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-18.json')
    const lease = readActiveBatchLease(integration)!
    repository.write(integration, 'src/conflict-output.ts', 'export const integrationSide = true\n')
    const integrationTip = repository.commit(integration, '集成侧冲突')
    updateActiveBatchTip({ repository: integration, ownerToken, expectedRevision: lease.revision, expectedTip: lease.currentTip, nextTip: integrationTip, updatedAt: '2026-08-31T05:19:00.000Z' })
    const manifestBytes = readFileSync(manifestPath)
    const leaseBefore = JSON.stringify(readActiveBatchLease(integration))

    const result = spawnSync(process.execPath, [integrationCli, 'merge', '--repo', integration, '--manifest', manifestPath, '--feature', 'codex/feat/conflict-output-20260831'], { cwd: projectRoot, encoding: 'utf8' })

    expect(result.status).toBe(3)
    expect(result.stdout).toContain(`integrationTip=${integrationTip}`)
    expect(result.stdout).toMatch(/featureTip=[0-9a-f]{40} featureBase=[0-9a-f]{40}/)
    expect(spawnSync('git', ['-C', integration, 'rev-parse', '-q', '--verify', 'MERGE_HEAD'], { encoding: 'utf8' }).status).toBe(0)
    expect(readFileSync(manifestPath)).toEqual(manifestBytes)
    expect(JSON.stringify(readActiveBatchLease(integration))).toBe(leaseBefore)
  })

  it('aborts and restores when a declared argv check times out', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'timeout-check')
    const integration = repository.createWorktree('integration-timeout-check', 'codex/integration/20260831-19')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-19', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'setInterval(() => {}, 1000)'], timeoutMs: 25 }], dryRun: false, now: '2026-08-31T05:19:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const before = repository.snapshot()

    expect(() => mergeIntegrationFeature({ integrationRepository: integration, manifestPath: path.join(integration, 'config', 'sherlock-integration-batches', '20260831-19.json'), featureBranch: 'codex/feat/timeout-check-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:20:00.000Z' })).toThrow(/检查失败/)
    expect(repository.snapshot().equals(before)).toBe(true)
  })

  it('rejects a moved feature ref and a wrong owner token before mutating the integration batch', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'owner-and-ref')
    const integration = repository.createWorktree('integration-owner-and-ref', 'codex/integration/20260831-20')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-20', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:20:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-20.json')
    const beforeWrongOwner = repository.snapshot()
    expect(() => mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/owner-and-ref-20260831', ownerToken: 'wrong-owner', dryRun: false, now: '2026-08-31T05:21:00.000Z' })).toThrow(/owner token/)
    expect(repository.snapshot().equals(beforeWrongOwner)).toBe(true)

    const worktreeList = repository.git(integration, 'worktree', 'list', '--porcelain')
    const featurePath = /worktree ([^\n]+)\nHEAD [^\n]+\nbranch refs\/heads\/codex\/feat\/owner-and-ref-20260831/.exec(worktreeList)?.[1]
    expect(featurePath).toBeTruthy()
    repository.write(featurePath!, 'src/moved.ts', 'export const moved = true\n')
    repository.commit(featurePath!, '移动功能引用')
    const beforeMovedRef = repository.snapshot()
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    expect(() => mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/owner-and-ref-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:22:00.000Z' })).toThrow(/预检|移动|tip/)
    expect(repository.snapshot().equals(beforeMovedRef)).toBe(true)
  })

  it('renders a usable recovery command with POSIX quoting for hostile paths and branches', () => {
    expect(formatIntegrationRecoveryCommand({
      repository: "/tmp/owner's repo/$(nope)",
      manifestPath: "/tmp/owner's repo/config/a b.json",
      featureBranch: "codex/feat/odd'branch-20260831"
    })).toBe("npm run git:integration -- continue --repo '/tmp/owner'\"'\"'s repo/$(nope)' --manifest '/tmp/owner'\"'\"'s repo/config/a b.json' --feature 'codex/feat/odd'\"'\"'branch-20260831'")
  })

  it('recovers the exact persisted owner without changing the batch, Git state, or lease bytes', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'recover-owner')
    const integration = repository.createWorktree('integration-recover-owner', 'codex/integration/20260831-21')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-21', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:21:00.000Z' })
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-21.json')
    const lease = readActiveBatchLease(integration)!
    const before = repository.snapshot()

    const result = recoverIntegrationOwnership({
      integrationRepository: integration,
      manifestPath,
      confirmBatchId: '20260831-21',
      confirmTip: lease.currentTip
    })

    expect(result).toMatchObject({ status: 'ownership-recovered', afterCommit: lease.currentTip })
    expect(repository.snapshot()).toEqual(before)
  })

  it('synchronizes advanced main, invalidates acceptance, then accepts the exact manifest bytes without a Git commit', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'sync-main')
    const integration = repository.createWorktree('integration-sync-main', 'codex/integration/20260831-22')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-22', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:22:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-22.json')
    const expectedMainBefore = JSON.parse(readFileSync(manifestPath, 'utf8')).expectedMainCommit
    mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/sync-main-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:23:00.000Z' })
    const acceptedTip = repository.git(integration, 'rev-parse', 'HEAD')
    acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: acceptedTip, confirmBatchId: '20260831-22', ownerToken, now: '2026-08-31T05:24:00.000Z' })
    repository.write(repository.main, 'src/main-advance.ts', 'export const mainAdvance = true\n')
    const mainTip = repository.commit(repository.main, '推进 main')

    const synchronized = synchronizeIntegrationMain({ integrationRepository: integration, manifestPath, ownerToken, dryRun: false, now: '2026-08-31T05:25:00.000Z' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const lease = readActiveBatchLease(integration)!
    expect(synchronized).toMatchObject({ status: 'main-synchronized' })
    expect(manifest.expectedMainCommit).toBe(mainTip)
    expect(manifest.mainSynchronizations).toHaveLength(1)
    expect(manifest.mainSynchronizations[0]).toMatchObject({ previousMainCommit: expectedMainBefore, mainCommit: mainTip })
    expect(lease).toMatchObject({ currentTip: synchronized.afterCommit })
    expect(lease.acceptedTip).toBeUndefined()
    const beforeAcceptHead = repository.git(integration, 'rev-parse', 'HEAD')
    const digest = createHash('sha256').update(readFileSync(manifestPath)).digest('hex')

    const accepted = acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: beforeAcceptHead, confirmBatchId: '20260831-22', ownerToken, now: '2026-08-31T05:26:00.000Z' })
    expect(accepted).toMatchObject({ status: 'accepted', beforeCommit: beforeAcceptHead, afterCommit: beforeAcceptHead })
    expect(repository.git(integration, 'rev-parse', 'HEAD')).toBe(beforeAcceptHead)
    expect(readActiveBatchLease(integration)).toMatchObject({ acceptedTip: beforeAcceptHead, acceptedManifestDigest: digest })
  }, 10000)

  it('fast-forwards only an accepted exact integration tip into canonical clean main and archives the lease', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'promote')
    const integration = repository.createWorktree('integration-promote', 'codex/integration/20260831-23')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-23', handoffPaths: [handoff], integrationChecks: [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }], dryRun: false, now: '2026-08-31T05:27:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-23.json')
    const merged = mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/promote-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:28:00.000Z' })
    acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: merged.afterCommit, confirmBatchId: '20260831-23', ownerToken, now: '2026-08-31T05:29:00.000Z' })

    const promoted = promoteIntegrationBatch({ integrationRepository: integration, manifestPath, mainWorktree: repository.main, confirmBatchId: '20260831-23', confirmTip: merged.afterCommit, ownerToken, dryRun: false, now: '2026-08-31T05:30:00.000Z' })
    expect(promoted).toMatchObject({ status: 'promoted', afterCommit: merged.afterCommit })
    expect(repository.git(repository.main, 'rev-parse', 'HEAD')).toBe(merged.afterCommit)
    expect(repository.git(repository.main, 'merge-base', '--is-ancestor', 'codex/feat/promote-20260831', 'HEAD')).toBe('')
    expect(readActiveBatchLease(integration)).toBeNull()
    expect(existsSync(path.join(repository.commonDirectory, 'sherlock-integration', 'history'))).toBe(true)
  }, 10000)

  it('retains the active lease after post-FF confirmation fails and retries the exact promoted state without another merge', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'promote-confirmation')
    const integration = repository.createWorktree('integration-promote-confirmation', 'codex/integration/20260831-25')
    const confirmation = path.join(repository.root, 'confirmation.mjs')
    writeFileSync(confirmation, 'process.exit(0)\n', 'utf8')
    const integrationChecks = [{ argv: [process.execPath, confirmation], timeoutMs: 1000 }] as [{ argv: [string, ...string[]]; timeoutMs: number }]
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-25', handoffPaths: [handoff], integrationChecks, dryRun: false, now: '2026-08-31T05:34:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-25.json')
    const merged = mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/promote-confirmation-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:35:00.000Z' })
    acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: merged.afterCommit, confirmBatchId: '20260831-25', ownerToken, now: '2026-08-31T05:36:00.000Z' })
    writeFileSync(confirmation, 'process.exit(9)\n', 'utf8')

    const first = promoteIntegrationBatch({ integrationRepository: integration, manifestPath, mainWorktree: repository.main, confirmBatchId: '20260831-25', confirmTip: merged.afterCommit, ownerToken, dryRun: false, now: '2026-08-31T05:37:00.000Z' })
    expect(first).toMatchObject({ status: 'recovery-required', afterCommit: merged.afterCommit })
    expect(repository.git(repository.main, 'rev-parse', 'HEAD')).toBe(merged.afterCommit)
    expect(readActiveBatchLease(integration)).toMatchObject({ currentTip: merged.afterCommit, acceptedTip: merged.afterCommit })

    writeFileSync(confirmation, 'process.exit(0)\n', 'utf8')
    const retried = promoteIntegrationBatch({ integrationRepository: integration, manifestPath, mainWorktree: repository.main, confirmBatchId: '20260831-25', confirmTip: merged.afterCommit, ownerToken, dryRun: false, now: '2026-08-31T05:38:00.000Z' })
    expect(retried).toMatchObject({ status: 'promoted', beforeCommit: merged.afterCommit, afterCommit: merged.afterCommit })
    expect(repository.git(repository.main, 'rev-parse', 'HEAD')).toBe(merged.afterCommit)
    expect(readActiveBatchLease(integration)).toBeNull()
  }, 15000)

  it('retains the active lease after archive publication fails following FF and archives on a later exact retry', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'promote-archive')
    const integration = repository.createWorktree('integration-promote-archive', 'codex/integration/20260831-26')
    const integrationChecks = [{ argv: [process.execPath, '-e', 'process.exit(0)'], timeoutMs: 1000 }] as [{ argv: [string, ...string[]]; timeoutMs: number }]
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-26', handoffPaths: [handoff], integrationChecks, dryRun: false, now: '2026-08-31T05:39:00.000Z' })
    const context = resolveRepositoryContext(integration)
    const ownerToken = JSON.parse(readFileSync(path.join(context.gitDirectory, 'sherlock-integration-owner.json'), 'utf8')).ownerToken
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-26.json')
    const merged = mergeIntegrationFeature({ integrationRepository: integration, manifestPath, featureBranch: 'codex/feat/promote-archive-20260831', ownerToken, dryRun: false, now: '2026-08-31T05:40:00.000Z' })
    acceptIntegrationBatch({ integrationRepository: integration, manifestPath, commit: merged.afterCommit, confirmBatchId: '20260831-26', ownerToken, now: '2026-08-31T05:41:00.000Z' })
    fs.mkdirSync(path.join(repository.commonDirectory, 'sherlock-integration', 'history', '20260831-26-promoted-2026-08-31T05-42-00.000Z'), { recursive: true })

    const first = promoteIntegrationBatch({ integrationRepository: integration, manifestPath, mainWorktree: repository.main, confirmBatchId: '20260831-26', confirmTip: merged.afterCommit, ownerToken, dryRun: false, now: '2026-08-31T05:42:00.000Z' })
    expect(first).toMatchObject({ status: 'recovery-required' })
    expect(repository.git(repository.main, 'rev-parse', 'HEAD')).toBe(merged.afterCommit)
    expect(readActiveBatchLease(integration)).toMatchObject({ acceptedTip: merged.afterCommit })

    const retried = promoteIntegrationBatch({ integrationRepository: integration, manifestPath, mainWorktree: repository.main, confirmBatchId: '20260831-26', confirmTip: merged.afterCommit, ownerToken, dryRun: false, now: '2026-08-31T05:43:00.000Z' })
    expect(retried).toMatchObject({ status: 'promoted' })
    expect(readActiveBatchLease(integration)).toBeNull()
  }, 15000)

  const promotionRejectionScenarios = [
      {
        name: 'dirty-promote', batchId: '20260831-27',
        mutate: (repository: GitWorkflowFixture) => repository.write(repository.main, 'src/dirty-promote.ts', 'export const dirty = true\n'),
        mainWorktree: (repository: GitWorkflowFixture, integration: string) => repository.main
      },
      {
        name: 'wrong-main-path', batchId: '20260831-28',
        mutate: () => {},
        mainWorktree: (_repository: GitWorkflowFixture, integration: string) => integration
      },
      {
        name: 'stale-expected-main', batchId: '20260831-29',
        mutate: (repository: GitWorkflowFixture) => { repository.write(repository.main, 'src/stale-main.ts', 'export const stale = true\n'); repository.commit(repository.main, '推进 main') },
        mainWorktree: (repository: GitWorkflowFixture) => repository.main
      },
      {
        name: 'stale-accepted-tip', batchId: '20260831-30',
        mutate: (repository: GitWorkflowFixture, state: ReturnType<typeof acceptedPromotion>) => {
          const leasePath = path.join(repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
          const lease = JSON.parse(readFileSync(leasePath, 'utf8'))
          lease.acceptedTip = '0'.repeat(40)
          writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`, 'utf8')
        },
        mainWorktree: (repository: GitWorkflowFixture) => repository.main
      },
      {
        name: 'stale-accepted-digest', batchId: '20260831-31',
        mutate: (repository: GitWorkflowFixture) => {
          const leasePath = path.join(repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
          const lease = JSON.parse(readFileSync(leasePath, 'utf8'))
          lease.acceptedManifestDigest = 'f'.repeat(64)
          writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`, 'utf8')
        },
        mainWorktree: (repository: GitWorkflowFixture) => repository.main
      },
      {
        name: 'non-ff-history', batchId: '20260831-32',
        mutate: (repository: GitWorkflowFixture, state: ReturnType<typeof acceptedPromotion>) => {
          repository.write(repository.main, 'src/non-ff.ts', 'export const nonFastForward = true\n')
          const mainTip = repository.commit(repository.main, '制造非 fast-forward main')
          const manifest = JSON.parse(readFileSync(state.manifestPath, 'utf8'))
          manifest.expectedMainCommit = mainTip
          writeFileSync(state.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
          const nextTip = repository.commit(state.integration, '记录非快进测试状态')
          const lease = readActiveBatchLease(state.integration)!
          updateActiveBatchTip({ repository: state.integration, ownerToken: state.ownerToken, expectedRevision: lease.revision, expectedTip: lease.currentTip, nextTip, updatedAt: '2026-08-31T06:03:00.000Z' })
          const leasePath = path.join(repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
          const acceptedLease = JSON.parse(readFileSync(leasePath, 'utf8'))
          acceptedLease.acceptedTip = nextTip
          acceptedLease.acceptedManifestDigest = createHash('sha256').update(readFileSync(state.manifestPath)).digest('hex')
          acceptedLease.acceptedAt = '2026-08-31T06:03:01.000Z'
          writeFileSync(leasePath, `${JSON.stringify(acceptedLease, null, 2)}\n`, 'utf8')
          state.tip = nextTip
        },
        mainWorktree: (repository: GitWorkflowFixture) => repository.main
      },
      {
        name: 'missing-feature-ancestor', batchId: '20260831-33',
        mutate: (repository: GitWorkflowFixture, state: ReturnType<typeof acceptedPromotion>) => {
          const listing = repository.git(state.integration, 'worktree', 'list', '--porcelain')
          const featurePath = new RegExp(`worktree ([^\\n]+)\\nHEAD [^\\n]+\\nbranch refs/heads/${state.branch.replaceAll('/', '\\/')}`).exec(listing)?.[1]
          if (!featurePath) throw new Error('missing feature fixture worktree')
          repository.write(featurePath, 'src/feature-advanced.ts', 'export const advancedFeature = true\n')
          repository.commit(featurePath, '移动 feature tip')
        },
        mainWorktree: (repository: GitWorkflowFixture) => repository.main
      }
    ]
  for (const scenario of promotionRejectionScenarios) {
    it(`rejects ${scenario.name} before FF without moving refs, worktrees, files, or leases`, () => {
      const repository = fixture()
      const state = acceptedPromotion(repository, scenario.name, scenario.batchId)
      scenario.mutate(repository, state)
      const before = repository.snapshot()
      expect(() => promoteIntegrationBatch({ integrationRepository: state.integration, manifestPath: state.manifestPath, mainWorktree: scenario.mainWorktree(repository, state.integration), confirmBatchId: scenario.batchId, confirmTip: state.tip, ownerToken: state.ownerToken, dryRun: false, now: '2026-08-31T06:04:00.000Z' })).toThrow()
      expect(repository.snapshot()).toEqual(before)
    }, 10000)
  }

  it('requires explicit matching cancellation and archives only the lease while preserving batch files and refs', () => {
    const repository = fixture()
    prepareIntegrationRoot(repository)
    const handoff = handoffFile(repository, 'cancel')
    const integration = repository.createWorktree('integration-cancel', 'codex/integration/20260831-24')
    adoptIntegrationBatch({ integrationRepository: integration, batchId: '20260831-24', handoffPaths: [handoff], integrationChecks: checks(), dryRun: false, now: '2026-08-31T05:31:00.000Z' })
    const manifestPath = path.join(integration, 'config', 'sherlock-integration-batches', '20260831-24.json')
    repository.write(integration, 'notes/untracked.txt', 'retain me\n')
    const refs = repository.git(integration, 'for-each-ref', '--format=%(refname) %(objectname)')
    const worktrees = repository.git(integration, 'worktree', 'list', '--porcelain')
    const manifest = readFileSync(manifestPath)
    const untracked = readFileSync(path.join(integration, 'notes', 'untracked.txt'))
    const before = repository.snapshot()

    expect(() => cancelIntegrationBatch({ integrationRepository: integration, manifestPath, confirmBatchId: 'wrong-batch', explicitCancellation: true, dryRun: false, now: '2026-08-31T05:32:00.000Z' })).toThrow(/batch|批次/)
    expect(() => cancelIntegrationBatch({ integrationRepository: integration, manifestPath, confirmBatchId: '20260831-24', explicitCancellation: false, dryRun: false, now: '2026-08-31T05:32:00.000Z' })).toThrow(/取消|确认/)
    expect(repository.snapshot()).toEqual(before)

    const cancelled = cancelIntegrationBatch({ integrationRepository: integration, manifestPath, confirmBatchId: '20260831-24', explicitCancellation: true, dryRun: false, now: '2026-08-31T05:33:00.000Z' })
    expect(cancelled).toMatchObject({ status: 'cancelled' })
    expect(readActiveBatchLease(integration)).toBeNull()
    expect(repository.git(integration, 'for-each-ref', '--format=%(refname) %(objectname)')).toBe(refs)
    expect(repository.git(integration, 'worktree', 'list', '--porcelain')).toBe(worktrees)
    expect(readFileSync(manifestPath)).toEqual(manifest)
    expect(readFileSync(path.join(integration, 'notes', 'untracked.txt'))).toEqual(untracked)
  })
})
