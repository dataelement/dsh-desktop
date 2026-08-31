import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'
import { formatIntegrationError, formatIntegrationOutcome } from '../scripts/lib/sherlock-integration-cli-outcome.mjs'

const projectRoot = path.resolve(import.meta.dirname, '..')
const handoffCli = path.join(projectRoot, 'scripts', 'create-sherlock-session-handoff.mjs')
const preflightCli = path.join(projectRoot, 'scripts', 'verify-sherlock-integration.mjs')
const integrationCli = path.join(projectRoot, 'scripts', 'manage-sherlock-integration.mjs')
const fixtures: GitWorkflowFixture[] = []

function fixture() {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function run(script: string, args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

describe('Sherlock integration CLI contract', () => {
  afterEach(() => {
    for (const value of fixtures.splice(0)) value.dispose()
  })

  it('advertises the executable handoff, preflight, and lifecycle command surfaces without diagnostics', () => {
    const handoff = run(handoffCli, ['--help'])
    const preflight = run(preflightCli, ['--help'])
    const lifecycle = run(integrationCli, ['--help'])

    expect(handoff).toMatchObject({ status: 0, stderr: '' })
    expect(handoff.stdout).toContain('--repo <feature-worktree>')
    expect(handoff.stdout).toContain('--format text|json')
    expect(preflight).toMatchObject({ status: 0, stderr: '' })
    expect(preflight.stdout).toContain('--repo <integration-worktree>')
    expect(preflight.stdout).toContain('--phase <prepare|merge|continue|recover-owner|sync-main|accept|promote|cancel>')
    expect(preflight.stdout).toContain('--commit <accepted-sha>')
    expect(lifecycle).toMatchObject({ status: 0, stderr: '' })
    expect(lifecycle.stdout).toContain('recover-owner')
    expect(lifecycle.stdout).toContain('sync-main')
    expect(lifecycle.stdout).toContain('accept')
    expect(lifecycle.stdout).toContain('promote')
    expect(lifecycle.stdout).toContain('cancel')
  })

  it('keeps invalid input on stderr with exit 2 instead of mixing it into machine output', () => {
    for (const [script, args] of [
      [handoffCli, ['--unknown']],
      [preflightCli, ['--unknown']],
      [integrationCli, ['unknown']]
    ] as Array<[string, string[]]>) {
      const result = run(script, args)
      expect(result.status).toBe(2)
      expect(result.stdout).toBe('')
      expect(result.stderr).not.toBe('')
    }
  })

  it('reports preflight blocks as exit 1 with a stable human token', () => {
    const repository = fixture()
    const result = run(preflightCli, ['--repo', repository.main, '--phase', 'merge'])

    expect(result).toMatchObject({ status: 1, stderr: '' })
    expect(result.stdout).toContain('PREFLIGHT BLOCKED phase=merge')
  })

  it('keeps successful JSON preflight output machine-readable and diagnostics-free', () => {
    const repository = fixture()
    const result = run(preflightCli, ['--repo', repository.main, '--phase', 'prepare', '--json'])

    expect(result).toMatchObject({ status: 0, stderr: '' })
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, phase: 'prepare', branch: 'main' })
  })

  it('forwards preflight accepted-tip and canonical-main inputs to every phase that requires them', () => {
    const repository = fixture()
    const missingManifest = path.join(repository.root, 'missing-manifest.json')
    const commit = 'a'.repeat(40)
    const phases = [
      { phase: 'recover-owner', args: ['--commit', commit] },
      { phase: 'accept', args: ['--commit', commit] },
      { phase: 'promote', args: ['--commit', commit, '--main-worktree', repository.main] }
    ]

    for (const { phase, args } of phases) {
      const result = run(preflightCli, ['--repo', repository.main, '--phase', phase, '--manifest', missingManifest, ...args, '--json'])
      const report = JSON.parse(result.stdout)
      expect(result).toMatchObject({ status: 1, stderr: '' })
      expect(report.findings.some((finding: { code: string }) => finding.code === 'phase-input-required')).toBe(false)
    }
  })

  it('maps lifecycle rejection, conflict, and recovery outcomes to their public exit code and output channel', () => {
    expect(formatIntegrationError({ integrationExit: 1 })).toEqual({ exitCode: 1, channel: 'stderr' })
    expect(formatIntegrationError(new Error('invalid input'))).toEqual({ exitCode: 2, channel: 'stderr' })
    expect(formatIntegrationOutcome({ status: 'conflict', batchId: '20260831-01', branch: 'codex/integration/20260831-01', beforeCommit: 'a'.repeat(40), afterCommit: 'b'.repeat(40) })).toMatchObject({ exitCode: 3, channel: 'stdout', output: expect.stringContaining('INTEGRATION CONFLICT') })
    expect(formatIntegrationOutcome({ status: 'recovery-required', batchId: '20260831-01', branch: 'codex/integration/20260831-01', beforeCommit: 'a'.repeat(40), afterCommit: 'b'.repeat(40) })).toMatchObject({ exitCode: 4, channel: 'stdout', output: expect.stringContaining('INTEGRATION RECOVERY_REQUIRED') })
  })
})
