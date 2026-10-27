import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'))
const { jobs } = workflow

// Exercise the workflow's actual expressions across dispatch/event combinations.
function enabled(expression, { event = 'workflow_dispatch', ref = 'refs/heads/test', ...inputs } = {}) {
  return runInNewContext(expression ?? 'true', {
    github: { event_name: event, ref },
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

describe('release CI scheduling', () => {
  it.each(['all', 'windows', 'macos'])('requires one shared test/typecheck gate for %s builds', target => {
    const shared = jobs['validate-shared-runtime']
    expect(shared.needs).toBe('prepare-shared-runtime-assets')
    expect(enabled(jobs['prepare-shared-runtime-assets'].if, { target })).toBe(true)
    for (const name of ['macos', 'windows-x64']) {
      expect(jobs[name].needs).toContain('validate-shared-runtime')
      expect(jobs[name].steps.some(candidate => candidate.run === 'npm run typecheck')).toBe(false)
    }
    expect(shared.steps.filter(candidate => candidate.run === 'npm run typecheck')).toHaveLength(1)
    expect(step('validate-shared-runtime', 'Run shared test suite once').run).toContain('vitest run')
    expect(jobs.macos.steps.some(candidate => candidate.run?.includes('vitest run'))).toBe(false)
    expect(enabled(jobs.macos.if, { target })).toBe(target !== 'windows')
    expect(enabled(jobs['windows-x64'].if, { target })).toBe(target !== 'macos')
  })

  it('prepares PPT assets on Ubuntu and keeps native Office tests on macOS', () => {
    expect(jobs['prepare-shared-runtime-assets']['runs-on']).toBe('ubuntu-24.04')
    expect(jobs['validate-shared-runtime']['runs-on']).toBe('macos-15')
    expect(jobs['prepare-shared-runtime-assets'].steps.some(candidate => candidate.run?.includes('office:prepare'))).toBe(false)
    expect(step('prepare-shared-runtime-assets', 'Build PPT runtime').run).toBe('npm run ppt:build')
    const download = jobs['validate-shared-runtime'].steps.find(candidate => candidate.uses === 'actions/download-artifact@v4')
    expect(download.with.name).toBe('shared-ppt-runtime')
    expect(download.with.path).toBe('.build/ppt-runtime')
    expect(enabled(jobs['prepare-shared-runtime-assets'].if, { event: 'pull_request' })).toBe(true)
    expect(enabled(jobs['windows-x64'].if, { event: 'pull_request' })).toBe(true)
  })

  it('uses focused Windows regressions by default and allows full-suite diagnostics', () => {
    const focused = step('windows-x64', 'Run focused Windows regressions')
    const full = step('windows-x64', 'Run complete Windows test suite')
    expect(focused.run).toContain('--config vitest.windows.config.ts')
    for (const windows_full_tests of [false, true]) {
      expect(enabled(focused.if, { windows_full_tests })).toBe(!windows_full_tests)
      expect(enabled(full.if, { windows_full_tests })).toBe(windows_full_tests)
    }
  })

  it('only schedules extra desktop probes when explicitly requested', () => {
    for (const [name, flag] of [
      ['Smoke test packaged Windows Harness', 'windows_smoke'],
      ['Check recovery UI on native Windows at three display scales', 'windows_recovery_ui']
    ]) {
      const probe = step('windows-x64', name)
      expect(workflow.on.workflow_dispatch.inputs[flag].default).toBe(false)
      expect(enabled(probe.if)).toBe(false)
      expect(enabled(probe.if, { [flag]: true })).toBe(true)
      expect(enabled(probe.if, { event: 'pull_request', [flag]: true })).toBe(false)
      expect(enabled(probe.if, { event: 'push', ref: 'refs/tags/v1.0.0', [flag]: true })).toBe(false)
    }
    expect(jobs['windows-x64'].steps.some(candidate => candidate.run?.includes('probe-electron-node-runtime'))).toBe(false)
    // Removing repeated probes must not disable packaging's required runtime gates.
    const afterPack = readFileSync('scripts/after-pack.cjs', 'utf8')
    expect(afterPack).toContain('await verifyPackagedHarness(context)')
    expect(afterPack).toContain('await verifyOfficeRuntime(context)')
    expect(afterPack).toContain('await verifyPackagedPptRuntime(context)')
  })

  it('does not rebuild or retest when resigning an existing Windows artifact', () => {
    const input = { mode: 'resign', target: 'windows' }
    expect(enabled(jobs['prepare-shared-runtime-assets'].if, input)).toBe(false)
    expect(enabled(jobs['windows-x64'].if, input)).toBe(false)
    expect(jobs['sign-windows'].needs).toEqual(['validate-dispatch', 'windows-x64'])
    expect(jobs['sign-windows'].if).toContain('always()')
    expect(jobs['sign-windows'].if).toContain("inputs.mode == 'resign'")
  })
})
