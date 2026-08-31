#!/usr/bin/env node
import { preflightIntegrationAction } from './lib/sherlock-integration-preflight.mjs'

function fail(message) {
  throw new Error(message)
}

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true }
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--json') {
      if (options.json) fail('不能重复传入 --json。')
      options.json = true
      continue
    }
    if (!['--repo', '--phase', '--manifest', '--feature', '--main-worktree', '--commit'].includes(argument)) {
      fail(`未知参数：${argument}`)
    }
    const key = argument.slice(2).replaceAll('-', '_')
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) fail(`${argument} 缺少值。`)
    if (options[key] !== undefined) fail(`不能重复传入 ${argument}。`)
    options[key] = value
    index += 1
  }
  if (!options.repo || !options.phase) fail('--repo 和 --phase 为必填参数。')
  return options
}

try {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    process.stdout.write('Usage: npm run git:integration:preflight -- --repo <integration-worktree> --phase <prepare|merge|continue|recover-owner|sync-main|accept|promote|cancel> [--manifest <path>] [--feature <branch>] [--main-worktree <canonical-main>] [--commit <accepted-sha>] [--json]\n')
    process.exitCode = 0
  } else {
  const report = preflightIntegrationAction({
    repository: options.repo,
    phase: options.phase,
    manifestPath: options.manifest,
    featureBranch: options.feature,
    mainWorktree: options.main_worktree,
    expectedAcceptedTip: options.commit
  })
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`)
  } else {
    process.stdout.write(`PREFLIGHT ${report.ok ? 'PASSED' : 'BLOCKED'} phase=${report.phase}\n`)
    for (const item of report.findings) process.stdout.write(`${item.severity.toUpperCase()} ${item.code}: ${item.message}\n`)
  }
  process.exitCode = report.ok ? 0 : 1
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 2
}
