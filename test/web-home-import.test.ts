import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildWebImportViewModel } from '../src/main/web-import-view'
import {
  communityPluginNames,
  credentialFileDigest,
  credentialsCopyMatches,
  desktopHomeIsUnused,
  importTmpPath,
  importWebHome,
  inspectWebHome,
  previewWebHome,
  readImportDecision,
  shouldOfferWebHomeImport,
  workspaceCopyMatches,
  workspaceRegistryDigest,
  writeSkipDecision
} from '../src/main/profile/web-home-import'

describe('web home import', () => {
  const homes: string[] = []

  async function createRoot(prefix: string): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), prefix))
    homes.push(root)
    return root
  }

  async function createWebHome(options?: {
    plugins?: Record<string, { version: string; spec?: string }>
    extraNodeModules?: Record<string, string>
  }): Promise<string> {
    const home = await createRoot('dsh-web-home-')
    const profile = join(home, 'profiles', 'web')
    const modules = join(profile, 'node_modules')
    await mkdir(join(home, 'sessions', 'session-one'), { recursive: true })
    await mkdir(join(home, 'sessions', 'session-two'), { recursive: true })
    await mkdir(join(home, 'storages'), { recursive: true })
    await mkdir(join(home, '.agent-presets'), { recursive: true })
    await mkdir(join(home, 'skills', 'demo-skill'), { recursive: true })
    await mkdir(modules, { recursive: true })
    await writeFile(join(home, 'settings.yaml'), 'locale:\n  preference: zh\n')
    await writeFile(join(home, '.credentials.yaml'), 'deepseek: sk-test\n')
    await writeFile(join(home, '.anonymous-user-id'), 'telemetry\n')
    await writeFile(
      join(home, 'storages', 'workspace.json'),
      JSON.stringify({ items: [{ workspaceId: 'w1', path: '/tmp/a' }, { workspaceId: 'w2', path: '/tmp/b' }] })
    )
    await writeFile(join(home, '.agent-presets', 'writer.dshpreset'), '{}')
    await writeFile(join(home, 'sessions', '.DS_Store'), '')

    const plugins = options?.plugins ?? { 'demo-plugin': { version: '1.2.3' } }
    const dependencies: Record<string, string> = {
      dshmarket: '^1.0.0',
      '@deepseek-ai/dsh-base': '0.1.6-alpha.2'
    }
    const bundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
    for (const [name, plugin] of Object.entries(plugins)) {
      dependencies[name] = plugin.spec ?? `^${plugin.version}`
      bundles.push(name)
      const packageDir = join(modules, name)
      await mkdir(packageDir, { recursive: true })
      await writeFile(
        join(packageDir, 'package.json'),
        JSON.stringify({ name, version: plugin.version })
      )
      await writeFile(join(packageDir, 'index.js'), 'module.exports = {}\n')
    }
    for (const [name, version] of Object.entries(options?.extraNodeModules ?? {})) {
      const packageDir = join(modules, name)
      await mkdir(packageDir, { recursive: true })
      await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name, version }))
    }
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies,
        dsh: { profile: { bundles } }
      })
    )
    await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(profile, '.npmrc'), 'registry=https://registry.npmjs.org/\n')
    await writeFile(join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await mkdir(join(home, '.dsh-market'), { recursive: true })
    await writeFile(join(home, '.dsh-market', 'cache.json'), '{}\n')
    return home
  }

  afterEach(async () => {
    await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
  })

  it('places the import tmp next to a resolved desktop home', () => {
    const dest = join(tmpdir(), 'harness')
    expect(importTmpPath(dest)).toBe(`${resolve(dest)}.import-tmp`)
    expect(importTmpPath(`${dest}${sep}`)).toBe(importTmpPath(dest))
  })

  it('recognizes a legal, empty, or missing web home', async () => {
    const webHome = await createWebHome()
    const empty = await createRoot('dsh-empty-home-')
    expect(await inspectWebHome(webHome)).toBe(true)
    expect(await inspectWebHome(empty)).toBe(false)
    expect(await inspectWebHome(join(empty, 'missing'))).toBe(false)
  })

  it('does not offer import when the desktop already has settings or a decision', async () => {
    const webHome = await createWebHome()
    const dest = join(await createRoot('dsh-desktop-home-'), 'harness')
    expect(await shouldOfferWebHomeImport(dest, webHome)).toBe(true)

    await mkdir(dest, { recursive: true })
    await writeFile(join(dest, 'settings.yaml'), 'locale:\n  preference: en\n')
    expect(await desktopHomeIsUnused(dest)).toBe(false)
    expect(await shouldOfferWebHomeImport(dest, webHome)).toBe(false)

    const skipped = join(await createRoot('dsh-desktop-skip-'), 'harness')
    await writeSkipDecision(skipped, webHome)
    expect(await shouldOfferWebHomeImport(skipped, webHome)).toBe(false)
    expect((await readImportDecision(skipped))?.decision).toBe('skipped')
  })

  it('treats a desktop home with credentials, plugins or generations as used', async () => {
    const webHome = await createWebHome()

    const credentials = join(await createRoot('dsh-desktop-credentials-'), 'harness')
    await mkdir(credentials, { recursive: true })
    await writeFile(join(credentials, '.credentials.yaml'), 'version: 1\n')
    expect(await shouldOfferWebHomeImport(credentials, webHome)).toBe(false)

    const plugins = join(await createRoot('dsh-desktop-plugins-'), 'harness')
    await mkdir(join(plugins, 'profiles', 'web'), { recursive: true })
    await writeFile(
      join(plugins, 'profiles', 'web', 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.0.0', 'dsh-plugin-demo': '^1.0.0' } })
    )
    expect(await shouldOfferWebHomeImport(plugins, webHome)).toBe(false)

    const generations = join(await createRoot('dsh-desktop-generations-'), 'harness')
    await mkdir(join(generations, 'profiles', '.generations', 'live', 'demo+1.0.0'), { recursive: true })
    expect(await shouldOfferWebHomeImport(generations, webHome)).toBe(false)

    const coreOnly = join(await createRoot('dsh-desktop-core-'), 'harness')
    await mkdir(join(coreOnly, 'profiles', 'web'), { recursive: true })
    await writeFile(
      join(coreOnly, 'profiles', 'web', 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base'] } } })
    )
    expect(await shouldOfferWebHomeImport(coreOnly, webHome)).toBe(true)
  })

  it.each(['settings-only', 'sessions-only', 'empty-profile'])('imports %s without requiring profile files', async (layout) => {
    const source = await createRoot('dsh-web-minimal-')
    const dest = join(await createRoot('dsh-desktop-minimal-'), 'harness')
    if (layout === 'sessions-only') {
      await mkdir(join(source, 'sessions', 'one'), { recursive: true })
      await writeFile(join(source, 'sessions', 'one', 'session.json'), '{"id":"one"}\n')
    } else {
      await writeFile(join(source, 'settings.yaml'), 'theme: light\n')
      if (layout === 'empty-profile') await mkdir(join(source, 'profiles', 'web'), { recursive: true })
    }
    expect(await shouldOfferWebHomeImport(dest, source)).toBe(true)

    await importWebHome({ source, dest })

    expect(await readFile(join(dest, 'profiles', 'web', 'pnpm-workspace.yaml'), 'utf8'))
      .toBe('packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
    const payload = layout === 'sessions-only' ? join('sessions', 'one', 'session.json') : 'settings.yaml'
    expect(await readFile(join(dest, payload))).toEqual(await readFile(join(source, payload)))
    expect(existsSync(join(source, 'profiles', 'web', 'pnpm-workspace.yaml'))).toBe(false)
    expect((await readImportDecision(dest))?.decision).toBe('imported')
    expect(existsSync(importTmpPath(dest))).toBe(false)
  })

  it('preserves an existing workspace configuration byte for byte', async () => {
    const source = await createWebHome()
    const config = 'packages:\n  - .\n\nnodeLinker: isolated\n# user configuration\n'
    await writeFile(join(source, 'profiles', 'web', 'pnpm-workspace.yaml'), config)
    const dest = join(await createRoot('dsh-desktop-workspace-config-'), 'harness')

    await importWebHome({ source, dest })

    expect(await readFile(join(dest, 'profiles', 'web', 'pnpm-workspace.yaml'), 'utf8')).toBe(config)
    expect(await readFile(join(source, 'profiles', 'web', 'pnpm-workspace.yaml'), 'utf8')).toBe(config)
  })

  it('replaces an unused desktop home without leaving the old tree behind', async () => {
    const webHome = await createWebHome()
    const parent = await createRoot('dsh-desktop-replace-')
    const dest = join(parent, 'harness')
    await mkdir(join(dest, 'logs'), { recursive: true })
    await writeFile(join(dest, 'logs', 'old.log'), 'old\n')

    await importWebHome({ source: webHome, dest })

    expect(existsSync(join(dest, 'logs', 'old.log'))).toBe(false)
    expect(existsSync(join(dest, 'settings.yaml'))).toBe(true)
    expect((await readdir(parent)).sort()).toEqual(['harness'])
  })

  it('copies the allowlist and leaves the executable tree behind', async () => {
    const localPlugin = await createRoot('dsh-local-plugin-')
    await writeFile(join(localPlugin, 'package.json'), JSON.stringify({
      name: 'local-plugin',
      version: '2.0.0'
    }))
    await writeFile(join(localPlugin, 'plugin.js'), 'export default {}\n')

    const webHome = await createWebHome({
      plugins: {
        'demo-plugin': { version: '1.2.3' },
        '@scope/extra': { version: '4.5.6' },
        'local-plugin': { version: '2.0.0', spec: `file:${localPlugin}` }
      },
      extraNodeModules: { leftover: '0.0.1' }
    })
    const dest = join(await createRoot('dsh-desktop-import-'), 'harness')
    const preview = await previewWebHome(webHome)
    expect(preview.sessionCount).toBe(2)
    expect(preview.workspaceCount).toBe(2)
    expect(preview.presetCount).toBe(1)
    expect(preview.hasCredentials).toBe(true)
    expect(preview.plugins).toEqual(['@scope/extra', 'demo-plugin', 'dshmarket', 'local-plugin'])
    expect(await communityPluginNames(webHome)).toEqual(preview.plugins)

    await importWebHome({ source: webHome, dest })

    expect(existsSync(join(dest, 'settings.yaml'))).toBe(true)
    expect(existsSync(join(dest, '.credentials.yaml'))).toBe(true)
    const sourceCredentials = await credentialFileDigest(webHome)
    const copiedCredentials = await credentialFileDigest(dest)
    expect(sourceCredentials.path).toBe('.credentials.yaml')
    expect(credentialsCopyMatches(sourceCredentials, copiedCredentials)).toBe(true)
    const sourceWorkspaces = await workspaceRegistryDigest(webHome)
    const copiedWorkspaces = await workspaceRegistryDigest(dest)
    expect(sourceWorkspaces.path).toBe('storages/workspace.json')
    expect(sourceWorkspaces.count).toBe(preview.workspaceCount)
    expect(workspaceCopyMatches(sourceWorkspaces, copiedWorkspaces)).toBe(true)
    expect(existsSync(join(dest, 'sessions', 'session-one'))).toBe(true)
    expect(existsSync(join(dest, 'storages', 'workspace.json'))).toBe(true)
    expect(existsSync(join(dest, '.agent-presets', 'writer.dshpreset'))).toBe(true)
    expect(existsSync(join(dest, 'skills', 'demo-skill'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'package.json'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'cordis.patch.yml'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', '.npmrc'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'pnpm-workspace.yaml'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'node_modules', 'demo-plugin', 'package.json'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'node_modules', '@scope', 'extra', 'package.json'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'node_modules', 'local-plugin', 'index.js'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'node_modules', 'demo-plugin', 'index.js'))).toBe(false)
    expect(existsSync(join(dest, 'profiles', 'web', 'node_modules', 'leftover'))).toBe(false)
    expect(existsSync(join(dest, 'profiles', 'web', 'pnpm-lock.yaml'))).toBe(false)
    expect(existsSync(join(dest, '.dsh-market'))).toBe(false)
    expect(existsSync(join(dest, '.anonymous-user-id'))).toBe(false)
    expect(existsSync(importTmpPath(dest))).toBe(false)
    expect((await readImportDecision(dest))?.decision).toBe('imported')
    expect(await shouldOfferWebHomeImport(dest, webHome)).toBe(false)
    expect(existsSync(join(webHome, 'settings.yaml'))).toBe(true)
    expect(existsSync(join(webHome, 'profiles', 'web', 'node_modules', 'demo-plugin', 'index.js'))).toBe(true)
  })

  it('keeps an existing desktop credentials file when import is refused', async () => {
    const webHome = await createWebHome()
    const dest = join(await createRoot('dsh-desktop-keep-credentials-'), 'harness')
    await mkdir(dest, { recursive: true })
    await writeFile(join(dest, '.credentials.yaml'), 'version: 1\nrefs:\n  KEPT: desktop\n')
    const desktopCredentials = await credentialFileDigest(dest)
    const webCredentials = await credentialFileDigest(webHome)

    await expect(importWebHome({ source: webHome, dest })).rejects.toThrow('desktop home already has user data')

    expect(await credentialFileDigest(dest)).toEqual(desktopCredentials)
    expect(await credentialFileDigest(webHome)).toEqual(webCredentials)
    expect(credentialsCopyMatches(webCredentials, desktopCredentials)).toBe(false)
  })

  it('does not treat a missing or truncated credentials file as a copy', async () => {
    const webHome = await createWebHome()
    const dest = join(await createRoot('dsh-desktop-credential-bytes-'), 'harness')
    await importWebHome({ source: webHome, dest })
    const sourceCredentials = await credentialFileDigest(webHome)
    expect(credentialsCopyMatches(sourceCredentials, await credentialFileDigest(dest))).toBe(true)

    await writeFile(join(dest, '.credentials.yaml'), Buffer.from([0]))
    expect(credentialsCopyMatches(sourceCredentials, await credentialFileDigest(dest))).toBe(false)
    await rm(join(dest, '.credentials.yaml'))
    expect((await credentialFileDigest(dest)).sha256).toBeUndefined()
    expect(credentialsCopyMatches(sourceCredentials, await credentialFileDigest(dest))).toBe(false)

    const withoutCredentials = await createWebHome()
    await rm(join(withoutCredentials, '.credentials.yaml'))
    const emptyDest = join(await createRoot('dsh-desktop-no-credentials-'), 'harness')
    await importWebHome({ source: withoutCredentials, dest: emptyDest })
    expect((await credentialFileDigest(withoutCredentials)).sha256).toBeUndefined()
    expect((await credentialFileDigest(emptyDest)).sha256).toBeUndefined()
    expect(credentialsCopyMatches(
      await credentialFileDigest(withoutCredentials),
      await credentialFileDigest(emptyDest)
    )).toBe(false)
    expect(existsSync(join(emptyDest, 'settings.yaml'))).toBe(true)
  })

  it('keeps an existing workspace registry when import is refused', async () => {
    const webHome = await createWebHome()
    const dest = join(await createRoot('dsh-desktop-keep-workspaces-'), 'harness')
    await mkdir(join(dest, 'storages'), { recursive: true })
    await writeFile(join(dest, 'storages', 'workspace.json'), '{"items":[{"workspaceId":"kept"}]}\n')
    const desktopWorkspaces = await workspaceRegistryDigest(dest)
    const webWorkspaces = await workspaceRegistryDigest(webHome)

    await expect(importWebHome({ source: webHome, dest })).rejects.toThrow('desktop home already has user data')

    expect(await workspaceRegistryDigest(dest)).toEqual(desktopWorkspaces)
    expect(await workspaceRegistryDigest(webHome)).toEqual(webWorkspaces)
    expect(workspaceCopyMatches(webWorkspaces, desktopWorkspaces)).toBe(false)
    expect(desktopWorkspaces.count).toBe(1)
  })

  it('does not treat a missing or truncated workspace registry as a copy', async () => {
    const webHome = await createWebHome()
    const dest = join(await createRoot('dsh-desktop-workspace-bytes-'), 'harness')
    await importWebHome({ source: webHome, dest })
    const sourceWorkspaces = await workspaceRegistryDigest(webHome)
    expect(sourceWorkspaces.count).toBe(2)
    expect(workspaceCopyMatches(sourceWorkspaces, await workspaceRegistryDigest(dest))).toBe(true)

    await writeFile(join(dest, 'storages', 'workspace.json'), Buffer.from([0]))
    expect(workspaceCopyMatches(sourceWorkspaces, await workspaceRegistryDigest(dest))).toBe(false)
    await rm(join(dest, 'storages', 'workspace.json'))
    expect((await workspaceRegistryDigest(dest)).sha256).toBeUndefined()
    expect(workspaceCopyMatches(sourceWorkspaces, await workspaceRegistryDigest(dest))).toBe(false)

    const withoutWorkspaces = await createWebHome()
    await rm(join(withoutWorkspaces, 'storages', 'workspace.json'))
    const emptyDest = join(await createRoot('dsh-desktop-no-workspaces-'), 'harness')
    await importWebHome({ source: withoutWorkspaces, dest: emptyDest })
    expect((await workspaceRegistryDigest(withoutWorkspaces)).sha256).toBeUndefined()
    expect((await workspaceRegistryDigest(emptyDest)).sha256).toBeUndefined()
    expect(workspaceCopyMatches(
      await workspaceRegistryDigest(withoutWorkspaces),
      await workspaceRegistryDigest(emptyDest)
    )).toBe(false)
    expect(existsSync(join(emptyDest, 'settings.yaml'))).toBe(true)
  })

  it('does not leave a half-written harness directory when import fails', async () => {
    const webHome = await createWebHome()
    const parent = await createRoot('dsh-desktop-fail-')
    const blocker = join(parent, 'not-a-directory')
    await writeFile(blocker, 'blocked\n')
    const dest = join(blocker, 'harness')
    await expect(importWebHome({ source: webHome, dest })).rejects.toThrow()
    expect(existsSync(dest)).toBe(false)
    expect(existsSync(importTmpPath(dest))).toBe(false)
    expect(await desktopHomeIsUnused(dest)).toBe(true)
    expect(await readImportDecision(dest)).toBeUndefined()
    expect(await readFile(blocker, 'utf8')).toBe('blocked\n')
    expect(await readFile(join(webHome, 'settings.yaml'), 'utf8')).toBe('locale:\n  preference: zh\n')
  })

  it('builds bilingual preview copy for the import page', () => {
    const model = buildWebImportViewModel({
      locale: 'zh',
      preview: {
        sessionCount: 2,
        workspaceCount: 1,
        presetCount: 0,
        plugins: ['demo-plugin'],
        hasCredentials: true
      }
    })
    expect(model.heading).toBe('发现网页版数据')
    expect(model.stats).toContain('2 个会话')
    expect(model.primaryLabel).toBe('导入并继续')
    expect(model.secondaryLabel).toBe('从空白开始')
  })
})
