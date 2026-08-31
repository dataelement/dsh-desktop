import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildFeatureHandoff,
  createIntegrationBatchManifest,
  validateIntegrationBatchManifest
} from '../scripts/lib/sherlock-integration-model.mjs'
import type { FeatureHandoff } from '../scripts/lib/sherlock-integration-model.mjs'
import { preflightIntegrationAction } from '../scripts/lib/sherlock-integration-preflight.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const projectRoot = path.resolve(import.meta.dirname, '..')
const preflightCli = path.join(projectRoot, 'scripts', 'verify-sherlock-integration.mjs')
const fixtures: GitWorkflowFixture[] = []

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function metadata(tipCommit: string) {
  return {
    featureName: '集成批次验证',
    checks: [{
      argv: ['npx', 'vitest', 'run', 'test/integration-batch.test.ts'],
      outcome: 'passed' as const,
      summary: 'feature handoff check',
      verifiedCommit: tipCommit,
      completedAt: '2026-08-31T03:00:00.000Z',
      timeoutMs: 120000
    }],
    uiVerification: { outcome: 'not-applicable' as const, summary: 'Git workflow tooling has no client UI.' },
    acceptanceCriteria: ['功能历史与文件清单匹配 live Git 状态'],
    risks: ['feature ref must remain pinned'],
  }
}

function createFeature(repository: GitWorkflowFixture, name: string) {
  const feature = repository.createWorktree(name, `codex/feat/${name}-20260831`)
  const base = repository.git(feature, 'rev-parse', 'HEAD')
  repository.write(feature, `src/${name}-one.ts`, 'export const one = true\n')
  const first = repository.commit(feature, '增加第一项功能')
  repository.write(feature, `src/${name}-two.ts`, 'export const two = true\n')
  const tip = repository.commit(feature, '增加第二项功能')
  const handoff = buildFeatureHandoff({
    repository: feature,
    baseCommit: base,
    metadata: metadata(tip),
    generatedAt: '2026-08-31T03:01:00.000Z'
  })
  return { feature, base, first, tip, handoff }
}

function writeManifest(repository: GitWorkflowFixture, value: unknown): string {
  const manifestPath = path.join(repository.root, 'batch.json')
  writeFileSync(manifestPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return manifestPath
}

function preflightWithoutMutation(options: Parameters<typeof preflightIntegrationAction>[0], repository: GitWorkflowFixture) {
  const before = repository.snapshot()
  const report = preflightIntegrationAction(options)
  expect(repository.snapshot().equals(before)).toBe(true)
  return report
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
})

