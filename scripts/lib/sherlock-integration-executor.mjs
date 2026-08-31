import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  acquireActiveBatchLease,
  readActiveBatchLease,
  updateActiveBatchTip
} from './sherlock-active-batch.mjs'
import {
  createIntegrationBatchManifest,
  validateFeatureHandoff
} from './sherlock-integration-model.mjs'
import {
  isAncestor,
  listRegisteredWorktrees,
  readRepositoryStatus,
  resolveCommit,
  resolveRepositoryContext,
  runGit
} from './sherlock-git-state.mjs'

const batchPattern = /^\d{8}-\d{2}$/

function fail(message) {
  const error = new Error(`集成批次执行失败：${message}`)
  error.integrationExit = 1
  throw error
}

function branchFor(batchId) {
  if (typeof batchId !== 'string' || !batchPattern.test(batchId)) fail('batchId 必须匹配 YYYYMMDD-NN。')
  return `codex/integration/${batchId}`
}

function manifestPathFor(batchId) {
  return `config/sherlock-integration-batches/${batchId}.json`
}

function strictNow(now) {
  if (typeof now !== 'string' || Number.isNaN(Date.parse(now)) || new Date(now).toISOString() !== now) {
    fail('now 必须是规范 ISO 时间。')
  }
  return now
}

function sourceClean(repository, label) {
  const status = readRepositoryStatus(repository)
  if (!status.sourceClean) fail(`${label} 必须没有未提交的源码改动。`)
}

function absentReference(repository, reference, label) {
  const result = runGit(repository, ['show-ref', '--verify', '--quiet', '--', reference], { allowFailure: true })
  if (result.status === 0) fail(`${label} 已存在：${reference}`)
  if (result.status !== 1) fail(`无法检查 ${label}：${reference}`)
}

function canonicalMain(repository) {
  let context
  try {
    context = resolveRepositoryContext(repository)
  } catch {
    fail('create 只能从精确的规范 main worktree 执行。')
  }
  if (context.branch !== 'main' || context.gitDirectory !== context.commonDirectory) {
    fail('create 只能从精确的规范 main worktree 执行。')
  }
  const registered = listRegisteredWorktrees(context.worktreeRoot)
  const exact = registered.find((entry) => entry.path === context.worktreeRoot)
  if (!exact || exact.branch !== 'main' || exact.prunable) fail('规范 main worktree 未被 Git 正常登记。')
  sourceClean(context.worktreeRoot, '规范 main worktree')
  return context
}

function currentMainTip(repository) {
  return resolveCommit(repository, 'refs/heads/main')
}

function requireIgnoredWorktreeDirectory(repository) {
  const result = runGit(repository, ['check-ignore', '-q', '--', '.worktrees/'], { allowFailure: true })
  if (result.status !== 0) fail('.worktrees/ 必须由 Git 忽略。')
}

function loadHandoffs(repository, handoffPaths, integrationChecks, batchId, beforeCommit, now) {
  if (!Array.isArray(handoffPaths) || handoffPaths.length === 0) fail('至少需要一张交接卡。')
  const handoffs = handoffPaths.map((handoffPath, index) => {
    if (typeof handoffPath !== 'string' || handoffPath.length === 0) fail(`handoffPaths[${index}] 必须是非空路径。`)
    let parsed
    try {
      parsed = JSON.parse(readFileSync(handoffPath, 'utf8'))
    } catch (error) {
      fail(`无法读取交接卡 ${handoffPath}：${error instanceof Error ? error.message : String(error)}`)
    }
    const handoff = validateFeatureHandoff(parsed)
    const liveTip = resolveCommit(repository, `refs/heads/${handoff.branch}`)
    if (liveTip !== handoff.tipCommit) fail(`交接卡功能分支已移动：${handoff.branch}`)
    if (!isAncestor(repository, handoff.baseCommit, handoff.tipCommit)) {
      fail(`交接卡功能基线不是 tip 的祖先：${handoff.branch}`)
    }
    return handoff
  })
  return createIntegrationBatchManifest({
    batchId,
    branch: branchFor(batchId),
    baseMainCommit: beforeCommit,
    handoffs,
    integrationChecks,
    createdAt: strictNow(now)
  })
}

function noActiveLease(repository) {
  const lease = readActiveBatchLease(repository)
  if (lease) fail(`已有活动集成租约：${lease.batchId}`)
}

