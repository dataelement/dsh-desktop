import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const gitEnvironment = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_TERMINAL_PROMPT: '0'
}

function git(repository: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    env: gitEnvironment
  }).trim()
}

function gitBytes(repository: string, args: readonly string[]): Buffer {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: 'buffer',
    env: gitEnvironment
  })
}

function resolveGitPath(repository: string, value: string): string {
  return path.resolve(repository, value)
}

function encodeSnapshotPart(label: string, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from(`${label}\0${value.length}\0`, 'utf8'), value, Buffer.from('\0', 'utf8')])
}

function integrationFiles(directory: string, prefix = ''): [string, Buffer][] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(prefix, entry.name)
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return integrationFiles(absolutePath, relativePath)
    if (!entry.isFile() || !relativePath.includes('sherlock-integration')) return []
    return [[relativePath, readFileSync(absolutePath)] as [string, Buffer]]
  })
}

export interface GitWorkflowFixture {
  root: string
  main: string
  commonDirectory: string
  git(repository: string, ...args: string[]): string
  write(repository: string, relativePath: string, content: string | Buffer): void
  commit(repository: string, message: string): string
  createWorktree(name: string, branch?: string): string
  writeCommonIntegrationFile(relativePath: string, content: string | Buffer): void
  snapshot(): Buffer
  dispose(): void
}

export function createGitWorkflowFixture(): GitWorkflowFixture {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sherlock-git-workflow-'))
  const mainDirectory = path.join(root, 'main')
  mkdirSync(mainDirectory)
  git(mainDirectory, ['init', '-b', 'main'])
  const main = realpathSync(mainDirectory)
  git(main, ['config', 'user.name', 'Sherlock Workflow Test'])
  git(main, ['config', 'user.email', 'sherlock-workflow-test@example.com'])
  git(main, ['config', 'commit.gpgSign', 'false'])
  writeFileSync(path.join(main, 'README.md'), 'baseline\n', 'utf8')
  git(main, ['add', 'README.md'])
  git(main, ['commit', '-m', '基线提交'])

  const commonDirectory = realpathSync(
    resolveGitPath(main, git(main, ['rev-parse', '--git-common-dir']))
  )
  const worktrees = new Map<string, string>()

  return {
    root,
    main,
    commonDirectory,
    git(repository, ...args) {
      return git(repository, args)
    },
    write(repository, relativePath, content) {
      const destination = path.join(repository, relativePath)
      mkdirSync(path.dirname(destination), { recursive: true })
      writeFileSync(destination, content)
    },
    commit(repository, message) {
      git(repository, ['add', '-A'])
      git(repository, ['commit', '-m', message])
      return git(repository, ['rev-parse', 'HEAD'])
    },
    createWorktree(name, branch = `codex/${name}`) {
      const worktree = path.join(root, 'worktrees', name)
      mkdirSync(path.dirname(worktree), { recursive: true })
      git(main, ['worktree', 'add', worktree, '-b', branch])
      worktrees.set(name, worktree)
      return realpathSync(worktree)
    },
    writeCommonIntegrationFile(relativePath, content) {
      const destination = path.join(commonDirectory, relativePath)
      mkdirSync(path.dirname(destination), { recursive: true })
      writeFileSync(destination, content)
    },
    snapshot() {
      const registered = gitBytes(main, ['worktree', 'list', '--porcelain', '-z'])
      const refs = gitBytes(main, ['for-each-ref', '--format=%(refname)%00%(objectname)'])
      const statuses = [main, ...worktrees.values()]
        .sort()
        .map((worktree) =>
          encodeSnapshotPart(
            `status:${worktree}`,
            gitBytes(worktree, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
          )
        )
      const commonFiles = integrationFiles(commonDirectory)
        .sort(([left], [right]) => left.localeCompare(right))
        .flatMap(([relativePath, contents]) =>
          encodeSnapshotPart(`common:${relativePath}`, contents)
        )

      return Buffer.concat([
        encodeSnapshotPart('refs', refs),
        encodeSnapshotPart('worktrees', registered),
        ...statuses,
        ...commonFiles
      ])
    },
    dispose() {
      rmSync(root, { recursive: true, force: true })
    }
  }
}
