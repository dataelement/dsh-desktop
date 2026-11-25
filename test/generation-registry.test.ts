import { writeFileSync } from 'node:fs'
import { access, mkdir, mkdtemp, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectUnreferencedGenerations,
  disableGeneration,
  isGenerationPlugin,
  ensureRegistryDirectories,
  generationId,
  listGenerations,
  readDesired,
  registryLayout,
  resolveEnabledGenerations,
  sweepRegistry,
  withRegistryLock,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

const removalFault = vi.hoisted(() => ({ trashPrefix: '', readPath: '', readdirPath: '' }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readdir: async (...args: Parameters<typeof actual.readdir>) => {
      if (removalFault.readdirPath && String(args[0]) === removalFault.readdirPath) {
        throw Object.assign(new Error('EPERM: simulated locked node_modules'), { code: 'EPERM' })
      }
      return actual.readdir(...args)
    },
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (removalFault.readPath && String(args[0]) === removalFault.readPath) {
        throw Object.assign(new Error('EPERM: simulated locked Profile manifest'), { code: 'EPERM' })
      }
      return actual.readFile(...args)
    },
    rm: async (...args: Parameters<typeof actual.rm>) => {
      const normalized = String(args[0]).replaceAll('\\', '/')
      if (removalFault.trashPrefix && normalized.includes(removalFault.trashPrefix)) {
        removalFault.trashPrefix = ''
        throw Object.assign(new Error('EPERM: simulated locked generation child'), { code: 'EPERM' })
      }
      return actual.rm(...args)
    }
  }
})

