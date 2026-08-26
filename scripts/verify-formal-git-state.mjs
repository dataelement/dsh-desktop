import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function git(repository, ...args) {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
}

function gitRaw(repository, ...args) {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function isSourcePath(filePath) {
  return (
    /^(src|packages|scripts|script|skills|test|build|config|patches|docs|\.githooks)\//.test(
      filePath
    ) ||
    /^(package(?:-lock)?\.json|AGENTS\.md|electron-builder[^/]*\.cjs|tsconfig[^/]*\.json)$/.test(
      filePath
    )
  )
}

function repositoryStatus(repository) {
  const records = gitRaw(
    repository,
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all'
  )
    .split('\0')
    .filter(Boolean)
  return {
    trackedChanges: records.filter((record) => !record.startsWith('?? ')),
    untrackedSources: records
      .filter((record) => record.startsWith('?? '))
      .map((record) => record.slice(3))
      .filter(isSourcePath)
  }
}

function registeredWorktrees(repository) {
  return gitRaw(repository, 'worktree', 'list', '--porcelain')
    .trim()
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((block) => {
      const fields = new Map(
        block.split(/\r?\n/).map((line) => {
          const separator = line.indexOf(' ')
          return separator === -1 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)]
        })
      )
      return {
        path: fields.get('worktree') ?? '',
        branch: (fields.get('branch') ?? '').replace(/^refs\/heads\//, '') || '(detached HEAD)'
      }
    })
    .filter((worktree) => worktree.path && existsSync(worktree.path))
}

function localBranches(repository) {
  const output = git(repository, 'for-each-ref', '--format=%(refname:short)', 'refs/heads')
  return output ? output.split(/\r?\n/).filter(Boolean) : []
}

function readVersion(repository) {
  const packageJson = JSON.parse(readFileSync(path.join(repository, 'package.json'), 'utf8'))
  if (typeof packageJson.version !== 'string') {
    throw new Error('package.json 缺少有效的 version。')
  }
  if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
    throw new Error(`package.json 版本号不是标准三段式 SemVer：${packageJson.version}`)
  }
  return packageJson.version
}

function verifyMajorTag(repository, version, head) {
  const [major, minor, patchVersion] = version.split('.').map(Number)
  if (major < 1 || minor !== 0 || patchVersion !== 0) return []

  const tag = `V${version}`
  try {
    const tagType = git(repository, 'cat-file', '-t', `refs/tags/${tag}`)
    const taggedCommit = git(repository, 'rev-list', '-n', '1', tag)
    if (tagType !== 'tag') {
      return [`大版本 ${version} 必须使用注释标签 ${tag}，不能使用轻量标签。`]
    }
    if (taggedCommit !== head) {
      return [`大版本标签 ${tag} 必须指向当前正式构建提交 ${head}。`]
    }
    return []
  } catch {
    return [`大版本 ${version} 必须先在当前提交创建本地注释标签 ${tag}。`]
  }
}

export function verifyFormalGitState(repository) {
  const resolvedRepository = path.resolve(repository)
  const errors = []
  const branch = git(resolvedRepository, 'branch', '--show-current')
  const head = git(resolvedRepository, 'rev-parse', 'HEAD')
  const { trackedChanges, untrackedSources } = repositoryStatus(resolvedRepository)
  const version = readVersion(resolvedRepository)

  if (branch !== 'main') {
    errors.push(`正式构建必须从 main 分支执行，当前分支是 ${branch || '(detached HEAD)'}。`)
  }
  if (trackedChanges.length > 0) {
    errors.push('存在尚未提交的代码改动；请先用中文说明提交后再构建正式版。')
  }
  if (untrackedSources.length > 0) {
    errors.push(`存在未纳入 Git 的源码文件：${untrackedSources.join('、')}`)
  }

  const currentWorktree = realpathSync(resolvedRepository)
  for (const worktree of registeredWorktrees(resolvedRepository)) {
    if (realpathSync(worktree.path) === currentWorktree) continue
    const status = repositoryStatus(worktree.path)
    if (status.trackedChanges.length > 0 || status.untrackedSources.length > 0) {
      errors.push(
        `另一个 worktree 存在尚未提交的改动：${worktree.branch}（${worktree.path}）`
      )
    }
  }

  const unmergedBranches = localBranches(resolvedRepository)
    .filter((candidate) => candidate !== 'main')
    .map((candidate) => ({
      name: candidate,
      ahead: Number(git(resolvedRepository, 'rev-list', '--count', `main..${candidate}`))
    }))
    .filter((candidate) => candidate.ahead > 0)
  if (unmergedBranches.length > 0) {
    errors.push(
      `以下本地分支仍有提交尚未合并到 main：${unmergedBranches
        .map((candidate) => `${candidate.name}（${candidate.ahead} 个提交）`)
        .join('、')}`
    )
  }

  errors.push(...verifyMajorTag(resolvedRepository, version, head))
  if (errors.length > 0) throw new Error(errors.join('\n'))

  return { branch, head, version }
}

function readOption(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少路径参数。`)
  return value
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyFormalGitState(readOption('--repo') ?? process.cwd())
    console.log(
      `正式构建源码检查通过：${result.branch} ${result.head.slice(0, 12)}，版本 ${result.version}`
    )
  } catch (error) {
    console.error(`正式构建源码检查失败：\n${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  }
}
