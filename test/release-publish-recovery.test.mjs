import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'))
const { jobs } = workflow
function enabled(job, inputs = {}, results = {}, ref = 'refs/heads/main', event = 'workflow_dispatch') {
  const expression = jobs[job].if.replace(/needs[.]([a-z0-9]+(?:-[a-z0-9]+)+)/g, (_, name) => `needs['${name}']`)
  return runInNewContext(expression, {
    github: { event_name: event, ref },
    inputs: { mode: 'development', target: 'all', version: '', ...inputs },
    needs: Object.fromEntries(['validate-dispatch', 'macos', 'windows-x64', 'sign-windows'].map(name =>
      [name, { result: results[name] ?? 'success' }])),
    always: () => true,
    startsWith: (value, prefix) => value.startsWith(prefix)
  })
}
const step = name => jobs.publish.steps.find(item => item.name === name)

describe('official release publication recovery', () => {
  it('rejects invalid source runs and signed artifacts through the real validator', () => {
    const result = spawnSync('python3', ['test/release-publish-source.py'], { encoding: 'utf8', timeout: 15_000 })
    expect(result.error).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  })

  it('reuses the existing publish job and never schedules build or sign jobs', () => {
    for (const ref of ['refs/heads/main', 'refs/tags/v1.2.3']) {
      for (const job of ['macos', 'windows-x64', 'sign-windows']) {
        expect(enabled(job, { mode: 'publish' }, {}, ref)).toBe(false)
      }
      expect(enabled('publish', { mode: 'publish' }, { macos: 'skipped', 'sign-windows': 'skipped' }, ref)).toBe(true)
    }
    expect(enabled('publish', { mode: 'publish' }, { 'validate-dispatch': 'failure' })).toBe(false)
    expect(jobs.publish.needs).toContain('validate-dispatch')
    expect(step('Download verified signed artifacts from original run').with['artifact-ids']).toBe('${{ steps.source.outputs.artifact_ids }}')
    expect(jobs.publish.steps.filter(item => item.uses === 'actions/download-artifact@v4' && !item.with['artifact-ids'])
      .every(item => item.if === "inputs.mode != 'publish'")).toBe(true)
  })

  it.each(['development', 'signed', 'prerelease', 'resign'])('preserves native scheduling for %s', mode => {
    for (const target of ['all', 'macos', 'windows']) {
      expect(enabled('macos', { mode, target })).toBe(target !== 'windows')
      expect(enabled('windows-x64', { mode, target })).toBe(mode !== 'resign' && target !== 'macos')
      expect(enabled('sign-windows', { mode, target }, { 'windows-x64': mode === 'resign' ? 'skipped' : 'success' }))
        .toBe(mode !== 'development')
      expect(enabled('publish', { mode, target })).toBe(false)
    }
    expect(enabled('publish', { mode }, {}, 'refs/tags/v1.2.3', 'push')).toBe(true)
    expect(enabled('publish', { mode }, { 'sign-windows': 'failure' }, 'refs/tags/v1.2.3', 'push')).toBe(false)
    expect(enabled('windows-x64', { mode }, {}, 'refs/pull/1/merge', 'pull_request')).toBe(true)
  })

  it('validates the five-field form for every operation and rejects mismatched inputs', () => {
    const script = jobs['validate-dispatch'].steps.find(item => item.name === 'Validate workflow_dispatch inputs').run
    const validate = overrides => spawnSync('bash', ['-c', script], { env: {
      ...process.env, MODE: 'publish', TARGET: 'all', VERSION: 'v1.2.3', SOURCE_RUN_ID: '42',
      CHECKS: 'standard', ...overrides
    }, encoding: 'utf8' }).status
    expect(validate({})).toBe(0)
    for (const input of [{ TARGET: 'windows' }, { VERSION: 'main' }, { SOURCE_RUN_ID: '' },
      { SOURCE_RUN_ID: '0' }, { VERSION: '1.2.3' }, { CHECKS: 'invalid' }, { MODE: 'unknown' }]) expect(validate(input)).toBe(1)
    expect(validate({ MODE: 'development', VERSION: '', SOURCE_RUN_ID: '' })).toBe(0)
    expect(validate({ MODE: 'development' })).toBe(1)
    for (const mode of ['signed', 'prerelease']) {
      expect(validate({ MODE: mode, VERSION: '1.2.3-test.1', SOURCE_RUN_ID: '' })).toBe(0)
      expect(validate({ MODE: mode, VERSION: '', SOURCE_RUN_ID: '' })).toBe(1)
      expect(validate({ MODE: mode, SOURCE_RUN_ID: '' })).toBe(1)
      expect(validate({ MODE: mode, VERSION: '1.2.3' })).toBe(1)
    }
    expect(validate({ MODE: 'resign', TARGET: 'windows', VERSION: '1.2.3' })).toBe(0)
    expect(validate({ MODE: 'resign', VERSION: '1.2.3' })).toBe(1)
    expect(validate({ MODE: 'resign', TARGET: 'windows', VERSION: '1.2.3', SOURCE_RUN_ID: '0' })).toBe(1)
    expect(validate({ CHECKS: 'extended' })).toBe(0)
  })

  it('binds release consumers to validated identity and retains the new run approval', () => {
    expect(jobs.publish.env.RELEASE_TAG).toContain('inputs.version')
    for (const item of jobs.publish.steps) expect(item.env?.RELEASE_TAG).toBeUndefined()
    for (const name of ['Wait for Feishu release confirmation', 'Inject approved popup notes into update feeds']) {
      expect(step(name).run).toContain('env GITHUB_SHA="$RELEASE_SOURCE_SHA"')
      expect(step(name).run).not.toContain('GITHUB_RUN_ID=')
      expect(step(name).run).not.toContain('GITHUB_RUN_ATTEMPT=')
    }
    expect(step('Verify release assets before publication').run).toContain('RELEASE_TAG#v')
    expect(step('Mirror release assets to ModelScope').run).toContain('tag = os.environ["RELEASE_TAG"]')
    expect(step('Mirror release assets to ModelScope').run).not.toContain('GITHUB_REF_NAME')
    const index = name => jobs.publish.steps.findIndex(item => item.name === name)
    for (const name of ['Create or update release', 'Mirror release assets to ModelScope', 'Configure initial 5% rollout on crash service']) {
      expect(index(name)).toBeGreaterThan(index('Wait for Feishu release confirmation'))
      expect(index(name)).toBeGreaterThan(index('Recheck immutable source after human approval'))
    }
    expect(step('Create or update release').run).toContain('--verify-tag')
  })
})
