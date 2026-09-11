import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { detectPluginRecovery } from '../src/main/plugin-recovery-detection'
import { parsePluginStartupFailures, PLUGIN_FAILURE_PREFIX } from '../src/shared/plugin-startup-failure'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

async function fixture(sources: string[]) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-startup-failure-'))
  roots.push(home)
  const profile = join(home, 'profiles', 'web')
  const names = sources.map((_, index) => `fixture-plugin-${index}`)
  for (const [index, source] of sources.entries()) {
    const dir = join(profile, 'node_modules', names[index]!)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'package.json'), JSON.stringify({
      name: names[index], version: '1.2.3', type: 'module', main: './index.js',
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(dir, 'index.js'), source)
    // The leaf is a file URL, not a package name. Legacy package-name matching
    // cannot establish this owner; provenance must survive nested groups.
    await writeFile(join(dir, 'cordis.patch.yml'), JSON.stringify([{ insert: [{
      id: `group-${index}`, name: 'cordis:group', group: true,
      config: [{ id: `leaf-${index}`, name: pathToFileURL(join(dir, 'index.js')).href }]
    }] }]))
  }
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    dependencies: Object.fromEntries(names.map((name) => [name, '1.2.3'])),
    dsh: { profile: { bundles: names } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]')
  const entry = join(home, 'entry.mjs')
  const bootUrl = pathToFileURL(resolve('node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')).href
  await writeFile(entry, `
    import { loadProfile, boot } from ${JSON.stringify(bootUrl)};
    const profile = loadProfile('fixture', 'web', ${JSON.stringify(resolve('node_modules/@deepseek-ai/dsh/package.json'))}, ${JSON.stringify(home)});
    await boot('fixture', ${JSON.stringify(join(profile, 'cordis.yml'))}, profile.layers.flatMap(layer => layer.patches), ctx => {
      ctx.provide('subagents', {});
    });
  `)
  return { home, entry, names }
}

function run(entry: string) {
  const result = spawnSync(process.execPath, [resolve('build/harness-node-entry.mjs'), entry], {
    encoding: 'utf8', timeout: 15_000
  })
  expect(result.error).toBeUndefined()
  expect(result.status, result.stderr).toBe(1)
  const line = result.stderr.split('\n').find((line) => line.startsWith(PLUGIN_FAILURE_PREFIX))
  expect(line, result.stderr).toBeDefined()
  const failures = parsePluginStartupFailures(line!)!
  expect(failures).toBeDefined()
  expect(result.stderr.indexOf(PLUGIN_FAILURE_PREFIX)).toBeLessThan(result.stderr.indexOf('[harness-node] DSH entry failed:'))
  return { failures, stderr: result.stderr }
}

