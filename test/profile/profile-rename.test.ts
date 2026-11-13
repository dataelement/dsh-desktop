import { lstat, mkdir, mkdtemp, readFile, readlink, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, win32 } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { copyWindowsProfile, migrateWebProfile, type ProfileCopyRoots, type WindowsProfileCopyIo } from '../../src/main/profile/profile-rename'

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
    await mkdir(join(web, 'nested'))
    await writeFile(join(web, 'nested', 'lock'), 'kept')
    const before = await readFile(join(web, 'package.json'), 'utf8')
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    expect(await readFile(join(desktop, 'package.json'), 'utf8')).toBe(before)
    expect(await readFile(join(desktop, 'cordis.patch.yml'), 'utf8')).toBe('user patch\n')
    expect(await readFile(join(desktop, 'desktop-storage.json'), 'utf8')).toBe('{"theme":"dark"}\n')
    expect(await readFile(join(desktop, '.dsh-market', 'state.json'), 'utf8')).toBe('{"disabled":["demo"]}\n')
    expect(await readlink(join(desktop, 'manifest-link'))).toBe('package.json')
    await expect(lstat(join(desktop, 'lock'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(desktop, 'nested', 'lock'), 'utf8')).toBe('kept')
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

  it('keeps an external directory link after the partial directory is renamed', async () => {
    const home = await homeWithWeb()
    const web = join(home, 'profiles', 'web')
    const packageDir = join(home, 'profiles', '.generations', 'live', 'linxin666+plugin', 'node_modules', '@linxin666', 'dsh-client-ui-skill-explorer')
    await mkdir(packageDir, { recursive: true })
    await writeFile(join(packageDir, 'package.json'), '{"name":"skill"}\n')
    await mkdir(join(web, 'node_modules', '@linxin666'), { recursive: true })
    await symlink(packageDir, join(web, 'node_modules', '@linxin666', 'dsh-client-ui-skill-explorer'), process.platform === 'win32' ? 'junction' : 'dir')
    const before = await readFile(join(packageDir, 'package.json'))
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    const copied = join(home, 'profiles', 'desktop', 'node_modules', '@linxin666', 'dsh-client-ui-skill-explorer')
    expect((await lstat(copied)).isSymbolicLink()).toBe(true)
    expect(await realpath(copied)).toBe(await realpath(packageDir))
    expect(await readFile(join(copied, 'package.json'))).toEqual(before)
    expect(await readFile(join(packageDir, 'package.json'))).toEqual(before)
    expect(await readlink(copied)).not.toContain('.desktop-rename-partial')
  })

  it('points an internal relative directory link at the renamed profile', async () => {
    const home = await homeWithWeb()
    const web = join(home, 'profiles', 'web')
    const desktop = join(home, 'profiles', 'desktop')
    await mkdir(join(web, 'data'))
    await writeFile(join(web, 'data', 'note.txt'), 'original')
    await symlink('data', join(web, 'link'), 'dir')
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    expect((await lstat(join(desktop, 'link'))).isSymbolicLink()).toBe(true)
    expect(await readlink(join(desktop, 'link'))).not.toContain('.desktop-rename-partial')
    expect(await realpath(join(desktop, 'link'))).toBe(await realpath(join(desktop, 'data')))
    await writeFile(join(desktop, 'data', 'note.txt'), 'desktop')
    expect(await readFile(join(web, 'data', 'note.txt'), 'utf8')).toBe('original')
    expect(await readFile(join(desktop, 'link', 'note.txt'), 'utf8')).toBe('desktop')
  })

  it('keeps a relative link to a sibling directory outside the old profile', async () => {
    const home = await homeWithWeb()
    const web = join(home, 'profiles', 'web')
    const outside = join(home, 'profiles', 'web-other', 'data')
    await mkdir(outside, { recursive: true })
    await writeFile(join(outside, 'note.txt'), 'outside')
    await symlink(join('..', 'web-other', 'data'), join(web, 'outside-link'), 'dir')
    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    const copied = join(home, 'profiles', 'desktop', 'outside-link')
    expect((await lstat(copied)).isSymbolicLink()).toBe(true)
    expect(await realpath(copied)).toBe(await realpath(outside))
    expect(await readFile(join(copied, 'note.txt'), 'utf8')).toBe('outside')
    expect(await readlink(copied)).not.toContain('.desktop-rename-partial')
  })

  it('removes a partial junction without deleting the external generation, then copies once', async () => {
    const home = await homeWithWeb()
    const generation = join(home, 'profiles', '.generations', 'live', 'plugin')
    await mkdir(generation, { recursive: true })
    await writeFile(join(generation, 'marker.txt'), 'keep')
    await expect(migrateWebProfile(home, {
      copy: async (_source, destination) => {
        await mkdir(join(destination, 'node_modules'), { recursive: true })
        await symlink(generation, join(destination, 'node_modules', 'plugin'), process.platform === 'win32' ? 'junction' : 'dir')
        throw new Error('copy stopped')
      }
    })).rejects.toThrow('copy stopped')
    expect(await readFile(join(generation, 'marker.txt'), 'utf8')).toBe('keep')
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toContain('dsh-profile-desktop')
    await expect(lstat(join(home, 'profiles', '.desktop-rename-partial'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, 'profiles', '.dsh-profile-rename.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, 'profiles', 'desktop'))).rejects.toMatchObject({ code: 'ENOENT' })

    expect(await migrateWebProfile(home)).toEqual({ status: 'copied' })
    expect(await readFile(join(home, 'profiles', 'desktop', 'cordis.patch.yml'), 'utf8')).toBe('user patch\n')
    expect(await migrateWebProfile(home)).toEqual({ status: 'already-migrated' })
    expect(await readFile(join(generation, 'marker.txt'), 'utf8')).toBe('keep')
    expect(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')).toContain('dsh-profile-desktop')
  })
})

const windowsSource = 'C:\\profiles\\web'
const windowsStaging = 'C:\\profiles\\.desktop-rename-partial'
const windowsFinal = 'C:\\profiles\\desktop'

describe('windows profile link copy', () => {
  it('recreates a confirmed directory link as a junction and does not follow it', async () => {
    const generation = '\\\\?\\C:\\profiles\\.generations\\live\\linxin666+plugin\\node_modules\\@linxin666\\dsh-client-ui-skill-explorer'
    const io = windowsIo([
      link(win32.join(windowsSource, 'node_modules', '@linxin666', 'dsh-client-ui-skill-explorer'), generation, 'directory'),
      link(win32.join(windowsSource, 'absolute-inside'), 'C:\\profiles\\web\\data', 'directory')
    ])
    await copyWindowsProfile(windowsRoots(), io.io)
    expect(io.symlinkCalls).toEqual([
      [generation, win32.join(windowsStaging, 'node_modules', '@linxin666', 'dsh-client-ui-skill-explorer'), 'junction'],
      ['C:\\profiles\\web\\data', win32.join(windowsStaging, 'absolute-inside'), 'junction']
    ])
    expect(io.symlinkCalls.some(call => call.includes('dir'))).toBe(false)
    expect(io.readDirectories.some(candidate => candidate.includes('.generations'))).toBe(false)
    expect(io.copiedFiles).toEqual([])
  })

  it('maps a relative directory inside the source profile onto the final desktop root', async () => {
    const io = windowsIo([
      link(win32.join(windowsSource, 'self'), '.', 'directory'),
      link(win32.join(windowsSource, 'cache-link'), '..cache', 'directory'),
      link(win32.join(windowsSource, 'inner'), '.\\data', 'directory')
    ])
    await copyWindowsProfile(windowsRoots(), io.io)
    expect(io.symlinkCalls).toEqual([
      [windowsFinal, win32.join(windowsStaging, 'self'), 'junction'],
      [`${windowsFinal}\\..cache`, win32.join(windowsStaging, 'cache-link'), 'junction'],
      [`${windowsFinal}\\data`, win32.join(windowsStaging, 'inner'), 'junction']
    ])
    expect(io.symlinkCalls.some(call => String(call[0]).includes('.desktop-rename-partial'))).toBe(false)
  })

  it('leaves a relative directory outside the source profile on its resolved path', async () => {
    const io = windowsIo([
      link(win32.join(windowsSource, 'sibling'), '..\\web-other\\data', 'directory'),
      link(win32.join(windowsSource, 'parent'), '..', 'directory'),
      link(win32.join(windowsSource, 'drive'), 'D:\\plugins\\pkg', 'directory')
    ])
    await copyWindowsProfile(windowsRoots(), io.io)
    expect(io.symlinkCalls).toEqual([
      ['C:\\profiles\\web-other\\data', win32.join(windowsStaging, 'sibling'), 'junction'],
      ['C:\\profiles', win32.join(windowsStaging, 'parent'), 'junction'],
      ['D:\\plugins\\pkg', win32.join(windowsStaging, 'drive'), 'junction']
    ])
    expect(io.symlinkCalls.some(call => String(call[0]).includes('\\desktop'))).toBe(false)
  })

  it('keeps a file link and surfaces symlink errors without copying the file', async () => {
    const kept = windowsIo([link(win32.join(windowsSource, 'manifest-link'), 'package.json', 'file')])
    await copyWindowsProfile(windowsRoots(), kept.io)
    expect(kept.symlinkCalls).toEqual([['package.json', win32.join(windowsStaging, 'manifest-link')]])
    expect(kept.copiedFiles).toEqual([])

    const denied = windowsIo([link(win32.join(windowsSource, 'manifest-link'), 'package.json', 'file')], {
      symlink: async () => { throw codeError('EPERM', 'operation not permitted') }
    })
    await expect(copyWindowsProfile(windowsRoots(), denied.io)).rejects.toMatchObject({ code: 'EPERM' })
    expect(denied.symlinkCalls).toEqual([['package.json', win32.join(windowsStaging, 'manifest-link')]])
    expect(denied.copiedFiles).toEqual([])

    const broken = windowsIo([link(win32.join(windowsSource, 'manifest-link'), 'package.json', 'file')], {
      symlink: async () => { throw codeError('EIO', 'io error') }
    })
    await expect(copyWindowsProfile(windowsRoots(), broken.io)).rejects.toMatchObject({ code: 'EIO' })
    expect(broken.symlinkCalls).toEqual([['package.json', win32.join(windowsStaging, 'manifest-link')]])
    expect(broken.copiedFiles).toEqual([])
  })

  it('does not turn a dangling link or a probe failure into a junction', async () => {
    const dangling = windowsIo([link(win32.join(windowsSource, 'missing-link'), 'C:\\profiles\\web\\gone', 'missing')])
    await copyWindowsProfile(windowsRoots(), dangling.io)
    expect(dangling.symlinkCalls).toEqual([['C:\\profiles\\web\\gone', win32.join(windowsStaging, 'missing-link')]])

    const danglingDenied = windowsIo([link(win32.join(windowsSource, 'missing-link'), 'C:\\profiles\\web\\gone', 'missing')], {
      symlink: async () => { throw codeError('EPERM', 'operation not permitted') }
    })
    await expect(copyWindowsProfile(windowsRoots(), danglingDenied.io)).rejects.toMatchObject({ code: 'EPERM' })
    expect(danglingDenied.symlinkCalls).toEqual([['C:\\profiles\\web\\gone', win32.join(windowsStaging, 'missing-link')]])

    for (const probe of ['EACCES', 'EPERM', 'EIO']) {
      const failed = windowsIo([link(win32.join(windowsSource, 'blocked'), 'C:\\profiles\\web\\data', 'directory', probe)])
      await expect(copyWindowsProfile(windowsRoots(), failed.io)).rejects.toMatchObject({ code: probe })
      expect(failed.symlinkCalls).toEqual([])
    }
  })

  it('rejects a link that is neither a file nor a directory', async () => {
    const io = windowsIo([link(win32.join(windowsSource, 'socket'), 'C:\\profiles\\web\\socket', 'other')])
    await expect(copyWindowsProfile(windowsRoots(), io.io)).rejects.toThrow('neither a file nor a directory')
    expect(io.symlinkCalls).toEqual([])
    expect(io.copiedFiles).toEqual([])
  })

  it('skips only the profile root lock', async () => {
    const io = windowsIo([
      file(win32.join(windowsSource, 'lock')),
      file(win32.join(windowsSource, 'nested', 'lock')),
      file(win32.join(windowsSource, 'kept.txt'))
    ])
    await copyWindowsProfile(windowsRoots(), io.io)
    expect(io.copiedFiles).toEqual([
      [win32.join(windowsSource, 'nested', 'lock'), win32.join(windowsStaging, 'nested', 'lock')],
      [win32.join(windowsSource, 'kept.txt'), win32.join(windowsStaging, 'kept.txt')]
    ])
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

function windowsRoots(): ProfileCopyRoots {
  return { sourceRoot: windowsSource, stagingRoot: windowsStaging, finalRoot: windowsFinal }
}

type FollowKind = 'directory' | 'file' | 'other' | 'missing'

interface VirtualNode {
  kind: 'file' | 'dir' | 'link'
  names?: string[]
  target?: string
  follow?: FollowKind
  errorCode?: string
}

function link(path: string, target: string, follow: FollowKind, errorCode?: string): VirtualNode & { path: string } {
  return { path, kind: 'link', target, follow, ...(errorCode === undefined ? {} : { errorCode }) }
}

function file(path: string): VirtualNode & { path: string } {
  return { path, kind: 'file' }
}

function codeError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code })
}

function windowsIo(entries: Array<VirtualNode & { path: string }>, hooks: {
  symlink?: WindowsProfileCopyIo['symlink']
} = {}): { io: WindowsProfileCopyIo, symlinkCalls: unknown[][], copiedFiles: unknown[][], readDirectories: string[] } {
  const nodes = new Map<string, VirtualNode>()
  const symlinkCalls: unknown[][] = []
  const copiedFiles: unknown[][] = []
  const readDirectories: string[] = []

  function normalize(candidate: string): string {
    const normalized = win32.normalize(candidate)
    return normalized.length > 3 ? normalized.replace(/\\$/u, '') : normalized
  }

  function add(entryPath: string, node: VirtualNode): void {
    const key = normalize(entryPath)
    nodes.set(key, node)
    const parent = normalize(win32.dirname(key))
    if (parent === key) return
    if (!nodes.has(parent)) add(parent, { kind: 'dir', names: [] })
    const parentNode = nodes.get(parent)
    const name = win32.basename(key)
    if (parentNode?.kind === 'dir' && parentNode.names && !parentNode.names.includes(name)) parentNode.names.push(name)
  }

  for (const entry of entries) {
    const { path: entryPath, ...node } = entry
    add(entryPath, node)
  }

  function nodeAt(candidate: string): VirtualNode {
    const node = nodes.get(normalize(candidate))
    if (!node) throw codeError('ENOENT', 'missing')
    return node
  }

  function followedStat(kind: FollowKind) {
    return {
      isSymbolicLink: () => false,
      isDirectory: () => kind === 'directory',
      isFile: () => kind === 'file'
    }
  }

  const io: WindowsProfileCopyIo = {
    paths: win32,
    lstat: async candidate => {
      const node = nodeAt(candidate)
      if (node.kind === 'link') return { isSymbolicLink: () => true, isDirectory: () => false, isFile: () => false }
      if (node.kind === 'dir') return followedStat('directory')
      return followedStat('file')
    },
    stat: async candidate => {
      const node = nodeAt(candidate)
      if (node.kind !== 'link') return node.kind === 'dir' ? followedStat('directory') : followedStat('file')
      if (node.errorCode) throw codeError(node.errorCode, node.errorCode)
      if (node.follow === 'missing' || node.follow === undefined) throw codeError('ENOENT', 'missing')
      return followedStat(node.follow)
    },
    readlink: async candidate => {
      const node = nodeAt(candidate)
      if (node.kind !== 'link' || node.target === undefined) throw codeError('EINVAL', 'not a link')
      return node.target
    },
    symlink: async (target, destination, type) => {
      symlinkCalls.push(type === undefined ? [target, destination] : [target, destination, type])
      if (hooks.symlink) await hooks.symlink(target, destination, type)
    },
    readdir: async candidate => {
      readDirectories.push(candidate)
      const node = nodeAt(candidate)
      if (node.kind !== 'dir' || !node.names) throw codeError('ENOTDIR', 'not a directory')
      return node.names
    },
    mkdir: async () => undefined,
    copyFile: async (source, destination) => { copiedFiles.push([source, destination]) }
  }
  return { io, symlinkCalls, copiedFiles, readDirectories }
}
