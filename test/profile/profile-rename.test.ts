import { lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateWebProfile } from '../../src/main/profile/profile-rename'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('web profile copy', () => {
  it('copies the profile, keeps the old directory, and does not repeat the copy', async () => {
    const home = await homeWithWeb()
    const web = join(home, 'profiles', 'web')
    const desktop = join(home, 'profiles', 'desktop')
    await symlink('package.json', join(web, 'manifest-link'))
    await writeFile(join(web, 'lock'), 'held')
    const before = await readFile(join(web, 'package.json'), 'utf8')
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    expect(await readFile(join(desktop, 'package.json'), 'utf8')).toBe(before)
    expect(await readFile(join(desktop, 'cordis.patch.yml'), 'utf8')).toBe('user patch\n')
    expect(await readFile(join(desktop, 'desktop-storage.json'), 'utf8')).toBe('{"theme":"dark"}\n')
    expect(await readFile(join(desktop, '.dsh-market', 'state.json'), 'utf8')).toBe('{"disabled":["demo"]}\n')
    expect(await readlink(join(desktop, 'manifest-link'))).toBe('package.json')
    await expect(lstat(join(desktop, 'lock'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(web, 'package.json'), 'utf8')).toBe(before)
    expect(await readFile(join(home, 'profiles', '.generations', 'desired.json'), 'utf8')).toBe('{"schemaVersion":1}\n')
    await writeFile(join(desktop, 'package.json'), '{"name":"changed"}\n')
    await writeFile(join(web, 'package.json'), '{"name":"web-changed"}\n')
    expect(await migrateWebProfile(home)).toEqual({ status: 'already-migrated' })
    expect(await readFile(join(desktop, 'package.json'), 'utf8')).toBe('{"name":"changed"}\n')
  })

  it('replaces an interrupted copy and leaves an existing desktop directory', async () => {
    const home = await homeWithWeb()
    const partial = join(home, 'profiles', '.desktop-rename-partial')
    await mkdir(partial, { recursive: true })
    await writeFile(join(partial, 'junk'), 'stale')
    await writeFile(join(home, 'profiles', '.dsh-profile-rename.json'), JSON.stringify({
      version: 1, state: 'copying', source: 'web', target: 'desktop'
    }))
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    await expect(lstat(partial)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), 'utf8')).toBe('user patch\n')

    const occupied = await homeWithWeb()
    await mkdir(join(occupied, 'profiles', 'desktop'), { recursive: true })
    await writeFile(join(occupied, 'profiles', 'desktop', 'package.json'), '{"name":"kept"}\n')
    await writeFile(join(occupied, 'profiles', '.dsh-profile-rename.json'), '{')
    expect(await migrateWebProfile(occupied)).toEqual({ status: 'kept-existing-desktop' })
    expect(await readFile(join(occupied, 'profiles', 'desktop', 'package.json'), 'utf8')).toBe('{"name":"kept"}\n')
    expect(await readFile(join(occupied, 'profiles', 'web', 'package.json'), 'utf8')).toContain('dsh-profile-desktop')
  })

  it('removes a failed copy and refuses to follow a symlink', async () => {
    const home = await homeWithWeb()
    await expect(migrateWebProfile(home, {
      copy: async (_source, destination) => {
        await mkdir(destination, { recursive: true })
        await writeFile(join(destination, 'partial'), 'x')
        throw new Error('copy stopped')
      }
    })).rejects.toThrow('copy stopped')
    await expect(lstat(join(home, 'profiles', 'desktop'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, 'profiles', '.desktop-rename-partial'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, 'profiles', '.dsh-profile-rename.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toContain('dsh-profile-desktop')

    const linked = await mkdtemp(join(tmpdir(), 'dsh-profile-rename-'))
    temporary.push(linked)
    const real = await homeWithWeb()
    await mkdir(join(linked, 'profiles'), { recursive: true })
    await symlink(join(real, 'profiles', 'web'), join(linked, 'profiles', 'web'))
    await expect(migrateWebProfile(linked)).rejects.toThrow('symlink')
    await expect(lstat(join(linked, 'profiles', 'desktop'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does nothing when the old profile is absent', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-profile-rename-'))
    temporary.push(home)
    expect(await migrateWebProfile(home)).toEqual({ status: 'source-absent' })
  })
})

async function homeWithWeb(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'dsh-profile-rename-'))
  temporary.push(home)
  const web = join(home, 'profiles', 'web')
  await mkdir(join(web, '.dsh-market'), { recursive: true })
  await mkdir(join(home, 'profiles', '.generations'), { recursive: true })
  await writeFile(join(web, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: { 'demo-plugin': '1.0.0' },
    dsh: { profile: { bundles: ['demo-plugin'] } }
  }))
  await writeFile(join(web, 'cordis.yml'), '[]\n')
  await writeFile(join(web, 'cordis.patch.yml'), 'user patch\n')
  await writeFile(join(web, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n')
  await writeFile(join(web, 'desktop-storage.json'), '{"theme":"dark"}\n')
  await writeFile(join(web, '.dsh-market', 'state.json'), '{"disabled":["demo"]}\n')
  await writeFile(join(home, 'profiles', '.generations', 'desired.json'), '{"schemaVersion":1}\n')
  return home
}