function targetAbsent(mainContext, worktreePath, batchId) {
  const normalized = path.resolve(worktreePath)
  const worktreeRoot = path.join(mainContext.worktreeRoot, '.worktrees')
  const relativeTarget = path.relative(worktreeRoot, normalized)
  if (!relativeTarget || relativeTarget === '..' || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
    fail('集成 worktree 路径必须位于规范 main 的 .worktrees/ 目录。')
  }
  if (existsSync(normalized)) fail(`集成 worktree 路径已存在：${normalized}`)
  const registered = listRegisteredWorktrees(mainContext.worktreeRoot)
  if (registered.some((entry) => entry.path === normalized)) fail(`集成 worktree 已被 Git 登记：${normalized}`)
  absentReference(mainContext.worktreeRoot, `refs/heads/${branchFor(batchId)}`, '集成分支')
  const manifestPath = manifestPathFor(batchId)
  if (existsSync(path.join(mainContext.worktreeRoot, manifestPath))) fail(`集成清单路径已存在：${manifestPath}`)
  const tracked = runGit(mainContext.worktreeRoot, ['ls-files', '--error-unmatch', '--', manifestPath], { allowFailure: true })
  if (tracked.status === 0) fail(`集成清单路径已被跟踪：${manifestPath}`)
  if (tracked.status !== 1) fail(`无法检查集成清单路径：${manifestPath}`)
  const inTip = runGit(mainContext.worktreeRoot, ['cat-file', '-e', `${mainContext.head}:${manifestPath}`], { allowFailure: true })
  if (inTip.status === 0) fail(`main 已包含集成清单路径：${manifestPath}`)
  if (inTip.status !== 128) fail(`无法检查 main 中的集成清单路径：${manifestPath}`)
  return normalized
}

function requireAdoptableIntegration(repository, batchId) {
  const context = resolveRepositoryContext(repository)
  const branch = branchFor(batchId)
  if (!context.linkedWorktree) fail('adopt 只能接管 Git 已登记的 linked worktree。')
  if (context.branch !== branch) fail(`adopt worktree 必须位于 ${branch}。`)
  const registered = listRegisteredWorktrees(context.worktreeRoot)
  const entry = registered.find((candidate) => candidate.path === context.worktreeRoot)
  if (!entry || entry.branch !== branch || entry.prunable) fail('adopt worktree 未被 Git 正常登记。')
  sourceClean(context.worktreeRoot, 'adopt 集成 worktree')
  const mainTip = currentMainTip(context.worktreeRoot)
  if (context.head !== mainTip) fail('adopt worktree 的 HEAD 必须精确等于当前本地 main tip。')
  const manifestPath = manifestPathFor(batchId)
  if (existsSync(path.join(context.worktreeRoot, manifestPath))) fail(`集成清单路径已存在：${manifestPath}`)
  const tracked = runGit(context.worktreeRoot, ['ls-files', '--error-unmatch', '--', manifestPath], { allowFailure: true })
  if (tracked.status === 0) fail(`集成清单路径已被跟踪：${manifestPath}`)
  if (tracked.status !== 1) fail(`无法检查集成清单路径：${manifestPath}`)
  return context
}

function action(kind, description, argv) {
  return argv ? { kind, description, argv } : { kind, description }
}

function recoveryResult({ batchId, branch, beforeCommit, repository, actions }) {
  let afterCommit = beforeCommit
  try { afterCommit = resolveRepositoryContext(repository).head } catch {}
  return {
    schemaVersion: 1,
    status: 'recovery-required',
    batchId,
    branch,
    beforeCommit,
    afterCommit,
    actions,
    recoveryCommand: `npm run git:integration -- recover-owner --repo ${JSON.stringify(repository)} --manifest ${manifestPathFor(batchId)}`
  }
}