describe('the plugin generation registry', () => {
  const homes: string[] = []

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-registry-'))
    homes.push(home)
    return home
  }

  async function fakeGeneration(
    home: string,
    id: string,
    pluginName: string,
    version: string
  ): Promise<void> {
    const dir = join(registryLayout(home).generations, id)
    await mkdir(dir, { recursive: true })
    await writeGenerationMeta(dir, { pluginName, version })
  }

  afterEach(async () => {
    removalFault.trashPrefix = ''
    removalFault.readPath = ''
    removalFault.readdirPath = ''
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('encodes a generation id that survives scoped names and identical versions', () => {
    const scoped = generationId('@linxin666/dsh-pet', '1.0.0', 'lock-a')
    expect(scoped).toMatch(/^linxin666\+dsh-pet\+1\.0\.0\+[0-9a-f]{12}$/u)
    expect(scoped).not.toContain('/')
    expect(scoped).not.toContain('@')

    // Same name and version, different resolved tree → different id.
    const treeA = generationId('name', '2.0.1', 'lockfile A')
    const treeB = generationId('name', '2.0.1', 'lockfile B')
    expect(treeA).not.toBe(treeB)

    // Same everything → same id, so a repeat install collapses.
    expect(generationId('name', '2.0.1', 'same')).toBe(generationId('name', '2.0.1', 'same'))
  })

  it('starts with an empty desired pointer and no generations', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    expect(await readDesired(home)).toEqual([])
    expect(await listGenerations(home)).toEqual([])
  })

  it('resolves desired generations and fails closed when the pointer references a missing id', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'sidebar+0.17.1+aaaa', 'dsh-better-sidebar', '0.17.1')
    await fakeGeneration(home, 'pet+1.0.0+bbbb', '@linxin666/dsh-pet', '1.0.0')

    await writeDesired(home, ['sidebar+0.17.1+aaaa'])
    const enabled = await resolveEnabledGenerations(home)

    expect([...enabled.keys()]).toEqual(['dsh-better-sidebar'])
    expect(enabled.get('dsh-better-sidebar')?.version).toBe('0.17.1')
    // pet exists on disk but is not desired, so resolution cannot see it.
    expect(enabled.has('@linxin666/dsh-pet')).toBe(false)

    await writeDesired(home, ['sidebar+0.17.1+aaaa', 'missing+9.9.9+cccc'])
    await expect(resolveEnabledGenerations(home)).rejects.toThrow(
      /Desired generation is missing or unreadable: missing\+9\.9\.9\+cccc/u
    )
    await expect(sweepRegistry(home)).rejects.toThrow(
      /Desired generation is missing or unreadable: missing\+9\.9\.9\+cccc/u
    )
    expect((await listGenerations(home)).map((generation) => generation.id).sort()).toEqual([
      'pet+1.0.0+bbbb',
      'sidebar+0.17.1+aaaa'
    ])
  })

  it('rejects package names and versions that could escape or corrupt a generation path', () => {
    expect(() => generationId('../outside', '1.0.0', 'lock')).toThrow(/safe npm package name/u)
    expect(() => generationId('safe-plugin', '../1.0.0', 'lock')).toThrow(/safe for a generation id/u)
    expect(() => generationId('safe-plugin', '..', 'lock')).toThrow(/safe for a generation id/u)
  })

  it('ignores retired last-known-good pointers when collecting generations', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'a+1+x', 'a', '1')
    await fakeGeneration(home, 'b+2+y', 'b', '2')
    await fakeGeneration(home, 'c+3+z', 'c', '3')

    await writeDesired(home, ['b+2+y'])
    await writeFile(
      join(registryLayout(home).root, 'last-known-good.json'),
      `${JSON.stringify(['a+1+x'])}\n`,
      'utf8'
    )

    expect((await collectUnreferencedGenerations(home)).sort()).toEqual(['a+1+x', 'c+3+z'])
  })

  it('retains generations projected by another Profile until every Profile switches', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'market+1+x', 'dshmarket', '1.0.0')
    await fakeGeneration(home, 'market+2+y', 'dshmarket', '2.0.0')
    await fakeGeneration(home, 'orphan+1+z', 'orphan', '1.0.0')
    const oldPackage = join(layout.generations, 'market+1+x', 'node_modules', 'dshmarket')
    await mkdir(oldPackage, { recursive: true })
    await writeFile(join(oldPackage, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.0.0' }))
    const manifest = (id: string) => JSON.stringify({
      dsh: { desktop: { generationProjection: { version: 1, plugins: { dshmarket: { generationId: id } } } } }
    })
    for (const [profile, id] of [['web', 'market+1+x'], ['desktop', 'market+2+y']] as const) {
      const directory = join(home, 'profiles', profile)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), manifest(id))
    }
    await writeDesired(home, ['market+2+y'])
    expect(await collectUnreferencedGenerations(home)).toEqual(['orphan+1+z'])
    expect((await sweepRegistry(home)).removed).toEqual(['orphan+1+z'])
    expect(JSON.parse(await readFile(join(oldPackage, 'package.json'), 'utf8')).version).toBe('1.0.0')

    await writeFile(join(home, 'profiles', 'web', 'package.json'), manifest('market+2+y'))
    expect(await collectUnreferencedGenerations(home)).toEqual(['market+1+x'])
    expect((await sweepRegistry(home)).removed).toEqual(['market+1+x'])
    await expect(access(oldPackage)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['demo', true], ['@scope/demo', true], ['demo', false], ['@scope/demo', false]
  ] as const)('retains the actual %s generation link when projection markers are present=%s', async (name, withMarker) => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'old+1+x', name, '1.0.0')
    await fakeGeneration(home, 'new+2+y', name, '2.0.0')
    await fakeGeneration(home, 'orphan+1+z', 'orphan', '1.0.0')
    const oldPackage = join(layout.generations, 'old+1+x', 'node_modules', name)
    await mkdir(oldPackage, { recursive: true })
    await writeFile(join(oldPackage, 'package.json'), JSON.stringify({ name, version: '1.0.0' }))
    const profile = join(home, 'profiles', 'web')
    const modules = join(profile, 'node_modules')
    const link = join(modules, name)
    await mkdir(dirname(link), { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dependencies: { [name]: '2.0.0' },
      ...(withMarker ? { dsh: { desktop: { generationProjection: {
        version: 1, plugins: { [name]: { generationId: 'new+2+y' } }
      } } } } : {})
    }))
    const state = join(profile, '.dsh-market')
    await mkdir(state)
    await writeFile(join(state, 'state.json'), JSON.stringify({ disabled: [name] }))
    await writeDesired(home, ['new+2+y'])
    // B has no package root: disabled projection must retain the usable A link.
    await symlink(process.platform === 'win32' ? oldPackage : relative(dirname(link), oldPackage), link,
      process.platform === 'win32' ? 'junction' : 'dir')
    const nested = join(modules, 'ordinary-package', 'node_modules')
    await mkdir(nested, { recursive: true })
    await symlink(join(layout.generations, 'orphan+1+z'), join(nested, 'nested-generation'),
      process.platform === 'win32' ? 'junction' : 'dir')
    await symlink(join(layout.generations + '-outside', 'orphan+1+z'), join(modules, 'external'),
      process.platform === 'win32' ? 'junction' : 'dir')
    expect(await collectUnreferencedGenerations(home)).toEqual(['orphan+1+z'])
    await sweepRegistry(home)
    expect(JSON.parse(await readFile(join(link, 'package.json'), 'utf8')).version).toBe('1.0.0')

    await rm(link, { force: true })
    const newPackage = join(layout.generations, 'new+2+y', 'node_modules', name)
    await symlink(process.platform === 'win32' ? newPackage : relative(dirname(link), newPackage), link,
      process.platform === 'win32' ? 'junction' : 'dir')
    expect(await collectUnreferencedGenerations(home)).toEqual(['old+1+x'])
    expect((await sweepRegistry(home)).removed).toEqual(['old+1+x'])
  })

  it.each(['node_modules', 'node_modules/@scope'])('retains all generations when Profile %s cannot be scanned', async directory => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'old+1+x', 'demo', '1.0.0')
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules', '@scope'), { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}')
    removalFault.readdirPath = join(profile, directory)
    expect(await collectUnreferencedGenerations(home)).toEqual([])
    expect((await sweepRegistry(home)).removed).toEqual([])
    removalFault.readdirPath = ''
    expect(await collectUnreferencedGenerations(home)).toEqual(['old+1+x'])
  })

  it.each(['missing', 'invalid-json', 'invalid-root', 'invalid-projection', 'unknown-version', 'unreadable'])(
    'retains all live generations when a Profile manifest is %s', async fault => {
      const home = await freshHome()
      const layout = await ensureRegistryDirectories(home)
      await fakeGeneration(home, 'old+1+x', 'demo', '1.0.0')
      await fakeGeneration(home, 'new+2+y', 'demo', '2.0.0')
      await writeDesired(home, ['new+2+y'])
      const profile = join(home, 'profiles', 'web')
      await mkdir(profile, { recursive: true })
      const path = join(profile, 'package.json')
      const malformed: Record<string, string> = {
        'invalid-json': '{broken',
        'invalid-root': 'null',
        'invalid-projection': JSON.stringify({ dsh: { desktop: { generationProjection: { version: 1, plugins: { demo: {} } } } } }),
        'unknown-version': JSON.stringify({ dsh: { desktop: { generationProjection: { version: 2, plugins: {} } } } })
      }
      if (fault !== 'missing') await writeFile(path, malformed[fault] ?? '{}')
      if (fault === 'unreadable') removalFault.readPath = path
      expect(await collectUnreferencedGenerations(home)).toEqual([])
      expect((await sweepRegistry(home)).removed).toEqual([])
      await expect(access(join(layout.generations, 'old+1+x'))).resolves.toBeUndefined()
      await expect(access(join(layout.generations, 'new+2+y'))).resolves.toBeUndefined()
      removalFault.readPath = ''
      await writeFile(path, '{}')
      expect(await collectUnreferencedGenerations(home)).toEqual(['old+1+x'])
    }
  )

  it('sweeps unreferenced generations and staging leftovers, keeps referenced ones', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keep', '1')
    await fakeGeneration(home, 'drop+2+y', 'drop', '2')
    await writeDesired(home, ['keep+1+x'])
    await mkdir(join(layout.staging, 'abandoned-uuid'), { recursive: true })

    const { removed, failed } = await sweepRegistry(home)

    expect(failed).toEqual([])
    expect(removed).toContain('drop+2+y')
    expect(removed).toContain('staging/abandoned-uuid')
    const survivors = (await listGenerations(home)).map((generation) => generation.id)
    expect(survivors).toEqual(['keep+1+x'])
  })

  it('recovers an unreferenced generation left without metadata by a partial deletion', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keep', '1')
    const incomplete = join(layout.generations, 'incomplete+2+y')
    await mkdir(join(incomplete, 'node_modules', 'locked-plugin'), { recursive: true })
    await writeFile(join(incomplete, 'node_modules', 'locked-plugin', 'index.js'), 'export {}\n')
    await writeDesired(home, ['keep+1+x'])

    expect((await listGenerations(home)).map((generation) => generation.id)).toEqual(['keep+1+x'])
    expect(await collectUnreferencedGenerations(home)).toEqual(['incomplete+2+y'])

    const { removed, failed } = await sweepRegistry(home)

    expect(removed).toContain('incomplete+2+y')
    expect(failed).toEqual([])
    await expect(access(incomplete)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('moves an unreferenced generation out of live before deleting its contents', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    const id = 'locked+1+x'
    await fakeGeneration(home, id, 'locked', '1')
    removalFault.trashPrefix = `/trash/${id}.`

    const first = await sweepRegistry(home)

    expect(first.removed).not.toContain(id)
    expect(first.failed).toContain(id)
    await expect(access(join(layout.generations, id))).rejects.toMatchObject({ code: 'ENOENT' })
    const trashEntries = await readdir(layout.trash)
    expect(trashEntries).toHaveLength(1)
    expect(trashEntries[0]).toMatch(/^locked\+1\+x\./u)

    const second = await sweepRegistry(home)
    expect(second.removed).toContain(`trash/${trashEntries[0]}`)
    expect(second.failed).toEqual([])
    expect(await readdir(layout.trash)).toEqual([])
  })

  it('does not sweep a desired generation whose metadata is missing', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    const incomplete = join(layout.generations, 'desired+1+x')
    await mkdir(incomplete, { recursive: true })
    await writeDesired(home, ['desired+1+x'])

    expect(await listGenerations(home)).toEqual([])
    await expect(resolveEnabledGenerations(home)).rejects.toThrow(
      /Desired generation is missing or unreadable: desired\+1\+x/u
    )
    await expect(sweepRegistry(home)).rejects.toThrow(
      /Desired generation is missing or unreadable: desired\+1\+x/u
    )
    await expect(access(incomplete)).resolves.toBeUndefined()
  })

  it('fails closed without sweeping generations when desired.json is corrupt', async () => {
    const home = await freshHome()
    const layout = await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keep', '1')
    await writeFile(layout.desiredPointer, '{not-json\n', 'utf8')

    await expect(sweepRegistry(home)).rejects.toThrow(/Generation pointer is invalid JSON/u)
    expect((await listGenerations(home)).map((generation) => generation.id)).toEqual(['keep+1+x'])

    await writeFile(layout.desiredPointer, JSON.stringify(['keep+1+x', 42]), 'utf8')
    await expect(readDesired(home)).rejects.toThrow(
      /Generation pointer must be an array of generation ids/u
    )
    expect((await listGenerations(home)).map((generation) => generation.id)).toEqual(['keep+1+x'])
  })

  it('serialises operations across the cross-process lock', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const order: string[] = []

    const first = withRegistryLock(home, async () => {
      order.push('first-start')
      await new Promise((resolve) => setTimeout(resolve, 40))
      order.push('first-end')
    })
    // Give the first call time to take the lock.
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = withRegistryLock(home, async () => {
      order.push('second-start')
    })

    await Promise.all([first, second])
    expect(order).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('immediately recovers a fresh lock whose owner process is gone', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await writeFile(registryLayout(home).lockFile, '424242 crashed\n')

    const result = await withRegistryLock(
      home,
      async () => 'acquired',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 100, processAlive: () => false }
    )
    expect(result).toBe('acquired')
  })

  it('detects an exited process owner with the platform process probe', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const child = spawn(process.execPath, ['-e', 'process.exit(0)'])
    await once(child, 'exit')
    if (child.pid === undefined) throw new Error('Test child did not receive a process id.')
    await writeFile(registryLayout(home).lockFile, `${child.pid} crashed\n`)

    await expect(withRegistryLock(
      home,
      async () => 'acquired',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 100 }
    )).resolves.toBe('acquired')
  })

  it('keeps a fresh lock whose owner pid is alive', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const lockFile = registryLayout(home).lockFile
    const body = '424242 still-running\n'
    await writeFile(lockFile, body)

    await expect(withRegistryLock(
      home,
      async () => 'must-not-run',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 5, processAlive: () => true }
    )).rejects.toThrow('Another plugin operation is holding the registry lock.')
    expect(await readFile(lockFile, 'utf8')).toBe(body)

    const old = new Date(Date.now() - 120_000)
    await utimes(lockFile, old, old)
    await expect(withRegistryLock(
      home,
      async () => 'acquired-after-deadline',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 100, processAlive: () => true }
    )).resolves.toBe('acquired-after-deadline')
  })

  it('keeps an owner lock when process inspection is not permitted', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const lockFile = registryLayout(home).lockFile
    const body = '424242 permission-denied\n'
    await writeFile(lockFile, body)

    await expect(withRegistryLock(
      home,
      async () => 'must-not-run',
      {
        staleAfterMs: 60_000,
        retryMs: 1,
        timeoutMs: 5,
        processAlive: () => { throw Object.assign(new Error('operation not permitted'), { code: 'EPERM' }) }
      }
    )).rejects.toThrow('Another plugin operation is holding the registry lock.')
    expect(await readFile(lockFile, 'utf8')).toBe(body)
  })

  it('uses the stale deadline for a malformed lock without process ownership', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const lockFile = registryLayout(home).lockFile
    await writeFile(lockFile, 'not a registry owner\n')

    await expect(withRegistryLock(
      home,
      async () => 'must-not-run',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 5, processAlive: () => false }
    )).rejects.toThrow('Another plugin operation is holding the registry lock.')

    const old = new Date(Date.now() - 120_000)
    await utimes(lockFile, old, old)
    await expect(withRegistryLock(
      home,
      async () => 'acquired',
      { staleAfterMs: 60_000, retryMs: 1, timeoutMs: 100, processAlive: () => false }
    )).resolves.toBe('acquired')
  })

  it('does not delete a successor lock that replaces a dead-owner snapshot', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    const lockFile = registryLayout(home).lockFile
    await writeFile(lockFile, '424242 crashed\n')
    const successor = `${process.pid} successor\n`
    let replaced = false

    await expect(withRegistryLock(
      home,
      async () => 'must-not-run',
      {
        staleAfterMs: 60_000,
        retryMs: 1,
        timeoutMs: 5,
        processAlive: (pid) => {
          if (pid === 424242 && !replaced) {
            replaced = true
            writeFileSync(lockFile, successor, 'utf8')
            return false
          }
          return true
        }
      }
    )).rejects.toThrow('Another plugin operation is holding the registry lock.')
    expect(await readFile(lockFile, 'utf8')).toBe(successor)
  })

  it('disables a generation by dropping every id for that plugin from desired', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'teams+0.1.14+aaaa', '@nanmicoder/dsh-agent-teams', '0.1.14')
    await fakeGeneration(home, 'teams+0.1.13+bbbb', '@nanmicoder/dsh-agent-teams', '0.1.13')
    await fakeGeneration(home, 'sidebar+1+cccc', 'dsh-better-sidebar', '1.0.0')
    await writeDesired(home, ['teams+0.1.14+aaaa', 'teams+0.1.13+bbbb', 'sidebar+1+cccc'])

    expect(await isGenerationPlugin(home, '@nanmicoder/dsh-agent-teams')).toBe(true)
    expect(await isGenerationPlugin(home, 'never-installed')).toBe(false)

    const removed = await disableGeneration(home, '@nanmicoder/dsh-agent-teams')
    expect(removed).toBe(true)
    expect(await readDesired(home)).toEqual(['sidebar+1+cccc'])

    // the generation directories are untouched — kept for a fast re-enable
    expect((await listGenerations(home)).map((g) => g.id).sort()).toEqual([
      'sidebar+1+cccc',
      'teams+0.1.13+bbbb',
      'teams+0.1.14+aaaa'
    ])

    // disabling something that is not desired is a no-op
    expect(await disableGeneration(home, '@nanmicoder/dsh-agent-teams')).toBe(false)
  })
})
