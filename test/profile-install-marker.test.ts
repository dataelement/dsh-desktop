import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearProfileInstallMarker,
  isProfileInstallComplete,
  markProfileInstallComplete,
  profileInstallMarkerPath
} from '../src/main/state/profile-install-marker'

describe('profile install marker', () => {
  const homes: string[] = []

  async function profileHome(): Promise<{ home: string; profile: string }> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-install-marker-'))
    homes.push(home)
    const profile = join(home, 'profiles', 'web')
    await mkdir(profile, { recursive: true })
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.9.0' } }),
      'utf8'
    )
    await writeFile(join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n', 'utf8')
    return { home, profile }
  }

  afterEach(async () => {
    await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
  })

  it('reports incomplete before any install', async () => {
    const { home } = await profileHome()
    expect(await isProfileInstallComplete(home)).toBe(false)
  })

  it('reports complete once an install is marked', async () => {
    const { home } = await profileHome()
    await markProfileInstallComplete(home)
    expect(await isProfileInstallComplete(home)).toBe(true)
  })

  it('reports incomplete after the manifest changes', async () => {
    const { home, profile } = await profileHome()
    await markProfileInstallComplete(home)
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.10.0' } }),
      'utf8'
    )
    expect(await isProfileInstallComplete(home)).toBe(false)
  })

  it('reports incomplete after the lockfile changes', async () => {
    const { home, profile } = await profileHome()
    await markProfileInstallComplete(home)
    await writeFile(join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\nextra: true\n', 'utf8')
    expect(await isProfileInstallComplete(home)).toBe(false)
  })

  // The interrupted install is the case the marker exists for: cleared before
  // the run, never rewritten, so the next launch installs instead of trusting
  // a tree that only looks finished.
  it('reports incomplete once the marker is withdrawn', async () => {
    const { home } = await profileHome()
    await markProfileInstallComplete(home)
    await clearProfileInstallMarker(home)
    expect(await isProfileInstallComplete(home)).toBe(false)
  })

  it('withdraws without a marker present', async () => {
    const { home } = await profileHome()
    await expect(clearProfileInstallMarker(home)).resolves.toBeUndefined()
  })

  it('never claims completeness without a lockfile to fingerprint', async () => {
    const { home, profile } = await profileHome()
    await markProfileInstallComplete(home)
    await rm(join(profile, 'pnpm-lock.yaml'))
    expect(await isProfileInstallComplete(home)).toBe(false)
  })

  it('keeps the marker inside the profile directory', async () => {
    const { home, profile } = await profileHome()
    expect(profileInstallMarkerPath(home)).toBe(join(profile, '.install-complete'))
  })
})
