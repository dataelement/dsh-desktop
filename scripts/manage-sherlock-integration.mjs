#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import {
  adoptIntegrationBatch,
  continueIntegrationFeature,
  createIntegrationBatch,
  mergeIntegrationFeature,
  readPersistedIntegrationOwnerToken
} from './lib/sherlock-integration-executor.mjs'

function fail(message) {
  throw new Error(message)
}

function parse(argv) {
  const command = argv[0]
  if (!['create', 'adopt', 'merge', 'continue'].includes(command)) fail('第一个参数必须为 create、adopt、merge 或 continue。')
  const options = { handoffs: [] }
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run' || argument === '--json') {
      const key = argument.slice(2).replaceAll('-', '_')
      if (options[key]) fail(`不能重复传入 ${argument}。`)
      options[key] = true
      continue
    }
    if (!['--repo', '--worktree', '--batch', '--handoff', '--checks', '--manifest', '--feature'].includes(argument)) fail(`未知参数：${argument}`)
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
  } else {
    if (!options.repo || !options.manifest || !options.feature) fail('merge/continue 必须提供 --repo、--manifest 和 --feature。')
    if (options.batch || options.handoffs.length > 0 || options.checks || options.worktree) fail('merge/continue 不接受批次创建参数。')
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
      : 'INTEGRATION RECOVERY_REQUIRED'
  process.stdout.write(`${token} batch=${result.batchId} branch=${result.branch} before=${result.beforeCommit} after=${result.afterCommit}\n`)
  if (result.conflictContext) {
    process.stdout.write(`CONFLICT integrationTip=${result.conflictContext.integrationTip} featureTip=${result.conflictContext.featureTip} featureBase=${result.conflictContext.featureBase}\n`)
  }
  if (result.recoveryCommand) process.stdout.write(`RECOVERY ${result.recoveryCommand}\n`)
}

try {
  const options = parse(process.argv.slice(2))
  const now = new Date().toISOString()
  const result = options.command === 'create' || options.command === 'adopt'
    ? (options.command === 'create'
        ? createIntegrationBatch({ batchId: options.batch, handoffPaths: options.handoffs, integrationChecks: readChecks(options.checks), dryRun: Boolean(options.dry_run), now, mainRepository: options.repo, worktreePath: options.worktree })
        : adoptIntegrationBatch({ batchId: options.batch, handoffPaths: options.handoffs, integrationChecks: readChecks(options.checks), dryRun: Boolean(options.dry_run), now, integrationRepository: options.repo }))
    : (options.command === 'merge'
        ? mergeIntegrationFeature({ integrationRepository: options.repo, manifestPath: options.manifest, featureBranch: options.feature, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now })
        : continueIntegrationFeature({ integrationRepository: options.repo, manifestPath: options.manifest, featureBranch: options.feature, ownerToken: readPersistedIntegrationOwnerToken(options.repo), dryRun: Boolean(options.dry_run), now }))
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`)
  else printHuman(result)
  process.exitCode = result.status === 'recovery-required' ? 4 : result.status === 'conflict' ? 3 : 0
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = error && typeof error === 'object' && error.integrationExit === 1 ? 1 : 2
}
