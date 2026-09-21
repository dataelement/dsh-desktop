import { spawn } from 'node:child_process'
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { it, expect } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../src/main/state/safe-mode-profile'
import { BRIDGE_READY_LINE } from '../packages/dsh-desktop-log-bridge/index.js'

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
    // The runtime logger bridge is composed into recovery too. It announces
    // itself on stdout; a clean boot bridges no runtime warning or error.
    expect(recovered.snapshot().logs).toContain(`[stdout] ${BRIDGE_READY_LINE}`)
    expect(recovered.snapshot().logs.filter((line) => line.startsWith('[stderr] [harness-log]'))).toEqual([])
    expect(recovered.snapshot().authToken).toBeTruthy()
    expect((await fetch(recovered.snapshot().url!)).status).toBe(401)
    // Backend readiness is insufficient: recovery must discover and serve the
    // client bootstrap without profiles/node_modules having been repaired.
    const url = recovered.snapshot().url
    const token = recovered.snapshot().authToken
    if (!url || !token) throw new Error('Recovery endpoint was not announced')
    const login = await fetch(`${url}/?token=${encodeURIComponent(token)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    const html = await (await fetch(url, { headers: { Cookie: cookie } })).text()
    const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/gu)].map((match) => match[1])
    const bootstrap = scriptUrls.find((src) => src?.includes('/plugins/??@deepseek-ai/dsh-client-modules/client.js'))
    expect(bootstrap, 'Recovery HTML must preload the client module system').toBeDefined()
    if (!bootstrap) throw new Error('Missing recovery bootstrap')
    const response = await fetch(new URL(bootstrap.replaceAll('&amp;', '&'), url), { headers: { Cookie: cookie } })
    expect(response.status).toBe(200)
    const registrations: { id: string }[] = []
    runInNewContext(await response.text(), { window: { __ModuleLoader__: { load: (registration: { id: string }) => registrations.push(registration) } } })
    expect(registrations.map((registration) => registration.id)).toContain('@deepseek-ai/dsh-client-modules')
    // A ready backend and frontend are insufficient: creating an agent also
    // resolves and mounts the shipped preset, without shared module links.
    await expect(lstat(join(home, 'profiles', 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
    const created = await fetch(new URL('/api/session/create', url), {
      method: 'POST',
      headers: { Cookie: cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'safe-mode-session', method: 'session/create', payload: { args: { request: {} } } })
    })
    const envelope = await created.json()
    expect(envelope.result?.ok, JSON.stringify(envelope)).toBe(true)
    expect(envelope.result?.value?.sessionId).toBeTruthy()
    // Recovery uses its own overlay and never edits the normal composition.
    expect(await readFile(normalPatch, 'utf8')).toContain('name: \'dsh-ppt-composer\'')
  } finally {
    await broken.stop()
    await recovered.stop()
    await rm(home, { recursive: true, force: true })
  }
}, 80_000)
