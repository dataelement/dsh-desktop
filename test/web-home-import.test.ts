import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildWebImportViewModel } from '../src/main/web-import-view'
import {
  communityPluginNames,
  desktopHomeIsUnused,
  importTmpPath,
  importWebHome,
  inspectWebHome,
  previewWebHome,
  readImportDecision,
  shouldOfferWebHomeImport,
  writeSkipDecision
} from '../src/main/state/web-home-import'

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
      '@deepseek-ai/dsh-base': '0.1.5-rc.2'
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
    expect(preview.plugins).toEqual(['@scope/extra', 'demo-plugin', 'local-plugin'])
    expect(await communityPluginNames(webHome)).toEqual(preview.plugins)

    await importWebHome({ source: webHome, dest })

    expect(existsSync(join(dest, 'settings.yaml'))).toBe(true)
    expect(existsSync(join(dest, '.credentials.yaml'))).toBe(true)
    expect(existsSync(join(dest, 'sessions', 'session-one'))).toBe(true)
    expect(existsSync(join(dest, 'storages', 'workspace.json'))).toBe(true)
    expect(existsSync(join(dest, '.agent-presets', 'writer.dshpreset'))).toBe(true)
    expect(existsSync(join(dest, 'skills', 'demo-skill'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'package.json'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', 'cordis.patch.yml'))).toBe(true)
    expect(existsSync(join(dest, 'profiles', 'web', '.npmrc'))).toBe(true)
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

describe('web home import wiring', () => {
  it('inserts the import page before profile maintenance and ships the resource', async () => {
    const [main, preload, manifest, html] = await Promise.all([
      readFile('src/main/index.ts', 'utf8'),
      readFile('src/preload/index.ts', 'utf8'),
      readFile('package.json', 'utf8'),
      readFile('build/web-import.html', 'utf8')
    ])
    expect(main.indexOf('await maybeImportWebHome(dshHome)')).toBeGreaterThan(
      main.indexOf('await runtime.stop()')
    )
    expect(main.indexOf('await maybeImportWebHome(dshHome)')).toBeLessThan(
      main.indexOf('await runProfileStartupMaintenance({')
    )
    expect(main).toContain("desktopResourcePath('web-import.html')")
    expect(main).toContain("ipcMain.handle('web-import:action'")
    expect(main).toContain('if (startInSafeMode) return')
    expect(preload).toContain("ipcRenderer.invoke('web-import:action', action)")
    expect(JSON.parse(manifest).build.extraResources).toContainEqual({
      from: 'build/web-import.html',
      to: 'web-import.html'
    })
    expect(html).toContain('id="import"')
    expect(html).toContain('id="skip"')
    expect(html).toContain("window.dshWebImport.action")
    expect(html).toContain("default-src 'none'")
    expect(html).not.toMatch(/(?:src|srcset)=["']https?:/)
  })
})
