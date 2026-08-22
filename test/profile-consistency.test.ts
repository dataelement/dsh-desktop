import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inspectProfileConsistency } from '../src/main/state/profile-consistency'

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
})
