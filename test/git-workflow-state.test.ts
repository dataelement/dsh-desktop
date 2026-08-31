import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  diffNameStatus,
  isAncestor,
  listRangeCommits,
  listRegisteredWorktrees,
  readRepositoryStatus,
  resolveCommit,
  resolveRepositoryContext,
  runGit
} from '../scripts/lib/sherlock-git-state.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const projectRoot = path.resolve(import.meta.dirname, '..')
const vitestExecutable = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')
const scratchDirectories: string[] = []
const fixtures: GitWorkflowFixture[] = []

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
  for (const directory of scratchDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('shared Git workflow state', () => {
  it('resolves linked worktree and common-directory paths as absolute paths', () => {
    const repository = fixture()
    const linkedWorktree = repository.createWorktree('linked-space', 'codex/linked-space')

    const context = resolveRepositoryContext(linkedWorktree)
    const worktrees = listRegisteredWorktrees(linkedWorktree)

    expect(context.worktreeRoot).toBe(linkedWorktree)
    expect(context.commonDirectory).toBe(repository.commonDirectory)
    expect(context.gitDirectory).not.toBe(context.commonDirectory)
    expect(context.linkedWorktree).toBe(true)
    expect(worktrees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: repository.main, branch: 'main' }),
        expect.objectContaining({ path: linkedWorktree, branch: 'codex/linked-space' })
      ])
    )
  })

  it('reports a detached HEAD without inventing a branch name', () => {
    const repository = fixture()
    repository.git(repository.main, 'switch', '--detach')

    expect(resolveRepositoryContext(repository.main).branch).toBeNull()
  })

  it('parses NUL-delimited renamed and copied paths containing spaces', () => {
    const repository = fixture()
    repository.write(repository.main, 'src/original name.ts', 'export const copied = true\n')
    repository.write(repository.main, 'src/copy source.ts', 'export const copy = true\n')
    const base = repository.commit(repository.main, '添加带空格的源码')
    repository.git(repository.main, 'mv', 'src/original name.ts', 'src/renamed value.ts')
    repository.write(repository.main, 'src/copied value.ts', 'export const copy = true\n')
    const tip = repository.commit(repository.main, '重命名并复制源码')

    expect(diffNameStatus(repository.main, base, tip)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: expect.stringMatching(/^R/),
          previousPath: 'src/original name.ts',
          path: 'src/renamed value.ts'
        }),
        expect.objectContaining({
          status: expect.stringMatching(/^C/),
          previousPath: 'src/copy source.ts',
          path: 'src/copied value.ts'
        })
      ])
    )
  })

  it('fails closed for unknown untracked paths while preserving exact generated-output exceptions', () => {
    const repository = fixture()
    repository.write(repository.main, 'src/new.ts', 'export const value = 1\n')
    repository.write(repository.main, 'dist-local-integration/generated.js', 'generated\n')

    expect(readRepositoryStatus(repository.main)).toMatchObject({
      untrackedSources: ['src/new.ts'],
      untrackedOutputs: ['dist-local-integration/generated.js'],
      sourceClean: false
    })
  })

  it('keeps Git allowed failures explicit and exposes commit ancestry and range history', () => {
    const repository = fixture()
    const base = resolveCommit(repository.main, 'HEAD')
    repository.write(repository.main, 'src/change.ts', 'export const value = 1\n')
    const tip = repository.commit(repository.main, '增加一个源码提交')

    expect(runGit(repository.main, ['rev-parse', '--verify', 'missing-ref'], { allowFailure: true }))
      .toMatchObject({ status: 128 })
    expect(isAncestor(repository.main, base, tip)).toBe(true)
    expect(listRangeCommits(repository.main, base, tip)).toEqual([
      { commit: tip, parents: [base], subject: '增加一个源码提交' }
    ])
  })

  it('does not collect tests nested under .worktrees', () => {
    const collectionRoot = mkdtempSync(path.join(os.tmpdir(), 'vitest-collection-'))
    scratchDirectories.push(collectionRoot)
    const worktreesDirectory = path.join(collectionRoot, '.worktrees')
    mkdirSync(worktreesDirectory, { recursive: true })
    const marker = 'nested-worktree-test-was-collected'
    writeFileSync(
      path.join(worktreesDirectory, 'nested.test.ts'),
      `throw new Error(${JSON.stringify(marker)})\n`,
      'utf8'
    )

    const child = spawnSync(
      process.execPath,
      [
        vitestExecutable,
        'run',
        '--config',
        path.join(projectRoot, 'vitest.config.ts'),
        '--root',
        collectionRoot
      ],
      { cwd: projectRoot, encoding: 'utf8' }
    )

    expect(`${child.stdout}\n${child.stderr}`).not.toContain(marker)
    expect(`${child.stdout}\n${child.stderr}`).toContain('No test files found')
  })
})
