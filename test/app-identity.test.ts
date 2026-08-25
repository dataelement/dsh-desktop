import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveDesktopIdentity } from '../src/main/app-identity'
import { migrateLegacyUserData } from '../src/main/app-data-migration'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  )
})

describe('desktop app identity', () => {
  it('keeps old legacy data isolated while the bridge and notarized app share Sherlock data', () => {
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', 'legacy', '')
    ).toEqual({
      name: 'Sherlock',
      userData: '/Users/test/Library/Application Support/dsh-desktop'
    })
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', 'legacy-bridge', '')
    ).toEqual({
      name: 'Sherlock',
      userData: '/Users/test/Library/Application Support/sherlock-desktop'
    })
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', 'notarized', '')
    ).toEqual({
      name: 'Sherlock',
      userData: '/Users/test/Library/Application Support/sherlock-desktop'
    })
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', 'development', '')
    ).toEqual({
      name: 'Sherlock Dev',
      userData: '/Users/test/Library/Application Support/dsh-desktop-dev'
    })
  })

  it('allows only an absolute explicit user-data path for an isolated launch', () => {
    expect(
      resolveDesktopIdentity('/Applications', 'legacy', '/tmp/sherlock-update-fixture').userData
    ).toBe('/tmp/sherlock-update-fixture')
    expect(() => resolveDesktopIdentity('/Applications', 'notarized', 'relative/path')).toThrow(
      'absolute'
    )
  })

  it('migrates durable legacy data once without copying singleton locks or caches', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sherlock-app-data-'))
    temporaryDirectories.push(root)
    const legacyUserData = join(root, 'dsh-desktop')
    const targetUserData = join(root, 'sherlock-desktop')
    await mkdir(join(legacyUserData, 'harness'), { recursive: true })
    await mkdir(join(legacyUserData, 'Cache'), { recursive: true })
    await writeFile(join(legacyUserData, 'harness', 'session-sentinel.txt'), 'preserved')
    await writeFile(join(legacyUserData, 'SingletonLock'), 'stale-lock')
    await writeFile(join(legacyUserData, 'Cache', 'cache-entry'), 'volatile')

    expect(migrateLegacyUserData(legacyUserData, targetUserData)).toBe(true)
    await expect(readFile(join(targetUserData, 'harness', 'session-sentinel.txt'), 'utf8')).resolves.toBe(
      'preserved'
    )
    await expect(readFile(join(targetUserData, 'SingletonLock'), 'utf8')).rejects.toThrow()
    await expect(readFile(join(targetUserData, 'Cache', 'cache-entry'), 'utf8')).rejects.toThrow()

    await writeFile(join(legacyUserData, 'harness', 'session-sentinel.txt'), 'changed')
    expect(migrateLegacyUserData(legacyUserData, targetUserData)).toBe(false)
    await expect(readFile(join(targetUserData, 'harness', 'session-sentinel.txt'), 'utf8')).resolves.toBe(
      'preserved'
    )
  })

  it('finishes an interrupted migration into an existing target without overwriting new data', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sherlock-app-data-recovery-'))
    temporaryDirectories.push(root)
    const legacyUserData = join(root, 'dsh-desktop')
    const targetUserData = join(root, 'sherlock-desktop')
    await mkdir(join(legacyUserData, 'harness'), { recursive: true })
    await mkdir(join(targetUserData, 'harness'), { recursive: true })
    await writeFile(join(legacyUserData, 'harness', 'legacy-session.txt'), 'legacy')
    await writeFile(join(legacyUserData, 'harness', 'settings.yaml'), 'old settings')
    await writeFile(join(targetUserData, 'harness', 'settings.yaml'), 'new settings')

    expect(migrateLegacyUserData(legacyUserData, targetUserData)).toBe(true)
    await expect(readFile(join(targetUserData, 'harness', 'legacy-session.txt'), 'utf8')).resolves.toBe(
      'legacy'
    )
    await expect(readFile(join(targetUserData, 'harness', 'settings.yaml'), 'utf8')).resolves.toBe(
      'new settings'
    )
    expect(migrateLegacyUserData(legacyUserData, targetUserData)).toBe(false)
  })
})
