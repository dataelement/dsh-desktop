import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import {
  acquireActiveBatchLease,
  readActiveBatchLease,
  updateActiveBatchTip
} from './sherlock-active-batch.mjs'
import {
  createIntegrationBatchManifest,
  validateFeatureHandoff,
  validateIntegrationBatchManifest
} from './sherlock-integration-model.mjs'
import { preflightIntegrationAction } from './sherlock-integration-preflight.mjs'
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
    actions: [
      ...actions.map(({ kind, description }) => ({ kind, description })),
      action('recovery-state-preserved', '已保留现有批次状态，待后续显式恢复流程处理。')
    ]
  }
}

function posixQuote(value) {
  if (typeof value !== 'string' || value.includes('\0')) fail('恢复命令参数必须是不含 NUL 的字符串。')
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

export function formatIntegrationRecoveryCommand({ repository, manifestPath, featureBranch }) {
  return `npm run git:integration -- continue --repo ${posixQuote(repository)} --manifest ${posixQuote(manifestPath)} --feature ${posixQuote(featureBranch)}`
}

function checkedNow(now) {
  return strictNow(now)
}

function readManifestForMutation(repository, manifestPath) {
  const context = resolveRepositoryContext(repository)
  const lease = readActiveBatchLease(context.worktreeRoot)
  if (!lease) fail('不存在活动集成租约。')
  const expectedPath = path.join(context.worktreeRoot, lease.manifestPath)
  if (path.resolve(manifestPath) !== path.resolve(expectedPath)) fail('manifestPath 必须精确匹配活动租约。')
  runGit(context.worktreeRoot, ['ls-files', '--error-unmatch', '--', lease.manifestPath])
  let manifest
  try {
    manifest = validateIntegrationBatchManifest(JSON.parse(readFileSync(expectedPath, 'utf8')))
  } catch (error) {
    fail(`无法读取集成批次清单：${error instanceof Error ? error.message : String(error)}`)
  }
  if (manifest.batchId !== lease.batchId || manifest.branch !== lease.branch) fail('集成清单与活动租约不匹配。')
  return { context, lease, manifest, manifestPath: expectedPath }
}

function verifyMutationOwner(context, lease, ownerToken, { requireLeaseTip = true } = {}) {
  if (typeof ownerToken !== 'string' || ownerToken.length === 0 || ownerToken.includes('\0')) fail('ownerToken 无效。')
  if (context.branch !== lease.branch) fail('当前 worktree 必须位于活动租约分支。')
  if (requireLeaseTip && context.head !== lease.currentTip) fail('当前 HEAD 必须精确等于活动租约 currentTip。')
  const hash = createHash('sha256').update(ownerToken, 'utf8').digest('hex')
  if (!timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(lease.ownerTokenHash, 'utf8'))) fail('owner token 不匹配。')
  const ownerPath = path.join(context.gitDirectory, 'sherlock-integration-owner.json')
  if (!existsSync(ownerPath) || (statSync(ownerPath).mode & 0o777) !== 0o600) fail('owner token 文件不可用。')
  let record
  try { record = JSON.parse(readFileSync(ownerPath, 'utf8')) } catch { fail('owner token 文件不是有效 JSON。') }
  if (!record || record.schemaVersion !== 1 || record.batchId !== lease.batchId || typeof record.ownerToken !== 'string') {
    fail('持久 owner token 与租约不匹配。')
  }
  const persistedHash = createHash('sha256').update(record.ownerToken, 'utf8').digest('hex')
  if (!timingSafeEqual(Buffer.from(persistedHash, 'utf8'), Buffer.from(lease.ownerTokenHash, 'utf8')) || record.ownerToken !== ownerToken) {
    fail('持久 owner token 与租约不匹配。')
  }
}

export function readPersistedIntegrationOwnerToken(repository) {
  const context = resolveRepositoryContext(repository)
  const ownerPath = path.join(context.gitDirectory, 'sherlock-integration-owner.json')
  let record
  try { record = JSON.parse(readFileSync(ownerPath, 'utf8')) } catch { fail('无法读取持久 owner token。') }
  if (!record || record.schemaVersion !== 1 || typeof record.ownerToken !== 'string' || record.ownerToken.length === 0 || record.ownerToken.includes('\0')) {
    fail('持久 owner token 无效。')
  }
  return record.ownerToken
}

function selectedFeature(manifest, featureBranch) {
  const feature = manifest.features.find((entry) => entry.handoff.branch === featureBranch)
  if (!feature) fail(`功能分支不在集成批次中：${featureBranch}`)
  return feature
}

