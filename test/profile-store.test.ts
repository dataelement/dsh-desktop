import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  configuredStoreDir,
  ensureStoreDirPinned,
  inspectStoreConsistency,
  pinStoreDir,
  recordedStoreDir,
  storeDirSetting
} from '../src/main/state/profile-store'

const NPMRC = 'package-import-method=clone-or-copy\nchild-concurrency=1\n'

describe('the profile’s pnpm store', () => {
  const homes: string[] = []

  async function profileHome(options: { recorded?: string; npmrc?: string } = {}): Promise<{
    home: string
    profile: string
  }> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-store-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}', 'utf8')
    if (options.recorded !== undefined) {
      await writeFile(
        join(profile, 'node_modules', '.modules.yaml'),
        `  "nodeLinker": "hoisted",\n  "storeDir": "${options.recorded}",\n  "virtualStoreDir": ".pnpm",\n`,
        'utf8'
      )
    }
    if (options.npmrc !== undefined) await writeFile(join(profile, '.npmrc'), options.npmrc, 'utf8')
    return { home, profile }
  }

  afterEach(async () => {
    await Promise.all(homes.splice(0).map((path) => rm(path, { recursive: true, force: true })))
  })

  it('reads what pnpm recorded and what the config pins', async () => {
    const { profile } = await profileHome({ recorded: '/p/web/.pnpm-store/v10' })
    await expect(recordedStoreDir(profile)).resolves.toBe('/p/web/.pnpm-store/v10')
    expect(configuredStoreDir(`${NPMRC}store-dir=/p/web/.pnpm-store\n`)).toBe('/p/web/.pnpm-store')
    expect(configuredStoreDir(NPMRC)).toBeUndefined()
  })

  it('pins the directory above the store’s version segment', () => {
    // pnpm records …/v10 but the setting names its parent.
    expect(storeDirSetting('/p/web/.pnpm-store/v10')).toBe('/p/web/.pnpm-store')
    expect(storeDirSetting('/p/web/.pnpm-store')).toBe('/p/web/.pnpm-store')
  })

  it('adds, replaces, or leaves the pin alone', () => {
    expect(pinStoreDir(NPMRC, '/store')).toBe(`${NPMRC}store-dir=/store\n`)
    expect(pinStoreDir(`${NPMRC}store-dir=/old\n`, '/store')).toBe(`${NPMRC}store-dir=/store\n`)
    // Already correct: the file is not rewritten on every launch.
    expect(pinStoreDir(`${NPMRC}store-dir=/store\n`, '/store')).toBeUndefined()
    expect(pinStoreDir('', '/store')).toBe('store-dir=/store\n')
  })

  it('states the recorded store in the profile’s config', async () => {
    const { home, profile } = await profileHome({
      recorded: '/p/web/.pnpm-store/v10',
      npmrc: NPMRC
    })

    await expect(ensureStoreDirPinned(home)).resolves.toBe('/p/web/.pnpm-store')
    expect(await readFile(join(profile, '.npmrc'), 'utf8')).toBe(
      `${NPMRC}store-dir=/p/web/.pnpm-store\n`
    )
    // Second launch has nothing left to do.
    await expect(ensureStoreDirPinned(home)).resolves.toBeUndefined()
  })

  it('has nothing to state for a profile that never installed anything', async () => {
    const { home } = await profileHome({ npmrc: NPMRC })
    await expect(ensureStoreDirPinned(home)).resolves.toBeUndefined()
    await expect(inspectStoreConsistency(home)).resolves.toBeUndefined()
  })

  it('names the mismatch that makes every pnpm operation fail', async () => {
    // ERR_PNPM_UNEXPECTED_STORE refuses installs, uninstalls, updates and
    // repairs alike, and the UI can only say "unable to change plugins".
    const unpinned = await profileHome({ recorded: '/p/web/.pnpm-store/v10', npmrc: NPMRC })
    await expect(inspectStoreConsistency(unpinned.home)).resolves.toContain('no .npmrc pins')

    const wrong = await profileHome({
      recorded: '/p/web/.pnpm-store/v10',
      npmrc: `${NPMRC}store-dir=/elsewhere\n`
    })
    await expect(inspectStoreConsistency(wrong.home)).resolves.toContain('/elsewhere')

    const pinned = await profileHome({
      recorded: '/p/web/.pnpm-store/v10',
      npmrc: `${NPMRC}store-dir=/p/web/.pnpm-store\n`
    })
    await expect(inspectStoreConsistency(pinned.home)).resolves.toBeUndefined()
  })
})
