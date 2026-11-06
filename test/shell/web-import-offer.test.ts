import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  credentialFileDigest,
  credentialsCopyMatches,
  importDecisionPath,
  workspaceCopyMatches,
  workspaceRegistryDigest
} from '../../src/main/state/web-home-import'
import { isWebImportPageUrl, offerWebHomeImport, readWebImportAction } from '../../src/main/shell/web-import-offer'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function writeWorkspaceRegistry(home: string, workspaceIds: readonly string[]): Promise<void> {
  await mkdir(join(home, 'storages'), { recursive: true })
  const items = workspaceIds.map(workspaceId => ({ workspaceId }))
  await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ items }))
}

async function fakeHomes(): Promise<{ webHome: string, dshHome: string }> {
  const root = await mkdtemp(join(tmpdir(), 'shell-web-import-'))
  temporary.push(root)
  const webHome = join(root, 'web')
  const dshHome = join(root, 'desktop')
  await mkdir(join(webHome, 'profiles', 'web'), { recursive: true })
  await writeFile(join(webHome, 'settings.yaml'), 'theme: light\n')
  await writeFile(join(webHome, 'profiles', 'web', 'package.json'), '{"name":"web","private":true}\n')
  await mkdir(dshHome, { recursive: true })
  return { webHome, dshHome }
}

