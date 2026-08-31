import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { acquireActiveBatchLease } from '../scripts/lib/sherlock-active-batch.mjs'
import { buildFeatureHandoff, createIntegrationBatchManifest } from '../scripts/lib/sherlock-integration-model.mjs'
import {
  assertSharedBuildSourceUnchanged,
  verifySharedBuildSource,
  type SharedSourceSnapshot
} from '../scripts/lib/sherlock-shared-source-gate.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const fixtures: GitWorkflowFixture[] = []

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function digest(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function ownedIntegration(repository: GitWorkflowFixture) {
  const feature = repository.createWorktree('source-feature', 'codex/feat/source-feature-20260831')
  const base = repository.git(feature, 'rev-parse', 'HEAD')
  repository.write(feature, 'src/source-feature.ts', 'export const sourceFeature = true\n')
  const featureTip = repository.commit(feature, '增加构建来源功能')
  const handoff = buildFeatureHandoff({
    repository: feature,
    baseCommit: base,
    metadata: {
      featureName: '构建来源功能',
      checks: [{
        argv: [process.execPath, '-e', 'process.exit(0)'],
        outcome: 'passed',
        summary: 'feature verification',
        verifiedCommit: featureTip,
        completedAt: '2026-08-31T08:00:00.000Z',
        timeoutMs: 1000
      }],
      uiVerification: { outcome: 'not-applicable', summary: 'Git workflow only.' },
      acceptanceCriteria: ['功能引用固定到交接提交'],
      risks: []
    },
    generatedAt: '2026-08-31T08:00:00.000Z'
  })
  const integration = repository.createWorktree('source-integration', 'codex/integration/20260831-01')
  const manifestPath = 'config/sherlock-integration-batches/20260831-01.json'
  const mainTip = repository.git(repository.main, 'rev-parse', 'HEAD')
  const manifest = createIntegrationBatchManifest({
    batchId: '20260831-01',
    branch: 'codex/integration/20260831-01',
    baseMainCommit: mainTip,
    handoffs: [handoff],
    integrationChecks: [],
    createdAt: '2026-08-31T08:00:00.000Z'
  })
  repository.write(integration, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  repository.commit(integration, '集成：创建来源批次清单')
  repository.git(integration, 'merge', '--no-ff', '--no-edit', handoff.branch)
  const currentTip = repository.git(integration, 'rev-parse', 'HEAD')
  const ownerToken = 'source-gate-owner-token'
  const lease = acquireActiveBatchLease({
    repository: integration,
    ownerToken,
    lease: {
      batchId: '20260831-01',
      branch: 'codex/integration/20260831-01',
      manifestPath,
      baseMainCommit: mainTip,
      currentTip,
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z'
    }
  }).lease
  return { integration, ownerToken, lease, manifestPath, feature, featureTip, featureBranch: handoff.branch }
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
})

describe('shared build source gate', () => {
  it('accepts only the canonical clean main worktree and ignores a clean unmerged feature worktree', () => {
    const repository = fixture()
    repository.createWorktree('clean-feature', 'codex/feat/clean-feature-20260831')

    expect(verifySharedBuildSource({ repository: repository.main })).toEqual({
      mode: 'local-main',
      worktreeRoot: repository.main,
      branch: 'main',
      commit: repository.git(repository.main, 'rev-parse', 'HEAD'),
      mainCommit: repository.git(repository.main, 'rev-parse', 'refs/heads/main'),
      sourceClean: true,
      batchId: null,
      manifestPath: null,
      manifestDigest: null,
      features: [],
      leaseRevision: null
    })
  })

  it('accepts an owning integration source only when its lease, tracked manifest, feature refs, and main ancestry remain exact', () => {
    const repository = fixture()
    const state = ownedIntegration(repository)

    expect(verifySharedBuildSource({ repository: state.integration, ownerToken: state.ownerToken })).toEqual({
      mode: 'local-integration',
      worktreeRoot: state.integration,
      branch: state.lease.branch,
      commit: state.lease.currentTip,
      mainCommit: repository.git(repository.main, 'rev-parse', 'refs/heads/main'),
      sourceClean: true,
      batchId: state.lease.batchId,
      manifestPath: state.manifestPath,
      manifestDigest: digest(path.join(state.integration, state.manifestPath)),
      features: [{ branch: state.featureBranch, commit: state.featureTip }],
      leaseRevision: state.lease.revision
    })
  })

  it('blocks main and every non-owning integration source while a lease remains active', () => {
    const repository = fixture()
    const state = ownedIntegration(repository)
    const competing = repository.createWorktree('competing-integration', 'codex/integration/20260831-02')

    expect(() => verifySharedBuildSource({ repository: repository.main })).toThrow(/活动集成租约|租约/)
    expect(() => verifySharedBuildSource({ repository: competing, ownerToken: state.ownerToken })).toThrow(/活动集成租约|租约/)
    expect(() => verifySharedBuildSource({ repository: state.integration })).toThrow(/ownerToken|owner|令牌/)
    expect(() => verifySharedBuildSource({ repository: state.integration, ownerToken: 'wrong-token' })).toThrow(/owner|令牌|不匹配/)
  })

  it('rejects changed source dirt, feature refs, and local main ancestry for an active integration source', () => {
    const dirtyRepository = fixture()
    const dirty = ownedIntegration(dirtyRepository)
    dirtyRepository.write(dirty.integration, 'src/uncommitted.ts', 'export const dirty = true\n')
    expect(() => verifySharedBuildSource({ repository: dirty.integration, ownerToken: dirty.ownerToken })).toThrow(/未提交源码改动/)

    const movedRepository = fixture()
    const moved = ownedIntegration(movedRepository)
    movedRepository.write(moved.feature, 'src/moved.ts', 'export const moved = true\n')
    movedRepository.commit(moved.feature, '移动功能引用')
    expect(() => verifySharedBuildSource({ repository: moved.integration, ownerToken: moved.ownerToken })).toThrow(/功能分支引用/)

    const mainRepository = fixture()
    const mainAdvanced = ownedIntegration(mainRepository)
    mainRepository.write(mainRepository.main, 'main-advanced.txt', 'advance\n')
    mainRepository.commit(mainRepository.main, '推进 main')
    expect(() => verifySharedBuildSource({ repository: mainAdvanced.integration, ownerToken: mainAdvanced.ownerToken })).toThrow(/local main.*祖先/)
  })

  it('reports the first changed scalar or ordered feature entry with before and after values', () => {
    const before: SharedSourceSnapshot = {
      mode: 'local-integration',
      worktreeRoot: '/tmp/integration',
      branch: 'codex/integration/20260831-01',
      commit: 'a'.repeat(40),
      mainCommit: 'b'.repeat(40),
      sourceClean: true,
      batchId: '20260831-01',
      manifestPath: 'config/sherlock-integration-batches/20260831-01.json',
      manifestDigest: 'c'.repeat(64),
      features: [{ branch: 'codex/feat/one-20260831', commit: 'd'.repeat(40) }],
      leaseRevision: 1
    }
    const after = { ...before, features: [{ branch: 'codex/feat/one-20260831', commit: 'e'.repeat(40) }] }

    expect(() => assertSharedBuildSourceUnchanged(before, after)).toThrow(/features\[0\]\.commit.*d{40}.*e{40}/)
  })

  it('detects HEAD, manifest, lease, and ordered feature snapshot changes', () => {
    const before: SharedSourceSnapshot = {
      mode: 'local-main',
      worktreeRoot: '/tmp/main',
      branch: 'main',
      commit: 'a'.repeat(40),
      mainCommit: 'a'.repeat(40),
      sourceClean: true,
      batchId: null,
      manifestPath: null,
      manifestDigest: null,
      features: [],
      leaseRevision: null
    }
    const changes: Array<[string, SharedSourceSnapshot]> = [
      ['mode', { ...before, mode: 'local-integration' }],
      ['worktreeRoot', { ...before, worktreeRoot: '/tmp/other' }],
      ['branch', { ...before, branch: 'codex/integration/20260831-01' }],
      ['commit', { ...before, commit: 'b'.repeat(40) }], // HEAD or lease currentTip movement
      ['mainCommit', { ...before, mainCommit: 'b'.repeat(40) }],
      ['batchId', { ...before, batchId: '20260831-01' }],
      ['manifestPath', { ...before, manifestPath: 'config/sherlock-integration-batches/20260831-01.json' }],
      ['manifestDigest', { ...before, manifestDigest: 'b'.repeat(64) }], // raw-byte manifest edit
      ['leaseRevision', { ...before, leaseRevision: 2 }], // lease CAS revision change
      ['features[0]', { ...before, features: [{ branch: 'codex/feat/one-20260831', commit: 'b'.repeat(40) }] }]
    ]

    for (const [field, after] of changes) {
      expect(() => assertSharedBuildSourceUnchanged(before, after)).toThrow(new RegExp(field.replaceAll('[', '\\[').replaceAll(']', '\\]')))
    }
  })
})
