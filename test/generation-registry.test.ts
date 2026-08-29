import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  collectUnreferencedGenerations,
  disableGeneration,
  isGenerationPlugin,
  commitLastKnownGood,
  ensureRegistryDirectories,
  generationId,
  listGenerations,
  readDesired,
  readLastKnownGood,
  registryLayout,
  resolveEnabledGenerations,
  revertToLastKnownGood,
  sweepRegistry,
  withRegistryLock,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

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

  it('starts with empty pointers and no generations', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    expect(await readDesired(home)).toEqual([])
    expect(await readLastKnownGood(home)).toEqual([])
    expect(await listGenerations(home)).toEqual([])
  })

  it('resolves only the generations that desired points at and that exist on disk', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'sidebar+0.17.1+aaaa', 'dsh-better-sidebar', '0.17.1')
    await fakeGeneration(home, 'pet+1.0.0+bbbb', '@linxin666/dsh-pet', '1.0.0')

    await writeDesired(home, ['sidebar+0.17.1+aaaa', 'missing+9.9.9+cccc'])
    const enabled = await resolveEnabledGenerations(home)

    expect([...enabled.keys()]).toEqual(['dsh-better-sidebar'])
    expect(enabled.get('dsh-better-sidebar')?.version).toBe('0.17.1')
    // pet exists on disk but is not desired, so resolution cannot see it.
    expect(enabled.has('@linxin666/dsh-pet')).toBe(false)
  })

  it('commits last-known-good from desired, never the other way round', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)

    await writeDesired(home, ['a+1+x'])
    await commitLastKnownGood(home)
    expect(await readLastKnownGood(home)).toEqual(['a+1+x'])

    // A new install moves desired forward but not LKG.
    await writeDesired(home, ['a+1+x', 'b+2+y'])
    expect(await readLastKnownGood(home)).toEqual(['a+1+x'])

    // A failed launch reverts desired to the set that booted.
    const reverted = await revertToLastKnownGood(home)
    expect(reverted).toEqual(['a+1+x'])
    expect(await readDesired(home)).toEqual(['a+1+x'])
  })

  it('treats a generation as unreferenced only when neither pointer names it', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'a+1+x', 'a', '1')
    await fakeGeneration(home, 'b+2+y', 'b', '2')
    await fakeGeneration(home, 'c+3+z', 'c', '3')

    await writeDesired(home, ['a+1+x'])
    await commitLastKnownGood(home)
    await writeDesired(home, ['b+2+y'])
    // a is still LKG, b is desired, c is neither.

    expect(await collectUnreferencedGenerations(home)).toEqual(['c+3+z'])
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
