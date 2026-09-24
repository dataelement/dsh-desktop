import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { composeEntries, loadProfileDirectory, readProfilePatches, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import { inspectProfileBootInputs } from '../src/main/state/profile-boot-preflight'
import { setHostPluginEnabled } from '../src/main/state/host-plugin-state'
import { projectRoot } from './patch-path'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true }))) })

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-boot-preflight-'))
  homes.push(home)
  const profile = join(home, 'profiles', 'web')
  const bundle = join(profile, 'node_modules', 'test-startup-bundle')
  await mkdir(bundle, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['test-startup-bundle'] } } }))
  await writeFile(join(bundle, 'package.json'), JSON.stringify({ name: 'test-startup-bundle', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
  await writeFile(join(bundle, 'cordis.patch.yml'), '[]\n')
  const entry = join(home, 'app', 'lib', 'bin.js')
  return { home, profile, bundle, check: () => inspectProfileBootInputs(home, entry) }
}

describe('normal Profile boot preflight', () => {
  it('accepts readable layers without evaluating config or modifying user files', async () => {
    const { profile, check } = await fixture()
    const patch = '- id: test\n  config:\n    value: !!js (() => { throw new Error("must not execute") })()\n'
    await writeFile(join(profile, 'cordis.patch.yml'), patch)
    expect(await check()).toBeUndefined()
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe(patch)
  })

  it.each(['bundle', 'patch', 'manifest', 'profile-yaml', 'home-yaml'] as const)('reports broken %s inputs before starting Harness', async broken => {
    const { home, profile, bundle, check } = await fixture()
    if (broken === 'bundle') await rm(bundle, { recursive: true })
    if (broken === 'patch') await rm(join(bundle, 'cordis.patch.yml'))
    if (broken === 'manifest') await writeFile(join(profile, 'package.json'), '{broken')
    if (broken === 'profile-yaml') await writeFile(join(profile, 'cordis.patch.yml'), '[broken')
    if (broken === 'home-yaml') await writeFile(join(home, 'cordis.patch.yml'), '[broken')
    const problem = await check()
    expect(problem?.message).toEqual(expect.any(String))
    if (broken === 'bundle' || broken === 'patch') {
      expect(problem?.message).toContain('test-startup-bundle')
      // Safe Mode points at this package instead of re-parsing the message.
      expect(problem?.packageName).toBe('test-startup-bundle')
    } else {
      expect(problem?.packageName).toBeUndefined()
    }
  })

  it('allows Harness to initialize an absent Profile', async () => {
    const { profile, check } = await fixture()
    await rm(profile, { recursive: true })
    expect(await check()).toBeUndefined()
  })

  it('skips a disabled incompatible bundle in both preflight and Harness, then checks it again when enabled', async () => {
    const { profile, bundle, check } = await fixture()
    await writeFile(join(bundle, 'package.json'), JSON.stringify({
      name: 'test-startup-bundle', version: '1.0.0',
      peerDependencies: { '@deepseek-ai/dsh-api': '0.0.0' },
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    const anchor = join(profile, 'missing-install', 'package.json')
    expect((await check())?.packageName).toBe('test-startup-bundle')
    await mkdir(join(profile, '.dsh-market'))
    const statePath = join(profile, '.dsh-market', 'state.json')
    await writeFile(statePath, JSON.stringify({ disabled: ['test-startup-bundle'] }))
    expect(await check()).toBeUndefined()
    expect(loadProfileDirectory('dsh-desktop', profile, anchor).layers).toEqual([])
    await writeFile(statePath, JSON.stringify({ disabled: [] }))
    expect((await check())?.packageName).toBe('test-startup-bundle')
  })

  it('skips a disabled bundle whose files are missing, while still checking other active bundles', async () => {
    const { profile, bundle, check } = await fixture()
    await rm(bundle, { recursive: true })
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({
      disabledSkins: ['test-startup-bundle']
    }))
    expect(await check()).toBeUndefined()
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dsh: { profile: { bundles: ['test-startup-bundle', 'another-active-bundle'] } }
    }))
    expect((await check())?.packageName).toBe('another-active-bundle')
  })

  it('does not treat an unreadable market state as permission to skip checks', async () => {
    const { profile, bundle, check } = await fixture()
    await rm(bundle, { recursive: true })
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, '.dsh-market', 'state.json'), '{bad json')
    expect((await check())?.packageName).toBe('test-startup-bundle')
  })

  it('disables host overlay rows that insert an off Profile package', async () => {
    const { home, profile, check } = await fixture()
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: host-bundle-row\n  disabled: true\n')
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['test-startup-bundle'] }))
    expect(await check()).toBeUndefined()
    const anchor = join(home, 'app', 'package.json')
    const loaded = loadProfileDirectory('dsh-desktop', profile, anchor)
    const context: ProfileContext = {
      name: 'web', dir: profile, home, installAnchor: anchor,
      patchPath: join(profile, 'cordis.patch.yml'), cwd: home,
      startedBundles: ['test-startup-bundle'], telemetryDisabledEnv: undefined,
      overlays: [{ insert: [{ id: 'host-bundle-row', name: 'test-startup-bundle' }] }]
    }
    const entries = composeEntries([readProfilePatches('dsh-desktop', context, loaded)])
    expect(entries).toEqual([expect.objectContaining({ id: 'host-bundle-row', disabled: true })])
  })

  it('restores a core row previously disabled through a now skipped plugin with the same row id', async () => {
    const { home, profile, bundle } = await fixture()
    const core = join(profile, 'node_modules', 'core-bundle')
    await mkdir(core, { recursive: true })
    await writeFile(join(core, 'package.json'), JSON.stringify({
      name: 'core-bundle', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(core, 'cordis.patch.yml'), '- insert:\n    - id: authorization\n      name: core-authorization\n')
    await writeFile(join(bundle, 'cordis.patch.yml'), '- insert:\n    - id: authorization\n      name: test-startup-bundle\n')
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dsh: { profile: { bundles: ['core-bundle', 'test-startup-bundle'] } }
    }))
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: authorization\n  disabled: true\n')
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['test-startup-bundle'] }))
    const anchor = join(home, 'app', 'package.json')
    const loaded = loadProfileDirectory('dsh-desktop', profile, anchor)
    const context: ProfileContext = {
      name: 'web', dir: profile, home, installAnchor: anchor,
      patchPath: join(profile, 'cordis.patch.yml'), cwd: home,
      startedBundles: ['core-bundle', 'test-startup-bundle'], telemetryDisabledEnv: undefined,
      overlays: []
    }
    const entries = composeEntries([readProfilePatches('dsh-desktop', context, loaded)])
    expect(entries).toEqual([expect.objectContaining({
      id: 'authorization', name: 'core-authorization', disabled: false
    })])
  })

  it.each(['dsh-image-generation', 'test-startup-bundle'])('sends a duplicate %s bundle to Recovery without changing the manifest', async (name) => {
    const { home, profile } = await fixture()
    const manifestPath = join(profile, 'package.json')
    const manifest = JSON.stringify({
      dependencies: { [name]: '0.1.1' },
      dsh: { profile: { bundles: [name] } }
    })
    await writeFile(manifestPath, manifest)
    if (name !== 'test-startup-bundle') {
      await symlink(join(projectRoot, 'node_modules', name),
        join(profile, 'node_modules', name), 'junction')
    }
    const entry = join(home, 'app', 'lib', 'bin.js')
    const hostPatch = name === 'test-startup-bundle'
      ? join(home, 'host.patch.yml')
      : join(projectRoot, 'build', 'dsh-desktop.patch.yml')
    if (name === 'test-startup-bundle') {
      await writeFile(hostPatch, '- insert:\n    - id: host-test\n      name: test-startup-bundle\n')
    } else {
      expect(await inspectProfileBootInputs(home, entry, hostPatch)).toBeUndefined()
      await setHostPluginEnabled(home, name, true)
    }
    expect(await inspectProfileBootInputs(home, entry, hostPatch)).toEqual({
      message: expect.stringContaining('enabled in both'),
      packageName: name
    })
    expect(await readFile(manifestPath, 'utf8')).toBe(manifest)
    await setHostPluginEnabled(home, name, false)
    expect(await inspectProfileBootInputs(home, entry, hostPatch)).toBeUndefined()
    await setHostPluginEnabled(home, name, true)
    await mkdir(join(profile, '.dsh-market'))
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: [name] }))
    expect(await inspectProfileBootInputs(home, entry, hostPatch)).toBeUndefined()
    expect(await readFile(manifestPath, 'utf8')).toBe(manifest)
  })
})