function requirePassingPreflight(repository, phase, manifestPath, featureBranch) {
  const report = preflightIntegrationAction({ repository, phase, manifestPath, featureBranch })
  if (!report.ok) {
    const details = report.findings.filter((entry) => entry.severity === 'error').map((entry) => entry.message).join('；')
    fail(`预检未通过：${details || '未知原因'}`)
  }
  return report
}

function runDeclaredChecks(repository, checks, verifiedCommit, now) {
  const evidence = []
  for (const check of checks) {
    const result = spawnSync(check.argv[0], check.argv.slice(1), {
      cwd: repository,
      encoding: 'utf8',
      shell: false,
      timeout: check.timeoutMs,
      maxBuffer: 64 * 1024 * 1024
    })
    if (result.error || result.status !== 0) {
      const diagnostic = result.error?.message || result.stderr || result.stdout || `退出码 ${result.status}`
      const error = new Error(`集成检查失败：${check.argv.join(' ')}；${diagnostic.trim()}`)
      error.checkFailure = true
      throw error
    }
    evidence.push({
      argv: [...check.argv],
      outcome: 'passed',
      summary: `已在暂存合并树执行：${check.argv.join(' ')}`,
      verifiedCommit,
      completedAt: now,
      timeoutMs: check.timeoutMs
    })
  }
  return evidence
}

function mergeParents(repository, commit) {
  const text = runGit(repository, ['show', '-s', '--format=%P', '--end-of-options', commit]).stdout.trim()
  return text ? text.split(' ') : []
}

function manifestWithMergedFeature(manifest, featureBranch, merged) {
  return validateIntegrationBatchManifest({
    ...manifest,
    features: manifest.features.map((feature) => feature.handoff.branch === featureBranch ? { ...feature, merged } : feature)
  })
}

function recordMergedFeature({ repository, lease, manifest, manifestPath, featureBranch, mergeCommit, checks, now, ownerToken }) {
  const nextManifest = manifestWithMergedFeature(manifest, featureBranch, {
    mergeCommit,
    verificationCommit: mergeCommit,
    checks,
    recordedAt: now
  })
  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8')
  runGit(repository, ['add', '--', lease.manifestPath])
  runGit(repository, ['commit', '-m', `集成：记录功能 ${featureBranch} 合并验证`])
  const recordCommit = resolveRepositoryContext(repository).head
  updateActiveBatchTip({
    repository,
    ownerToken,
    expectedRevision: lease.revision,
    expectedTip: lease.currentTip,
    nextTip: recordCommit,
    updatedAt: now
  })
  return recordCommit
}

function mergeRecoveryResult({ repository, manifestPath, featureBranch, beforeCommit, actions }) {
  const state = readManifestForMutation(repository, manifestPath)
  return {
    ...recoveryResult({ batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit, repository, actions }),
    recoveryCommand: formatIntegrationRecoveryCommand({ repository: state.context.worktreeRoot, manifestPath, featureBranch })
  }
}

function mergeActions(featureBranch, checks) {
  return [
    action('merge-feature', '以完整功能历史创建未提交的合并边界。', ['merge', '--no-ff', '--no-commit', featureBranch]),
    ...checks.map((check) => action('run-integration-check', '在暂存合并树执行声明的检查。', [...check.argv])),
    action('commit-merge', '提交中文功能合并边界。', ['commit', '-m', `集成：合并功能 ${featureBranch}`]),
    action('record-merge-evidence', '提交精确的合并和检查证据。', ['commit', '-m', `集成：记录功能 ${featureBranch} 合并验证`])
  ]
}

