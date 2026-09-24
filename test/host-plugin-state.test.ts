import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { profileHasEnabledBundle, readDisabledHostPlugins, setHostPluginEnabled } from '../src/main/state/host-plugin-state'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true }))) })

describe('Desktop host plugin state', () => {
  it('defaults the built-in image tool to disabled and persists a reversible host-only switch', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-state-'))
    homes.push(home)
    expect(await readDisabledHostPlugins(home)).toEqual(['dsh-image-generation'])
    await setHostPluginEnabled(home, 'dsh-image-generation', true)
    expect(await readDisabledHostPlugins(home)).toEqual([])
    await setHostPluginEnabled(home, 'dsh-image-generation', false)
    expect(await readDisabledHostPlugins(home)).toEqual(['dsh-image-generation'])
  })

  it('preserves an explicitly enabled state from an existing Profile', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-state-'))
    homes.push(home)
    await writeFile(join(home, 'desktop-host-plugins.json'), JSON.stringify({ version: 1, disabled: [] }))
    expect(await readDisabledHostPlugins(home)).toEqual([])
  })

  it('does not silently enable a host plugin when its state is corrupt', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-state-'))
    homes.push(home)
    await writeFile(join(home, 'desktop-host-plugins.json'), '{broken')
    await expect(readDisabledHostPlugins(home)).rejects.toThrow()
    await expect(setHostPluginEnabled(home, 'dsh-image-generation', false)).rejects.toThrow()
    expect(await readFile(join(home, 'desktop-host-plugins.json'), 'utf8')).toBe('{broken')
  })

  it('reports an active market bundle for conflict prevention', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-host-state-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, '.dsh-market'), { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: ['dsh-image-generation'] } } }))
    expect(await profileHasEnabledBundle(home, 'dsh-image-generation')).toBe(true)
    await writeFile(join(profile, '.dsh-market', 'state.json'), JSON.stringify({ disabled: ['dsh-image-generation'] }))
    expect(await profileHasEnabledBundle(home, 'dsh-image-generation')).toBe(false)
  })
})
