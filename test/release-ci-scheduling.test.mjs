import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'))
const { jobs } = workflow

// Exercise the actual expressions rather than duplicating dispatch logic in tests.
function enabled(expression, { event = 'workflow_dispatch', ref = 'refs/heads/test', arch = 'arm64', ...inputs } = {}) {
  return runInNewContext(expression ?? 'true', {
    github: { event_name: event, ref },
    matrix: { arch },
    inputs: { mode: 'development', target: 'all', ...inputs },
    startsWith: (value, prefix) => value.startsWith(prefix),
    always: () => true
  })
}

function step(job, name) {
  const result = jobs[job].steps.find(candidate => candidate.name === name)
  expect(result, `${job}: ${name}`).toBeDefined()
  return result
}

function scheduled(job, name, input) {
  return enabled(jobs[job].if, input) && enabled(step(job, name).if, input)
}

describe('release CI scheduling', () => {
  it('shows only five fields with safe build defaults', () => {
    const inputs = workflow.on.workflow_dispatch.inputs
    expect(Object.keys(inputs)).toEqual(['mode', 'target', 'version', 'source_run_id', 'checks'])
    expect(inputs.mode.default).toBe('development')
    expect(inputs.target.default).toBe('all')
    expect(inputs.checks.default).toBe('standard')
    expect(inputs.version.required).toBe(false)
    expect(inputs.source_run_id.required).toBe(false)
    const text = readFileSync('.github/workflows/release.yml', 'utf8')
    for (const [, field] of text.matchAll(/inputs\.([a-z_]+)/g)) {
      expect(inputs, `dispatch consumer: ${field}`).toHaveProperty(field)
    }
  })

  it('has no standalone preparation/validation dependency before native builds', () => {
    expect(jobs['prepare-shared-runtime-assets']).toBeUndefined()
    expect(jobs['validate-shared-runtime']).toBeUndefined()
    expect(jobs.macos.needs).toBe('validate-dispatch')
    expect(jobs['windows-x64'].needs).toBe('validate-dispatch')
  })

  it.each([
    [{ target: 'all' }, true, false, true],
    [{ target: 'macos' }, true, false, false],
    [{ target: 'windows' }, false, true, false],
    [{ event: 'pull_request' }, false, true, false],
    [{ event: 'push', ref: 'refs/tags/v1.0.0' }, true, false, true]
  ])('runs shared checks exactly once for %j', (input, macFull, winFull, winFocused) => {
    expect(scheduled('macos', 'Run shared tests on macOS', input)).toBe(macFull)
    expect(scheduled('windows-x64', 'Run complete Windows test suite', input)).toBe(winFull)
    expect(scheduled('windows-x64', 'Run focused Windows regressions', input)).toBe(winFocused)
    expect(scheduled('macos', 'Typecheck shared code on macOS', input)).toBe(macFull)
    expect(scheduled('windows-x64', 'Typecheck shared code on Windows', input)).toBe(winFull)
    expect(Number(macFull) + Number(winFull)).toBe(1)
    expect(scheduled('macos', 'Run shared tests on macOS', { ...input, arch: 'x64' })).toBe(false)
  })

  it('allows explicitly repeating the full suite on Windows when diagnosing all-platform builds', () => {
    const input = { target: 'all', checks: 'extended' }
    expect(scheduled('macos', 'Run shared tests on macOS', input)).toBe(true)
    expect(scheduled('windows-x64', 'Run complete Windows test suite', input)).toBe(true)
    expect(scheduled('windows-x64', 'Run focused Windows regressions', input)).toBe(false)
  })

  it('shares only generated assets across platforms and lets input fingerprints invalidate stale outputs', () => {
    const mac = step('macos', 'Cache generated Office and PPT assets')
    const windows = step('windows-x64', 'Cache generated Office and PPT assets')
    expect(mac.with).toEqual(windows.with)
    expect(mac.with.enableCrossOsArchive).toBe(true)
    expect(mac.with.path).toContain('.build/ppt-runtime')
    expect(mac.with.path).toContain('.build/office-template-cache')
    expect(mac.with.path).not.toContain('node_modules')
    expect(mac.with.path).not.toContain('.build/office-runtime')
    expect(mac.with.key).toContain('hashFiles(')
  })

  it('only schedules extra desktop probes when explicitly requested', () => {
    for (const name of [
      'Smoke test packaged Windows Harness',
      'Check recovery UI on native Windows at three display scales'
    ]) {
      const probe = step('windows-x64', name)
      expect(workflow.on.workflow_dispatch.inputs.checks.default).toBe('standard')
      expect(enabled(probe.if)).toBe(false)
      expect(enabled(probe.if, { checks: 'extended' })).toBe(true)
      expect(enabled(probe.if, { event: 'pull_request', checks: 'extended' })).toBe(false)
      expect(enabled(probe.if, { event: 'push', checks: 'extended' })).toBe(false)
    }
    expect(jobs['windows-x64'].steps.some(candidate => candidate.run?.includes('probe-electron-node-runtime'))).toBe(false)
    const afterPack = readFileSync('scripts/after-pack.cjs', 'utf8')
    for (const gate of ['verifyPackagedHarness', 'verifyOfficeRuntime', 'verifyPackagedPptRuntime']) {
      expect(afterPack).toContain(`await ${gate}(context)`)
    }
  })

  it('preserves source bytes before Windows checkout so template hashes remain reusable', () => {
    const steps = jobs['windows-x64'].steps
    const preserveIndex = steps.findIndex(candidate => candidate.name === 'Preserve shared asset fingerprints during checkout')
    const checkoutIndex = steps.findIndex(candidate => candidate.uses === 'actions/checkout@v4')
    expect(preserveIndex).toBeGreaterThanOrEqual(0)
    expect(preserveIndex).toBeLessThan(checkoutIndex)
    expect(steps[preserveIndex].run).toBe('git config --global core.autocrlf false')
  })

  it('restores Electron before ci and retains install scripts plus timing evidence', () => {
    for (const name of ['macos', 'windows-x64']) {
      const steps = jobs[name].steps
      const installIndex = steps.findIndex(candidate => candidate.name === 'Install dependencies with timings')
      const configIndex = steps.findIndex(candidate => candidate.name === 'Configure native download caches before dependency installation')
      const cacheIndex = steps.findIndex(candidate => candidate.uses === 'actions/cache@v4' && candidate.with.path.includes('${{ env.ELECTRON_CACHE }}'))
      expect(configIndex).toBeGreaterThanOrEqual(0)
      expect(cacheIndex).toBeGreaterThan(configIndex)
      expect(installIndex).toBeGreaterThan(cacheIndex)
      expect(steps[configIndex].run).toContain('electron_config_cache=')
      expect(steps[installIndex].run).toContain('--timing')
      expect(steps[installIndex].run).toContain('--prefer-offline')
      expect(steps[installIndex].run).not.toContain('--ignore-scripts')
      expect(step(name, 'Upload dependency installation timings').if).toBe('always()')
    }
  })

  it('archives release payloads and only opt-in development builds', () => {
    const archive = step('windows-x64', 'Archive and verify unpacked Windows payload')
    expect(enabled(archive.if)).toBe(false)
    expect(enabled(archive.if, { event: 'pull_request' })).toBe(false)
    for (const input of [{ mode: 'signed' }, { mode: 'prerelease' }, { checks: 'extended' }, { event: 'push', ref: 'refs/tags/v1.0.0' }]) {
      expect(enabled(archive.if, input)).toBe(true)
    }
    expect(workflow.on.workflow_dispatch.inputs.checks.default).toBe('standard')
  })

  it('resigns existing artifacts without rebuilding either native platform', () => {
    const input = { mode: 'resign', target: 'windows' }
    expect(enabled(jobs.macos.if, input)).toBe(false)
    expect(enabled(jobs['windows-x64'].if, input)).toBe(false)
    expect(jobs['sign-windows'].needs).toEqual(['validate-dispatch', 'windows-x64'])
    expect(jobs['sign-windows'].if).toContain('always()')
    expect(jobs['sign-windows'].if).toContain("inputs.mode == 'resign'")
  })
})
