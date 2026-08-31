#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import {
  adoptIntegrationBatch,
  acceptIntegrationBatch,
  cancelIntegrationBatch,
  continueIntegrationFeature,
  createIntegrationBatch,
  mergeIntegrationFeature,
  promoteIntegrationBatch,
  readPersistedIntegrationOwnerToken,
  recoverIntegrationOwnership,
  synchronizeIntegrationMain
} from './lib/sherlock-integration-executor.mjs'

function fail(message) {
  throw new Error(message)
}

function parse(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true }
  const command = argv[0]
  if (!['create', 'adopt', 'merge', 'continue', 'recover-owner', 'sync-main', 'accept', 'promote', 'cancel'].includes(command)) fail('第一个参数必须为 create、adopt、merge、continue、recover-owner、sync-main、accept、promote 或 cancel。')
  const options = { handoffs: [] }
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run' || argument === '--json' || argument === '--explicit-cancellation') {
      const key = argument.slice(2).replaceAll('-', '_')
      if (options[key]) fail(`不能重复传入 ${argument}。`)
      options[key] = true
      continue
    }
    if (!['--repo', '--worktree', '--batch', '--handoff', '--checks', '--manifest', '--feature', '--commit', '--confirm-batch', '--confirm-tip', '--main-worktree'].includes(argument)) fail(`未知参数：${argument}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) fail(`${argument} 缺少值。`)
    if (argument === '--handoff') {
      options.handoffs.push(value)
    } else {
      const key = argument.slice(2).replaceAll('-', '_')
      if (options[key] !== undefined) fail(`不能重复传入 ${argument}。`)
      options[key] = value
    }
    index += 1
  }
  if (command === 'create' || command === 'adopt') {
    if (!options.repo || !options.batch || options.handoffs.length === 0 || !options.checks) {
      fail('--repo、--batch、至少一个 --handoff 和 --checks 为必填参数。')
    }
    if (options.manifest || options.feature) fail('create/adopt 不接受 --manifest 或 --feature。')
    if (command === 'create' && !options.worktree) fail('create 必须提供 --worktree。')
    if (command === 'adopt' && options.worktree) fail('adopt 不接受 --worktree。')
  } else if (command === 'merge' || command === 'continue') {
    if (!options.repo || !options.manifest || !options.feature) fail('merge/continue 必须提供 --repo、--manifest 和 --feature。')
    if (options.batch || options.handoffs.length > 0 || options.checks || options.worktree) fail('merge/continue 不接受批次创建参数。')
  } else if (command === 'recover-owner') {
    if (!options.repo || !options.manifest || !options.confirm_batch || !options.confirm_tip) fail('recover-owner 必须提供 --repo、--manifest、--confirm-batch 和 --confirm-tip。')
    if (options.dry_run || options.commit || options.main_worktree || options.explicit_cancellation || options.batch || options.handoffs.length > 0 || options.checks || options.worktree || options.feature) fail('recover-owner 不接受批次创建、功能、dry-run、commit、main-worktree 或 cancellation 参数。')
  } else if (command === 'sync-main') {
    if (!options.repo || !options.manifest) fail('sync-main 必须提供 --repo 和 --manifest。')
    if (options.commit || options.confirm_batch || options.confirm_tip || options.main_worktree || options.explicit_cancellation || options.batch || options.handoffs.length > 0 || options.checks || options.worktree || options.feature) fail('sync-main 不接受批次创建、功能、验收、推进或取消参数。')
  } else if (command === 'accept') {
    if (!options.repo || !options.manifest || !options.commit || !options.confirm_batch) fail('accept 必须提供 --repo、--manifest、--commit 和 --confirm-batch。')
    if (options.dry_run || options.confirm_tip || options.main_worktree || options.explicit_cancellation || options.batch || options.handoffs.length > 0 || options.checks || options.worktree || options.feature) fail('accept 不接受批次创建、功能、dry-run、confirm-tip、main-worktree 或 cancellation 参数。')
  } else if (command === 'promote') {
    if (!options.repo || !options.manifest || !options.main_worktree || !options.confirm_batch || !options.confirm_tip) fail('promote 必须提供 --repo、--manifest、--main-worktree、--confirm-batch 和 --confirm-tip。')
    if (options.commit || options.explicit_cancellation || options.batch || options.handoffs.length > 0 || options.checks || options.worktree || options.feature) fail('promote 不接受批次创建、功能、commit 或 cancellation 参数。')
  } else {
    if (!options.repo || !options.manifest || !options.confirm_batch || !options.explicit_cancellation) fail('cancel 必须提供 --repo、--manifest、--confirm-batch 和 --explicit-cancellation。')
    if (options.commit || options.confirm_tip || options.main_worktree || options.batch || options.handoffs.length > 0 || options.checks || options.worktree || options.feature) fail('cancel 不接受批次创建、功能、commit、confirm-tip 或 main-worktree 参数。')
  }
  return { command, ...options }
}

function readChecks(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`无法读取 --checks：${error instanceof Error ? error.message : String(error)}`)
  }
}

function printHuman(result) {
  const token = result.status === 'planned' ? 'INTEGRATION PLANNED'
    : result.status === 'prepared' ? 'INTEGRATION PREPARED'
      : result.status === 'merged' ? 'INTEGRATION MERGED'
        : result.status === 'conflict' ? 'INTEGRATION CONFLICT'
          : result.status === 'ownership-recovered' ? 'INTEGRATION OWNERSHIP_RECOVERED'
            : result.status === 'main-synchronized' ? 'INTEGRATION MAIN_SYNCHRONIZED'
              : result.status === 'accepted' ? 'INTEGRATION ACCEPTED'
                : result.status === 'promoted' ? 'INTEGRATION PROMOTED'
                  : result.status === 'cancelled' ? 'INTEGRATION CANCELLED'
                    : 'INTEGRATION RECOVERY_REQUIRED'
  process.stdout.write(`${token} batch=${result.batchId} branch=${result.branch} before=${result.beforeCommit} after=${result.afterCommit}\n`)
  if (result.conflictContext) {
    process.stdout.write(`CONFLICT integrationTip=${result.conflictContext.integrationTip} featureTip=${result.conflictContext.featureTip} featureBase=${result.conflictContext.featureBase}\n`)
  }
  if (result.recoveryCommand) process.stdout.write(`RECOVERY ${result.recoveryCommand}\n`)
}

function printHelp() {
  process.stdout.write('Usage: npm run git:integration -- <create|adopt|merge|continue|recover-owner|sync-main|accept|promote|cancel> [options]\n')
  process.stdout.write('recover-owner --repo <integration-worktree> --manifest <manifest> --confirm-batch <batch> --confirm-tip <sha> [--json]\n')
  process.stdout.write('sync-main --repo <integration-worktree> --manifest <manifest> [--dry-run] [--json]\n')
  process.stdout.write('accept --repo <integration-worktree> --manifest <manifest> --commit <sha> --confirm-batch <batch> [--json]\n')
  process.stdout.write('promote --repo <integration-worktree> --manifest <manifest> --main-worktree <canonical-main> --confirm-batch <batch> --confirm-tip <sha> [--dry-run] [--json]\n')
  process.stdout.write('cancel --repo <integration-worktree> --manifest <manifest> --confirm-batch <batch> --explicit-cancellation [--dry-run] [--json]\n')
}

try {
  const options = parse(process.argv.slice(2))
  if (options.help) {
    printHelp()
    process.exitCode = 0
  } else {
  const now = new Date().toISOString()
  const result = options.command === 'create' || options.command === 'adopt'
    ? (options.command === 'create'
        ? createIntegrationBatch({ batchId: options.batch, handoffPaths: options.handoffs, integrationChecks: readChecks(options.checks), dryRun: Boolean(options.dry_run), now, mainRepository: options.repo, worktreePath: options.worktree })
        : adoptIntegrationBatch({ batchId: options.batch, handoffPaths: options.handoffs, integrationChecks: readChecks(options.checks), dryRun: Boolean(options.dry_run), now, integrationRepository: options.repo }))
    : (options.command === 'merge'
        ? mergeIntegrationFeature({ integrationRepository: options.repo, manifestPath: options.manifest, featureBranch: options.feature, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now })
        : options.command === 'continue'
          ? continueIntegrationFeature({ integrationRepository: options.repo, manifestPath: options.manifest, featureBranch: options.feature, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now })
          : options.command === 'recover-owner'
            ? recoverIntegrationOwnership({ integrationRepository: options.repo, manifestPath: options.manifest, confirmBatchId: options.confirm_batch, confirmTip: options.confirm_tip })
            : options.command === 'sync-main'
              ? synchronizeIntegrationMain({ integrationRepository: options.repo, manifestPath: options.manifest, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now })
              : options.command === 'accept'
                ? acceptIntegrationBatch({ integrationRepository: options.repo, manifestPath: options.manifest, commit: options.commit, confirmBatchId: options.confirm_batch, ownerToken: readPersistedIntegrationOwnerToken(options.repo), now })
                : options.command === 'promote'
                  ? promoteIntegrationBatch({ integrationRepository: options.repo, manifestPath: options.manifest, mainWorktree: options.main_worktree, confirmBatchId: options.confirm_batch, confirmTip: options.confirm_tip, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now })
                  : cancelIntegrationBatch({ integrationRepository: options.repo, manifestPath: options.manifest, confirmBatchId: options.confirm_batch, explicitCancellation: options.explicit_cancellation === true, dryRun: Boolean(options.dry_run), now }))
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`)
  else printHuman(result)
  process.exitCode = result.status === 'recovery-required' ? 4 : result.status === 'conflict' ? 3 : 0
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = error && typeof error === 'object' && error.integrationExit === 1 ? 1 : 2
}
