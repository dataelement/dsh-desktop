import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import path from 'node:path'

const gitOutputLimit = 64 * 1024 * 1024
const generatedOutputRoots = new Set([
  'dist',
  'dist-dev',
  'dist-internal',
  'dist-notarized',
  'dist-legacy',
  'dist-release',
  'dist-local-integration',
  'dist-feature-preview',
  'output',
  '.sherlock-build'
])

function gitFailureMessage(args, result) {
  const diagnostic = result.stderr.trim() || result.stdout.trim()
  return diagnostic || `git ${args.join(' ')} 执行失败（退出码 ${result.status}）。`
}

function outputRecords(output) {
  return output.split('\0').filter((record) => record.length > 0)
}

function absoluteGitPath(worktreeRoot, gitPath) {
  return path.normalize(realpathSync(path.resolve(worktreeRoot, gitPath)))
}

function isGeneratedOutput(filePath) {
  const [topLevel] = filePath.split('/', 1)
  return generatedOutputRoots.has(topLevel)
}

export function runGit(repository, args, options = {}) {
  const result = spawnSync('git', ['-C', path.resolve(repository), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: gitOutputLimit
  })
  if (result.error) throw result.error
  if (typeof result.status !== 'number') {
    throw new Error(`git ${args.join(' ')} 未返回退出状态。`)
  }

  const commandResult = {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
  if (commandResult.status !== 0 && !options.allowFailure) {
    throw new Error(gitFailureMessage(args, commandResult))
  }
  return commandResult
}

export function resolveRepositoryContext(repository) {
  const worktreeRoot = path.normalize(
    realpathSync(path.resolve(runGit(repository, ['rev-parse', '--show-toplevel']).stdout.trim()))
  )
  const gitDirectory = absoluteGitPath(
    worktreeRoot,
    runGit(worktreeRoot, ['rev-parse', '--git-dir']).stdout.trim()
  )
  const commonDirectory = absoluteGitPath(
    worktreeRoot,
    runGit(worktreeRoot, ['rev-parse', '--git-common-dir']).stdout.trim()
  )
  const branchOutput = runGit(worktreeRoot, ['branch', '--show-current']).stdout.trim()
  const head = runGit(worktreeRoot, ['rev-parse', 'HEAD']).stdout.trim()

  return {
    worktreeRoot,
    gitDirectory,
    commonDirectory,
    branch: branchOutput || null,
    head,
    linkedWorktree: gitDirectory !== commonDirectory
  }
}

export function readRepositoryStatus(repository) {
  const output = runGit(repository, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all'
  ]).stdout
  const trackedChanges = []
  const untrackedSources = []
  const untrackedOutputs = []

  for (const record of outputRecords(output)) {
    if (!record.startsWith('?? ')) {
      trackedChanges.push(record)
      continue
    }

    const filePath = record.slice(3)
    if (isGeneratedOutput(filePath)) untrackedOutputs.push(filePath)
    else untrackedSources.push(filePath)
  }

  return {
    trackedChanges,
    untrackedSources,
    untrackedOutputs,
    sourceClean: trackedChanges.length === 0 && untrackedSources.length === 0
  }
}

export function listRegisteredWorktrees(repository) {
  const output = runGit(repository, ['worktree', 'list', '--porcelain', '-z']).stdout

  return output
    .split('\0\0')
    .filter((block) => block.length > 0)
    .map((block) => {
      const fields = new Map(
        outputRecords(block).map((record) => {
          const separator = record.indexOf(' ')
          return separator === -1 ? [record, ''] : [record.slice(0, separator), record.slice(separator + 1)]
        })
      )
      const worktreePath = fields.get('worktree')
      if (!worktreePath) throw new Error('Git worktree 记录缺少路径。')
      const branchReference = fields.get('branch') ?? ''

      return {
        path: absoluteGitPath(path.resolve(repository), worktreePath),
        head: fields.get('HEAD') ?? '',
        branch: branchReference.replace(/^refs\/heads\//, '') || null,
        locked: fields.has('locked'),
        prunable: fields.has('prunable')
      }
    })
}

export function resolveCommit(repository, revision) {
  return runGit(repository, ['rev-parse', '--verify', `${revision}^{commit}`]).stdout.trim()
}

export function isAncestor(repository, ancestor, descendant) {
  const result = runGit(
    repository,
    ['merge-base', '--is-ancestor', ancestor, descendant],
    { allowFailure: true }
  )
  if (result.status === 0) return true
  if (result.status === 1) return false
  throw new Error(gitFailureMessage(['merge-base', '--is-ancestor', ancestor, descendant], result))
}

export function listRangeCommits(repository, base, tip) {
  const records = outputRecords(
    runGit(repository, [
      'log',
      '-z',
      '--reverse',
      '--format=%H%x00%P%x00%s',
      `${base}..${tip}`
    ]).stdout
  )
  if (records.length % 3 !== 0) throw new Error('Git 提交范围输出格式无效。')

  const commits = []
  for (let index = 0; index < records.length; index += 3) {
    commits.push({
      commit: records[index],
      parents: records[index + 1] ? records[index + 1].split(' ') : [],
      subject: records[index + 2]
    })
  }
  return commits
}

export function diffNameStatus(repository, base, tip) {
  const records = outputRecords(
    runGit(repository, [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      '--find-copies-harder',
      base,
      tip
    ]).stdout
  )
  const changes = []

  for (let index = 0; index < records.length; ) {
    const status = records[index++]
    if (!status) throw new Error('Git 文件变更输出格式无效。')
    if (status.startsWith('R') || status.startsWith('C')) {
      const previousPath = records[index++]
      const filePath = records[index++]
      if (previousPath === undefined || filePath === undefined) {
        throw new Error('Git 重命名或复制输出缺少路径。')
      }
      changes.push({ status, path: filePath, previousPath })
      continue
    }

    const filePath = records[index++]
    if (filePath === undefined) throw new Error('Git 文件变更输出缺少路径。')
    changes.push({ status, path: filePath })
  }

  return changes
}
