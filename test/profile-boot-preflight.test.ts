import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
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

  it('skips a disabled incompatible or missing bundle before startup checks', async () => {
    const { profile, bundle, check } = await fixture()
    await writeFile(join(bundle, 'package.json'), '{broken')
    expect((await check())?.packageName).toBe('test-startup-bundle')
    await mkdir(join(profile, '.dsh-market'))
    const statePath = join(profile, '.dsh-market', 'state.json')
    await writeFile(statePath, JSON.stringify({ disabled: ['test-startup-bundle'] }))
    expect(await check()).toBeUndefined()
    expect(loadProfileDirectory('dsh-desktop', profile, join(profile, 'missing-app', 'package.json')).layers).toEqual([])
    await rm(bundle, { recursive: true })
    expect(await check()).toBeUndefined()
    await writeFile(statePath, JSON.stringify({ disabled: [] }))
    expect((await check())?.packageName).toBe('test-startup-bundle')
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
