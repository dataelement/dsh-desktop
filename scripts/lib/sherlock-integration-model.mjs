import { closeSync, existsSync, linkSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  diffNameStatus,
  isAncestor,
  listRangeCommits,
  readRepositoryStatus,
  resolveCommit,
  resolveRepositoryContext
} from './sherlock-git-state.mjs'

const fullSha = /^[0-9a-f]{40}$/
const featureBranch = /^codex\/feat\/[a-z0-9][a-z0-9-]*-\d{8}$/

function fail(message) {
  throw new Error(`功能交接卡无效：${message}`)
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} 必须是对象。`)
  return value
}

function exactKeys(value, label, allowedKeys) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) fail(`${label} 包含未知字段 ${key}。`)
  }
}

function string(value, label, { nonEmpty = true } = {}) {
  if (typeof value !== 'string' || (nonEmpty && value.length === 0)) fail(`${label} 必须是非空字符串。`)
  return value
}

function sha(value, label) {
  const valueString = string(value, label)
  if (!fullSha.test(valueString)) fail(`${label} 必须是 40 位小写提交 SHA。`)
  return valueString
}

function timestamp(value, label) {
  const valueString = string(value, label)
  if (Number.isNaN(Date.parse(valueString))) fail(`${label} 必须是可解析的时间。`)
  return valueString
}

function strings(value, label, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) fail(`${label} 必须是${nonEmpty ? '非空' : ''}字符串数组。`)
  return value.map((item, index) => string(item, `${label}[${index}]`))
}

function safeRepositoryPath(value, label) {
  const filePath = string(value, label)
  if (
    filePath.includes('\0') ||
    filePath.includes('\\') ||
    /^[A-Za-z]:/.test(filePath) ||
    path.posix.isAbsolute(filePath) ||
    path.win32.isAbsolute(filePath) ||
    filePath === '.' ||
    filePath === '..' ||
    filePath.split('/').includes('..') ||
    path.posix.normalize(filePath) !== filePath
  ) {
    fail(`${label} 必须是已规范化的仓库相对路径。`)
  }
  return filePath
}

function validateCommit(value, index) {
  const commit = object(value, `commits[${index}]`)
  exactKeys(commit, `commits[${index}]`, ['commit', 'parents', 'subject'])
  return {
    commit: sha(commit.commit, `commits[${index}].commit`),
    parents: strings(commit.parents, `commits[${index}].parents`).map((parent, parentIndex) =>
      sha(parent, `commits[${index}].parents[${parentIndex}]`)
    ),
    subject: string(commit.subject, `commits[${index}].subject`, { nonEmpty: false })
  }
}

function validateFile(value, index) {
  const change = object(value, `files[${index}]`)
  exactKeys(change, `files[${index}]`, ['status', 'path', 'previousPath'])
  const status = string(change.status, `files[${index}].status`)
  const renameOrCopy = /^([RC])(\d{1,3})$/.exec(status)
  const ordinaryStatus = /^[ADMTUXB]$/.test(status)
  if (!ordinaryStatus && (!renameOrCopy || (renameOrCopy[2] && Number(renameOrCopy[2]) > 100))) {
    fail(`files[${index}].status 无效。`)
  }
  const result = { status, path: safeRepositoryPath(change.path, `files[${index}].path`) }
  const needsPreviousPath = Boolean(renameOrCopy)
  if (needsPreviousPath && change.previousPath === undefined) {
    fail(`files[${index}].previousPath 是重命名或复制记录的必填路径。`)
  }
  if (!needsPreviousPath && change.previousPath !== undefined) {
    fail(`files[${index}].previousPath 只允许用于重命名或复制记录。`)
  }
  if (change.previousPath !== undefined) {
    result.previousPath = safeRepositoryPath(change.previousPath, `files[${index}].previousPath`)
  }
  return result
}

function validateCheck(value, index, tipCommit) {
  const check = object(value, `checks[${index}]`)
  exactKeys(check, `checks[${index}]`, ['argv', 'outcome', 'summary', 'verifiedCommit', 'completedAt', 'timeoutMs'])
  if (!Array.isArray(check.argv) || check.argv.length === 0) fail(`checks[${index}].argv 必须是非空参数数组。`)
  const argv = check.argv.map((argument, argumentIndex) => {
    const valueString = string(argument, `checks[${index}].argv[${argumentIndex}]`)
    if (valueString.includes('\0')) fail(`checks[${index}].argv[${argumentIndex}] 不能包含 NUL 字符。`)
    return valueString
  })
  if (check.outcome !== 'passed') fail(`checks[${index}].outcome 必须为 passed。`)
  const verifiedCommit = sha(check.verifiedCommit, `checks[${index}].verifiedCommit`)
  if (verifiedCommit !== tipCommit) fail(`checks[${index}].verifiedCommit 必须绑定当前 tipCommit。`)
  if (!Number.isSafeInteger(check.timeoutMs) || check.timeoutMs <= 0) {
    fail(`checks[${index}].timeoutMs 必须是正整数。`)
  }
  return {
    argv,
    outcome: 'passed',
    summary: string(check.summary, `checks[${index}].summary`),
    verifiedCommit,
    completedAt: timestamp(check.completedAt, `checks[${index}].completedAt`),
    timeoutMs: check.timeoutMs
  }
}

export function validateFeatureHandoff(value) {
  const handoff = object(value, '交接卡')
  exactKeys(handoff, '交接卡', [
    'schemaVersion',
    'featureName',
    'branch',
    'baseCommit',
    'tipCommit',
    'commits',
    'files',
    'checks',
    'uiVerification',
    'acceptanceCriteria',
    'risks',
    'generatedAt'
  ])
  if (handoff.schemaVersion !== 1) fail('schemaVersion 必须为 1。')
  const branch = string(handoff.branch, 'branch')
  if (!featureBranch.test(branch)) fail('branch 必须匹配 codex/feat/<slug>-<YYYYMMDD>。')
  const baseCommit = sha(handoff.baseCommit, 'baseCommit')
  const tipCommit = sha(handoff.tipCommit, 'tipCommit')
  if (baseCommit === tipCommit) fail('baseCommit 和 tipCommit 不能相同。')
  if (!Array.isArray(handoff.commits) || handoff.commits.length === 0) fail('commits 必须是非空数组。')
  const commits = handoff.commits.map(validateCommit)
  const commitIds = new Set(commits.map((commit) => commit.commit))
  if (commitIds.size !== commits.length) fail('commits 不能包含重复提交。')
  if (commits.at(-1).commit !== tipCommit) fail('commits 必须按范围顺序结束于 tipCommit。')
  if (commitIds.has(baseCommit)) fail('commits 不能包含 baseCommit。')
  const commitPositions = new Map(commits.map((commit, index) => [commit.commit, index]))
  const reachable = new Set([tipCommit])
  const pending = [tipCommit]
  while (pending.length > 0) {
    const commit = commits[commitPositions.get(pending.pop())]
    for (const parent of commit.parents) {
      if (commitPositions.has(parent) && !reachable.has(parent)) {
        reachable.add(parent)
        pending.push(parent)
      }
    }
  }
  for (const [index, commit] of commits.entries()) {
    for (const parent of commit.parents) {
      if (parent === baseCommit) continue
      const parentIndex = commitPositions.get(parent)
      if (parentIndex === undefined) fail(`commits[${index}] 的父提交未包含在范围内。`)
      if (parentIndex >= index) fail(`commits 必须按父提交在前的拓扑顺序排列。`)
    }
    if (!reachable.has(commit.commit)) fail(`commits[${index}] 是未连接到 tipCommit 的孤立提交。`)
  }
  if (!Array.isArray(handoff.files)) fail('files 必须是数组。')
  const files = handoff.files.map(validateFile)
  if (!Array.isArray(handoff.checks)) fail('checks 必须是数组。')
  const checks = handoff.checks.map((check, index) => validateCheck(check, index, tipCommit))
  const uiVerification = object(handoff.uiVerification, 'uiVerification')
  exactKeys(uiVerification, 'uiVerification', ['outcome', 'summary'])
  if (uiVerification.outcome !== 'passed' && uiVerification.outcome !== 'not-applicable') {
    fail('uiVerification.outcome 必须为 passed 或 not-applicable。')
  }
  return {
    schemaVersion: 1,
    featureName: string(handoff.featureName, 'featureName'),
    branch,
    baseCommit,
    tipCommit,
    commits,
    files,
    checks,
    uiVerification: {
      outcome: uiVerification.outcome,
      summary: string(uiVerification.summary, 'uiVerification.summary')
    },
    acceptanceCriteria: strings(handoff.acceptanceCriteria, 'acceptanceCriteria', { nonEmpty: true }),
    risks: strings(handoff.risks, 'risks'),
    generatedAt: timestamp(handoff.generatedAt, 'generatedAt')
  }
}

export function buildFeatureHandoff({ repository, baseCommit, metadata, generatedAt }) {
  const context = resolveRepositoryContext(repository)
  if (!context.branch || !featureBranch.test(context.branch)) {
    fail('当前分支必须匹配 codex/feat/<slug>-<YYYYMMDD>。')
  }
  const status = readRepositoryStatus(context.worktreeRoot)
  if (!status.sourceClean) fail('功能 worktree 必须没有未提交的源码改动。')
  const declaredBase = sha(baseCommit, 'baseCommit')
  if (resolveCommit(context.worktreeRoot, declaredBase) !== declaredBase) {
    fail('baseCommit 必须是可解析的完整提交 SHA。')
  }
  const branchRef = `refs/heads/${context.branch}`
  if (resolveCommit(context.worktreeRoot, branchRef) !== context.head) {
    fail('功能分支引用必须精确指向当前 HEAD。')
  }
  if (!isAncestor(context.worktreeRoot, declaredBase, context.head)) {
    fail('baseCommit 必须是 tipCommit 的祖先。')
  }
  const commits = listRangeCommits(context.worktreeRoot, declaredBase, context.head)
  if (commits.length === 0) fail('功能提交范围不能为空。')
  const fields = object(metadata, 'metadata')
  const handoff = validateFeatureHandoff({
    schemaVersion: 1,
    featureName: fields.featureName,
    branch: context.branch,
    baseCommit: declaredBase,
    tipCommit: context.head,
    commits,
    // baseCommit is required to be an ancestor, making this exact two-endpoint
    // comparison equivalent to Git's three-dot feature inventory.
    files: diffNameStatus(context.worktreeRoot, declaredBase, context.head),
    checks: fields.checks,
    uiVerification: fields.uiVerification,
    acceptanceCriteria: fields.acceptanceCriteria,
    risks: fields.risks,
    generatedAt
  })
  const after = resolveRepositoryContext(context.worktreeRoot)
  if (after.branch !== context.branch || after.head !== context.head || resolveCommit(after.worktreeRoot, branchRef) !== after.head) {
    fail('生成期间功能分支引用发生变化。')
  }
  if (!readRepositoryStatus(after.worktreeRoot).sourceClean) {
    fail('生成期间功能 worktree 出现未提交的源码改动。')
  }
  return handoff
}

export function handoffOutputPath(repository, handoff) {
  const context = resolveRepositoryContext(repository)
  const normalizedBranch = handoff.branch.replaceAll('/', '-')
  return path.join(context.commonDirectory, 'sherlock-integration', 'handoffs', `${normalizedBranch}-${handoff.tipCommit.slice(0, 12)}.json`)
}

export function writeFeatureHandoff(outputPath, handoff) {
  const bytes = `${JSON.stringify(handoff, null, 2)}\n`
  if (existsSync(outputPath)) {
    if (readFileSync(outputPath, 'utf8') === bytes) return bytes
    throw new Error(`交接卡已存在且内容不同，拒绝覆盖：${outputPath}`)
  }
  mkdirSync(path.dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  let temporaryDescriptor
  try {
    temporaryDescriptor = openSync(temporaryPath, 'wx', 0o600)
    writeFileSync(temporaryDescriptor, bytes, 'utf8')
    closeSync(temporaryDescriptor)
    temporaryDescriptor = undefined
    linkSync(temporaryPath, outputPath)
  } finally {
    if (temporaryDescriptor !== undefined) closeSync(temporaryDescriptor)
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
  return bytes
}
