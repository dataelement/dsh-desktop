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

function actionFor(phase) {
  return { kind: phase, description: `只读预检已完成；${phase} 阶段的变更必须由集成执行器显式执行。` }
}

export function preflightIntegrationAction({ repository, phase, manifestPath, featureBranch, mainWorktree, expectedAcceptedTip }) {
  if (!phases.has(phase)) throw new Error('phase 必须是受支持的集成阶段。')
  const report = reportFor(repository, phase)
  report.plannedActions.push(actionFor(phase))
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
      const baseAncestor = attempt(report, 'batch-base-ancestry-check-failed', () => isAncestor(repository, manifest.baseMainCommit, report.head))
      if (baseAncestor === false) addError(report, 'batch-base-not-ancestor', '批次 baseMainCommit 不是当前集成提交的祖先。', { base: manifest.baseMainCommit, head: report.head })
      const expectedAncestor = attempt(report, 'batch-expected-main-ancestry-check-failed', () => isAncestor(repository, manifest.expectedMainCommit, report.head))
      if (expectedAncestor === false) addError(report, 'batch-expected-main-not-ancestor', '批次 expectedMainCommit 不是当前集成提交的祖先。', { expectedMainCommit: manifest.expectedMainCommit, head: report.head })
      const selected = featureBranch ? manifest.features.filter((feature) => feature.handoff.branch === featureBranch) : manifest.features
      if (featureBranch && selected.length === 0) addError(report, 'feature-not-in-batch', '指定功能分支不在批次清单中。', { featureBranch })
      for (const feature of selected) {
        const featureResult = attempt(report, 'feature-preflight-failed', () => verifyFeatureHandoff({ repository, handoff: feature.handoff, batchMainCommit: report.head }))
        if (featureResult) {
          report.findings.push(...featureResult.findings)
          if (!featureResult.ok) report.ok = false
        }
      }
    }
  } else if (phase !== 'prepare') {
    addError(report, 'batch-manifest-required', '此阶段必须提供批次清单。')
  }
  if (expectedAcceptedTip !== undefined) {
    if (!fullSha.test(expectedAcceptedTip)) addError(report, 'accepted-tip-invalid', 'expectedAcceptedTip 必须是完整小写 SHA。')
    else if (report.head !== expectedAcceptedTip) addError(report, 'accepted-tip-mismatch', '当前集成提交不是预期验收提交。', { expected: expectedAcceptedTip, actual: report.head })
  }
  if (mainWorktree) {
    const mainContext = attempt(report, 'main-worktree-invalid', () => resolveRepositoryContext(mainWorktree))
    if (mainContext) {
      if (mainContext.branch !== 'main') addError(report, 'main-worktree-branch-invalid', 'main worktree 必须位于 main 分支。', { branch: mainContext.branch })
      const status = attempt(report, 'main-worktree-status-failed', () => readRepositoryStatus(mainContext.worktreeRoot))
      if (status && !status.sourceClean) addError(report, 'main-worktree-dirty', 'main worktree 含未提交源码改动。')
    }
  }
  return report
}
