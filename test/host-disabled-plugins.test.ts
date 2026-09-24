import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { composeEntries, loadOverlayPatches, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { prepareHostDisabledPluginsPatch } from '../src/main/state/host-disabled-plugins'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { inspectProfileBootInputs } from '../src/main/state/profile-boot-preflight'
import { prepareProfileBundleForHostEnable, setHostPluginEnabled } from '../src/main/state/host-plugin-state'
import { projectRoot } from './patch-path'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))) })

describe('disabled Profile packages in Desktop host patch', () => {
  it('drops a stale generated host disable when a Profile package is switched off', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const market = join(home, 'profiles', 'web', '.dsh-market')
    await mkdir(market, { recursive: true })
    await writeFile(join(market, 'state.json'), JSON.stringify({ disabled: ['dsh-image-generation'] }))
    const hostPath = join(home, 'desktop.patch.yml')
    await writeFile(hostPath, '- insert:\n    - id: dsh-image-generation\n      name: dsh-image-generation\n')
    const stalePath = join(home, 'desktop-disabled-plugins.patch.yml')
    await writeFile(stalePath, '- id: dsh-image-generation\n  disabled: true\n')

    expect(await prepareHostDisabledPluginsPatch(home, hostPath)).toBeUndefined()
    await expect(readFile(stalePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('restores an active in-box row disabled by the market toggle for the same package name', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, '.dsh-market'), { recursive: true })
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['dsh-image-generation'] }))
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: image-gen\n  disabled: true\n- id: dsh-image-generation\n  disabled: true\n')
    const hostPath = join(home, 'desktop.patch.yml')
    await writeFile(hostPath, '- insert:\n    - id: dsh-image-generation\n      name: dsh-image-generation\n')

    const overlayPath = await prepareHostDisabledPluginsPatch(home, hostPath)
    expect(overlayPath).toBeDefined()
    expect(await readFile(overlayPath!, 'utf8')).toContain('- id: "dsh-image-generation"\n  disabled: false')
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toContain('disabled: true')
  })

  it('keeps the core authorization row and the in-box image tool active', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const core = join(profile, 'node_modules', 'core-bundle')
    const optional = join(profile, 'node_modules', 'optional-bundle')
    await mkdir(core, { recursive: true })
    await mkdir(optional, { recursive: true })
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dsh: { profile: { bundles: ['core-bundle', 'optional-bundle'] } }
    }))
    for (const [directory, name] of [[core, 'core-bundle'], [optional, 'optional-bundle']] as const) {
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name, dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
    }
    await writeFile(join(core, 'cordis.patch.yml'), '- insert:\n    - id: authorization\n      name: core-authorization\n')
    await writeFile(join(optional, 'cordis.patch.yml'), '- insert:\n    - id: authorization\n      name: optional-bundle\n')
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: authorization\n  disabled: true\n')
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['optional-bundle'] }))
    const hostPath = join(home, 'desktop.patch.yml')
    await writeFile(hostPath, '- insert:\n    - id: imagegen\n      name: optional-bundle\n')

    const overlayPath = await prepareHostDisabledPluginsPatch(home, hostPath)
    expect(overlayPath).toBeDefined()
    const loaded = loadProfileDirectory('dsh-desktop', profile, join(home, 'missing-app', 'package.json'))
    const entries = composeEntries([
      ...loaded.layers.map((layer) => layer.patches),
      loaded.patches,
      loadOverlayPatches('dsh-desktop', hostPath),
      loadOverlayPatches('dsh-desktop', overlayPath!)
    ])
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'authorization', name: 'core-authorization', disabled: false }),
      expect.objectContaining({ id: 'imagegen', name: 'optional-bundle' })
    ]))
    expect(entries.find((entry) => entry.id === 'imagegen')?.disabled).toBeUndefined()
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe('- id: authorization\n  disabled: true\n')
  })

  it('boots the real Harness with a stale market disable and keeps image settings available', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const runtime = new HarnessRuntime({
      dshEntryPath: join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      nodeEntryPath: join(projectRoot, 'build', 'harness-node-entry.mjs'),
      nodeExecutablePath: process.execPath,
      dshPatchPath: join(projectRoot, 'build', 'dsh-desktop.patch.yml'),
      dshSafePatchPath: join(projectRoot, 'build', 'dsh-desktop-safe.patch.yml'),
      dshHome: home,
      logPath: join(home, 'harness.log'),
      startupTimeoutMs: 30_000,
      launchProcess: (executable, args, options) => spawn(executable, args, options),
      onChanged() {}
    })
    try {
      await setHostPluginEnabled(home, 'dsh-image-generation', true)
      await runtime.start(home)
      expect(runtime.snapshot().phase, runtime.snapshot().logs.join('\n')).toBe('ready')
      await runtime.stop()
      const market = join(home, 'profiles', 'web', '.dsh-market')
      await mkdir(market, { recursive: true })
      await writeFile(join(market, 'state.json'), JSON.stringify({ disabled: ['dsh-image-generation'] }))
      await runtime.start(home)
      const snapshot = runtime.snapshot()
      expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
      if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce an authenticated endpoint')
      const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
      const headers = { Cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') }
      const page = await fetch(snapshot.url, { headers })
      expect(page.status).toBe(200)
      expect(await page.text()).toContain('dsh-image-generation')
      expect((await fetch(new URL('/api/image-generation.settings', snapshot.url), { headers })).status).toBe(200)
    } finally {
      await runtime.stop()
    }
  }, 90_000)

  it('skips the installed market image bundle while keeping the in-box settings available', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const runtime = new HarnessRuntime({
      dshEntryPath: join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      nodeEntryPath: join(projectRoot, 'build', 'harness-node-entry.mjs'),
      nodeExecutablePath: process.execPath,
      dshPatchPath: join(projectRoot, 'build', 'dsh-desktop.patch.yml'),
      dshSafePatchPath: join(projectRoot, 'build', 'dsh-desktop-safe.patch.yml'),
      dshHome: home,
      logPath: join(home, 'harness.log'),
      startupTimeoutMs: 30_000,
      launchProcess: (executable, args, options) => spawn(executable, args, options),
      onChanged() {}
    })
    try {
      await setHostPluginEnabled(home, 'dsh-image-generation', true)
      await runtime.start(home)
      expect(runtime.snapshot().phase, runtime.snapshot().logs.join('\n')).toBe('ready')
      await runtime.stop()
      const manifestPath = join(profile, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        dependencies: Record<string, string>
        dsh: { profile: { bundles: string[] } }
      }
      manifest.dependencies['dsh-image-generation'] = '0.1.1'
      manifest.dsh.profile.bundles.push('dsh-image-generation')
      await writeFile(manifestPath, JSON.stringify(manifest))
      await symlink(join(projectRoot, 'node_modules', 'dsh-image-generation'),
        join(profile, 'node_modules', 'dsh-image-generation'), 'junction')
      await mkdir(join(profile, '.dsh-market'), { recursive: true })
      await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: [] }))
      await writeFile(join(profile, 'cordis.patch.yml'),
        '- id: image-gen\n  disabled: true\n- id: dsh-image-generation\n  disabled: true\n')
      expect(await prepareProfileBundleForHostEnable(home, 'dsh-image-generation')).toEqual({ ok: true })
      await runtime.start(home)
      const snapshot = runtime.snapshot()
      expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
      expect(await readFile(join(home, 'desktop-disabled-plugins.patch.yml'), 'utf8'))
        .toContain('- id: "dsh-image-generation"\n  disabled: false')
      if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce an authenticated endpoint')
      const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
      const headers = { Cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') }
      expect((await fetch(new URL('/api/image-generation.settings', snapshot.url), { headers })).status).toBe(200)
      expect((await readFile(manifestPath, 'utf8'))).toBe(JSON.stringify(manifest))
    } finally {
      await runtime.stop()
    }
  }, 90_000)

  it('boots the market image bundle with the built-in one off by default', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-disable-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const desktopPatchPath = join(projectRoot, 'build', 'dsh-desktop.patch.yml')
    const entryPath = join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    const runtime = new HarnessRuntime({
      dshEntryPath: entryPath,
      nodeEntryPath: join(projectRoot, 'build', 'harness-node-entry.mjs'),
      nodeExecutablePath: process.execPath,
      dshPatchPath: desktopPatchPath,
      dshSafePatchPath: join(projectRoot, 'build', 'dsh-desktop-safe.patch.yml'),
      dshHome: home,
      logPath: join(home, 'harness.log'),
      startupTimeoutMs: 30_000,
      launchProcess: (executable, args, options) => spawn(executable, args, options),
      onChanged() {}
    })
    try {
      await runtime.start(home)
      expect(runtime.snapshot().phase, runtime.snapshot().logs.join('\n')).toBe('ready')
      expect(await readFile(join(home, 'desktop-host-sources.patch.yml'), 'utf8')).not.toContain('dsh-image-generation')
      await runtime.stop()
      const manifestPath = join(profile, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        dependencies: Record<string, string>
        dsh: { profile: { bundles: string[] } }
      }
      manifest.dependencies['dsh-image-generation'] = '0.1.1'
      manifest.dsh.profile.bundles.push('dsh-image-generation')
      await writeFile(manifestPath, JSON.stringify(manifest))
      await symlink(join(projectRoot, 'node_modules', 'dsh-image-generation'),
        join(profile, 'node_modules', 'dsh-image-generation'), 'junction')
      expect(await inspectProfileBootInputs(home, entryPath, desktopPatchPath)).toBeUndefined()
      await runtime.start(home)
      const snapshot = runtime.snapshot()
      expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
      const hostPatch = await readFile(join(home, 'desktop-host-sources.patch.yml'), 'utf8')
      expect(hostPatch).not.toContain('dsh-image-generation')
      if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce an authenticated endpoint')
      const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
      const headers = { Cookie: login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ') }
      expect((await fetch(new URL('/api/image-generation.settings', snapshot.url), { headers })).status).toBe(200)
    } finally {
      await runtime.stop()
    }
  }, 90_000)
})
