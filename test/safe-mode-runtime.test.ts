import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { it, expect } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../src/main/state/safe-mode-profile'

it('boots recovery when a PPT dependency is missing without loading optional Desktop plugins', async () => {
  const root = resolve(import.meta.dirname, '..')
  const home = await mkdtemp(join(tmpdir(), 'dsh-safe-mode-runtime-'))
  const normalPatch = join(root, 'build/dsh-desktop.patch.yml')
  const safePatch = join(root, 'build/dsh-desktop-safe.patch.yml')
  const hook = join(home, 'missing-ppt.mjs')
  const missing = 'BUG008 simulated missing PPT dependency'
  await writeFile(hook, `
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@aiden0z/pptx-renderer') {
    throw new Error(${JSON.stringify(missing)});
  }
  if (specifier === 'dsh-desktop-market-installer' || specifier === 'dsh-desktop-preset-transfer') {
    throw new Error('Optional Desktop plugin loaded in recovery: ' + specifier);
  }
  return next(specifier, context);
}});
`)
  const makeRuntime = (dshSafePatchPath: string, logName: string) => new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: process.execPath,
    dshPatchPath: normalPatch,
    dshSafePatchPath,
    dshHome: home,
    logPath: join(home, logName),
    startupTimeoutMs: 30_000,
    launchProcess: (executable, args, options) => spawn(executable, ['--import', pathToFileURL(hook).href, ...args], options),
    onChanged() {}
  })
  // Positive control: the same safe Profile with a PPT-only overlay must fail.
  // This proves the fault injection actually reaches the missing dependency.
  const brokenPatch = join(home, 'ppt.patch.yml')
  await writeFile(brokenPatch, '- insert:\n    - id: dsh-ppt-composer\n      name: dsh-ppt-composer\n')
  const broken = makeRuntime(brokenPatch, 'broken.log')
  const recovered = makeRuntime(safePatch, 'recovered.log')
  try {
    await ensureSafeModeProfile(home)
    await broken.start(home, SAFE_MODE_PROFILE)
    expect(broken.snapshot().phase).toBe('failed')
    expect(broken.snapshot().message, broken.snapshot().logs.join('\n')).toContain(missing)
    await broken.stop()

    await recovered.start(home, SAFE_MODE_PROFILE)
    expect(recovered.snapshot().phase, recovered.snapshot().logs.join('\n')).toBe('ready')
    expect(recovered.snapshot().authToken).toBeTruthy()
    const timings = recovered.snapshot().logs.flatMap(line => {
      const marker = '[startup-timing] '
      const index = line.indexOf(marker)
      return index < 0 ? [] : [JSON.parse(line.slice(index + marker.length))]
    })
    const launch = timings.find(event => event.stage === 'launch')
    expect(launch).toBeDefined()
    for (const stage of ['shell.environment', 'process.spawn', 'child.entry', 'child.harness-import-and-init', 'backend.ready']) {
      expect(timings.some(event => event.stage === stage && event.run === launch.run), stage).toBe(true)
    }
    const imported = timings.find(event => event.stage === 'child.harness-import-and-init' && event.status === 'done')
    expect(imported.moduleCount).toBeGreaterThan(0)
    expect(imported.cpuMs).toBeGreaterThanOrEqual(0)
    expect(JSON.stringify(timings)).not.toContain(recovered.snapshot().authToken)

    expect((await fetch(recovered.snapshot().url!)).status).toBe(401)
    // Recovery uses its own overlay and never edits the normal composition.
    expect(await readFile(normalPatch, 'utf8')).toContain('name: \'dsh-ppt-composer\'')
  } finally {
    await broken.stop()
    await recovered.stop()
    await rm(home, { recursive: true, force: true })
  }
}, 80_000)
