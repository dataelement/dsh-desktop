import { access, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

const removalFault = vi.hoisted(() => ({ trashPrefix: '' }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
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

  it('treats desired as the sole authority for generation retention', async () => {
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

  it('breaks a stale lock left by a crashed process', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await writeFile(registryLayout(home).lockFile, '99999 crashed\n')

    // A fresh operation should still acquire it once the lock is past its
    // stale deadline.
    const result = await withRegistryLock(
      home,
      async () => 'acquired',
      { staleAfterMs: 0, retryMs: 1, timeoutMs: 2000 }
    )
    expect(result).toBe('acquired')
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