export function mergeIntegrationFeature({ integrationRepository, manifestPath, featureBranch, ownerToken, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  const feature = selectedFeature(state.manifest, featureBranch)
  if (feature.merged) fail('功能已经记录为完成合并。')
  requirePassingPreflight(state.context.worktreeRoot, 'merge', state.manifestPath, featureBranch)
  verifyMutationOwner(state.context, state.lease, ownerToken)
  if (isAncestor(state.context.worktreeRoot, feature.handoff.tipCommit, state.context.head)) fail('功能 tip 已在集成历史中；请使用 continue 恢复记录。')
  const actions = mergeActions(featureBranch, state.manifest.integrationChecks)
  if (dryRun) return { schemaVersion: 1, status: 'planned', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: state.context.head, afterCommit: state.context.head, actions }

  const beforeCommit = state.context.head
  const merge = runGit(state.context.worktreeRoot, ['merge', '--no-ff', '--no-commit', featureBranch], { allowFailure: true })
  if (merge.status !== 0) {
    const inConflict = runGit(state.context.worktreeRoot, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { allowFailure: true }).status === 0
    if (inConflict) {
      return {
        schemaVersion: 1,
        status: 'conflict',
        batchId: state.lease.batchId,
        branch: state.lease.branch,
        beforeCommit,
        afterCommit: beforeCommit,
        actions: [...actions, action('merge-conflict-preserved', '已保留 MERGE_HEAD 和未合并文件，等待显式解决。')],
        conflictContext: { integrationTip: beforeCommit, featureTip: feature.handoff.tipCommit, featureBase: feature.handoff.baseCommit }
      }
    }
    fail(`合并命令失败：${merge.stderr.trim() || merge.stdout.trim()}`)
  }
  try {
    const stagedChecks = runDeclaredChecks(state.context.worktreeRoot, state.manifest.integrationChecks, '0'.repeat(40), now)
    runGit(state.context.worktreeRoot, ['commit', '-m', `集成：合并功能 ${featureBranch}`])
    const mergeCommit = resolveRepositoryContext(state.context.worktreeRoot).head
    const parents = mergeParents(state.context.worktreeRoot, mergeCommit)
    if (parents.length !== 2 || parents[0] !== beforeCommit || parents[1] !== feature.handoff.tipCommit) fail('合并边界父提交与预期功能 tip 不匹配。')
    const checks = stagedChecks.map((check) => ({ ...check, verifiedCommit: mergeCommit }))
    const advancedLease = updateActiveBatchTip({
      repository: state.context.worktreeRoot,
      ownerToken,
      expectedRevision: state.lease.revision,
      expectedTip: beforeCommit,
      nextTip: mergeCommit,
      updatedAt: now
    })
    const afterCommit = recordMergedFeature({ repository: state.context.worktreeRoot, lease: advancedLease, manifest: state.manifest, manifestPath: state.manifestPath, featureBranch, mergeCommit, checks, now, ownerToken })
    return { schemaVersion: 1, status: 'merged', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit, afterCommit, actions }
  } catch (error) {
    if (error && typeof error === 'object' && error.checkFailure) {
      const aborted = runGit(state.context.worktreeRoot, ['merge', '--abort'], { allowFailure: true })
      if (aborted.status === 0) fail(error.message)
      return mergeRecoveryResult({ repository: state.context.worktreeRoot, manifestPath: state.manifestPath, featureBranch, beforeCommit, actions })
    }
    return mergeRecoveryResult({ repository: state.context.worktreeRoot, manifestPath: state.manifestPath, featureBranch, beforeCommit, actions })
  }
}

export function continueIntegrationFeature({ integrationRepository, manifestPath, featureBranch, ownerToken, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  const feature = selectedFeature(state.manifest, featureBranch)
  if (feature.merged) fail('功能已经记录为完成合并。')
  requirePassingPreflight(state.context.worktreeRoot, 'continue', state.manifestPath, featureBranch)
  verifyMutationOwner(state.context, state.lease, ownerToken, { requireLeaseTip: false })
  const parents = mergeParents(state.context.worktreeRoot, state.context.head)
  const leaseAlreadyAdvanced = state.lease.currentTip === state.context.head
  if (
    parents.length !== 2 ||
    parents[1] !== feature.handoff.tipCommit ||
    (!leaseAlreadyAdvanced && parents[0] !== state.lease.currentTip)
  ) {
    fail('continue 只能记录父提交精确匹配租约 tip 和功能 tip 的边界合并。')
  }
  const actions = mergeActions(featureBranch, state.manifest.integrationChecks)
  if (dryRun) return { schemaVersion: 1, status: 'planned', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: state.context.head, afterCommit: state.context.head, actions }
  const mergeCommit = state.context.head
  try {
    const checks = runDeclaredChecks(state.context.worktreeRoot, state.manifest.integrationChecks, mergeCommit, now)
    const afterCommit = recordMergedFeature({ repository: state.context.worktreeRoot, lease: state.lease, manifest: state.manifest, manifestPath: state.manifestPath, featureBranch, mergeCommit, checks, now, ownerToken })
    return { schemaVersion: 1, status: 'merged', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: mergeCommit, afterCommit, actions }
  } catch {
    return mergeRecoveryResult({ repository: state.context.worktreeRoot, manifestPath: state.manifestPath, featureBranch, beforeCommit: mergeCommit, actions })
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
  let worktreeCreated = false
  try {
    if (createArgv) {
      runGit(context.worktreeRoot, createArgv)
      integrationRepository = path.resolve(createArgv[4])
      worktreeCreated = true
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
    if (leaseAcquired || worktreeCreated) {
      return recoveryResult({ batchId, branch, beforeCommit, repository: integrationRepository, actions })
    }
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
