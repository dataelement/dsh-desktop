import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  diffNameStatus,
  isAncestor,
  listRangeCommits,
  listRegisteredWorktrees,
  readRepositoryStatus,
  resolveCommit,
  resolveRepositoryContext,
  runGit
} from './sherlock-git-state.mjs'
import { validateFeatureHandoff, validateIntegrationBatchManifest } from './sherlock-integration-model.mjs'

const fullSha = /^[0-9a-f]{40}$/
const phases = new Set(['prepare', 'merge', 'continue', 'recover-owner', 'sync-main', 'accept', 'promote', 'cancel'])
const phaseRequirements = Object.freeze({
  prepare: {
    manifest: 'forbidden', feature: 'forbidden', mainWorktree: 'forbidden', acceptedTip: 'forbidden',
    sourceClean: true, action: 'prepare-batch', description: '准备创建新的集成批次。'
  },
  merge: {
    manifest: 'required', feature: 'required', mainWorktree: 'forbidden', acceptedTip: 'forbidden',
    sourceClean: true, noMergeHead: true, unrecordedFeature: true, action: 'merge-feature', description: '验证合并指定功能。'
  },
  continue: {
    manifest: 'required', feature: 'required', mainWorktree: 'forbidden', acceptedTip: 'forbidden',
    sourceClean: true, continuation: true, action: 'continue-merge', description: '验证继续或恢复指定功能的合并。'
  },
  'recover-owner': {
    manifest: 'required', feature: 'forbidden', mainWorktree: 'forbidden', acceptedTip: 'required',
    sourceClean: true, integrationBranch: true, action: 'recover-owner', description: '验证集成批次的 owner 恢复。'
  },
  'sync-main': {
    manifest: 'required', feature: 'forbidden', mainWorktree: 'required', acceptedTip: 'forbidden',
    sourceClean: true, action: 'synchronize-main', description: '验证与 main 的同步。'
  },
  accept: {
    manifest: 'required', feature: 'forbidden', mainWorktree: 'forbidden', acceptedTip: 'required',
    sourceClean: true, allFeaturesMerged: true, action: 'accept-batch', description: '验证集成批次验收。'
  },
  promote: {
    manifest: 'required', feature: 'forbidden', mainWorktree: 'required', acceptedTip: 'required',
    sourceClean: true, allFeaturesMerged: true, action: 'promote-fast-forward', description: '验证向 main 的 fast-forward 推进。'
  },
  cancel: {
    manifest: 'required', feature: 'forbidden', mainWorktree: 'forbidden', acceptedTip: 'forbidden',
    action: 'cancel-batch', description: '验证显式取消集成批次。'
  }
})

