import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { installBundledPluginProfile } from '../src/main/bundled-plugin-profile'
import { patchBetterSidebarClient } from '../scripts/lib/patch-sherlock-better-sidebar.mjs'
import { patchSherlockOfficePreviewClient } from '../scripts/lib/patch-sherlock-office-preview.mjs'

const temporaryDirectories: string[] = []

async function temporaryDirectory(label: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), `${label}-`))
  temporaryDirectories.push(directory)
  return directory
}

async function makeBundledProfile(root: string): Promise<string> {
  const profile = path.join(root, 'sherlock-plugin-profile')
  await mkdir(path.join(profile, 'modules', 'dsh-file-drop'), { recursive: true })
  await writeFile(
    path.join(profile, 'package.json'),
    `${JSON.stringify(
      {
        name: 'dsh-profile-web',
        private: true,
        dependencies: { 'dsh-file-drop': 'file:vendor/dsh-file-drop' },
        dsh: {
          profile: {
            bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-file-drop']
          },
          sherlock: {
            retiredPlugins: [
              '@vectorize-io/hindsight-coding-agents',
              'dsh-memory-evolve'
            ]
          }
        }
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  await writeFile(path.join(profile, 'cordis.patch.yml'), '- id: product-policy\n', 'utf8')
  await writeFile(path.join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n', 'utf8')
  await writeFile(
    path.join(profile, 'modules', 'dsh-file-drop', 'index.js'),
    'export default true\n',
    'utf8'
  )
  return profile
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    if (existsSync(directory)) {
      // Test cleanup is intentionally limited to directories created under os.tmpdir().
      rmSync(directory, { recursive: true, force: true })
    }
  }
})

describe('bundled Sherlock plugin profile', () => {
  it('prepares the bundled Office adapter reproducibly and fails closed on a drifted bundle', async () => {
    const source = await readFile(
      path.resolve(
        import.meta.dirname,
        '..',
        'build',
        'sherlock-plugin-profile',
        'vendor',
        '@huanlin',
        'dsh-plugin-better-sidebar-plugin-office',
        'lib',
        'client.js'
      ),
      'utf8'
    )
    const patched = patchSherlockOfficePreviewClient(source)

    expect(patchSherlockOfficePreviewClient(patched)).toBe(patched)
    expect(() => patchSherlockOfficePreviewClient(`${source}\n/* sherlock:office-preview-service:v1 */`))
      .toThrow(/Office preview .*integrity/u)
    expect(() => patchSherlockOfficePreviewClient(patched.replace(
      '\t\texports.officePreviewService = officePreviewService;',
      ''
    ))).toThrow(/Office preview .*integrity/u)
    for (const [label, incomplete] of [
      ['duplicate marker', `${patched}\n/* sherlock:office-preview-service:v1 */`],
      ['missing component definition', patched.replace(
        '\t\tfunction OfficePreviewComponent(props) {',
        '\t\tfunction BrokenOfficePreviewComponent(props) {'
      )],
      ['missing service definition', patched.replace(
        '\t\tconst officePreviewService = Object.freeze({',
        '\t\tconst brokenOfficePreviewService = Object.freeze({'
      )],
      ['damaged sidebar registration', patched.replace(
        'betterSidebar.registerFileViewer(viewer)',
        'betterSidebar.registerFileViewer()'
      )],
      ['reverted lifecycle cancellation', patched.replace(
        'if (lifecycle.signal.aborted) return;',
        'if (cancelled) return;'
      )],
      ['missing apply export', patched.replace('\t\texports.apply = apply;', '')],
      ['missing viewer export', patched.replace('\t\texports.officeViewers = officeViewers;', '')]
    ] as const) {
      expect(
        () => patchSherlockOfficePreviewClient(incomplete),
        `marker branch must reject ${label}`
      ).toThrow(/Office preview .*integrity/u)
    }
    if (source.includes('/* sherlock:office-preview-service:v1 */')) {
      expect(() => patchSherlockOfficePreviewClient(source.replace(
        'ctx.inject(["betterSidebar"]',
        'ctx.inject(["unexpected-office-api"]'
      ))).toThrow(/Office preview patch integrity/u)
    } else {
      expect(() => patchSherlockOfficePreviewClient(source.replace(
        'const inject = ["betterSidebar"];',
        'const inject = ["unexpected-office-api"];'
      ))).toThrow(/Office preview .*expected 1, found 0/u)
    }
  })

  it('keeps Sherlock pinned sidebar tabs first, fixed, and session-targetable', async () => {
    const source = await readFile(
      path.resolve(
        import.meta.dirname,
        '..',
        'build',
        'sherlock-plugin-profile',
        'vendor',
        'dsh-better-sidebar',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    const patched = patchBetterSidebarClient(source)

    expect(patchBetterSidebarClient(patched)).toBe(patched)
    expect(patched).toContain('const pinned = tab.meta?.sherlockPinned === true;')
    expect(patched).toContain('/* sherlock:pinned-sidebar-edge:v1 */')
    expect(patched).toContain('/* sherlock:pinned-sidebar-reconcile:v1 */')
    expect(patched).toContain(
      'return openTabInActivePane(closeTab(state, leaf.id, existing.id), reconciled)'
    )
    expect(patched).toContain('if (moving?.meta?.sherlockPinned === true) return state;')
    expect(patched).toContain('draggable: !pinned')
    expect(patched).toContain('candidate?.meta?.sherlockClosable === false')
    expect(patched).toContain('const setPanelState = (patch, scope) =>')
    expect(patched).toContain('targetsInactiveSession ? store.reduceFor(scope.sessionId, reducer) : store.reduce(reducer)')
    expect(patched).toContain('setPanelState')
  })

  it('restores committed sidebar surface sizes after imperative drag cleanup', async () => {
    const source = await readFile(
      path.resolve(
        import.meta.dirname,
        '..',
        'build',
        'sherlock-plugin-profile',
        'vendor',
        'dsh-better-sidebar',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    const patched = patchBetterSidebarClient(source)

    expect(patched).toContain('/* sherlock:panel-surface-sync:v1 */')
    expect(patched).toContain(
      'if (width > 0) panelRef.current?.style.setProperty("width", `${width}px`);'
    )
    expect(patched).toContain(
      'if (height > 0) bottomRef.current?.style.setProperty("height", `${height}px`);'
    )
    expect(patched).toContain('(0, react.useLayoutEffect)(() => {')
    expect(patched).toContain(
      'bottomRef.current?.style.setProperty("height", `${Math.min(committed.bottomHeight, window.innerHeight)}px`);'
    )
    expect(patched).toContain('snapshot.state?.bottomOpen,')
    expect(patchBetterSidebarClient(patched)).toBe(patched)
  })

  it('publishes file drags from Files rows and search results without making folders draggable', async () => {
    const source = await readFile(
      path.resolve(
        import.meta.dirname,
        '..',
        'build',
        'sherlock-plugin-profile',
        'vendor',
        'dsh-better-sidebar',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    const patched = patchBetterSidebarClient(source)
    const fileRowStart = patched.indexOf('title: entry.broken ?')
    const fileRowEnd = patched.indexOf('children: [', fileRowStart)
    const folderRowStart = patched.indexOf('className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerDir')
    const folderRowEnd = patched.indexOf('children: [', folderRowStart)
    const searchResultStart = patched.indexOf('results.matches.map((rel) =>')
    const searchResultEnd = patched.indexOf('children: rel', searchResultStart)

    expect(patched).toContain('/* sherlock:files-to-research-canvas:v2 */')
    expect(fileRowStart).toBeGreaterThanOrEqual(0)
    expect(fileRowEnd).toBeGreaterThan(fileRowStart)
    expect(patched.slice(fileRowStart, fileRowEnd)).toContain('draggable: true')
    expect(patched.slice(fileRowStart, fileRowEnd)).toContain(
      '"data-sherlock-file-drag-source": entry.path'
    )
    expect(patched.slice(fileRowStart, fileRowEnd)).toContain(
      'writeSherlockSidebarFileDrag(event, entry.path, entry.name, sessionId, cwd)'
    )
    expect(folderRowStart).toBeGreaterThanOrEqual(0)
    expect(folderRowEnd).toBeGreaterThan(folderRowStart)
    expect(patched.slice(folderRowStart, folderRowEnd)).not.toContain('draggable: true')
    expect(searchResultStart).toBeGreaterThanOrEqual(0)
    expect(searchResultEnd).toBeGreaterThan(searchResultStart)
    expect(patched.slice(searchResultStart, searchResultEnd)).toContain('draggable: true')
    expect(patched.slice(searchResultStart, searchResultEnd)).toContain(
      'writeSherlockSidebarFileDrag(event, absolutePath, baseName$1(absolutePath), sessionId, cwd, rel)'
    )
    expect(patched).toContain(
      '? { path: filePath, name, sessionId, relativePath } : { path: filePath, name })'
    )
    expect(patched).toContain('safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint)')
    expect(patched).toContain(
      'const previewEligible = relativePath !== null && relativePath.length <= 512 && typeof sessionId === "string" && sessionId.length > 0 && sessionId.length <= 512;'
    )
    expect(patchBetterSidebarClient(patched)).toBe(patched)
  })

  it('uses the formal profile without either retired memory plugin', async () => {
    const appManifest = JSON.parse(
      await readFile(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8')
    ) as { version: string }
    const policy = JSON.parse(
      await readFile(
        path.resolve(import.meta.dirname, '..', 'build', 'sherlock-bundled-plugins.json'),
        'utf8'
      )
    ) as {
      plugins: string[]
      runtimePackages: string[]
      excludedPlugins: string[]
      excludedEntryIds: string[]
      bundles: string[]
    }
    const preparation = await readFile(
      path.resolve(import.meta.dirname, '..', 'scripts', 'prepare-bundled-plugin-profile.mjs'),
      'utf8'
    )

    expect(appManifest.version).toBe('0.7.3')
    expect(policy.plugins).toEqual([
      '@huanlin/dsh-plugin-better-sidebar-plugin-office',
      'dsh-better-sidebar',
      'dsh-file-drop',
      'dshmarket'
    ])
    expect(policy.plugins).not.toContain('dsh-update-checker')
    expect(policy.plugins).not.toContain('dsh-memory-evolve')
    expect(policy.plugins).not.toContain('@vectorize-io/hindsight-coding-agents')
    expect(policy.excludedPlugins).toEqual([
      '@vectorize-io/hindsight-coding-agents',
      'dsh-memory-evolve'
    ])
    expect(policy.excludedEntryIds).toEqual(['hindsight', 'dsh-memory-evolve'])
    expect(policy.bundles).not.toContain('dsh-memory-evolve')
    expect(policy.bundles).not.toContain('@vectorize-io/hindsight-coding-agents')
    expect(policy.runtimePackages).toEqual([
      'dsh-desktop-market-installer',
      'dsh-web-search-session-model'
    ])
    expect(preparation).toContain("'sherlock-desktop'")
    expect(preparation).not.toContain("'dsh-desktop-dev'")
    expect(preparation).toContain("path.join(projectRoot, 'packages', packageName)")
    expect(preparation).toContain('runtimePackages')
    expect(preparation).toContain('excludedPlugins')
    expect(preparation).toContain('retiredPlugins')
    expect(preparation).toContain('stripExcludedProfileEntries')
    expect(preparation).toContain('sourceManifest.dsh?.sherlock?.plugins')
    expect(preparation).toContain("'.credentials.yaml'")
    expect(preparation).toContain("'settings.yaml'")
    expect(preparation).toContain("part.startsWith('.env.')")
    expect(preparation).toContain('patchBetterSidebarPackage(vendorPath)')
    expect(preparation).toContain('patchSherlockOfficePreviewPackage(vendorPath)')
    expect(preparation).not.toContain('patchMemoryEvolvePackage')
    expect(
      await readFile(
        path.resolve(
          import.meta.dirname,
          '..',
          'build',
          'sherlock-plugin-profile',
          'cordis.patch.yml'
        ),
        'utf8'
      )
    ).not.toMatch(/^- id: (?:hindsight|dsh-memory-evolve)$/mu)
  })

  it('installs the packaged profile for a fresh user without touching model credentials', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-fresh')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const harness = path.join(userDataPath, 'harness')
    await mkdir(harness, { recursive: true })
    await writeFile(path.join(harness, '.credentials.yaml'), 'OPENAI_API_KEY: user-owned\n')

    const result = installBundledPluginProfile({
      userDataPath,
      bundledProfilePath,
      appVersion: '0.6.7',
      now: new Date('2026-08-25T09:00:00.000Z')
    })

    const installedProfile = path.join(harness, 'profiles', 'web')
    expect(result.installed).toBe(true)
    expect(result.plugins).toEqual(['dsh-file-drop'])
    expect(readFileSync(path.join(installedProfile, 'cordis.patch.yml'), 'utf8')).toBe(
      '- id: product-policy\n'
    )
    expect(existsSync(path.join(installedProfile, 'node_modules', 'dsh-file-drop', 'index.js'))).toBe(
      true
    )
    expect(existsSync(path.join(installedProfile, 'modules'))).toBe(false)
    expect(await readFile(path.join(harness, '.credentials.yaml'), 'utf8')).toBe(
      'OPENAI_API_KEY: user-owned\n'
    )
    expect(existsSync(path.join(installedProfile, '.credentials.yaml'))).toBe(false)
  })

  it('upgrades an older profile by uninstalling both memory plugins and preserving user data', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-upgrade')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const harness = path.join(userDataPath, 'harness')
    const oldProfile = path.join(harness, 'profiles', 'web')
    await mkdir(path.join(oldProfile, 'node_modules', 'dsh-memory-evolve'), { recursive: true })
    await mkdir(
      path.join(oldProfile, 'node_modules', '@vectorize-io', 'hindsight-coding-agents'),
      { recursive: true }
    )
    await mkdir(path.join(harness, 'custom-plugins', 'dsh-memory-evolve'), { recursive: true })
    await mkdir(
      path.join(harness, 'custom-plugins', '@vectorize-io', 'hindsight-coding-agents'),
      { recursive: true }
    )
    await writeFile(
      path.join(oldProfile, 'package.json'),
      '{"dependencies":{"old-plugin":"1.0.0","dsh-update-checker":"1.4.16","dsh-memory-evolve":"0.1.0","@vectorize-io/hindsight-coding-agents":"0.4.2"}}\n',
      'utf8'
    )
    await writeFile(
      path.join(oldProfile, 'node_modules', 'dsh-memory-evolve', 'package.json'),
      '{"name":"dsh-memory-evolve","version":"0.1.0"}\n',
      'utf8'
    )
    await writeFile(
      path.join(
        oldProfile,
        'node_modules',
        '@vectorize-io',
        'hindsight-coding-agents',
        'package.json'
      ),
      '{"name":"@vectorize-io/hindsight-coding-agents","version":"0.4.2"}\n',
      'utf8'
    )
    await writeFile(
      path.join(harness, 'custom-plugins', 'dsh-memory-evolve', 'package.json'),
      '{"name":"dsh-memory-evolve","version":"0.1.0"}\n',
      'utf8'
    )
    await writeFile(
      path.join(
        harness,
        'custom-plugins',
        '@vectorize-io',
        'hindsight-coding-agents',
        'package.json'
      ),
      '{"name":"@vectorize-io/hindsight-coding-agents","version":"0.4.2"}\n',
      'utf8'
    )
    await writeFile(path.join(oldProfile, 'cordis.patch.yml'), '- id: old-profile\n', 'utf8')
    await writeFile(path.join(harness, 'settings.yaml'), 'models: user-owned\n', 'utf8')

    const result = installBundledPluginProfile({
      userDataPath,
      bundledProfilePath,
      appVersion: '0.7.3',
      now: new Date('2026-08-25T09:01:02.000Z')
    })

    expect(result.installed).toBe(true)
    expect(result.backupDirectory).toBeDefined()
    expect(
      JSON.parse(readFileSync(path.join(oldProfile, 'package.json'), 'utf8')).dependencies
    ).toEqual({ 'dsh-file-drop': 'file:vendor/dsh-file-drop' })
    expect(readFileSync(path.join(oldProfile, 'cordis.patch.yml'), 'utf8')).toBe(
      '- id: product-policy\n'
    )
    expect(existsSync(path.join(oldProfile, 'node_modules', 'dsh-memory-evolve'))).toBe(false)
    expect(
      existsSync(
        path.join(oldProfile, 'node_modules', '@vectorize-io', 'hindsight-coding-agents')
      )
    ).toBe(false)
    expect(existsSync(path.join(harness, 'custom-plugins', 'dsh-memory-evolve'))).toBe(false)
    expect(
      existsSync(
        path.join(harness, 'custom-plugins', '@vectorize-io', 'hindsight-coding-agents')
      )
    ).toBe(false)
    expect(
      readFileSync(path.join(result.backupDirectory!, 'package.json'), 'utf8')
    ).toContain('dsh-memory-evolve')
    expect(
      existsSync(path.join(result.backupDirectory!, 'node_modules', 'dsh-memory-evolve'))
    ).toBe(true)
    expect(
      existsSync(
        path.join(
          result.backupDirectory!,
          'node_modules',
          '@vectorize-io',
          'hindsight-coding-agents'
        )
      )
    ).toBe(true)
    expect(await readFile(path.join(harness, 'settings.yaml'), 'utf8')).toBe(
      'models: user-owned\n'
    )
  })

  it('is idempotent for the same packaged plugin fingerprint', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-idempotent')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const options = {
      userDataPath,
      bundledProfilePath,
      appVersion: '0.6.7',
      now: new Date('2026-08-25T09:02:00.000Z')
    }

    expect(installBundledPluginProfile(options).installed).toBe(true)
    writeFileSync(
      path.join(userDataPath, 'harness', 'profiles', 'web', 'runtime-marker'),
      'keep me\n',
      'utf8'
    )
    const second = installBundledPluginProfile(options)

    expect(second.installed).toBe(false)
    expect(
      readFileSync(
        path.join(userDataPath, 'harness', 'profiles', 'web', 'runtime-marker'),
        'utf8'
      )
    ).toBe('keep me\n')
  })

  it('removes a retired custom memory plugin even when the bundled profile is current', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-retired-idempotent')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const options = { userDataPath, bundledProfilePath, appVersion: '0.7.3' }

    expect(installBundledPluginProfile(options).installed).toBe(true)
    const retiredPath = path.join(
      userDataPath,
      'harness',
      'custom-plugins',
      'dsh-memory-evolve'
    )
    await mkdir(retiredPath, { recursive: true })
    await writeFile(
      path.join(retiredPath, 'package.json'),
      '{"name":"dsh-memory-evolve","version":"0.1.0"}\n',
      'utf8'
    )

    expect(installBundledPluginProfile(options).installed).toBe(false)
    expect(existsSync(retiredPath)).toBe(false)
  })

  it('does nothing in unpackaged development when no bundled profile exists', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-absent')
    const result = installBundledPluginProfile({
      userDataPath: path.join(root, 'user-data'),
      bundledProfilePath: path.join(root, 'missing-profile'),
      appVersion: 'dev'
    })

    expect(result).toEqual({ installed: false, plugins: [] })
  })

  it('reinstalls when bundled plugin code changes without a manifest or version change', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-code-change')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const options = { userDataPath, bundledProfilePath, appVersion: '0.6.6' }

    expect(installBundledPluginProfile(options).installed).toBe(true)
    await writeFile(
      path.join(bundledProfilePath, 'modules', 'dsh-file-drop', 'index.js'),
      'export default "patched"\n',
      'utf8'
    )

    expect(installBundledPluginProfile(options).installed).toBe(true)
    expect(
      await readFile(
        path.join(userDataPath, 'harness', 'profiles', 'web', 'node_modules', 'dsh-file-drop', 'index.js'),
        'utf8'
      )
    ).toBe('export default "patched"\n')
  })
})
