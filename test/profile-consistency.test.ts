import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { healProfileBundles, HOST_COMPOSED_BUNDLES, inspectProfileConsistency } from '../src/main/state/profile-consistency'
import { projectRoot } from './patch-path'

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>()
  return { ...original, rename: vi.fn(original.rename) }
})

describe('profile consistency', () => {
  const homes: string[] = []

  async function profileHome(manifest: unknown, layer = '[]\n'): Promise<{ home: string; modules: string }> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-consistency-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const modules = join(profile, 'node_modules')
    await mkdir(modules, { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify(manifest), 'utf8')
    await writeFile(join(profile, 'cordis.patch.yml'), layer, 'utf8')
    return { home, modules }
  }

  async function install(modules: string, name: string, bundle = true): Promise<void> {
    await mkdir(join(modules, name), { recursive: true })
    await writeFile(
      join(modules, name, 'package.json'),
      JSON.stringify({ name, ...(bundle ? { dsh: { bundle: { patch: './cordis.patch.yml' } } } : {}) }),
      'utf8'
    )
  }

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
  })

  it('says nothing about a coherent profile', async () => {
    const { home, modules } = await profileHome({
      dependencies: { dshmarket: '1.17.1' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dshmarket'] } }
    })
    await install(modules, 'dshmarket')

    await expect(inspectProfileConsistency(home)).resolves.toEqual([])
  })

  it('names a package that is installed but never composed', async () => {
    // Exactly the state a rolled-back install leaves: the files are there, the
    // declaration is not, and the market can never load.
    const { home, modules } = await profileHome({
      dependencies: { dshmarket: '1.16.0' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } }
    })
    await install(modules, 'dshmarket')

    await expect(inspectProfileConsistency(home)).resolves.toEqual([
      'dshmarket is installed and declares a bundle, but is not composed'
    ])
  })

  it('names a package left installed but declared nowhere', async () => {
    // The state a rolled-back install leaves behind, and the one that made the
    // market unusable: files present, every declaration gone, so anything that
    // only checks node_modules still calls it installed.
    const { home, modules } = await profileHome({
      dependencies: { 'dsh-spend': '^0.4.6' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-spend'] } }
    })
    await install(modules, 'dsh-spend')
    await install(modules, 'dshmarket')
    // A bundle that arrived as a dependency of a declared plugin is not ours
    // to complain about.
    await writeFile(
      join(modules, 'dsh-spend', 'package.json'),
      JSON.stringify({
        name: 'dsh-spend',
        dependencies: { 'dsh-spend-ui': '^1.0.0' },
        dsh: { bundle: { patch: './cordis.patch.yml' } }
      }),
      'utf8'
    )
    await install(modules, 'dsh-spend-ui')

    await expect(inspectProfileConsistency(home)).resolves.toEqual([
      'dshmarket is installed but declared nowhere in the profile manifest'
    ])
  })

  it('names a bundle that is declared but missing', async () => {
    const { home } = await profileHome({
      dependencies: { 'dsh-doudizhu': '^1.0.0' },
      dsh: { profile: { bundles: ['dsh-doudizhu'] } }
    })

    await expect(inspectProfileConsistency(home)).resolves.toEqual([
      'bundle dsh-doudizhu is declared but not installed'
    ])
  })

  it('names a patch layer that inserts something uninstalled', async () => {
    const { home } = await profileHome(
      { dependencies: {}, dsh: { profile: { bundles: [] } } },
      '- insert:\n    - id: doudizhu\n      name: dsh-doudizhu\n'
    )

    await expect(inspectProfileConsistency(home)).resolves.toEqual([
      'the patch layer inserts dsh-doudizhu, which is not installed'
    ])
  })

  it('leaves a home without a profile alone', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-consistency-empty-'))
    homes.push(home)
    await expect(inspectProfileConsistency(home)).resolves.toEqual([])
  })

  it('auto-heals uncomposed bundles into manifest dsh.profile.bundles', async () => {
    const { home, modules } = await profileHome({
      dependencies: { 'dsh-better-sidebar': '^1.0.0', 'dsh-dream-skin': '^1.0.0' },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } }
    })
    await install(modules, 'dsh-better-sidebar', true)
    await install(modules, 'dsh-dream-skin', true)

    // Before heal, consistency reports they are installed but not composed
    const beforeFindings = await inspectProfileConsistency(home)
    expect(beforeFindings).toContain('dsh-better-sidebar is installed and declares a bundle, but is not composed')
    expect(beforeFindings).toContain('dsh-dream-skin is installed and declares a bundle, but is not composed')

    // Heal
    const healed = await healProfileBundles(home)
    expect(healed).toEqual({ added: ['dsh-better-sidebar', 'dsh-dream-skin'], removed: [] })

    // After heal, consistency reports clean
    await expect(inspectProfileConsistency(home)).resolves.toEqual([])

    // Check package.json
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      'dsh-better-sidebar',
      'dsh-dream-skin'
    ])
  })

  it.each([
    [],
    ['dsh-ppt'],
    ['dsh-ppt-composer'],
    ['dsh-image-generation'],
    ['dsh-ppt', 'dsh-ppt-composer', 'dsh-image-generation']
  ])('keeps image generation declared while reconciling Desktop PPT layers %j', async (...bundles: string[]) => {
    const manifest = {
      dependencies: { 'dsh-ppt': '0.1.1-rc.2', 'dsh-ppt-composer': '0.1.1-rc.2', 'dsh-image-generation': '0.1.0', 'community-plugin': '1.0.0' },
      dsh: { profile: { bundles }, desktop: { preserved: true } }
    }
    const layer = '# Preserve custom settings, including PPT settings.\n[]\n'
    const { home, modules } = await profileHome(manifest, layer)
    for (const name of [...HOST_COMPOSED_BUNDLES, 'dsh-image-generation', 'community-plugin']) await install(modules, name)
    const profile = join(home, 'profiles', 'web')
    const pptData = join(home, 'kimi-ppt', 'existing-project.json')
    await mkdir(join(home, 'kimi-ppt'))
    await writeFile(pptData, '{"existing":"project"}')

    const imageDeclared = bundles.includes('dsh-image-generation')
    const removed = bundles.filter((name) => name !== 'dsh-image-generation')
    expect(await healProfileBundles(home, HOST_COMPOSED_BUNDLES)).toEqual({
      added: [...(imageDeclared ? [] : ['dsh-image-generation']), 'community-plugin'], removed
    })
    const after = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(after).toEqual({ ...manifest, dsh: { ...manifest.dsh, profile: { bundles: ['dsh-image-generation', 'community-plugin'] } } })
    for (const name of HOST_COMPOSED_BUNDLES) {
      expect(JSON.parse(await readFile(join(modules, name, 'package.json'), 'utf8')).name).toBe(name)
    }
    expect(await readFile(pptData, 'utf8')).toBe('{"existing":"project"}')
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe(layer)
    await expect(inspectProfileConsistency(home, HOST_COMPOSED_BUNDLES)).resolves.toEqual([])

    // Compose with the real shipped layers: installed core + composer bundles
    // used to activate the core twice (and could insert the composer twice).
    const patches = new Map([...HOST_COMPOSED_BUNDLES, 'dsh-image-generation'].map((name) => [
      name, loadOverlayPatches('test', join(projectRoot, 'node_modules', name, 'cordis.patch.yml'))
    ]))
    const desktop = loadOverlayPatches('test', join(projectRoot, 'build', 'dsh-desktop.patch.yml'))
    const entries = composeEntries([
      ...after.dsh.profile.bundles.map((name: string) => patches.get(name) ?? []),
      desktop
    ])
    expect(entries.filter((entry) => !entry.disabled && entry.name === 'dsh-ppt')).toHaveLength(0)
    expect(entries.filter((entry) => !entry.disabled && entry.name === 'dsh-ppt-composer')).toHaveLength(1)
    expect(entries.filter((entry) => !entry.disabled && entry.name === 'dsh-image-generation')).toHaveLength(2)
    const once = await readFile(join(profile, 'package.json'), 'utf8')
    await expect(healProfileBundles(home, HOST_COMPOSED_BUNDLES)).resolves.toEqual({ added: [], removed: [] })
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(once)
  })

  it('still composes PPT when no Desktop owner was specified', async () => {
    const { home, modules } = await profileHome({
      dependencies: { 'dsh-ppt': '0.1.1-rc.2' }, dsh: { profile: { bundles: [] } }
    })
    await install(modules, 'dsh-ppt')
    await expect(healProfileBundles(home)).resolves.toEqual({ added: ['dsh-ppt'], removed: [] })
  })

  it('preserves the manifest and reports failure if duplicate removal cannot be committed', async () => {
    const { home } = await profileHome({ dsh: { profile: { bundles: ['dsh-ppt'] } } })
    const file = join(home, 'profiles', 'web', 'package.json')
    const before = await readFile(file, 'utf8')
    vi.mocked(fs.rename).mockRejectedValueOnce(new Error('replacement denied'))
    await expect(healProfileBundles(home, HOST_COMPOSED_BUNDLES)).rejects.toThrow('replacement denied')
    expect(await readFile(file, 'utf8')).toBe(before)
    expect((await fs.readdir(join(home, 'profiles', 'web'))).filter((name) => name.endsWith('.tmp'))).toEqual([])
  })
})