function finding(code, severity, message, details) {
  return details === undefined ? { code, severity, message } : { code, severity, message, details }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function readPatchId(repository, commit) {
  try {
    const patch = runGit(repository, [
      'show',
      '--format=',
      '--no-ext-diff',
      '--no-textconv',
      '--end-of-options',
      commit
    ])
    const result = spawnSync('git', ['-C', path.resolve(repository), 'patch-id', '--stable'], {
      input: patch.stdout,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
    if (result.error || result.status !== 0) return null
    const patchId = result.stdout.trim().split(/\s+/)[0]
    return /^[0-9a-f]{40}$/.test(patchId) ? patchId : null
  } catch {
    return null
  }
}

function reportFor(repository, phase) {
  const context = resolveRepositoryContext(repository)
  return {
    schemaVersion: 1,
    ok: true,
    phase,
    branch: context.branch,
    head: context.head,
    findings: [],
    plannedActions: []
  }
}

function addError(report, code, message, details) {
  report.findings.push(finding(code, 'error', message, details))
  report.ok = false
}

function addInfo(report, code, message, details) {
  report.findings.push(finding(code, 'info', message, details))
}

function attempt(report, code, action) {
  try {
    return action()
  } catch (error) {
    addError(report, code, error instanceof Error ? error.message : String(error))
    return undefined
  }
}

function featureReport(repository, phase) {
  return reportFor(repository, phase)
}

export function verifyFeatureHandoff({ repository, handoff, batchMainCommit }) {
  const report = featureReport(repository, 'merge')
  let card
  try {
    card = validateFeatureHandoff(handoff)
  } catch (error) {
    addError(report, 'feature-handoff-invalid', error instanceof Error ? error.message : String(error))
    return report
  }

  const context = resolveRepositoryContext(repository)
  let liveTip
  try {
    liveTip = resolveCommit(context.worktreeRoot, `refs/heads/${card.branch}`)
  } catch (error) {
    addError(report, 'feature-ref-missing', `功能分支引用不可解析：${card.branch}`, { branch: card.branch })
  }
  if (liveTip && liveTip !== card.tipCommit) {
    addError(report, 'feature-ref-moved', '功能分支引用不再指向交接卡 tip。', { expected: card.tipCommit, actual: liveTip, branch: card.branch })
  }

  const worktrees = attempt(report, 'feature-worktree-list-failed', () => listRegisteredWorktrees(context.worktreeRoot)) ?? []
  for (const worktree of worktrees.filter((entry) => entry.branch === card.branch)) {
    if (worktree.prunable) {
      addError(report, 'feature-worktree-prunable', '功能分支登记的 worktree 已不可用。', { path: worktree.path })
      continue
    }
    const status = attempt(report, 'feature-worktree-status-failed', () => readRepositoryStatus(worktree.path))
    if (status && !status.sourceClean) {
      addError(report, 'feature-worktree-dirty', '功能分支登记的 worktree 含未提交源码改动。', {
        path: worktree.path,
        trackedChanges: status.trackedChanges,
        untrackedSources: status.untrackedSources
      })
    }
  }

  const comparisonTip = liveTip ?? card.tipCommit
  const featureBaseAncestor = attempt(report, 'feature-ancestry-check-failed', () => isAncestor(context.worktreeRoot, card.baseCommit, comparisonTip))
  if (featureBaseAncestor === false) addError(report, 'feature-base-not-ancestor', '交接卡 base 不是功能 tip 的祖先。', { base: card.baseCommit, tip: comparisonTip })
  const batchBaseAncestor = attempt(report, 'batch-ancestry-check-failed', () => isAncestor(context.worktreeRoot, card.baseCommit, batchMainCommit))
  if (batchBaseAncestor === false) addError(report, 'feature-base-not-ancestor', '交接卡 base 不是当前集成提交的祖先。', { base: card.baseCommit, batchMainCommit })

  const liveCommits = attempt(report, 'feature-history-read-failed', () => listRangeCommits(context.worktreeRoot, card.baseCommit, comparisonTip))
  if (liveCommits && !sameJson(liveCommits, card.commits)) {
    addError(report, 'feature-history-mismatch', '功能提交历史与交接卡不一致。', { expected: card.commits, actual: liveCommits })
  }
  const liveFiles = attempt(report, 'feature-files-read-failed', () => diffNameStatus(context.worktreeRoot, card.baseCommit, comparisonTip))
  if (liveFiles && !sameJson(liveFiles, card.files)) {
    addError(report, 'feature-file-inventory-mismatch', '功能文件清单与交接卡不一致。', { expected: card.files, actual: liveFiles })
  }
  for (const check of card.checks) {
    if (check.verifiedCommit !== comparisonTip) {
      addError(report, 'feature-check-stale', '功能检查证据未绑定当前功能 tip。', { expected: comparisonTip, actual: check.verifiedCommit, argv: check.argv })
    }
  }

  const equivalent = new Set()
  const batchCommits = attempt(report, 'batch-history-read-failed', () => listRangeCommits(context.worktreeRoot, card.baseCommit, batchMainCommit)) ?? []
  const batchPatchIds = new Set(batchCommits.map((commit) => readPatchId(context.worktreeRoot, commit.commit)).filter(Boolean))
  for (const commit of card.commits) {
    const reachable = attempt(report, 'feature-merge-reachability-failed', () => isAncestor(context.worktreeRoot, commit.commit, batchMainCommit))
    if (reachable) {
      equivalent.add(commit.commit)
      continue
    }
    const patchId = readPatchId(context.worktreeRoot, commit.commit)
    if (patchId && batchPatchIds.has(patchId)) equivalent.add(commit.commit)
  }
  if (equivalent.size === card.commits.length) {
    addInfo(report, 'feature-already-merged', '功能提交已完整存在于当前集成历史，可幂等跳过。', { branch: card.branch })
  } else if (equivalent.size > 0) {
    addError(report, 'feature-partially-merged', '功能提交仅部分存在于当前集成历史，不能自动重复合并。', {
      branch: card.branch,
      equivalentCommits: [...equivalent],
      missingCommits: card.commits.map((commit) => commit.commit).filter((commit) => !equivalent.has(commit))
    })
  }
  return report
}

function actionFor(requirements, featureBranch) {
  const target = requirements.feature === 'required' && featureBranch ? `功能 ${featureBranch}` : '批次'
  return { kind: requirements.action, description: `${requirements.description}目标：${target}；变更必须由集成执行器显式执行。` }
}

function hasInput(value) {
  return typeof value === 'string' && value.length > 0
}

function validatePhaseInputs(report, requirements, inputs) {
  for (const [name, requirement] of Object.entries(requirements)) {
    if (!['manifest', 'feature', 'mainWorktree', 'acceptedTip'].includes(name)) continue
    const value = inputs[name]
    if (requirement === 'required' && !hasInput(value)) {
      addError(report, 'phase-input-required', `${name} 是 ${report.phase} 阶段的必填输入。`, { phase: report.phase, input: name })
    }
    if (requirement === 'forbidden' && value !== undefined) {
      addError(report, 'phase-input-forbidden', `${name} 不允许用于 ${report.phase} 阶段。`, { phase: report.phase, input: name })
    }
  }
}

function mergeInProgress(repository) {
  return runGit(repository, ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { allowFailure: true }).status === 0
}

function resolveRecordedCommit(report, repository, commit, code, label) {
  try {
    const resolved = resolveCommit(repository, commit)
    if (resolved !== commit) {
      addError(report, code, `${label} 没有精确解析为记录的提交。`, { expected: commit, actual: resolved })
      return undefined
    }
    return resolved
  } catch (error) {
    addError(report, code, `${label} 不可解析。`, {
      commit,
      error: error instanceof Error ? error.message : String(error)
    })
    return undefined
  }
}

function requireAncestor(report, repository, ancestor, descendant, code, message, details) {
  if (!ancestor || !descendant) return
  const result = attempt(report, `${code}-check-failed`, () => isAncestor(repository, ancestor, descendant))
  if (result === false) addError(report, code, message, details)
}

function validateMergedFeatureEvidence(report, repository, integrationHead, feature, featureVerification) {
  const merged = feature.merged
  if (!merged) return
  const mergeCommit = resolveRecordedCommit(report, repository, merged.mergeCommit, 'merged-merge-commit-unresolved', '记录的 mergeCommit')
  const verificationCommit = resolveRecordedCommit(report, repository, merged.verificationCommit, 'merged-verification-commit-unresolved', '记录的 verificationCommit')
  requireAncestor(
    report,
    repository,
    mergeCommit,
    integrationHead,
    'merged-merge-commit-not-reachable',
    '记录的 mergeCommit 不是当前集成 HEAD 的祖先。',
    { mergeCommit: merged.mergeCommit, head: integrationHead, branch: feature.handoff.branch }
  )
  requireAncestor(
    report,
    repository,
    verificationCommit,
    integrationHead,
    'merged-verification-commit-not-reachable',
    '记录的 verificationCommit 不是当前集成 HEAD 的祖先。',
    { verificationCommit: merged.verificationCommit, head: integrationHead, branch: feature.handoff.branch }
  )
  requireAncestor(
    report,
    repository,
    feature.handoff.tipCommit,
    mergeCommit,
    'merged-feature-tip-not-merged',
    '功能 tip 不是记录的 mergeCommit 的祖先。',
    { tipCommit: feature.handoff.tipCommit, mergeCommit: merged.mergeCommit, branch: feature.handoff.branch }
  )
  requireAncestor(
    report,
    repository,
    mergeCommit,
    verificationCommit,
    'merged-verification-not-after-merge',
    '记录的 verificationCommit 必须等于或位于 mergeCommit 之后。',
    { mergeCommit: merged.mergeCommit, verificationCommit: merged.verificationCommit, branch: feature.handoff.branch }
  )
  for (const check of merged.checks) {
    if (check.verifiedCommit !== merged.verificationCommit) {
      addError(report, 'merged-check-tip-mismatch', '记录的合并检查未绑定 verificationCommit。', {
        verifiedCommit: check.verifiedCommit,
        verificationCommit: merged.verificationCommit,
        argv: check.argv,
        branch: feature.handoff.branch
      })
    }
  }
  const liveMerged = featureVerification?.findings.some(
    (item) => item.code === 'feature-already-merged' && item.severity === 'info'
  )
  if (!liveMerged) {
    addError(report, 'merged-live-feature-not-integrated', '实时功能预检未证明该功能已完整合入当前集成历史。', {
      branch: feature.handoff.branch,
      tipCommit: feature.handoff.tipCommit
    })
  }
}

export function preflightIntegrationAction({ repository, phase, manifestPath, featureBranch, mainWorktree, expectedAcceptedTip }) {
  if (!phases.has(phase)) throw new Error('phase 必须是受支持的集成阶段。')
  const requirements = phaseRequirements[phase]
  const report = reportFor(repository, phase)
  report.plannedActions.push(actionFor(requirements, featureBranch))
  validatePhaseInputs(report, requirements, {
    manifest: manifestPath,
    feature: featureBranch,
    mainWorktree,
    acceptedTip: expectedAcceptedTip
  })
  if (requirements.sourceClean) {
    const status = attempt(report, 'integration-worktree-status-failed', () => readRepositoryStatus(repository))
    if (status && !status.sourceClean) {
      addError(report, 'integration-worktree-dirty', '当前集成 worktree 含未提交源码改动。', {
        trackedChanges: status.trackedChanges,
        untrackedSources: status.untrackedSources
      })
    }
  }
  let manifest
  if (manifestPath) {
    try {
      manifest = validateIntegrationBatchManifest(JSON.parse(readFileSync(manifestPath, 'utf8')))
    } catch (error) {
      addError(report, 'batch-manifest-invalid', error instanceof Error ? error.message : String(error), { manifestPath })
    }
    if (manifest) {
      report.batchId = manifest.batchId
      if (report.branch !== manifest.branch) addError(report, 'integration-branch-mismatch', '当前分支不是清单指定的集成分支。', { expected: manifest.branch, actual: report.branch })
      if (requirements.integrationBranch && (!report.branch || !/^codex\/integration\/\d{8}-\d{2}$/.test(report.branch))) {
        addError(report, 'integration-branch-required', '当前 worktree 必须位于合法集成分支。', { branch: report.branch })
      }
      const baseAncestor = attempt(report, 'batch-base-ancestry-check-failed', () => isAncestor(repository, manifest.baseMainCommit, report.head))
      if (baseAncestor === false) addError(report, 'batch-base-not-ancestor', '批次 baseMainCommit 不是当前集成提交的祖先。', { base: manifest.baseMainCommit, head: report.head })
      const expectedAncestor = attempt(report, 'batch-expected-main-ancestry-check-failed', () => isAncestor(repository, manifest.expectedMainCommit, report.head))
      if (expectedAncestor === false) addError(report, 'batch-expected-main-not-ancestor', '批次 expectedMainCommit 不是当前集成提交的祖先。', { expectedMainCommit: manifest.expectedMainCommit, head: report.head })
      const selected = requirements.feature === 'required' && hasInput(featureBranch)
        ? manifest.features.filter((feature) => feature.handoff.branch === featureBranch)
        : []
      if (requirements.feature === 'required' && hasInput(featureBranch) && selected.length !== 1) {
        addError(report, 'feature-not-in-batch', '指定功能分支不在批次清单中。', { featureBranch })
      }
      if (requirements.unrecordedFeature && selected[0]?.merged) {
        addError(report, 'feature-already-recorded-merged', '指定功能已记录为完成合并，不能再次执行 merge。', { featureBranch })
      }
      if (requirements.continuation && selected[0]) {
        const feature = selected[0]
        const continued = attempt(report, 'continuation-state-check-failed', () =>
          mergeInProgress(repository) || (!feature.merged && isAncestor(repository, feature.handoff.tipCommit, report.head))
        )
        if (!continued) addError(report, 'continuation-state-required', 'continue 阶段必须检测到 MERGE_HEAD 或未记录的功能 tip 已在当前 HEAD 中。', { featureBranch })
        if (feature.merged) addError(report, 'feature-already-recorded-merged', '已记录完成合并的功能不能继续 merge。', { featureBranch })
      }
      if (requirements.allFeaturesMerged) {
        const unmerged = manifest.features.filter((feature) => !feature.merged).map((feature) => feature.handoff.branch)
        if (unmerged.length > 0) addError(report, 'batch-features-unmerged', '验收或推进前必须记录所有功能已完成合并。', { branches: unmerged })
      }
      const featuresToVerify = requirements.feature === 'required'
        ? selected
        : requirements.allFeaturesMerged || phase === 'sync-main' || phase === 'recover-owner'
          ? manifest.features
          : []
      const featureVerifications = new Map()
      for (const feature of featuresToVerify) {
        const featureResult = attempt(report, 'feature-preflight-failed', () => verifyFeatureHandoff({ repository, handoff: feature.handoff, batchMainCommit: report.head }))
        featureVerifications.set(feature.handoff.branch, featureResult)
        if (featureResult) {
          report.findings.push(...featureResult.findings)
          if (!featureResult.ok) report.ok = false
        }
      }
      if (requirements.allFeaturesMerged) {
        for (const feature of manifest.features) {
          validateMergedFeatureEvidence(report, repository, report.head, feature, featureVerifications.get(feature.handoff.branch))
        }
      }
    }
  }
  if (requirements.acceptedTip === 'required' && hasInput(expectedAcceptedTip)) {
    if (!fullSha.test(expectedAcceptedTip)) addError(report, 'accepted-tip-invalid', 'expectedAcceptedTip 必须是完整小写 SHA。')
    else if (report.head !== expectedAcceptedTip) addError(report, 'accepted-tip-mismatch', '当前集成提交不是预期验收提交。', { expected: expectedAcceptedTip, actual: report.head })
  }
  if (requirements.mainWorktree === 'required' && hasInput(mainWorktree)) {
    const mainContext = attempt(report, 'main-worktree-invalid', () => resolveRepositoryContext(mainWorktree))
    if (mainContext) {
      if (mainContext.branch !== 'main') addError(report, 'main-worktree-branch-invalid', 'main worktree 必须位于 main 分支。', { branch: mainContext.branch })
      const status = attempt(report, 'main-worktree-status-failed', () => readRepositoryStatus(mainContext.worktreeRoot))
      if (status && !status.sourceClean) addError(report, 'main-worktree-dirty', 'main worktree 含未提交源码改动。')
      if (manifest && phase === 'promote' && mainContext.head !== manifest.expectedMainCommit) {
        addError(report, 'main-worktree-expected-mismatch', 'main worktree HEAD 必须精确匹配批次 expectedMainCommit。', { expected: manifest.expectedMainCommit, actual: mainContext.head })
      }
    }
  }
  return report
}
