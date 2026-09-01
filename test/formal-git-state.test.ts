import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const verifier = path.join(projectRoot, 'scripts', 'verify-formal-git-state.mjs')
const scratchDirectories: string[] = []

function runGit(repository: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim()
}

function createRepository(version = '0.6.8'): string {
  const repository = mkdtempSync(path.join(os.tmpdir(), 'sherlock-formal-git-'))
  scratchDirectories.push(repository)
  runGit(repository, 'init', '-b', 'main')
  runGit(repository, 'config', 'user.name', 'Sherlock Test')
  runGit(repository, 'config', 'user.email', 'sherlock-test@example.com')
  writeFileSync(
    path.join(repository, 'package.json'),
    `${JSON.stringify({ name: 'sherlock-test', version }, null, 2)}\n`,
    'utf8'
  )
  writeFileSync(path.join(repository, 'tracked.txt'), 'baseline\n', 'utf8')
  runGit(repository, 'add', 'package.json', 'tracked.txt')
  runGit(repository, 'commit', '-m', '基线提交')
  return repository
}

function verify(repository: string) {
  return spawnSync(process.execPath, [verifier, '--repo', repository], {
    encoding: 'utf8'
  })
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('formal Git source gate', () => {
  it('accepts a clean patch release committed on main', () => {
    const repository = createRepository()

    const result = verify(repository)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('正式构建源码检查通过')
  })

  it('rejects tracked changes that have not been committed', () => {
    const repository = createRepository()
    writeFileSync(path.join(repository, 'tracked.txt'), 'dirty\n', 'utf8')

    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('存在尚未提交的代码改动')
  })

  it('rejects untracked source files that would be omitted from the formal build commit', () => {
    const repository = createRepository()
    mkdirSync(path.join(repository, 'src'))
    writeFileSync(path.join(repository, 'src', 'new-feature.ts'), 'export const value = 1\n')

    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('未纳入 Git 的源码文件')
    expect(result.stderr).toContain('src/new-feature.ts')
  })

  it('ignores allowed generated output but rejects an unknown untracked root file', () => {
    const repository = createRepository()
    mkdirSync(path.join(repository, 'dist-local-integration'))
    writeFileSync(path.join(repository, 'dist-local-integration', 'generated.js'), 'generated\n')

    expect(verify(repository).status).toBe(0)

    writeFileSync(path.join(repository, 'unexpected-root-file'), 'not generated\n')
    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('未纳入 Git 的源码文件')
    expect(result.stderr).toContain('unexpected-root-file')
  })

  it('rejects an unarchived integration branch with commits missing from main', () => {
    const repository = createRepository()
    runGit(repository, 'switch', '-c', 'codex/integration/20260831-02')
    writeFileSync(path.join(repository, 'session.txt'), 'unmerged\n', 'utf8')
    runGit(repository, 'add', 'session.txt')
    runGit(repository, 'commit', '-m', '另一个会话的修改')
    runGit(repository, 'switch', 'main')

    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('codex/integration/20260831-02')
    expect(result.stderr).toContain('尚未合并到 main')
  })

  it('ignores an integration branch whose exact batch was explicitly cancelled and archived', () => {
    const repository = createRepository()
    const baseMainCommit = runGit(repository, 'rev-parse', 'HEAD')
    const branch = 'codex/integration/20260831-01'
    runGit(repository, 'switch', '-c', branch)
    writeFileSync(path.join(repository, 'cancelled-batch.txt'), 'not for release\n', 'utf8')
    runGit(repository, 'add', 'cancelled-batch.txt')
    runGit(repository, 'commit', '-m', '已取消的集成批次')
    const cancelledTip = runGit(repository, 'rev-parse', 'HEAD')
    runGit(repository, 'switch', 'main')

    const historyDirectory = path.join(
      repository,
      runGit(repository, 'rev-parse', '--git-common-dir'),
      'sherlock-integration',
      'history',
      '20260831-01-cancelled-2026-08-31T08-30-00.000Z'
    )
    mkdirSync(historyDirectory, { recursive: true })
    writeFileSync(path.join(historyDirectory, 'lease.json'), `${JSON.stringify({
      schemaVersion: 1,
      revision: 2,
      batchId: '20260831-01',
      branch,
      manifestPath: 'config/sherlock-integration-batches/20260831-01.json',
      baseMainCommit,
      currentTip: cancelledTip,
      ownerTokenHash: 'a'.repeat(64),
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:15:00.000Z'
    })}\n`, 'utf8')

    const result = verify(repository)

    expect(result.status, result.stderr).toBe(0)
  })

  it('rejects uncommitted changes left in another session worktree', () => {
    const repository = createRepository()
    const worktreeParent = mkdtempSync(path.join(os.tmpdir(), 'sherlock-session-worktree-'))
    scratchDirectories.push(worktreeParent)
    const worktree = path.join(worktreeParent, 'worktree')
    runGit(repository, 'worktree', 'add', worktree, '-b', 'codex/dirty-session')
    writeFileSync(path.join(worktree, 'tracked.txt'), 'dirty session change\n', 'utf8')

    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('codex/dirty-session')
    expect(result.stderr).toContain('另一个 worktree 存在尚未提交的改动')
  })

  it('rejects an active integration lease before a formal build can start', () => {
    const repository = createRepository()
    const head = runGit(repository, 'rev-parse', 'HEAD')
    const leaseDirectory = path.join(repository, runGit(repository, 'rev-parse', '--git-common-dir'), 'sherlock-integration', 'active')
    mkdirSync(leaseDirectory, { recursive: true })
    writeFileSync(path.join(leaseDirectory, 'lease.json'), `${JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      batchId: '20260831-01',
      branch: 'codex/integration/20260831-01',
      manifestPath: 'config/sherlock-integration-batches/20260831-01.json',
      baseMainCommit: head,
      currentTip: head,
      ownerTokenHash: 'a'.repeat(64),
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-08-31T08:00:00.000Z'
    })}\n`, 'utf8')

    const result = verify(repository)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('活动集成租约')
  })

  it('ignores a missing registered worktree while checking formal source state', () => {
    const repository = createRepository()
    const worktreeParent = mkdtempSync(path.join(os.tmpdir(), 'sherlock-stale-worktree-'))
    scratchDirectories.push(worktreeParent)
    const worktree = path.join(worktreeParent, 'worktree')
    runGit(repository, 'worktree', 'add', worktree, '-b', 'codex/stale-session')
    renameSync(worktree, `${worktree}-moved`)

    const result = verify(repository)

    expect(result.status).toBe(0)
  })

  it('requires an annotated Vx.0.0 tag on a major release commit', () => {
    const repository = createRepository('1.0.0')

    const withoutTag = verify(repository)
    expect(withoutTag.status).toBe(1)
    expect(withoutTag.stderr).toContain('V1.0.0')

    runGit(repository, 'tag', '-a', 'V1.0.0', '-m', 'Sherlock V1.0.0')
    const withTag = verify(repository)
    expect(withTag.status).toBe(0)
  })
})
