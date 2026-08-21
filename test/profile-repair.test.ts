import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearDamagedPackageDirectories,
  findDamagedPackageDirectories,
  hasProfile
} from '../src/main/state/profile-repair'
import { buildProfileInstallArguments } from '../src/main/runtime/profile-plugin-command'

describe('profile repair', () => {
  const homes: string[] = []

  async function profileHome(): Promise<{ home: string; nodeModules: string }> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-profile-repair-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    const nodeModules = join(profile, 'node_modules')
    await mkdir(nodeModules, { recursive: true })
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.15.0' } }),
      'utf8'
    )
    return { home, nodeModules }
  }

  async function materialize(directory: string, name: string): Promise<string> {
    const path = join(directory, name)
    await mkdir(path, { recursive: true })
    await writeFile(join(path, 'package.json'), JSON.stringify({ name, version: '1.0.0' }), 'utf8')
    return path
  }

  afterEach(async () => {
    await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
  })

  it('reports nothing for a profile whose packages are all materialized', async () => {
    const { home, nodeModules } = await profileHome()
    await materialize(nodeModules, 'dshmarket')
    await materialize(join(nodeModules, '@deepseek-ai'), 'dsh-settings')

    await expect(findDamagedPackageDirectories(home)).resolves.toEqual([])
  })

  it('finds the leftovers a failed pnpm run blocks the next one with', async () => {
    const { home, nodeModules } = await profileHome()
    // What the Windows locked rename leaves: a name taken by something that is
    // not a package, which pnpm can then never rename its staging onto.
    const halfWritten = join(nodeModules, 'cose-base')
    await mkdir(halfWritten, { recursive: true })
    await writeFile(join(halfWritten, 'index.js'), '', 'utf8')
    const staging = join(nodeModules, 'cose-base_tmp_15968_6')
    await mkdir(staging, { recursive: true })
    await writeFile(join(staging, 'package.json'), JSON.stringify({ name: 'cose-base' }), 'utf8')
    const sidelined = join(nodeModules, 'argparse.dsh-old-1787317710932')
    await materialize(nodeModules, 'argparse')
    await mkdir(sidelined, { recursive: true })

    const damaged = await findDamagedPackageDirectories(home)

    expect(new Set(damaged)).toEqual(new Set([halfWritten, staging, sidelined]))
  })

  it('spares pnpm’s own entries, scoped packages, and symlinks', async () => {
    const { home, nodeModules } = await profileHome()
    await mkdir(join(nodeModules, '.pnpm'), { recursive: true })
    await mkdir(join(nodeModules, '.bin'), { recursive: true })
    // A scope directory holds packages and has no manifest of its own.
    await materialize(join(nodeModules, '@deepseek-ai'), 'dsh-settings')
    const target = await materialize(nodeModules, 'dshmarket')
    // Directory symlinks need Developer Mode or elevation on Windows; the rest
    // of the expectation still holds where they cannot be created.
    await symlink(target, join(nodeModules, 'linked-plugin'), 'junction').catch(() => undefined)

    await expect(findDamagedPackageDirectories(home)).resolves.toEqual([])
  })

  it('finds a damaged package inside a scope', async () => {
    const { home, nodeModules } = await profileHome()
    const damagedScoped = join(nodeModules, '@linxin666', 'dsh-web-ui-all')
    await mkdir(damagedScoped, { recursive: true })

    await expect(findDamagedPackageDirectories(home)).resolves.toEqual([damagedScoped])
  })

  it('clears what it found so the install can claim the names again', async () => {
    const { home, nodeModules } = await profileHome()
    const halfWritten = join(nodeModules, 'cose-base')
    await mkdir(halfWritten, { recursive: true })
    const intact = await materialize(nodeModules, 'dshmarket')

    await expect(clearDamagedPackageDirectories(home)).resolves.toEqual([halfWritten])
    expect(existsSync(halfWritten)).toBe(false)
    expect(existsSync(intact)).toBe(true)
    await expect(findDamagedPackageDirectories(home)).resolves.toEqual([])
  })

  it('leaves a home without a profile alone', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-profile-repair-empty-'))
    homes.push(home)

    expect(hasProfile(home)).toBe(false)
    await expect(clearDamagedPackageDirectories(home)).resolves.toEqual([])
  })

  it('restores the cleared packages through the profile’s own installer', () => {
    expect(buildProfileInstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'install'
    ])
  })
})