describe('structured startup failures through the real bundled loader', () => {
  it('attributes a nested missing-method failure to its root bundle and reuses recovery selection', async () => {
    const { home, entry, names } = await fixture([
      'export default function(ctx) { ctx.subagents.registerContinuableSetup(); }'
    ])
    const { failures, stderr } = run(entry)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({
      stage: 'apply', entryId: 'leaf-0',
      owner: { packageName: names[0], version: '1.2.3' },
      message: expect.stringContaining('registerContinuableSetup is not a function')
    })
    expect(failures[0]!.chain.map((row) => row.entryId)).toContain('group-0')
    const detection = await detectPluginRecovery({ dshHome: home, initialLogs: [], startupFailures: failures })
    expect(detection.plugins).toEqual(names)
    expect(stderr).not.toContain('"config":')
  })

  it('preserves multiple async/non-Error failures without selecting wrapper plugins', async () => {
    const { entry, names } = await fixture([
      'export default async function() { await Promise.resolve(); throw new Error("async failure"); }',
      'export default function() { throw "plain rejection"; }'
    ])
    const { failures } = run(entry)
    expect(failures.map((failure) => failure.owner?.packageName).sort()).toEqual(names)
    expect(failures.map((failure) => failure.message)).toEqual(expect.arrayContaining(['async failure', 'plain rejection']))
  })

  it('captures module import failures with the same owner contract', async () => {
    const { entry, names } = await fixture(['import "missing-fixture-dependency"; export default () => {};'])
    expect(run(entry).failures[0]).toMatchObject({ stage: 'import', owner: { packageName: names[0] } })
  })

  it('inherits ownership for an unannotated child loaded by a nested include', async () => {
    const { home, entry, names } = await fixture(['export default function() { throw new Error("nested include failure"); }'])
    const dir = join(home, 'profiles', 'web', 'node_modules', names[0]!)
    await writeFile(join(dir, 'children.yml'), JSON.stringify([
      { id: 'included-leaf', name: pathToFileURL(join(dir, 'index.js')).href }
    ]))
    await writeFile(join(dir, 'cordis.patch.yml'), JSON.stringify([{ insert: [{
      id: 'plugin-include', name: 'cordis:include', config: { path: pathToFileURL(join(dir, 'children.yml')).href }
    }] }]))
    expect(run(entry).failures[0]).toMatchObject({
      entryId: 'included-leaf', owner: { packageName: names[0], version: '1.2.3' }
    })
  })

  it('reports the same provenance through the production DSH CLI entry', async () => {
    const { home, names } = await fixture(['export default function() { throw new TypeError("startup API mismatch"); }'])
    const result = spawnSync(process.execPath, [
      resolve('build/harness-node-entry.mjs'), resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'),
      '--profile', 'web'
    ], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, DSH_HOME: home } })
    expect(result.status, result.stderr).toBe(1)
    const line = result.stderr.split('\n').find((line) => line.startsWith(PLUGIN_FAILURE_PREFIX))
    expect(line, result.stderr).toBeDefined()
    expect(parsePluginStartupFailures(line!)?.[0]?.owner?.packageName).toBe(names[0])
  }, 20_000)

  it('captures bundle preparation failures before a loader entry exists', async () => {
    const { home, entry, names } = await fixture(['export default () => {};'])
    await rm(join(home, 'profiles', 'web', 'node_modules', names[0]!, 'cordis.patch.yml'))
    expect(run(entry).failures[0]).toMatchObject({ stage: 'prepare', owner: { packageName: names[0] } })
  })

  it('reports missing-service activation with the owning bundle', async () => {
    const { entry, names } = await fixture([
      'export const inject = ["unavailableFixtureService"]; export function apply() {}'
    ])
    expect(run(entry).failures[0]).toMatchObject({
      stage: 'activate', owner: { packageName: names[0] },
      message: expect.stringContaining('unavailableFixtureService')
    })
  })

  it('preserves the initialization error when scope cleanup also throws', async () => {
    const { entry } = await fixture([
      'export default function(ctx) { ctx.fiber.dispose = async () => { throw new Error("cleanup failure"); }; throw Object.freeze(new Error("original initialization failure")); }'
    ])
    const { failures, stderr } = run(entry)
    expect(failures).toHaveLength(1)
    expect(stderr).toContain('original initialization failure')
    expect(stderr).toContain('cleanup failure')
  })

  it('keeps successful bundle loading unchanged', async () => {
    const { entry } = await fixture(['export default function() {}'])
    const result = spawnSync(process.execPath, [resolve('build/harness-node-entry.mjs'), entry], {
      encoding: 'utf8', timeout: 5_000
    })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stderr).not.toContain(PLUGIN_FAILURE_PREFIX)
  })

  it('does not replace unknown/protected owners with unrelated text suspects', async () => {
    const { home, names } = await fixture(['export default () => {};'])
    for (const owner of [undefined, { packageName: '@deepseek-ai/dsh-base' }, { packageName: 'not-installed' }]) {
      const detection = await detectPluginRecovery({
        dshHome: home,
        initialLogs: [`[stderr] failed to apply loader entry x (${names[0]}): misleading text`],
        startupFailures: [{ stage: 'apply', packageName: 'leaf', message: 'failure', chain: [], owner }]
      })
      expect(detection.plugins).toEqual([])
    }
  })

  it('rejects malformed and unsupported wire reports', () => {
    for (const value of ['{', '{"version":2,"failures":[]}', '{"version":1,"failures":[{}]}']) {
      expect(parsePluginStartupFailures(PLUGIN_FAILURE_PREFIX + value)).toBeUndefined()
    }
  })

  it('retains structured identity outside the log ring and clears it on a fresh launch', async () => {
    const { home, entry, names } = await fixture([
      'export default function(ctx) { ctx.subagents.registerContinuableSetup(); }'
    ])
    const runtime = new HarnessRuntime({
      dshEntryPath: entry,
      nodeEntryPath: resolve('build/harness-node-entry.mjs'),
      nodeExecutablePath: process.execPath,
      dshPatchPath: entry,
      dshSafePatchPath: entry,
      dshHome: home,
      logPath: join(home, 'runtime.log'),
      startupTimeoutMs: 5_000,
      launchProcess: (executable, args, options) => spawn(executable, args, options),
      onChanged() {}
    })
    try {
      expect(runtime.launchAttemptId).toBe(0)
      await runtime.start(home)
      expect(runtime.launchAttemptId).toBe(1)
      expect(runtime.snapshot().phase).toBe('failed')
      expect(runtime.snapshot().pluginFailures?.[0]?.owner?.packageName).toBe(names[0])
      for (let i = 0; i < 250; i++) runtime.note(`later diagnostic ${i}`)
      expect(runtime.snapshot().logs.some((line) => line.includes(PLUGIN_FAILURE_PREFIX))).toBe(false)
      expect((await detectPluginRecovery({
        dshHome: home, initialLogs: runtime.snapshot().logs,
        startupFailures: runtime.snapshot().pluginFailures
      })).plugins).toEqual(names)
      await writeFile(entry, 'throw new Error("unrelated host failure");')
      await runtime.start(home)
      expect(runtime.launchAttemptId).toBe(2)
      expect(runtime.snapshot().pluginFailures).toEqual([])
      expect(runtime.snapshot().message).toContain('unrelated host failure')
    } finally {
      await runtime.stop()
    }
  }, 15_000)
})