function establishBatch({ repository, context, batchId, manifest, beforeCommit, dryRun, createArgv }) {
  const branch = branchFor(batchId)
  const manifestPath = manifestPathFor(batchId)
  const actions = []
  if (createArgv) actions.push(action('create-worktree', '创建新的集成 worktree。', createArgv))
  else actions.push(action('adopt-worktree', '接管既有集成 worktree，不移动分支或路径。'))
  actions.push(action('acquire-lease', '取得活动集成批次租约。'))
  actions.push(action('write-manifest', '写入受跟踪集成批次清单。'))
  actions.push(action('commit-manifest', '提交集成批次清单。', ['commit', '-m', `集成：创建批次 ${batchId}`]))
  if (dryRun) {
    return { schemaVersion: 1, status: 'planned', batchId, branch, beforeCommit, afterCommit: beforeCommit, actions }
  }

  let integrationRepository = context.worktreeRoot
  let leaseAcquired = false
  try {
    if (createArgv) {
      runGit(context.worktreeRoot, createArgv)
      integrationRepository = path.resolve(createArgv[4])
    }
    const integrationContext = resolveRepositoryContext(integrationRepository)
    if (integrationContext.branch !== branch || integrationContext.head !== beforeCommit) {
      fail('创建或接管后的集成 worktree 不再位于预期分支和提交。')
    }
    const ownerToken = randomBytes(32).toString('hex')
    const acquired = acquireActiveBatchLease({
      repository: integrationContext.worktreeRoot,
      ownerToken,
      lease: {
        batchId,
        branch,
        manifestPath,
        baseMainCommit: beforeCommit,
        currentTip: beforeCommit,
        createdAt: manifest.createdAt,
        updatedAt: manifest.createdAt
      }
    })
    if (!acquired.created) fail('活动集成租约已存在，拒绝重用。')
    leaseAcquired = true
    const diskManifest = path.join(integrationContext.worktreeRoot, manifestPath)
    mkdirSync(path.dirname(diskManifest), { recursive: true })
    writeFileSync(diskManifest, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    runGit(integrationContext.worktreeRoot, ['add', '--', manifestPath])
    runGit(integrationContext.worktreeRoot, ['commit', '-m', `集成：创建批次 ${batchId}`])
    const afterCommit = resolveRepositoryContext(integrationContext.worktreeRoot).head
    if (resolveCommit(integrationContext.worktreeRoot, `${afterCommit}^`) !== beforeCommit) {
      fail('集成清单必须成为集成分支的首个提交。')
    }
    const files = runGit(integrationContext.worktreeRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', afterCommit]).stdout.trim()
    if (files !== manifestPath) fail('首个集成提交只能包含批次清单。')
    updateActiveBatchTip({
      repository: integrationContext.worktreeRoot,
      ownerToken,
      expectedRevision: acquired.lease.revision,
      expectedTip: beforeCommit,
      nextTip: afterCommit,
      updatedAt: manifest.createdAt
    })
    return { schemaVersion: 1, status: 'prepared', batchId, branch, beforeCommit, afterCommit, actions }
  } catch (error) {
    if (leaseAcquired) return recoveryResult({ batchId, branch, beforeCommit, repository: integrationRepository, actions })
    throw error
  }
}

export function createIntegrationBatch({ mainRepository, worktreePath, batchId, handoffPaths, integrationChecks, dryRun, now }) {
  if (typeof worktreePath !== 'string' || worktreePath.length === 0) fail('worktreePath 必须是非空路径。')
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  const main = canonicalMain(mainRepository)
  const branch = branchFor(batchId)
  requireIgnoredWorktreeDirectory(main.worktreeRoot)
  const target = targetAbsent(main, worktreePath, batchId)
  noActiveLease(main.worktreeRoot)
  const beforeCommit = currentMainTip(main.worktreeRoot)
  if (main.head !== beforeCommit) fail('规范 main worktree 的 HEAD 必须精确等于本地 main tip。')
  const manifest = loadHandoffs(main.worktreeRoot, handoffPaths, integrationChecks, batchId, beforeCommit, now)
  return establishBatch({
    repository: main.worktreeRoot,
    context: main,
    batchId,
    manifest,
    beforeCommit,
    dryRun,
    createArgv: ['worktree', 'add', '-b', branch, target, beforeCommit]
  })
}

export function adoptIntegrationBatch({ integrationRepository, batchId, handoffPaths, integrationChecks, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  const integration = requireAdoptableIntegration(integrationRepository, batchId)
  noActiveLease(integration.worktreeRoot)
  const beforeCommit = integration.head
  const manifest = loadHandoffs(integration.worktreeRoot, handoffPaths, integrationChecks, batchId, beforeCommit, now)
  return establishBatch({
    repository: integration.worktreeRoot,
    context: integration,
    batchId,
    manifest,
    beforeCommit,
    dryRun
  })
}
