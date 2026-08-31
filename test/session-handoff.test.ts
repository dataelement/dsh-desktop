import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildFeatureHandoff,
  validateFeatureHandoff
} from '../scripts/lib/sherlock-integration-model.mjs'
import { listRangeCommits } from '../scripts/lib/sherlock-git-state.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const projectRoot = path.resolve(import.meta.dirname, '..')
const handoffCli = path.join(projectRoot, 'scripts', 'create-sherlock-session-handoff.mjs')
const fixtures: GitWorkflowFixture[] = []

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function metadata(tipCommit: string) {
  return {
    featureName: '会话交接卡',
    checks: [
      {
        argv: ['npx', 'vitest', 'run', 'test/session-handoff.test.ts'],
        outcome: 'passed',
        summary: 'handoff contract',
        verifiedCommit: tipCommit,
        completedAt: '2026-08-31T01:02:03.000Z',
        timeoutMs: 120000
      },
      {
        argv: ['npm', 'run', 'typecheck'],
        outcome: 'passed',
        summary: 'type declarations',
        verifiedCommit: tipCommit,
        completedAt: '2026-08-31T01:03:04.000Z',
        timeoutMs: 120000
      }
    ],
    uiVerification: { outcome: 'not-applicable', summary: 'Git workflow tooling has no client UI.' },
    acceptanceCriteria: ['完整提交历史可追溯', '验证证据绑定当前提交'],
    risks: ['依赖 feature 分支引用保持不变'],
    generatedAt: '2026-08-31T01:04:05.000Z'
  }
}

function handoffValue(tipCommit: string) {
  return {
    schemaVersion: 1,
    featureName: '会话交接卡',
    branch: 'codex/feat/handoff-card-20260831',
    baseCommit: 'a'.repeat(40),
    tipCommit,
    commits: [{ commit: tipCommit, parents: ['a'.repeat(40)], subject: '增加交接卡' }],
    files: [{ status: 'M', path: 'src/session.ts' }],
    checks: metadata(tipCommit).checks,
    uiVerification: metadata(tipCommit).uiVerification,
    acceptanceCriteria: metadata(tipCommit).acceptanceCriteria,
    risks: metadata(tipCommit).risks,
    generatedAt: '2026-08-31T01:04:05.000Z'
  }
}

function commitWithTimestamp(repository: string, message: string, timestamp: string): string {
  execFileSync('git', ['-C', repository, 'add', '-A'], { encoding: 'utf8' })
  execFileSync('git', ['-C', repository, 'commit', '-m', message], {
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: timestamp, GIT_COMMITTER_DATE: timestamp }
  })
  return execFileSync('git', ['-C', repository, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
})

