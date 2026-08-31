import { createHash, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { readActiveBatchLease } from './sherlock-active-batch.mjs'
import {
  isAncestor,
  listRegisteredWorktrees,
  readRepositoryStatus,
  resolveCommit,
  resolveRepositoryContext,
  runGit
} from './sherlock-git-state.mjs'
import { validateIntegrationBatchManifest } from './sherlock-integration-model.mjs'

function fail(message) {
  throw new Error(`共享构建来源无效：${message}`)
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function canonicalManifestPath(batchId) {
  return `config/sherlock-integration-batches/${batchId}.json`
}

function canonicalMainContext(repository) {
  const candidates = listRegisteredWorktrees(repository)
    .filter((entry) => entry.branch === 'main' && !entry.prunable)
    .map((entry) => {
      try {
        return resolveRepositoryContext(entry.path)
      } catch {
        return null
      }
    })
    .filter((context) => context && context.branch === 'main' && context.gitDirectory === context.commonDirectory)
  if (candidates.length !== 1) fail('必须存在且只存在一个规范 main worktree。')
  return candidates[0]
}

function ownerMatches(ownerToken, expectedHash) {
  if (typeof ownerToken !== 'string' || ownerToken.length === 0 || ownerToken.includes('\0')) {
    fail('local-integration 构建必须提供 ownerToken。')
  }
  const actual = Buffer.from(digest(Buffer.from(ownerToken, 'utf8')), 'utf8')
  const expected = Buffer.from(expectedHash, 'utf8')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    fail('ownerToken 与活动集成租约不匹配。')
  }
}

function sourceClean(repository) {
  if (!readRepositoryStatus(repository).sourceClean) fail('当前 worktree 含未提交源码改动。')
}

function trackedManifest(repository, lease) {
  if (lease.manifestPath !== canonicalManifestPath(lease.batchId)) {
    fail('活动租约 manifestPath 不是批次的精确安全路径。')
  }
  runGit(repository, ['ls-files', '--error-unmatch', '--', lease.manifestPath])
  const manifestFile = path.join(resolveRepositoryContext(repository).worktreeRoot, lease.manifestPath)
  if (!existsSync(manifestFile) || !statSync(manifestFile).isFile()) {
    fail('活动租约 manifestPath 必须指向受跟踪普通文件。')
  }
  const bytes = readFileSync(manifestFile)
  let manifest
  try {
    manifest = validateIntegrationBatchManifest(JSON.parse(bytes.toString('utf8')))
  } catch (error) {
    fail(`集成批次清单无效：${error instanceof Error ? error.message : String(error)}`)
  }
  return { manifest, manifestDigest: digest(bytes) }
}

function localMainSnapshot(context, main) {
  if (context.worktreeRoot !== main.worktreeRoot || context.branch !== 'main') {
    fail('local-main 构建必须从规范 main worktree 执行。')
  }
  sourceClean(context.worktreeRoot)
  if (readActiveBatchLease(context.worktreeRoot)) fail('活动集成租约存在，local-main 构建被阻止。')
  const mainCommit = resolveCommit(context.worktreeRoot, 'refs/heads/main')
  if (context.head !== mainCommit) fail('local-main HEAD 必须精确等于 refs/heads/main。')
  return {
    mode: 'local-main',
    worktreeRoot: context.worktreeRoot,
    branch: 'main',
    commit: context.head,
    mainCommit,
    sourceClean: true,
    batchId: null,
    manifestPath: null,
    manifestDigest: null,
    features: [],
    leaseRevision: null
  }
}

function localIntegrationSnapshot(context, lease, ownerToken) {
  const registration = listRegisteredWorktrees(context.worktreeRoot).find(
    (entry) => entry.path === context.worktreeRoot
  )
  if (!registration || registration.prunable || registration.branch !== lease.branch) {
    fail('活动集成来源必须是 Git 正常登记的租约 worktree。')
  }
  if (context.branch !== lease.branch) fail('当前集成分支不是活动租约分支。')
  if (context.head !== lease.currentTip) fail('当前集成 HEAD 必须精确等于活动租约 currentTip。')
  ownerMatches(ownerToken, lease.ownerTokenHash)
  sourceClean(context.worktreeRoot)
  const { manifest, manifestDigest } = trackedManifest(context.worktreeRoot, lease)
  if (
    manifest.batchId !== lease.batchId ||
    manifest.branch !== lease.branch ||
    manifest.baseMainCommit !== lease.baseMainCommit
  ) {
    fail('集成批次清单必须精确匹配活动租约的批次、分支和 base。')
  }
  const mainCommit = resolveCommit(context.worktreeRoot, 'refs/heads/main')
  if (!isAncestor(context.worktreeRoot, mainCommit, lease.currentTip)) {
    fail('当前 local main 必须是活动集成 tip 的祖先。')
  }
  const features = manifest.features.map(({ handoff }) => {
    const liveTip = resolveCommit(context.worktreeRoot, `refs/heads/${handoff.branch}`)
    if (liveTip !== handoff.tipCommit) fail(`功能分支引用不再精确指向声明 tip：${handoff.branch}`)
    if (!isAncestor(context.worktreeRoot, handoff.tipCommit, lease.currentTip)) {
      fail(`声明功能 tip 不可从当前集成 tip 到达：${handoff.branch}`)
    }
    return { branch: handoff.branch, commit: handoff.tipCommit }
  })
  if (features.length === 0) fail('集成批次必须声明至少一个功能。')
  return {
    mode: 'local-integration',
    worktreeRoot: context.worktreeRoot,
    branch: lease.branch,
    commit: lease.currentTip,
    mainCommit,
    sourceClean: true,
    batchId: lease.batchId,
    manifestPath: lease.manifestPath,
    manifestDigest,
    features,
    leaseRevision: lease.revision
  }
}

export function verifySharedBuildSource({ repository, ownerToken }) {
  const context = resolveRepositoryContext(repository)
  const main = canonicalMainContext(context.worktreeRoot)
  const lease = readActiveBatchLease(context.worktreeRoot)
  if (context.worktreeRoot === main.worktreeRoot) return localMainSnapshot(context, main)
  if (!lease) fail('只允许规范 main 或活动集成租约分支作为共享构建来源。')
  return localIntegrationSnapshot(context, lease, ownerToken)
}

function mismatch(field, before, after) {
  fail(`${field} 已变化（before: ${JSON.stringify(before)}；after: ${JSON.stringify(after)}）。`)
}

export function assertSharedBuildSourceUnchanged(before, after) {
  const scalarFields = [
    'mode',
    'worktreeRoot',
    'branch',
    'commit',
    'mainCommit',
    'sourceClean',
    'batchId',
    'manifestPath',
    'manifestDigest',
    'leaseRevision'
  ]
  for (const field of scalarFields) {
    if (before[field] !== after[field]) mismatch(field, before[field], after[field])
  }
  const maximum = Math.max(before.features.length, after.features.length)
  for (let index = 0; index < maximum; index += 1) {
    const left = before.features[index]
    const right = after.features[index]
    if (!left || !right) mismatch(`features[${index}]`, left ?? null, right ?? null)
    if (left.branch !== right.branch) mismatch(`features[${index}].branch`, left.branch, right.branch)
    if (left.commit !== right.commit) mismatch(`features[${index}].commit`, left.commit, right.commit)
  }
}
