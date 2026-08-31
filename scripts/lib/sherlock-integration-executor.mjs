import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import {
  acquireActiveBatchLease,
  archiveActiveBatchLease,
  markActiveBatchAccepted,
  readActiveBatchLease,
  recoverActiveBatchOwnership,
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

function manifestDigest(manifestPath) {
  return createHash('sha256').update(readFileSync(manifestPath)).digest('hex')
}

function canonicalMainWorktree(repository) {
  const candidates = listRegisteredWorktrees(repository)
    .filter((entry) => entry.branch === 'main' && !entry.prunable)
    .map((entry) => {
      try { return resolveRepositoryContext(entry.path) } catch { return null }
    })
    .filter(Boolean)
    .filter((context) => context.branch === 'main' && context.gitDirectory === context.commonDirectory)
  if (candidates.length !== 1) fail('必须存在且只存在一个规范 main worktree。')
  return candidates[0]
}

function requireExactConfirmation(value, expected, label) {
  if (typeof value !== 'string' || value !== expected) fail(`${label} 必须精确匹配当前批次状态。`)
}

function resultFor(status, state, beforeCommit, afterCommit, actions) {
  return {
    schemaVersion: 1,
    status,
    batchId: state.lease.batchId,
    branch: state.lease.branch,
    beforeCommit,
    afterCommit,
    actions
  }
}

function recordMainSynchronization({ repository, lease, manifest, manifestPath, previousMainCommit, mainCommit, mergeCommit, checks, now, ownerToken }) {
  const nextManifest = validateIntegrationBatchManifest({
    ...manifest,
    expectedMainCommit: mainCommit,
    mainSynchronizations: [...manifest.mainSynchronizations, {
      previousMainCommit,
      mainCommit,
      mergeCommit,
      verificationCommit: mergeCommit,
      checks,
      recordedAt: now
    }]
  })
  writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8')
  runGit(repository, ['add', '--', lease.manifestPath])
  runGit(repository, ['commit', '-m', `集成：记录 main 同步验证`])
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

function requirePassingPreflight(repository, phase, manifestPath, featureBranch, mainWorktree, expectedAcceptedTip) {
  const report = preflightIntegrationAction({ repository, phase, manifestPath, featureBranch, mainWorktree, expectedAcceptedTip })
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

function exactMergedEvidence(feature, checks, mergeCommit) {
  const merged = feature.merged
  if (!merged || merged.mergeCommit !== mergeCommit || merged.verificationCommit !== mergeCommit) return false
  if (merged.checks.length !== checks.length) return false
  return merged.checks.every((check, index) =>
    check.verifiedCommit === mergeCommit &&
    check.outcome === 'passed' &&
    check.timeoutMs === checks[index].timeoutMs &&
    check.summary === `已在暂存合并树执行：${checks[index].argv.join(' ')}` &&
    JSON.stringify(check.argv) === JSON.stringify(checks[index].argv)
  )
}

function assertLiveFeatureTip(repository, feature) {
  if (resolveCommit(repository, `refs/heads/${feature.handoff.branch}`) !== feature.handoff.tipCommit) {
    fail('功能分支引用不再指向交接卡 tip。')
  }
}

function stagedManifestOnly(repository, manifestPath) {
  const unstaged = runGit(repository, ['diff', '--name-only', '--']).stdout
  const staged = runGit(repository, ['diff', '--cached', '--name-only', '--']).stdout.trim().split('\n').filter(Boolean)
  return unstaged.length === 0 && staged.length === 1 && staged[0] === manifestPath
}

function headManifest(repository, manifestPath) {
  try {
    return validateIntegrationBatchManifest(JSON.parse(runGit(repository, ['show', `HEAD:${manifestPath}`]).stdout))
  } catch {
    return null
  }
}

function boundaryForContinuation(repository, feature, lease) {
  const context = resolveRepositoryContext(repository)
  const parents = mergeParents(repository, context.head)
  if (parents.length !== 2 || parents[1] !== feature.handoff.tipCommit) return null
  if (lease.currentTip !== context.head && parents[0] !== lease.currentTip) return null
  return { context, mergeCommit: context.head }
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
  const actions = mergeActions(featureBranch, state.manifest.integrationChecks)
  if (feature.merged) {
    assertLiveFeatureTip(state.context.worktreeRoot, feature)
    verifyMutationOwner(state.context, state.lease, ownerToken, { requireLeaseTip: false })
    const headRecord = headManifest(state.context.worktreeRoot, state.lease.manifestPath)
    const recordParents = mergeParents(state.context.worktreeRoot, state.context.head)
    const clean = readRepositoryStatus(state.context.worktreeRoot).sourceClean
    if (
      headRecord && !headRecord.features.find((entry) => entry.handoff.branch === featureBranch)?.merged &&
      clean === false && stagedManifestOnly(state.context.worktreeRoot, state.lease.manifestPath)
    ) {
      const boundary = boundaryForContinuation(state.context.worktreeRoot, feature, state.lease)
      if (!boundary || !exactMergedEvidence(feature, state.manifest.integrationChecks, boundary.mergeCommit)) {
        fail('暂存的合并记录不满足精确恢复条件。')
      }
      if (dryRun) return { schemaVersion: 1, status: 'planned', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: boundary.mergeCommit, afterCommit: boundary.mergeCommit, actions }
      runGit(state.context.worktreeRoot, ['commit', '-m', `集成：记录功能 ${featureBranch} 合并验证`])
      const recordCommit = resolveRepositoryContext(state.context.worktreeRoot).head
      const nextLease = updateActiveBatchTip({ repository: state.context.worktreeRoot, ownerToken, expectedRevision: state.lease.revision, expectedTip: state.lease.currentTip, nextTip: recordCommit, updatedAt: now })
      return { schemaVersion: 1, status: 'merged', batchId: nextLease.batchId, branch: nextLease.branch, beforeCommit: boundary.mergeCommit, afterCommit: recordCommit, actions }
    }
    if (
      clean && recordParents.length === 1 && recordParents[0] === state.lease.currentTip &&
      runGit(state.context.worktreeRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', state.context.head]).stdout.trim() === state.lease.manifestPath &&
      runGit(state.context.worktreeRoot, ['show', '-s', '--format=%s', state.context.head]).stdout.trim() === `集成：记录功能 ${featureBranch} 合并验证` &&
      exactMergedEvidence(feature, state.manifest.integrationChecks, state.lease.currentTip)
    ) {
      if (dryRun) return { schemaVersion: 1, status: 'planned', batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: state.context.head, afterCommit: state.context.head, actions }
      const nextLease = updateActiveBatchTip({ repository: state.context.worktreeRoot, ownerToken, expectedRevision: state.lease.revision, expectedTip: state.lease.currentTip, nextTip: state.context.head, updatedAt: now })
      return { schemaVersion: 1, status: 'merged', batchId: nextLease.batchId, branch: nextLease.branch, beforeCommit: state.context.head, afterCommit: state.context.head, actions }
    }
    fail('功能已经记录为完成合并。')
  }
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

export function recoverIntegrationOwnership({ integrationRepository, manifestPath, confirmBatchId, confirmTip }) {
  const state = readManifestForMutation(integrationRepository, manifestPath)
  requireExactConfirmation(confirmBatchId, state.lease.batchId, 'confirmBatchId')
  requireExactConfirmation(confirmTip, state.lease.currentTip, 'confirmTip')
  let recovered
  try {
    recovered = recoverActiveBatchOwnership({
      repository: state.context.worktreeRoot,
      expectedBatchId: confirmBatchId,
      expectedTip: confirmTip,
      expectedManifestDigest: manifestDigest(state.manifestPath)
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
  if (recovered.lease.branch !== state.context.branch || recovered.lease.currentTip !== state.context.head) {
    fail('恢复 owner 的 worktree 分支或 HEAD 已变化。')
  }
  return resultFor('ownership-recovered', state, state.context.head, state.context.head, [
    action('recover-owner', '验证已持久化 owner token、租约、清单字节摘要和当前集成 tip。')
  ])
}

export function synchronizeIntegrationMain({ integrationRepository, manifestPath, ownerToken, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  const main = canonicalMainWorktree(state.context.worktreeRoot)
  sourceClean(main.worktreeRoot, '规范 main worktree')
  requirePassingPreflight(state.context.worktreeRoot, 'sync-main', state.manifestPath, undefined, main.worktreeRoot)
  verifyMutationOwner(state.context, state.lease, ownerToken)
  const mainTip = resolveCommit(main.worktreeRoot, 'refs/heads/main')
  if (main.head !== mainTip) fail('规范 main worktree 的 HEAD 必须精确等于本地 main tip。')
  if (mainTip === state.manifest.expectedMainCommit) fail('当前 local main 没有可同步的新提交。')
  if (!isAncestor(state.context.worktreeRoot, state.manifest.expectedMainCommit, mainTip)) {
    fail('当前 local main 不再是 expectedMainCommit 的后继，拒绝同步。')
  }
  if (isAncestor(state.context.worktreeRoot, mainTip, state.context.head)) {
    fail('当前 local main 已包含在集成历史中，拒绝伪造同步记录。')
  }
  const actions = [
    action('merge-main', '以非 rebase 合并将当前 local main 同步到集成分支。', ['merge', '--no-ff', '--no-commit', 'refs/heads/main']),
    ...state.manifest.integrationChecks.map((check) => action('run-integration-check', '在暂存 main 合并树执行声明的检查。', [...check.argv])),
    action('commit-main-sync', '提交 main 同步边界。', ['commit', '-m', `集成：同步 main ${mainTip}`]),
    action('record-main-sync-evidence', '提交精确 main 同步和检查证据。', ['commit', '-m', '集成：记录 main 同步验证'])
  ]
  if (dryRun) return resultFor('planned', state, state.context.head, state.context.head, actions)

  const beforeCommit = state.context.head
  const merge = runGit(state.context.worktreeRoot, ['merge', '--no-ff', '--no-commit', 'refs/heads/main'], { allowFailure: true })
  if (merge.status !== 0) {
    const inConflict = runGit(state.context.worktreeRoot, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { allowFailure: true }).status === 0
    if (inConflict) return recoveryResult({ batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit, repository: state.context.worktreeRoot, actions })
    fail(`同步 main 失败：${merge.stderr.trim() || merge.stdout.trim()}`)
  }
  try {
    const stagedChecks = runDeclaredChecks(state.context.worktreeRoot, state.manifest.integrationChecks, '0'.repeat(40), now)
    runGit(state.context.worktreeRoot, ['commit', '-m', `集成：同步 main ${mainTip}`])
    const mergeCommit = resolveRepositoryContext(state.context.worktreeRoot).head
    const parents = mergeParents(state.context.worktreeRoot, mergeCommit)
    if (parents.length !== 2 || parents[0] !== beforeCommit || parents[1] !== mainTip) fail('main 同步合并边界父提交不匹配。')
    const checks = stagedChecks.map((check) => ({ ...check, verifiedCommit: mergeCommit }))
    const advancedLease = updateActiveBatchTip({
      repository: state.context.worktreeRoot,
      ownerToken,
      expectedRevision: state.lease.revision,
      expectedTip: beforeCommit,
      nextTip: mergeCommit,
      updatedAt: now
    })
    const afterCommit = recordMainSynchronization({
      repository: state.context.worktreeRoot,
      lease: advancedLease,
      manifest: state.manifest,
      manifestPath: state.manifestPath,
      previousMainCommit: state.manifest.expectedMainCommit,
      mainCommit: mainTip,
      mergeCommit,
      checks,
      now,
      ownerToken
    })
    return resultFor('main-synchronized', state, beforeCommit, afterCommit, actions)
  } catch (error) {
    if (error && typeof error === 'object' && error.checkFailure) {
      const aborted = runGit(state.context.worktreeRoot, ['merge', '--abort'], { allowFailure: true })
      if (aborted.status === 0) fail(error.message)
    }
    return recoveryResult({ batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit, repository: state.context.worktreeRoot, actions })
  }
}

export function acceptIntegrationBatch({ integrationRepository, manifestPath, commit, confirmBatchId, ownerToken, now }) {
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  requireExactConfirmation(confirmBatchId, state.lease.batchId, 'confirmBatchId')
  requireExactConfirmation(commit, state.context.head, 'commit')
  requirePassingPreflight(state.context.worktreeRoot, 'accept', state.manifestPath, undefined, undefined, commit)
  verifyMutationOwner(state.context, state.lease, ownerToken)
  try {
    markActiveBatchAccepted({
      repository: state.context.worktreeRoot,
      ownerToken,
      expectedRevision: state.lease.revision,
      acceptedTip: commit,
      acceptedManifestDigest: manifestDigest(state.manifestPath),
      acceptedAt: now
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
  return resultFor('accepted', state, state.context.head, state.context.head, [
    action('accept-batch', '仅在租约中记录精确集成 tip 与原始清单字节摘要。')
  ])
}

export function promoteIntegrationBatch({ integrationRepository, manifestPath, mainWorktree, confirmBatchId, confirmTip, ownerToken, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  const canonical = canonicalMainWorktree(state.context.worktreeRoot)
  if (path.resolve(mainWorktree) !== canonical.worktreeRoot) fail('mainWorktree 必须精确等于已登记的规范 main worktree。')
  sourceClean(canonical.worktreeRoot, '规范 main worktree')
  requireExactConfirmation(confirmBatchId, state.lease.batchId, 'confirmBatchId')
  requireExactConfirmation(confirmTip, state.context.head, 'confirmTip')
  requirePassingPreflight(state.context.worktreeRoot, 'promote', state.manifestPath, undefined, canonical.worktreeRoot, confirmTip)
  verifyMutationOwner(state.context, state.lease, ownerToken)
  if (canonical.head !== state.manifest.expectedMainCommit) fail('规范 main worktree 的 HEAD 不再匹配 expectedMainCommit。')
  if (state.lease.acceptedTip !== state.context.head || state.lease.acceptedManifestDigest !== manifestDigest(state.manifestPath)) {
    fail('租约验收 tip 或清单字节摘要已过期。')
  }
  if (!isAncestor(state.context.worktreeRoot, canonical.head, state.context.head)) fail('集成 tip 不是规范 main 的 fast-forward 后继。')
  for (const feature of state.manifest.features) {
    if (!isAncestor(state.context.worktreeRoot, feature.handoff.tipCommit, state.context.head)) {
      fail(`功能 tip 未包含在集成 tip 中：${feature.handoff.branch}`)
    }
  }
  const actions = [action('promote-fast-forward', '仅以 --ff-only 将已验收集成分支推进规范 main。', ['merge', '--ff-only', state.lease.branch]), action('archive-lease', '将活动租约无覆盖归档为 promoted。')]
  if (dryRun) return resultFor('planned', state, state.context.head, state.context.head, actions)
  const promoted = runGit(canonical.worktreeRoot, ['merge', '--ff-only', state.lease.branch], { allowFailure: true })
  if (promoted.status !== 0) fail(`推进 main 失败：${promoted.stderr.trim() || promoted.stdout.trim()}`)
  const mainAfter = resolveRepositoryContext(canonical.worktreeRoot).head
  if (mainAfter !== state.context.head) fail('推进后的 main HEAD 与已验收集成 tip 不匹配。')
  for (const feature of state.manifest.features) {
    if (!isAncestor(canonical.worktreeRoot, feature.handoff.tipCommit, mainAfter)) fail(`推进后的 main 缺少功能 tip：${feature.handoff.branch}`)
  }
  try {
    archiveActiveBatchLease({ repository: state.context.worktreeRoot, ownerToken, expectedBatchId: state.lease.batchId, outcome: 'promoted', archivedAt: now })
  } catch {
    return recoveryResult({ batchId: state.lease.batchId, branch: state.lease.branch, beforeCommit: state.context.head, repository: state.context.worktreeRoot, actions })
  }
  return resultFor('promoted', state, state.context.head, mainAfter, actions)
}

export function cancelIntegrationBatch({ integrationRepository, manifestPath, confirmBatchId, explicitCancellation, dryRun, now }) {
  if (typeof dryRun !== 'boolean') fail('dryRun 必须为布尔值。')
  checkedNow(now)
  const state = readManifestForMutation(integrationRepository, manifestPath)
  requireExactConfirmation(confirmBatchId, state.lease.batchId, 'confirmBatchId')
  if (explicitCancellation !== true) fail('取消批次必须提供 explicitCancellation。')
  const actions = [action('archive-lease', '仅归档活动租约为 cancelled，不清理分支、worktree 或文件。')]
  if (dryRun) return resultFor('planned', state, state.context.head, state.context.head, actions)
  try {
    archiveActiveBatchLease({ repository: state.context.worktreeRoot, expectedBatchId: state.lease.batchId, outcome: 'cancelled', archivedAt: now, explicitCancellation: true })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
  return resultFor('cancelled', state, state.context.head, state.context.head, actions)
}