describe('web home import offer', () => {
  it('rejects an action that is not import or skip', () => {
    expect(readWebImportAction('import')).toBe('import')
    expect(readWebImportAction('skip')).toBe('skip')
    expect(readWebImportAction('delete')).toBeUndefined()
    expect(readWebImportAction({ action: 'import' })).toBeUndefined()
  })

  it('recognizes the import page with its query string', () => {
    const page = join(tmpdir(), 'web-import.html')
    const url = new URL(pathToFileURL(page))
    url.searchParams.set('state', '{"heading":"导入"}')
    expect(isWebImportPageUrl(url.href, page)).toBe(true)
    expect(isWebImportPageUrl('dsh-app://app/', page)).toBe(false)
    expect(isWebImportPageUrl(pathToFileURL(join(tmpdir(), 'other.html')).href, page)).toBe(false)
  })

  it('does not offer when the desktop home already has sessions', async () => {
    const homes = await fakeHomes()
    await mkdir(join(homes.dshHome, 'sessions', 'one'), { recursive: true })
    await writeFile(join(homes.dshHome, 'sessions', 'one', 'session.json'), '{}')
    let asked = false
    const result = await offerWebHomeImport({
      ...homes,
      choose: () => {
        asked = true
        return Promise.resolve('skip')
      }
    })
    expect(result).toBe('not-offered')
    expect(asked).toBe(false)
  })

  it('records skip without copying the web home', async () => {
    const homes = await fakeHomes()
    const before = (await stat(join(homes.webHome, 'settings.yaml'))).mtimeMs
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('skip') })
    expect(result).toBe('skipped')
    const decision = JSON.parse(await readFile(importDecisionPath(homes.dshHome), 'utf8')) as { decision?: string }
    expect(decision.decision).toBe('skipped')
    expect((await stat(join(homes.webHome, 'settings.yaml'))).mtimeMs).toBe(before)
    await expect(stat(join(homes.dshHome, 'settings.yaml'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('leaves the source in place when the copy is confirmed', async () => {
    const homes = await fakeHomes()
    const before = await readFile(join(homes.webHome, 'settings.yaml'), 'utf8')
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('import') })
    expect(result).toBe('imported')
    expect(await readFile(join(homes.webHome, 'settings.yaml'), 'utf8')).toBe(before)
    expect(await readFile(join(homes.dshHome, 'settings.yaml'), 'utf8')).toBe(before)
  })

  it('asks again after a failed copy and records a later skip', async () => {
    const homes = await fakeHomes()
    const notices: Array<string | undefined> = []
    const result = await offerWebHomeImport({
      ...homes,
      choose: async (_preview, notice) => {
        notices.push(notice)
        if (notices.length === 1) {
          await writeFile(join(homes.dshHome, 'settings.yaml'), 'occupied\n')
          return 'import'
        }
        return 'skip'
      }
    })
    expect(result).toBe('skipped')
    expect(notices[1]).toContain('already has user data')
    const decision = JSON.parse(await readFile(importDecisionPath(homes.dshHome), 'utf8')) as { decision?: string }
    expect(decision.decision).toBe('skipped')
  })

  it('records nothing when the page is closed', async () => {
    const homes = await fakeHomes()
    await writeFile(join(homes.webHome, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC: source\n')
    const sourceCredentials = await credentialFileDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve(undefined) })
    expect(result).toBe('cancelled')
    await expect(stat(importDecisionPath(homes.dshHome))).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await credentialFileDigest(homes.dshHome)).sha256).toBeUndefined()
    expect(await credentialFileDigest(homes.webHome)).toEqual(sourceCredentials)
    expect(credentialsCopyMatches(sourceCredentials, await credentialFileDigest(homes.dshHome))).toBe(false)
  })

  it('does not copy credentials when the offer is skipped', async () => {
    const homes = await fakeHomes()
    await writeFile(join(homes.webHome, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC: source\n')
    const sourceCredentials = await credentialFileDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('skip') })
    expect(result).toBe('skipped')
    expect((await credentialFileDigest(homes.dshHome)).sha256).toBeUndefined()
    expect(await credentialFileDigest(homes.webHome)).toEqual(sourceCredentials)
  })

  it('does not replace credentials that are already in the desktop home', async () => {
    const homes = await fakeHomes()
    await writeFile(join(homes.webHome, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC: web\n')
    await writeFile(join(homes.dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC: desktop\n')
    const desktopCredentials = await credentialFileDigest(homes.dshHome)
    let asked = false
    const result = await offerWebHomeImport({
      ...homes,
      choose: () => {
        asked = true
        return Promise.resolve('import')
      }
    })
    expect(result).toBe('not-offered')
    expect(asked).toBe(false)
    expect(await credentialFileDigest(homes.dshHome)).toEqual(desktopCredentials)
    expect(credentialsCopyMatches(await credentialFileDigest(homes.webHome), desktopCredentials)).toBe(false)
  })

  it('copies credentials bytes when the offer is confirmed', async () => {
    const homes = await fakeHomes()
    await writeFile(join(homes.webHome, '.credentials.yaml'), 'version: 1\nrefs:\n  SYNTHETIC: source\n')
    const sourceCredentials = await credentialFileDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('import') })
    expect(result).toBe('imported')
    expect(credentialsCopyMatches(sourceCredentials, await credentialFileDigest(homes.dshHome))).toBe(true)
    expect(await credentialFileDigest(homes.webHome)).toEqual(sourceCredentials)
  })

  it('does not copy the workspace registry when the page is closed', async () => {
    const homes = await fakeHomes()
    await writeWorkspaceRegistry(homes.webHome, ['alpha', 'beta'])
    const sourceWorkspaces = await workspaceRegistryDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve(undefined) })
    expect(result).toBe('cancelled')
    expect((await workspaceRegistryDigest(homes.dshHome)).sha256).toBeUndefined()
    expect(await workspaceRegistryDigest(homes.webHome)).toEqual(sourceWorkspaces)
    expect(workspaceCopyMatches(sourceWorkspaces, await workspaceRegistryDigest(homes.dshHome))).toBe(false)
  })

  it('does not copy the workspace registry when the offer is skipped', async () => {
    const homes = await fakeHomes()
    await writeWorkspaceRegistry(homes.webHome, ['alpha', 'beta'])
    const sourceWorkspaces = await workspaceRegistryDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('skip') })
    expect(result).toBe('skipped')
    expect((await workspaceRegistryDigest(homes.dshHome)).sha256).toBeUndefined()
    expect(await workspaceRegistryDigest(homes.webHome)).toEqual(sourceWorkspaces)
  })

  it('does not replace a workspace registry already in the desktop home', async () => {
    const homes = await fakeHomes()
    await writeWorkspaceRegistry(homes.webHome, ['alpha'])
    await writeWorkspaceRegistry(homes.dshHome, ['kept'])
    const desktopWorkspaces = await workspaceRegistryDigest(homes.dshHome)
    let asked = false
    const result = await offerWebHomeImport({
      ...homes,
      choose: () => {
        asked = true
        return Promise.resolve('import')
      }
    })
    expect(result).toBe('not-offered')
    expect(asked).toBe(false)
    expect(await workspaceRegistryDigest(homes.dshHome)).toEqual(desktopWorkspaces)
    expect(workspaceCopyMatches(await workspaceRegistryDigest(homes.webHome), desktopWorkspaces)).toBe(false)
  })

  it('copies the workspace registry when the offer is confirmed', async () => {
    const homes = await fakeHomes()
    await writeWorkspaceRegistry(homes.webHome, ['alpha', 'beta'])
    const sourceWorkspaces = await workspaceRegistryDigest(homes.webHome)
    const result = await offerWebHomeImport({ ...homes, choose: () => Promise.resolve('import') })
    expect(result).toBe('imported')
    expect(sourceWorkspaces.count).toBe(2)
    expect(workspaceCopyMatches(sourceWorkspaces, await workspaceRegistryDigest(homes.dshHome))).toBe(true)
    expect(await workspaceRegistryDigest(homes.webHome)).toEqual(sourceWorkspaces)
  })

  it('asks before the profile copy', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    const call = source.indexOf('await offerWebHomeImport(')
    const migrate = source.indexOf('await migrateWebProfile(')
    expect(call).toBeGreaterThan(0)
    expect(migrate).toBeGreaterThan(call)
    expect(source.includes('if (!safeMode)')).toBe(true)
  })
})