describe('tracked integration batch manifests and read-only preflight', () => {
  it('requires an exact batch identity, exact derived branch, unique feature tips, acceptance criteria, safe paths, argv arrays, and full SHAs', () => {
    const tip = 'b'.repeat(40)
    const handoff: FeatureHandoff = {
      schemaVersion: 1,
      featureName: '静态功能',
      branch: 'codex/feat/static-20260831',
      baseCommit: 'a'.repeat(40),
      tipCommit: tip,
      commits: [{ commit: tip, parents: ['a'.repeat(40)], subject: '功能提交' }],
      files: [{ status: 'M', path: 'src/static.ts' }],
      checks: [{ argv: ['npm', 'run', 'typecheck'], outcome: 'passed', summary: 'typecheck', verifiedCommit: tip, completedAt: '2026-08-31T03:00:00.000Z', timeoutMs: 120000 }],
      uiVerification: { outcome: 'not-applicable', summary: 'no UI' },
      acceptanceCriteria: ['可追溯'],
      risks: [],
      generatedAt: '2026-08-31T03:00:00.000Z'
    }
    const manifest = createIntegrationBatchManifest({
      batchId: '20260831-01',
      branch: 'codex/integration/20260831-01',
      baseMainCommit: 'a'.repeat(40),
      handoffs: [handoff],
      integrationChecks: [{ argv: ['npx', 'vitest', 'run', 'test/integration-batch.test.ts'], timeoutMs: 120000 }],
      createdAt: '2026-08-31T03:02:00.000Z'
    })

    expect(manifest).toMatchObject({ batchId: '20260831-01', branch: 'codex/integration/20260831-01', expectedMainCommit: 'a'.repeat(40) })
    expect(() => validateIntegrationBatchManifest({ ...manifest, batchId: '20260831-1' })).toThrow(/batchId|批次/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, branch: 'codex/integration/20260831-02' })).toThrow(/branch|分支/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, features: [{ handoff }, { handoff }] })).toThrow(/重复|unique|branch|tip/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, features: [{ handoff: { ...handoff, acceptanceCriteria: [] } }] })).toThrow(/acceptance|验收|非空/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, features: [{ handoff: { ...handoff, files: [{ status: 'M', path: '../outside.ts' }] } }] })).toThrow(/路径|path/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, integrationChecks: [{ argv: 'npm test', timeoutMs: 120000 }] })).toThrow(/argv|参数/)
    expect(() => validateIntegrationBatchManifest({ ...manifest, expectedMainCommit: 'A'.repeat(40) })).toThrow(/SHA|提交/)
  })

  it('collects moved-ref, dirty-worktree, undeclared-history, stale-evidence, partial-merge, and ancestry findings without mutating the fixture', () => {
    const repository = fixture()
    const { feature, base, first, handoff } = createFeature(repository, 'preflight')
    const integration = repository.createWorktree('integration', 'codex/integration/20260831-01')
    repository.git(integration, 'cherry-pick', first)
    repository.write(feature, 'src/uncommitted.ts', 'export const dirtyAgain = true\n')
    repository.write(feature, 'src/third.ts', 'export const moved = true\n')
    repository.commit(feature, '移动功能引用')
    repository.write(feature, 'src/uncommitted.ts', 'export const dirty = true\n')
    const unrelated = repository.createWorktree('unrelated', 'codex/feat/unrelated-20260831')
    repository.write(unrelated, 'src/unrelated.ts', 'export const unrelated = true\n')
    const unrelatedBase = repository.commit(unrelated, '无关基准')
    const staleAndUnrelated = {
      ...handoff,
      baseCommit: unrelatedBase,
      commits: handoff.commits.map((commit, index) => index === 0 ? { ...commit, parents: [unrelatedBase] } : commit),
      checks: handoff.checks.map((check) => ({ ...check, verifiedCommit: handoff.tipCommit }))
    }
    const manifest = createIntegrationBatchManifest({
      batchId: '20260831-01',
      branch: 'codex/integration/20260831-01',
      baseMainCommit: base,
      handoffs: [staleAndUnrelated],
      integrationChecks: [{ argv: ['npm', 'run', 'typecheck'], timeoutMs: 120000 }],
      createdAt: '2026-08-31T03:02:00.000Z'
    })
    const report = preflightWithoutMutation({ repository: integration, phase: 'merge', manifestPath: writeManifest(repository, manifest), featureBranch: handoff.branch }, repository)
    const codes = report.findings.map((finding) => finding.code)

    expect(report.ok).toBe(false)
    expect(codes).toEqual(expect.arrayContaining([
      'feature-ref-moved',
      'feature-worktree-dirty',
      'feature-history-mismatch',
      'feature-check-stale',
      'feature-base-not-ancestor',
      'feature-partially-merged'
    ]))
  })

  it('reports a fully merged feature as idempotent information and emits one JSON report or a stable human result token', () => {
    const repository = fixture()
    const { base, handoff } = createFeature(repository, 'merged')
    const integration = repository.createWorktree('integration-merged', 'codex/integration/20260831-02')
    repository.git(integration, 'merge', '--no-ff', '--no-edit', handoff.branch)
    const manifest = createIntegrationBatchManifest({
      batchId: '20260831-02',
      branch: 'codex/integration/20260831-02',
      baseMainCommit: base,
      handoffs: [handoff],
      integrationChecks: [{ argv: ['npm', 'run', 'typecheck'], timeoutMs: 120000 }],
      createdAt: '2026-08-31T03:02:00.000Z'
    })
    const manifestPath = writeManifest(repository, manifest)
    const report = preflightWithoutMutation({ repository: integration, phase: 'merge', manifestPath, featureBranch: handoff.branch }, repository)

    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'feature-already-merged', severity: 'info' })
    ]))
    const before = repository.snapshot()
    const json = spawnSync(process.execPath, [preflightCli, '--repo', integration, '--phase', 'merge', '--manifest', manifestPath, '--feature', handoff.branch, '--json'], { cwd: projectRoot, encoding: 'utf8' })
    expect(repository.snapshot().equals(before)).toBe(true)
    expect(json.status).toBe(0)
    expect(json.stderr).toBe('')
    expect(JSON.parse(json.stdout)).toMatchObject({ schemaVersion: 1, phase: 'merge' })
    const textBefore = repository.snapshot()
    const text = spawnSync(process.execPath, [preflightCli, '--repo', integration, '--phase', 'merge', '--manifest', manifestPath, '--feature', handoff.branch], { cwd: projectRoot, encoding: 'utf8' })
    expect(repository.snapshot().equals(textBefore)).toBe(true)
    expect(text.stdout).toMatch(/^PREFLIGHT (PASSED|BLOCKED)\b/)
    expect(text.stderr).toBe('')
    const invalidPhase = spawnSync(process.execPath, [preflightCli, '--repo', integration, '--phase', 'invalid', '--json'], { cwd: projectRoot, encoding: 'utf8' })
    expect(invalidPhase.status).toBe(2)
    expect(invalidPhase.stdout).toBe('')
    expect(invalidPhase.stderr).toMatch(/phase|阶段/)
  })

  it('fails closed with distinct phase actions when each of the eight phases lacks or receives a forbidden prerequisite', () => {
    const repository = fixture()
    const { base, handoff } = createFeature(repository, 'phase-gates')
    const integration = repository.createWorktree('integration-phase-gates', 'codex/integration/20260831-03')
    const manifest = createIntegrationBatchManifest({
      batchId: '20260831-03',
      branch: 'codex/integration/20260831-03',
      baseMainCommit: base,
      handoffs: [handoff],
      integrationChecks: [{ argv: ['npm', 'run', 'typecheck'], timeoutMs: 120000 }],
      createdAt: '2026-08-31T03:02:00.000Z'
    })
    const manifestPath = writeManifest(repository, manifest)
    const cases: Array<{
      phase: Parameters<typeof preflightIntegrationAction>[0]['phase']
      options: Omit<Parameters<typeof preflightIntegrationAction>[0], 'repository' | 'phase'>
      action: string
      finding: string
    }> = [
      { phase: 'prepare', options: { manifestPath }, action: 'prepare-batch', finding: 'phase-input-forbidden' },
      { phase: 'merge', options: { manifestPath }, action: 'merge-feature', finding: 'phase-input-required' },
      { phase: 'continue', options: { manifestPath }, action: 'continue-merge', finding: 'phase-input-required' },
      { phase: 'recover-owner', options: { manifestPath }, action: 'recover-owner', finding: 'phase-input-required' },
      { phase: 'sync-main', options: { manifestPath }, action: 'synchronize-main', finding: 'phase-input-required' },
      { phase: 'accept', options: { manifestPath }, action: 'accept-batch', finding: 'phase-input-required' },
      { phase: 'promote', options: { manifestPath }, action: 'promote-fast-forward', finding: 'phase-input-required' },
      { phase: 'cancel', options: { manifestPath, featureBranch: handoff.branch }, action: 'cancel-batch', finding: 'phase-input-forbidden' }
    ]

    const actionKinds = new Set<string>()
    for (const testCase of cases) {
      const before = repository.snapshot()
      const report = preflightIntegrationAction({ repository: integration, phase: testCase.phase, ...testCase.options })
      expect(repository.snapshot().equals(before)).toBe(true)
      expect(report.ok).toBe(false)
      expect(report.plannedActions).toEqual([
        expect.objectContaining({ kind: testCase.action })
      ])
      expect(report.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: testCase.finding, severity: 'error' })
      ]))
      actionKinds.add(report.plannedActions[0]!.kind)
    }
    expect(actionKinds.size).toBe(8)
  })

  it('rejects fabricated merged records for accept and promote when the feature is not integrated', () => {
    const repository = fixture()
    const { base, handoff } = createFeature(repository, 'fabricated-merged')
    const integration = repository.createWorktree('integration-fabricated-merged', 'codex/integration/20260831-04')
    const fakeMergeCommit = 'c'.repeat(40)
    const fakeVerificationCommit = 'd'.repeat(40)
    const manifest = {
      ...createIntegrationBatchManifest({
        batchId: '20260831-04',
        branch: 'codex/integration/20260831-04',
        baseMainCommit: base,
        handoffs: [handoff],
        integrationChecks: [{ argv: ['npm', 'run', 'typecheck'], timeoutMs: 120000 }],
        createdAt: '2026-08-31T03:02:00.000Z'
      }),
      features: [{
        handoff,
        merged: {
          mergeCommit: fakeMergeCommit,
          verificationCommit: fakeVerificationCommit,
          checks: [{
            argv: ['npm', 'run', 'typecheck'],
            outcome: 'passed',
            summary: 'fabricated evidence',
            verifiedCommit: fakeVerificationCommit,
            completedAt: '2026-08-31T03:03:00.000Z',
            timeoutMs: 120000
          }],
          recordedAt: '2026-08-31T03:03:00.000Z'
        }
      }]
    }
    const manifestPath = writeManifest(repository, manifest)
    const integrationHead = repository.git(integration, 'rev-parse', 'HEAD')
    const cases: Array<{
      phase: 'accept' | 'promote'
      options: Omit<Parameters<typeof preflightIntegrationAction>[0], 'repository' | 'phase'>
    }> = [
      { phase: 'accept', options: { manifestPath, expectedAcceptedTip: integrationHead } },
      { phase: 'promote', options: { manifestPath, mainWorktree: repository.main, expectedAcceptedTip: integrationHead } }
    ]

    for (const testCase of cases) {
      const before = repository.snapshot()
      const report = preflightIntegrationAction({ repository: integration, phase: testCase.phase, ...testCase.options })
      expect(repository.snapshot().equals(before)).toBe(true)
      expect(report.ok).toBe(false)
      expect(report.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'merged-merge-commit-unresolved', severity: 'error' }),
        expect.objectContaining({ code: 'merged-verification-commit-unresolved', severity: 'error' }),
        expect.objectContaining({ code: 'merged-live-feature-not-integrated', severity: 'error' })
      ]))
    }
  })
})
