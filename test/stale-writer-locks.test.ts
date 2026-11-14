import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isProcessAlive, removeStaleWriterLocks } from '../src/main/profile/stale-writer-locks'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function home(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-locks-'))
  dirs.push(dir)
  await mkdir(join(dir, 'profiles', 'web'), { recursive: true })
  return dir
}

describe('removeStaleWriterLocks', () => {
  it('removes locks whose owner process is gone and keeps live ones', async () => {
    const dir = await home()
    await writeFile(join(dir, '.credentials.yaml.lock'), '4242\n')
    await writeFile(join(dir, 'profiles', 'node_modules.lock'), '4243\n')
    await writeFile(join(dir, 'settings.yaml.lock'), '777\n')

    const removed = await removeStaleWriterLocks(dir, (pid) => pid === 777)

    expect(removed.sort()).toEqual(
      [join(dir, '.credentials.yaml.lock'), join(dir, 'profiles', 'node_modules.lock')].sort()
    )
    expect(await readdir(dir)).toContain('settings.yaml.lock')
  })

  it('ignores files that are not atomic-write locks, deeper directories and its own pid', async () => {
    const dir = await home()
    await writeFile(join(dir, 'pnpm.lock'), 'lockfileVersion: 9\n')
    await writeFile(join(dir, 'own.lock'), `${process.pid}\n`)
    await writeFile(join(dir, 'profiles', 'web', 'deep.lock'), '4242\n')
    await mkdir(join(dir, 'dir.lock'))

    expect(await removeStaleWriterLocks(dir, () => false)).toEqual([])
    expect(await readdir(dir)).toEqual(expect.arrayContaining(['pnpm.lock', 'own.lock', 'dir.lock']))
    expect(await readdir(join(dir, 'profiles', 'web'))).toEqual(['deep.lock'])
  })

  it('removes lock files older than 10 seconds regardless of content', async () => {
    const dir = await home()
    const lockPath = join(dir, '.credentials.yaml.lock')
    await writeFile(lockPath, 'corrupted or lingering lock')

    // Simulate now being 15 seconds after file creation
    const now = Date.now() + 15_000
    const removed = await removeStaleWriterLocks(dir, () => true, now)

    expect(removed).toEqual([lockPath])
    expect(await readdir(dir)).not.toContain('.credentials.yaml.lock')
  })

  it('removes empty abandoned lock files older than 2 seconds', async () => {
    const dir = await home()
    const emptyLock = join(dir, '.credentials.yaml.lock')
    await writeFile(emptyLock, '')

    const now = Date.now() + 3_000
    const removed = await removeStaleWriterLocks(dir, () => true, now)

    expect(removed).toEqual([emptyLock])
    expect(await readdir(dir)).not.toContain('.credentials.yaml.lock')
  })

  it('tolerates a missing DSH_HOME', async () => {
    expect(await removeStaleWriterLocks(join(tmpdir(), 'dsh-locks-missing-home'))).toEqual([])
  })

  it('detects the current process as alive', () => {
    expect(isProcessAlive(process.pid)).toBe(true)
  })
})
