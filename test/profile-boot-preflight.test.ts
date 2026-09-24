import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { inspectProfileBootInputs } from '../src/main/state/profile-boot-preflight'

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
})