describe('feature session handoffs', () => {
  it('builds a deterministic card for the exact branch with ordered commits, rename records, and check argv', () => {
    const repository = fixture()
    repository.write(repository.main, 'src/original.ts', 'export const original = true\n')
    repository.commit(repository.main, '添加待重命名源码')
    const feature = repository.createWorktree('handoff-card', 'codex/feat/handoff-card-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/first.ts', 'export const first = true\n')
    const first = repository.commit(feature, '增加交接卡源码')
    repository.git(feature, 'mv', 'src/original.ts', 'src/renamed.ts')
    repository.write(feature, 'src/second.ts', 'export const second = true\n')
    const tip = repository.commit(feature, '重命名交接卡源码')

    const firstCard = buildFeatureHandoff({
      repository: feature,
      baseCommit: base,
      metadata: metadata(tip),
      generatedAt: '2026-08-31T01:04:05.000Z'
    })
    const secondCard = buildFeatureHandoff({
      repository: feature,
      baseCommit: base,
      metadata: metadata(tip),
      generatedAt: '2026-08-31T01:04:05.000Z'
    })

    expect(firstCard).toEqual(secondCard)
    expect(firstCard).toMatchObject({
      branch: 'codex/feat/handoff-card-20260831',
      baseCommit: base,
      tipCommit: tip,
      commits: [
        { commit: first, parents: [base], subject: '增加交接卡源码' },
        { commit: tip, parents: [first], subject: '重命名交接卡源码' }
      ],
      checks: metadata(tip).checks
    })
    expect(firstCard.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: expect.stringMatching(/^R/), previousPath: 'src/original.ts', path: 'src/renamed.ts' }),
        { status: 'A', path: 'src/second.ts' }
      ])
    )
    expect(firstCard.commits.every((commit) => /^[0-9a-f]{40}$/.test(commit.commit))).toBe(true)
  })

  it('rejects source-dirty, detached, non-feature, non-ancestral, and empty feature ranges', () => {
    const repository = fixture()
    const feature = repository.createWorktree('handoff-rejections', 'codex/feat/handoff-rejections-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/feature.ts', 'export const value = true\n')
    const tip = repository.commit(feature, '增加功能')
    const options = { repository: feature, baseCommit: base, metadata: metadata(tip), generatedAt: '2026-08-31T01:04:05.000Z' }

    repository.write(feature, 'src/dirty.ts', 'dirty\n')
    expect(() => buildFeatureHandoff(options)).toThrow(/未提交|clean|干净/)

    const detachedRepository = fixture()
    const detachedFeature = detachedRepository.createWorktree('handoff-detached', 'codex/feat/handoff-detached-20260831')
    const detachedBase = detachedRepository.git(detachedFeature, 'rev-parse', 'HEAD')
    detachedRepository.write(detachedFeature, 'src/feature.ts', 'export const value = true\n')
    const detachedTip = detachedRepository.commit(detachedFeature, '增加功能')
    const detachedOptions = { repository: detachedFeature, baseCommit: detachedBase, metadata: metadata(detachedTip), generatedAt: '2026-08-31T01:04:05.000Z' }

    detachedRepository.git(detachedFeature, 'switch', '--detach')
    expect(() => buildFeatureHandoff(detachedOptions)).toThrow(/feature|分支|branch/)

    const wrongBranchRepository = fixture()
    const wrongBranch = wrongBranchRepository.createWorktree('handoff-wrong-branch', 'codex/not-a-feature')
    const wrongBase = wrongBranchRepository.git(wrongBranch, 'rev-parse', 'HEAD')
    wrongBranchRepository.write(wrongBranch, 'src/feature.ts', 'export const value = true\n')
    const wrongTip = wrongBranchRepository.commit(wrongBranch, '增加功能')
    expect(() => buildFeatureHandoff({ repository: wrongBranch, baseCommit: wrongBase, metadata: metadata(wrongTip), generatedAt: '2026-08-31T01:04:05.000Z' })).toThrow(/feature|分支|branch/)

    const validRepository = fixture()
    const validFeature = validRepository.createWorktree('handoff-range', 'codex/feat/handoff-range-20260831')
    const validBase = validRepository.git(validFeature, 'rev-parse', 'HEAD')
    validRepository.write(validFeature, 'src/feature.ts', 'export const value = true\n')
    const validTip = validRepository.commit(validFeature, '增加功能')
    const validOptions = { repository: validFeature, baseCommit: validBase, metadata: metadata(validTip), generatedAt: '2026-08-31T01:04:05.000Z' }
    expect(() => buildFeatureHandoff({ ...validOptions, baseCommit: validTip })).toThrow(/范围|range|empty|提交/)
    const unrelatedFeature = validRepository.createWorktree('handoff-unrelated', 'codex/feat/handoff-unrelated-20260831')
    validRepository.write(unrelatedFeature, 'src/unrelated.ts', 'export const unrelated = true\n')
    const unrelatedBase = validRepository.commit(unrelatedFeature, '增加无关提交')
    expect(() => buildFeatureHandoff({ ...validOptions, baseCommit: unrelatedBase })).toThrow(/祖先|ancestor|base/)
  })

  it('rejects check evidence from another tip, command strings, unsafe paths, and duplicate commits', () => {
    const tip = 'b'.repeat(40)
    const value = handoffValue(tip)

    expect(() => validateFeatureHandoff({ ...value, checks: [{ ...value.checks[0], verifiedCommit: 'c'.repeat(40) }] })).toThrow(/verifiedCommit|提交/)
    expect(() => validateFeatureHandoff({ ...value, checks: [{ ...value.checks[0], argv: 'npm test' }] })).toThrow(/argv|命令/)
    for (const unsafePath of ['/absolute.ts', '../outside.ts', 'src/../outside.ts', '', 'src\u0000bad.ts', 'src//double.ts']) {
      expect(() => validateFeatureHandoff({ ...value, files: [{ status: 'M', path: unsafePath }] })).toThrow(/路径|path/)
    }
    expect(() => validateFeatureHandoff({ ...value, files: [{ status: 'R100', path: 'src/new.ts', previousPath: '../old.ts' }] })).toThrow(/路径|path/)
    expect(() => validateFeatureHandoff({ ...value, commits: [value.commits[0], value.commits[0]] })).toThrow(/重复|duplicate|提交/)
    expect(() => validateFeatureHandoff({
      ...value,
      commits: [
        { commit: tip, parents: ['a'.repeat(40)], subject: 'tip before parent' },
        { commit: 'd'.repeat(40), parents: ['a'.repeat(40)], subject: 'wrong final commit' }
      ]
    })).toThrow(/范围顺序|tipCommit|提交/)
  })

  it('rejects reordered, mutated, and disconnected commit topology', () => {
    const repository = fixture()
    const feature = repository.createWorktree('handoff-topology', 'codex/feat/handoff-topology-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/one.ts', 'export const one = true\n')
    const first = repository.commit(feature, '第一个提交')
    repository.write(feature, 'src/two.ts', 'export const two = true\n')
    const second = repository.commit(feature, '第二个提交')
    repository.write(feature, 'src/three.ts', 'export const three = true\n')
    const tip = repository.commit(feature, '第三个提交')
    const card = buildFeatureHandoff({ repository: feature, baseCommit: base, metadata: metadata(tip), generatedAt: '2026-08-31T01:04:05.000Z' })

    expect(() => validateFeatureHandoff({ ...card, commits: [card.commits[1], card.commits[0], card.commits[2]] })).toThrow(/拓扑|父提交|顺序/)
    expect(() => validateFeatureHandoff({
      ...card,
      commits: card.commits.map((commit) => commit.commit === second ? { ...commit, parents: ['f'.repeat(40)] } : commit)
    })).toThrow(/父提交|拓扑|范围|孤立/)
    expect(() => validateFeatureHandoff({
      ...card,
      commits: [
        { commit: 'e'.repeat(40), parents: [base], subject: '孤立提交' },
        ...card.commits
      ]
    })).toThrow(/孤立|拓扑|范围/)
    expect(first).not.toBe(second)
  })

  it('keeps merge parents before their skewed-timestamp merge child', () => {
    const repository = fixture()
    const feature = repository.createWorktree('handoff-merge', 'codex/feat/handoff-merge-20260831')
    const side = repository.createWorktree('handoff-side', 'codex/feat/handoff-side-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/feature.ts', 'export const feature = true\n')
    const featureCommit = commitWithTimestamp(feature, '未来的功能提交', '2030-01-01T00:00:00 +0000')
    repository.write(side, 'src/side.ts', 'export const side = true\n')
    const sideCommit = commitWithTimestamp(side, '过去的分支提交', '2000-01-01T00:00:00 +0000')
    execFileSync('git', ['-C', feature, 'merge', '--no-ff', '--no-edit', 'codex/feat/handoff-side-20260831'], {
      encoding: 'utf8',
      env: { ...process.env, GIT_AUTHOR_DATE: '2010-01-01T00:00:00 +0000', GIT_COMMITTER_DATE: '2010-01-01T00:00:00 +0000' }
    })
    const tip = repository.git(feature, 'rev-parse', 'HEAD')
    const card = buildFeatureHandoff({ repository: feature, baseCommit: base, metadata: metadata(tip), generatedAt: '2026-08-31T01:04:05.000Z' })
    const positions = new Map(card.commits.map((commit, index) => [commit.commit, index]))

    expect(card.commits).toEqual(listRangeCommits(feature, base, tip))
    expect(positions.get(featureCommit)).toBeLessThan(positions.get(tip)!)
    expect(positions.get(sideCommit)).toBeLessThan(positions.get(tip)!)
    for (const commit of card.commits) {
      for (const parent of commit.parents) {
        if (positions.has(parent)) expect(positions.get(parent)).toBeLessThan(positions.get(commit.commit)!)
      }
    }
  })

  it('rejects extra schema keys, portable-unsafe paths, fabricated status records, and unsafe check shapes', () => {
    const tip = 'b'.repeat(40)
    const value = handoffValue(tip)

    expect(() => validateFeatureHandoff({ ...value, injected: true })).toThrow(/未知字段|字段/)
    expect(() => validateFeatureHandoff({ ...value, commits: [{ ...value.commits[0], extra: true }] })).toThrow(/未知字段|字段/)
    expect(() => validateFeatureHandoff({ ...value, files: [{ ...value.files[0], extra: true }] })).toThrow(/未知字段|字段/)
    expect(() => validateFeatureHandoff({ ...value, checks: [{ ...value.checks[0], extra: true }] })).toThrow(/未知字段|字段/)
    expect(() => validateFeatureHandoff({ ...value, uiVerification: { ...value.uiVerification, extra: true } })).toThrow(/未知字段|字段/)
    for (const unsafePath of ['..\\outside.ts', 'C:outside.ts', 'src\\portable.ts']) {
      expect(() => validateFeatureHandoff({ ...value, files: [{ status: 'M', path: unsafePath }] })).toThrow(/路径|path/)
    }
    expect(() => validateFeatureHandoff({ ...value, files: [{ status: 'R101', path: 'src/new.ts', previousPath: 'src/old.ts' }] })).toThrow(/status|状态/)
    for (const status of ['R', 'C']) {
      expect(() => validateFeatureHandoff({ ...value, files: [{ status, path: 'src/new.ts', previousPath: 'src/old.ts' }] })).toThrow(/status|状态/)
    }
    expect(() => validateFeatureHandoff({ ...value, files: [{ status: 'M', path: 'src/file.ts', previousPath: 'src/old.ts' }] })).toThrow(/previousPath|路径/)
    expect(() => validateFeatureHandoff({ ...value, checks: [{ ...value.checks[0], argv: ['npm', 'run\u0000typecheck'] }] })).toThrow(/argv|参数/)
    expect(() => validateFeatureHandoff({ ...value, checks: [{ ...value.checks[0], command: 'npm test' }] })).toThrow(/未知字段|command|字段/)
    expect(validateFeatureHandoff({ ...value, files: [{ status: 'C100', path: 'src/copied.ts', previousPath: 'src/source.ts' }] }).files).toEqual([
      { status: 'C100', path: 'src/copied.ts', previousPath: 'src/source.ts' }
    ])
    for (const status of ['R0', 'R100', 'C0', 'C100']) {
      expect(validateFeatureHandoff({ ...value, files: [{ status, path: 'src/new.ts', previousPath: 'src/old.ts' }] }).files).toEqual([
        { status, path: 'src/new.ts', previousPath: 'src/old.ts' }
      ])
    }
  })

  it('fails closed when metadata access dirties the feature worktree after the initial status check', () => {
    const repository = fixture()
    const feature = repository.createWorktree('handoff-toctou', 'codex/feat/handoff-toctou-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/feature.ts', 'export const value = true\n')
    const tip = repository.commit(feature, '增加功能')
    const raceMetadata = metadata(tip)
    Object.defineProperty(raceMetadata, 'risks', {
      enumerable: true,
      get() {
        repository.write(feature, 'src/dirtied-during-build.ts', 'export const race = true\n')
        return ['metadata access dirtied the worktree']
      }
    })

    expect(() => buildFeatureHandoff({ repository: feature, baseCommit: base, metadata: raceMetadata, generatedAt: '2026-08-31T01:04:05.000Z' })).toThrow(/未提交|clean|干净/)
  })

  it('writes only an idempotent default card and never overwrites differing content', () => {
    const repository = fixture()
    const feature = repository.createWorktree('handoff-cli', 'codex/feat/handoff-cli-20260831')
    const base = repository.git(feature, 'rev-parse', 'HEAD')
    repository.write(feature, 'src/cli.ts', 'export const cli = true\n')
    const tip = repository.commit(feature, '增加交接命令')
    const metadataPath = path.join(repository.root, 'metadata.json')
    writeFileSync(metadataPath, `${JSON.stringify(metadata(tip))}\n`, 'utf8')
    const expectedPath = path.join(
      repository.commonDirectory,
      'sherlock-integration',
      'handoffs',
      `codex-feat-handoff-cli-20260831-${tip.slice(0, 12)}.json`
    )
    const argv = [handoffCli, '--repo', feature, '--base', base, '--metadata', metadataPath, '--format', 'json']

    const initial = spawnSync(process.execPath, argv, { cwd: projectRoot, encoding: 'utf8' })
    const repeated = spawnSync(process.execPath, argv, { cwd: projectRoot, encoding: 'utf8' })

    expect(initial.status).toBe(0)
    expect(initial.stderr).toBe('')
    expect(JSON.parse(initial.stdout)).toMatchObject({ tipCommit: tip })
    expect(existsSync(expectedPath)).toBe(true)
    expect(readFileSync(expectedPath, 'utf8')).toBe(initial.stdout)
    expect(repeated.status).toBe(0)
    expect(readFileSync(expectedPath, 'utf8')).toBe(initial.stdout)

    writeFileSync(expectedPath, '{"different":true}\n', 'utf8')
    const conflict = spawnSync(process.execPath, argv, { cwd: projectRoot, encoding: 'utf8' })
    expect(conflict.status).not.toBe(0)
    expect(conflict.stdout).toBe('')
    expect(conflict.stderr).toMatch(/覆盖|already exists|不同/)
    expect(readFileSync(expectedPath, 'utf8')).toBe('{"different":true}\n')
  })
})
