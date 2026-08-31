import fs, { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildFeatureHandoff } from '../scripts/lib/sherlock-integration-model.mjs'
import { acquireActiveBatchLease, readActiveBatchLease } from '../scripts/lib/sherlock-active-batch.mjs'
import { resolveRepositoryContext } from '../scripts/lib/sherlock-git-state.mjs'
import {
  adoptIntegrationBatch,
  createIntegrationBatch
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
})
