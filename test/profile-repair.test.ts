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

  it('finds the leftovers inside a package’s own node_modules', async () => {
    // Once the package being replaced is a dependency of a dependency, its
    // staging lands under the dependent, not at the top level — and a sweep
    // that stops at the top level leaves one copy behind per attempt.
    const { home, nodeModules } = await profileHome()
    const dependent = await materialize(nodeModules, 'cytoscape-fcose')
    const nested = join(dependent, 'node_modules')
    await materialize(nested, 'cose-base')
    const sidelined = join(nested, 'cose-base.dsh-old-1787327060846')
    await mkdir(sidelined, { recursive: true })
    const staging = join(nested, 'cose-base_tmp_7408_7')
    await mkdir(staging, { recursive: true })

    const damaged = await findDamagedPackageDirectories(home)

    expect(new Set(damaged)).toEqual(new Set([sidelined, staging]))
    await expect(clearDamagedPackageDirectories(home)).resolves.toHaveLength(2)
    expect(existsSync(sidelined)).toBe(false)
    expect(existsSync(staging)).toBe(false)
    expect(existsSync(join(nested, 'cose-base'))).toBe(true)
  })

  it('reports only the directories that are actually gone', async () => {
    // Node's recursive `rm` resolves successfully without removing anything
    // under a non-ASCII path, and a sweep that trusted it announced twelve
    // cleared directories over a profile where all twelve were still there.
    // Whatever the platform does, the count has to match the disk.
    const { home, nodeModules } = await profileHome()
    const staging = join(nodeModules, 'dshmarket_tmp_7408_13')
    await mkdir(join(staging, 'lib'), { recursive: true })
    await writeFile(join(staging, 'lib', 'index.js'), '', 'utf8')

    const cleared = await clearDamagedPackageDirectories(home)

    expect(cleared).toEqual([staging])
    expect(existsSync(staging)).toBe(false)
  })

  it('leaves a home without a profile alone', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-profile-repair-empty-'))
    homes.push(home)

    expect(hasProfile(home)).toBe(false)
    await expect(clearDamagedPackageDirectories(home)).resolves.toEqual([])
  })

  it('restores the cleared packages through the profile’s own installer', () => {
    // The repair runs with CI set, which is pnpm's cue to freeze the lockfile.
    // A profile worth repairing is one where a failed `add` already wrote the
    // new version into the lockfile while package.json still names the old, so
    // freezing there fails on the divergence instead of healing it.
    expect(buildProfileInstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'install',
      '--no-frozen-lockfile'
    ])
  })
})
