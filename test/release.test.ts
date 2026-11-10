import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { resolveDesktopIdentity } from '../src/main/shell/product-identity'

const projectRoot = path.resolve(import.meta.dirname, '..')

const releaseAssets = [
  'dsh-desktop-mac-arm64.dmg',
  'dsh-desktop-mac-x64.dmg',
  'dsh-desktop-windows-x64-setup.exe'
]

/** The exact Harness build every `@deepseek-ai/dsh-*` production dep is pinned to. */
const HARNESS_VERSION = '0.2.2-rc.1'

interface ProductManifest {
  dshDesktopIdentity?: unknown
  build: {
    appId: string
    productName: string
    extraMetadata?: { dshDesktopIdentity?: unknown }
  }
}

const productManifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as ProductManifest
const explicitProduct = productManifest.dshDesktopIdentity !== undefined

function assertProductIdentity(manifest: ProductManifest, development: { appId: string; productName: string }): void {
  // Pass an empty environment so developer Profile overrides cannot mask packaging errors.
  const production = resolveDesktopIdentity(manifest, true, 'app-data', {})
  const unpackaged = resolveDesktopIdentity(manifest, false, 'app-data', {})
  const devPackage = resolveDesktopIdentity({ ...manifest, dshDesktopChannel: 'development' }, true, 'app-data', {})
  expect(devPackage).toEqual(unpackaged)
  expect(production.userData.toLowerCase()).not.toBe(devPackage.userData.toLowerCase())
  expect(manifest.build.productName).toBe(production.name)
  expect(development.productName).toBe(devPackage.name)
  expect(development.productName).not.toBe(manifest.build.productName)
  for (const id of [manifest.build.appId, development.appId]) expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)+$/)
  expect(development.appId.toLowerCase()).not.toBe(manifest.build.appId.toLowerCase())
  if (manifest.dshDesktopIdentity === undefined) {
    expect(manifest.build.appId).toBe('io.dsh.desktop')
    expect(development.appId).toBe('io.dsh.desktop.dev')
    expect(production).toEqual({ name: 'DSH Desktop', userData: path.join('app-data', 'dsh-desktop') })
    expect(devPackage).toEqual({ name: 'DSH Desktop Dev', userData: path.join('app-data', 'dsh-desktop-dev') })
  } else {
    expect(manifest.build.extraMetadata?.dshDesktopIdentity).toEqual(manifest.dshDesktopIdentity)
  }
}

function artifactPrefix(artifact: string, installer: string): string {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)-\$\{os\}-\$\{arch\}\.\$\{ext\}$/.exec(artifact)
  if (!match?.[1] || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(match[1])) throw new Error('Artifact must have a stable portable prefix and platform placeholders')
  expect(installer).toBe(match[1] + '-windows-${arch}-setup.${ext}')
  return match[1]
}

function assertUpdateSources(sources: Array<{ provider: string; url?: string }>): void {
  expect(sources.length).toBeGreaterThan(0)
  for (const source of sources) {
    expect(source.provider).toBe('generic')
    expect(typeof source.url).toBe('string')
    const url = new URL(source.url ?? '')
    expect(url.protocol).toBe('https:')
    expect(url.hostname).not.toBe('')
    expect(url.username + url.password + url.search + url.hash).toBe('')
    expect(url.pathname.endsWith('/')).toBe(true)
  }
}

// Parse syntax rather than accepting a commented-out core import as an entry.
function entryPaths(source: string): Map<string, string> {
  const parsed = ts.createSourceFile('config.ts', source, ts.ScriptTarget.Latest, true)
  const exported = parsed.statements.find(ts.isExportAssignment)?.expression
  const config = exported && ts.isCallExpression(exported) ? exported.arguments[0] : undefined
  const property = (node: ts.Node | undefined, key: string): ts.Expression | undefined => {
    if (!node || !ts.isObjectLiteralExpression(node)) return undefined
    const row = node.properties.find(item => ts.isPropertyAssignment(item)
      && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === key)
    return row && ts.isPropertyAssignment(row) ? row.initializer : undefined
  }
  const result = new Map<string, string>()
  for (const [target, names] of [['main', ['index', 'host']], ['preload', ['app']]] as const) {
    const inputs = property(property(property(property(config, target), 'build'), 'rollupOptions'), 'input')
    for (const name of names) {
      const entry = property(inputs, name)
      if (!entry || !ts.isCallExpression(entry) || !ts.isIdentifier(entry.expression) || entry.expression.text !== 'resolve') continue
      const argument = entry.arguments[0]
      if (entry.arguments.length === 1 && argument && ts.isStringLiteral(argument)) result.set(name, argument.text)
    }
  }
  return result
}

async function assertCoreEntry(entry: string | undefined, core: string, root = projectRoot): Promise<void> {
  expect(entry).toBeTypeOf('string')
  if (!entry || path.isAbsolute(entry) || entry.includes('\\') || entry.split('/').includes('..')) throw new Error('Entry must be project relative')
  const filename = path.join(root, entry)
  const source = await readFile(filename, 'utf8')
  if (entry === core) return
  const imports = ts.createSourceFile(entry, source, ts.ScriptTarget.Latest, true).statements
    .filter(ts.isImportDeclaration)
    .filter(node => !node.importClause && ts.isStringLiteral(node.moduleSpecifier))
    .map(node => ts.isStringLiteral(node.moduleSpecifier) ? path.resolve(path.dirname(filename), node.moduleSpecifier.text).replace(/\.ts$/, '') : '')
  expect(imports).toContain(path.join(root, core).replace(/\.ts$/, ''))
}


describe('product contract fixtures', () => {
  const identity = { productName: 'Sample Desktop', userDataDirectory: 'sample', developmentUserDataDirectory: 'sample-dev' }
  const manifest: ProductManifest = { dshDesktopIdentity: identity, build: { appId: 'org.sample.desktop', productName: identity.productName, extraMetadata: { dshDesktopIdentity: identity } } }
  const development = { appId: 'org.sample.desktop.dev', productName: 'Sample Desktop Dev' }

  it('accepts explicit identity and rejects colliding or malformed product isolation', () => {
    expect(() => assertProductIdentity(manifest, development)).not.toThrow()
    expect(() => assertProductIdentity(manifest, { ...development, appId: manifest.build.appId })).toThrow()
    expect(() => assertProductIdentity(manifest, { ...development, productName: identity.productName })).toThrow()
    for (const configured of [null, {}, { ...identity, userDataDirectory: '../sample' }, { ...identity, developmentUserDataDirectory: 'SAMPLE' }]) {
      expect(() => assertProductIdentity({ ...manifest, dshDesktopIdentity: configured }, development)).toThrow()
    }
    expect(() => assertProductIdentity({ ...manifest, build: { ...manifest.build, extraMetadata: {} } }, development)).toThrow()
  })

  it('requires stable portable artifacts and credential-free HTTPS update sources', () => {
    expect(artifactPrefix('sample-${os}-${arch}.${ext}', 'sample-windows-${arch}-setup.${ext}')).toBe('sample')
    for (const invalid of ['../sample-${os}-${arch}.${ext}', 'sample-${version}-${os}-${arch}.${ext}', 'sample.exe', 'nul-${os}-${arch}.${ext}']) {
      expect(() => artifactPrefix(invalid, 'sample-windows-${arch}-setup.${ext}')).toThrow()
    }
    expect(() => artifactPrefix('sample-${os}-${arch}.${ext}', 'other.exe')).toThrow()
    expect(() => assertUpdateSources([{ provider: 'generic', url: 'https://updates.example.org/latest/' }])).not.toThrow()
    expect(() => assertUpdateSources([])).toThrow()
    for (const url of ['http://updates.example.org/', 'file:///updates/', 'arbitrary', 'https://user:password@updates.example.org/', 'https://updates.example.org/?token=secret']) {
      expect(() => assertUpdateSources([{ provider: 'generic', url }])).toThrow()
    }
  })

  it('requires an existing wrapper with a real side-effect import of the core entry', async () => {
    expect(entryPaths("// index: resolve('src/main/shell/app.ts')").size).toBe(0)
    expect(entryPaths("const unused = { index: resolve('src/main/shell/app.ts') }; export default defineConfig({})").size).toBe(0)
    const root = await mkdtemp(path.join(tmpdir(), 'desktop-entry-'))
    try {
      await mkdir(path.join(root, 'product'))
      await writeFile(path.join(root, 'product/main.ts'), "import '../src/main/shell/app'\n")
      await expect(assertCoreEntry('product/main.ts', 'src/main/shell/app.ts', root)).resolves.toBeUndefined()
      await expect(assertCoreEntry('product/missing.ts', 'src/main/shell/app.ts', root)).rejects.toThrow()
      for (const source of ["// import '../src/main/shell/app'", "const entry = '../src/main/shell/app'", "import '../src/preload/app'", "export * from '../src/main/shell/app'"]) {
        await writeFile(path.join(root, 'product/main.ts'), source)
        await expect(assertCoreEntry('product/main.ts', 'src/main/shell/app.ts', root)).rejects.toThrow()
      }
      await expect(assertCoreEntry('../main.ts', 'src/main/shell/app.ts', root)).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('GitHub release contract', () => {
  it('keeps the package and lockfile versions aligned', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { version: string }
    const packageLock = JSON.parse(
      await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')
    ) as { version: string; packages: Record<string, { version?: string }> }

    expect(packageLock.version).toBe(packageJson.version)
    expect(packageLock.packages['']?.version).toBe(packageJson.version)
  })

  it('declares required DSH peer packages as production dependencies', async () => {
    const packageLock = JSON.parse(
      await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')
    ) as {
      packages: Record<string, { dev?: boolean; peer?: boolean }>
    }

    // A lock location is a path, so nested installs read as
    // `node_modules/<host>/node_modules/<name>`. Only the segment after the
    // last `node_modules/` names the package: without that, a third-party peer
    // that npm nested under a DSH package (rc.8 gives ui-trajectory its own
    // React 19) reads as a DSH package and trips this guard.
    const packageNameOf = (location: string): string =>
      location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length)

    const peerOnlyRuntimePackages = Object.entries(packageLock.packages)
      .filter(
        ([location, metadata]) =>
          packageNameOf(location).startsWith('@deepseek-ai/') &&
          metadata.peer === true &&
          metadata.dev !== true
      )
      .map(([location]) => packageNameOf(location))

    expect(peerOnlyRuntimePackages).toEqual([])
  })

  it('vendors upstream-new closure packages as file: production deps with no registry resolution', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> }
    const packageLockRaw = await readFile(
      path.join(projectRoot, 'package-lock.json'),
      'utf8'
    )
    const packageLock = JSON.parse(packageLockRaw) as {
      packages: Record<string, { resolved?: string; integrity?: string }>
    }

    // alpha.3 introduced these as transitive deps of shipped packages; they are
    // explicit production deps so the lockfile pins them like the rest of the
    // closure instead of letting a transitive range float.
    const promotedClosurePackages = [
      '@deepseek-ai/dsh-client-ui-schedule',
      '@deepseek-ai/dsh-deque',
      '@deepseek-ai/dsh-session-turn-outline',
      '@deepseek-ai/dsh-util-time',
      '@deepseek-ai/dsh-util-values'
    ]

    for (const packageName of promotedClosurePackages) {
      expect(packageJson.dependencies[packageName]).toBe(HARNESS_VERSION)
    }

    // Upstream publishes the official CI build to the registry, so every
    // `@deepseek-ai/dsh-*` dep is pinned to one exact version and every
    // resolution carries an integrity hash — `npm ci` stays reproducible
    // without vendoring tarballs into the repository.
    const harnessDeps = Object.entries(packageJson.dependencies).filter(
      ([name]) => name.startsWith('@deepseek-ai/dsh')
    )
    expect(harnessDeps.length).toBeGreaterThan(200)
    for (const [name, range] of harnessDeps) {
      expect(range, name).toBe(HARNESS_VERSION)
      const entry = packageLock.packages[`node_modules/${name}`]
      expect(entry?.resolved, name).toMatch(/^https?:\/\//)
      expect(entry?.integrity, name).toMatch(/^sha\d+-/)
    }

    // The vendored-tarball layout is gone; nothing may resolve from it.
    expect(packageLockRaw).not.toMatch(/file:packages\/harness-/)
  })

  it('keeps the official Harness closure at one version without promoting optional providers or test support', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> }
    const packageLock = JSON.parse(
      await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')
    ) as { packages: Record<string, { version?: string }> }

    for (const [location, metadata] of Object.entries(packageLock.packages)) {
      const name = location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length)
      if (/^@deepseek-ai\/dsh(?:-|$)/.test(name)) {
        expect(metadata.version, location).toBe(HARNESS_VERSION)
      }
    }

    const excludedHarnessPackages = [
      '@deepseek-ai/cordis-plugin-logger-console',
      '@deepseek-ai/dsh-agent-loop-testkit',
      '@deepseek-ai/dsh-client-test-runtime',
      '@deepseek-ai/dsh-client-web',
      // upstream 0.1.2-rc.1 moved this to packages/experimental/ (out of the
      // dsh family tarball set); desktop continues not to bundle it.
      '@deepseek-ai/dsh-code-runtime-python',
      '@deepseek-ai/dsh-e2b',
      '@deepseek-ai/dsh-fs-e2b',
      '@deepseek-ai/dsh-llm-mock-server',
      '@deepseek-ai/dsh-llm-replay',
      '@deepseek-ai/dsh-loader-smoke',
      '@deepseek-ai/dsh-lsp',
      '@deepseek-ai/dsh-lsp-stdio',
      '@deepseek-ai/dsh-sdk-client',
      // NOTE: @deepseek-ai/dsh-session-persistence-sqlite was removed upstream in
      // 0.1.2-alpha.3, so its exclusion assertion is gone. dsh-storage-sqlite is
      // likewise no longer in the closure but its guard is kept defensively.
      '@deepseek-ai/dsh-session-snapshot',
      '@deepseek-ai/dsh-storage-sqlite',
      '@deepseek-ai/dsh-subagent-acp',
      '@deepseek-ai/dsh-subagent-claude-code',
      '@deepseek-ai/dsh-subagent-codex',
      '@deepseek-ai/dsh-subagent-dsh-sdk',
      '@deepseek-ai/dsh-subprocess-e2b',
      '@deepseek-ai/dsh-tool-lsp',
      '@deepseek-ai/dsh-web-search-exa',
      '@deepseek-ai/dsh-web-search-perplexity'
    ]

    for (const packageName of excludedHarnessPackages) {
      expect(packageJson.dependencies[packageName]).toBeUndefined()
      expect(packageLock.packages[`node_modules/${packageName}`]).toBeUndefined()
    }
    // Official bundles own these, including retrieval and entry customization.
    // 0.2.2 no longer ships the dated deepseek-model-label-1017 web plugin.
    for (const packageName of [
      '@deepseek-ai/dsh-tool-terminal',
      '@deepseek-ai/dsh-tool-session-query',
      '@deepseek-ai/dsh-session-title-all-prompts-llm',
      '@deepseek-ai/dsh-web-deepseek-api',
      '@deepseek-ai/dsh-client-ui-entry-customization'
    ]) {
      expect(packageJson.dependencies[packageName]).toBeUndefined()
      expect(packageLock.packages[`node_modules/${packageName}`]).toBeDefined()
    }
    expect(packageLock.packages['node_modules/@anthropic-ai/claude-agent-sdk']).toBeUndefined()
    expect(packageLock.packages['node_modules/@openai/codex']).toBeUndefined()
  })

  it('uses stable platform-specific artifact names', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      build: {
        artifactName: string
        asar: boolean
        asarUnpack: string[]
        afterPack?: string
        extraResources: Array<{ from: string; to: string }>
        win: { target: Array<{ target: string; arch: string[] }>; requestedExecutionLevel?: string }
        nsis: { artifactName: string; include: string }
        portable?: unknown
      }
    }
    const prefix = artifactPrefix(packageJson.build.artifactName, packageJson.build.nsis.artifactName)
    if (!explicitProduct) expect(prefix).toBe('dsh-desktop')
    expect(packageJson.build.asar).toBe(true)
    // JavaScript stays in app.asar; only files the OS loads or executes unpack.
    expect(packageJson.build.asarUnpack).not.toContain('node_modules/**/*')
    expect(packageJson.build.asarUnpack).toEqual(expect.arrayContaining([
      '**/*.{node,dylib,dll,so,exe}',
      '**/spawn-helper',
      '**/@vscode/ripgrep-*/bin/rg',
      'node_modules/@deepseek-ai/libreoffice-kit-*/**/*'
    ]))
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/app-icon.png',
      to: 'icon.png'
    })
    for (const removed of [
      'build/harness-node-entry.mjs',
      'build/host-module-fallback.mjs',
      'build/windows-hidden-console.mjs',
      'build/windows-child-process-hide.mjs',
      'build/windows-hide-console-import.mjs'
    ]) {
      expect(packageJson.build.extraResources).not.toContainEqual(expect.objectContaining({ from: removed }))
    }
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/packaged-pnpm-invocation.mjs',
      to: 'packaged-pnpm-invocation.mjs'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/office-engine-resolution.mjs',
      to: 'office-engine-resolution.mjs'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/splash.html',
      to: 'splash.html'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/startup-whale.gif',
      to: 'startup-whale.gif'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/dsh-loader.gif',
      to: 'dsh-loader.gif'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/dsh-loader-dark.gif',
      to: 'dsh-loader-dark.gif'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/dsh-desktop.patch.yml',
      to: 'dsh-desktop.patch.yml'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/dsh-desktop-safe.patch.yml',
      to: 'dsh-desktop-safe.patch.yml'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/web-import.html',
      to: 'web-import.html'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'THIRD_PARTY_NOTICES.md',
      to: 'THIRD_PARTY_NOTICES.md'
    })
    if (!explicitProduct) expect(packageJson.build.nsis.artifactName).toBe(
      'dsh-desktop-windows-${arch}-setup.${ext}'
    )
    expect(packageJson.build.nsis.include).toBe('build/installer.nsh')
    expect(packageJson.build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }])
    expect(packageJson.build.win.requestedExecutionLevel).toBe('asInvoker')
    expect(packageJson.build.portable).toBeUndefined()
  })

  it('keeps update metadata on the latest channel for pre-release versions', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { build: { detectUpdateChannel?: boolean } }

    // A version like 0.8.0-rc.1 would otherwise make electron-builder write
    // rc-mac.yml / rc.yml instead of latest-mac.yml / latest.yml, which every
    // downstream release step expects by name.
    expect(packageJson.build.detectUpdateChannel).toBe(false)
  })

  it('publishes update metadata for installed desktop builds', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      dependencies: Record<string, string>
      build: {
        publish: Array<{ provider: string; url?: string; owner?: string; repo?: string }>
        win: { verifyUpdateCodeSignature: boolean; signtoolOptions: { publisherName: string } }
      }
    }
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(packageJson.dependencies['electron-updater']).toBeTruthy()
    assertUpdateSources(packageJson.build.publish)
    if (!explicitProduct) expect(packageJson.build.publish).toEqual([
      { provider: 'generic', url: 'https://dshdesktop.com/updates/latest/' }
    ])
    expect(packageJson.build.win.verifyUpdateCodeSignature).toBe(true)
    expect(packageJson.build.win.signtoolOptions.publisherName.trim()).not.toBe('')
    if (!explicitProduct) expect(packageJson.build.win.signtoolOptions.publisherName).toBe('Beijing Shuju Xiangsu Intelligence Technology Co., Ltd.')
    for (const asset of [
      'latest-mac-arm64.yml',
      'latest-mac-x64.yml',
      'latest-mac.yml',
      'latest.yml',
      'dsh-desktop-mac-${{ matrix.arch }}.zip.blockmap',
      'dsh-desktop-windows-x64-setup.exe.blockmap'
    ]) {
      expect(workflow).toContain(asset)
    }
    expect(workflow).toContain('merge-mac-update-metadata.mjs')
    expect(workflow).toContain('Verify release assets before publication')
    expect(workflow).toContain('verify-release-assets.mjs release-assets')
  })

  it('keeps builder jobs from attempting implicit tag publishing', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    for (const script of [
      'package:mac',
      'package:mac:arm64',
      'package:mac:x64',
      'package:win',
      'package:dev:mac:arm64',
      'package:dev:mac:x64',
      'package:dev:win'
    ]) {
      expect(packageJson.scripts[script]).toContain('--publish never')
    }
  })

  it('uses the staged-directory installer for both Windows builds and signed repackaging', async () => {
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
      build: { nsis: { allowToChangeInstallationDirectory: boolean } }
    }
    const workflow = await readFile(path.join(projectRoot, '.github', 'workflows', 'release.yml'), 'utf8')
    expect(packageJson.scripts['package:win']).toContain('electron-builder-windows.mjs')
    expect(packageJson.scripts['package:dev:win']).toContain('electron-builder-windows.mjs')
    expect(packageJson.build.nsis.allowToChangeInstallationDirectory).toBe(true)
    expect(workflow).toContain('node scripts/release/electron-builder-windows.mjs --win --x64 --publish never')
  })

  it('packages an isolated development channel from the current workspace', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string>; build: { artifactName: string; nsis: { artifactName: string } } }
    const developmentConfig = createRequire(import.meta.url)('../electron-builder.dev.cjs') as {
      appId: string
      productName: string
      directories: { output: string }
      extraMetadata: { dshDesktopChannel: string }
      artifactName: string
      nsis: { artifactName: string }
    }

    expect(packageJson.scripts['package:dev:dir']).toContain('npm run build')
    expect(packageJson.scripts['package:dev:dir']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:mac:arm64']).toContain('verify-target.mjs darwin arm64')
    expect(packageJson.scripts['package:dev:mac:arm64']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:mac:x64']).toContain('verify-target.mjs darwin x64')
    expect(packageJson.scripts['package:dev:mac:x64']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:win']).toContain('verify-target.mjs win32 x64')
    expect(packageJson.scripts['package:dev:win']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:win']).toContain('--publish never')
    assertProductIdentity(productManifest, developmentConfig)
    expect(developmentConfig.directories.output).toBe('dist-dev')
    expect(developmentConfig.extraMetadata.dshDesktopChannel).toBe('development')
    const devPrefix = artifactPrefix(developmentConfig.artifactName, developmentConfig.nsis.artifactName)
    expect(devPrefix).not.toBe(artifactPrefix(packageJson.build.artifactName, packageJson.build.nsis.artifactName))
    if (!explicitProduct) {
      expect(devPrefix).toBe('dsh-desktop-dev')
      expect(developmentConfig.nsis.artifactName).toBe('dsh-desktop-dev-windows-${arch}-setup.${ext}')
    }
  })

  it('builds the official package from the transplanted shell', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string>, build: { extraMetadata?: { main?: string } } }
    const officialVite = await readFile(path.join(projectRoot, 'electron.vite.config.ts'), 'utf8')

    expect(packageJson.scripts['build:shell']).toBeUndefined()
    expect(packageJson.scripts['package:shell:mac:arm64']).toBeUndefined()
    expect(packageJson.scripts.build).toContain('electron-vite build')
    const entries = entryPaths(officialVite)
    expect(entries.get('host')).toBe('src/host/index.ts')
    if (!explicitProduct) {
      expect(entries.get('index')).toBe('src/main/shell/app.ts')
      expect(entries.get('app')).toBe('src/preload/app.ts')
    }
    await assertCoreEntry(entries.get('index'), 'src/main/shell/app.ts')
    await assertCoreEntry(entries.get('app'), 'src/preload/app.ts')
    const core = await readFile(path.join(projectRoot, 'src/main/shell/app.ts'), 'utf8')
    for (const option of ['contextIsolation: true', 'nodeIntegration: false', 'sandbox: true', 'webSecurity: true']) expect(core).toContain(option)
    expect(officialVite).not.toContain('src/main/index.ts')
    expect(officialVite).not.toContain('src/preload/index.ts')
    expect(officialVite).not.toContain('electron.vite.shell.config.ts')
  })

  it('builds and publishes every supported platform', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain('runner: macos-15')
    expect(workflow).toContain('runner: macos-15-intel')
    expect(workflow).toContain('runs-on: windows-2022')
    expect(workflow).toContain('--publish never --config electron-builder.dev.cjs')
    expect(workflow).toContain('Smoke test packaged Windows Harness')
    expect(workflow).toContain('$sourceExecutable = Get-Item $env:SMOKE_EXE')
    expect(workflow).toContain("$isolatedApp = Join-Path $env:RUNNER_TEMP")
    expect(workflow).toContain('$executable = Join-Path $isolatedApp $sourceExecutable.Name')
    expect(workflow).toContain('-WorkingDirectory $isolatedApp')
    expect(workflow).toContain('Packaged koffi native binding failed (exit code $koffiExitCode).')
    expect(workflow).toContain("'dist-dev\\win-unpacked\\DSH Desktop Dev.exe'")
    expect(workflow).toContain('if (-not [string]::IsNullOrEmpty($log))')
    expect(workflow).toContain("dsh web: (http://127\\.0\\.0\\.1:\\d+/\\?token=[^\\s]+)")
    expect(workflow).toContain('-SessionVariable harnessSession')
    expect(workflow).toContain('-WebSession $harnessSession')
    expect(workflow).toContain('Packaged Windows Harness smoke test passed.')
    expect(workflow).toContain('$desktop.Kill($true)')
    expect(workflow).toContain('$desktop.WaitForExit(10000)')
    expect(workflow).toContain('node scripts/release/archive-windows-release.mjs "$env:ARCHIVE_DIST"')
    expect(workflow).toContain("&& 'dist' || 'dist-dev'")
    expect(workflow).not.toContain('tar -czf dist/win-unpacked.tar.gz')
    expect(workflow).toContain('payload = @{ args = @{ request = $request } }')
    expect(workflow).toContain("Invoke-HarnessRpc 'workspace/create'")
    expect(workflow).toContain("Invoke-HarnessRpc 'session/create'")
    expect(workflow).toContain('Harness process exited after workspace and session creation.')
    expect(workflow).toContain('version:')
    expect(workflow).not.toContain('signed_version:')
    expect(workflow).toContain('mode:')
    expect(workflow).toContain('--prerelease')
    expect(workflow).toContain('name: windows-x64-dev')
    expect(workflow).toContain('dist-dev/dsh-desktop-dev-windows-x64-setup.exe')
    expect(workflow).toContain('dsh-desktop-mac-${{ matrix.arch }}.dmg')
    expect(workflow).toContain('dsh-desktop-windows-x64-setup.exe')
    expect(
      workflow.match(
        /npm version --no-git-tag-version --allow-same-version "\$\{\{ github\.ref_name \}\}"/g
      )
    ).toHaveLength(3)
  })

  it('signs and notarizes both macOS architectures on tag releases', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    for (const secret of [
      'DESKTOP_CSC_LINK',
      'DESKTOP_CSC_KEY_PASSWORD',
      'DESKTOP_APPLE_API_KEY',
      'DESKTOP_APPLE_API_KEY_ID',
      'DESKTOP_APPLE_API_ISSUER',
      'DESKTOP_APPLE_TEAM_ID'
    ]) {
      expect(workflow).toContain(`secrets.${secret}`)
    }
    expect(workflow.match(/Prepare macOS signing keychain/g)).toHaveLength(1)
    expect(workflow.match(/xcrun stapler validate/g)).toHaveLength(2)
    expect(workflow.match(/xcrun notarytool submit/g)).toHaveLength(1)
    expect(workflow.match(/CSC_IDENTITY_AUTO_DISCOVERY: 'false'/g)).toHaveLength(1)
    expect(workflow).not.toContain("CSC_LINK: ''")
    const config = parse(workflow)
    expect(config.jobs.macos.strategy['fail-fast']).toBe(false)
    expect(config.jobs.macos.strategy.matrix.include).toEqual([
      { arch: 'arm64', label: 'Apple Silicon', runner: 'macos-15', 'app-directory': 'mac-arm64', artifact: 'macos-apple-silicon' },
      { arch: 'x64', label: 'Intel', runner: 'macos-15-intel', 'app-directory': 'mac', artifact: 'macos-intel' }
    ])
    expect(config.jobs.macos['runs-on']).toBe('${{ matrix.runner }}')
    for (const job of ['publish', 'publish-prerelease']) {
      expect(config.jobs[job].needs).toContain('macos')
      expect(config.jobs[job].if).toContain("needs.macos.result == 'success'")
    }
    expect(workflow).toMatch(
      /windows-x64:\r?\n\s+name: Windows x64\r?\n(?:[\s\S]*?)runs-on: windows-2022\r?\n\s+steps:/
    )
  })

  it('builds once before shared checks and each native packaging job', async () => {
    const workflow = parse(await readFile(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')) as {
      jobs: Record<string, { steps: Array<{ run?: string; uses?: string; with?: Record<string, unknown> }> }>
    }
    for (const name of ['macos', 'windows-x64']) {
      const steps = workflow.jobs[name]?.steps ?? []
      const buildIndex = steps.findIndex(step => step.run === 'npm run build')
      const testIndex = steps.findIndex(step => step.run?.startsWith('npx --no-install vitest run'))
      expect(buildIndex).toBeGreaterThanOrEqual(0)
      expect(testIndex).toBeGreaterThan(buildIndex)
      expect(steps.filter(step => step.run === 'npm run build')).toHaveLength(1)
      const packages = steps.filter(step => step.run?.includes('--publish never'))
      expect(packages).toHaveLength(2)
      for (const step of packages) {
        expect(step.run).toContain('verify-target.mjs')
        expect(step.run).not.toContain('npm run build')
      }
      for (const step of steps.filter(step => step.uses === 'actions/upload-artifact@v4' && step.with?.['if-no-files-found'] === 'error')) {
        expect(step.with?.['compression-level']).toBe(0)
      }
    }
  })

  it('signs Windows installers on the local UKey runner before publishing', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain('name: windows-x64-unsigned')
    expect(workflow).toContain('Sign Windows package locally with UKey')
    expect(workflow).toContain('runs-on: [self-hosted, macOS, ARM64]')
    expect(workflow).toContain('--storetype ETOKEN')
    expect(workflow).toContain('--storepass "file:$pin_file"')
    expect(workflow).toContain('--tsmode RFC3161')
    expect(workflow).toContain('secrets.DESKTOP_WINDOWS_SIGNING_PIN')
    expect(workflow).toContain(`printf '%s' "$WINDOWS_SIGNING_PIN" > "$pin_file"`)
    expect(workflow).toContain('unset WINDOWS_SIGNING_PIN')
    expect(workflow).not.toContain('security find-generic-password')
    expect(workflow).not.toContain('WINDOWS_SIGNING_KEYCHAIN_SERVICE')
    expect(workflow).toContain('finalize-windows-release.mjs')
    expect(workflow).toContain('sign-windows-unpacked.mjs')
    expect(workflow).toContain('win-unpacked.tar.gz')
    expect(workflow).toContain('--prepackaged')
    expect(workflow).toContain('set -euo pipefail')
    expect(workflow).not.toContain('Falling back to original installer')
    expect(workflow).not.toContain('Restoring original Windows installer')
    expect(workflow).toContain("if (Test-Path $packagedNode) { throw 'Standalone Windows node.exe must not be packaged.' }")
    expect(workflow).toContain('version="${PRERELEASE_TAG#v}"')
    expect(workflow).toContain('version="${SIGNED_VERSION#v}"')
    expect(workflow).not.toContain('version="${PRERELEASE_TAG:-${GITHUB_REF_NAME#v}}"')
    expect(workflow).toContain('pattern: macos-*')
    expect(workflow).toMatch(
      /publish:[\s\S]*?needs\.sign-windows\.result == 'success'[\s\S]*?- sign-windows/
    )
  })

  it('keeps Windows signing independent of macOS packaging and notarization', async () => {
    const { jobs } = parse(await readFile(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')) as {
      jobs: Record<string, { needs?: string | string[]; if?: string }>
    }
    expect(jobs['sign-windows']?.needs).toEqual(['validate-dispatch', 'windows-x64'])
    const ancestors = new Set<string>()
    const pending = ['sign-windows']
    while (pending.length > 0) {
      const name = pending.pop()
      if (!name || ancestors.has(name)) continue
      ancestors.add(name)
      expect(jobs[name]).toBeDefined()
      const needs = jobs[name]?.needs ?? []
      pending.push(...(Array.isArray(needs) ? needs : [needs]))
    }
    expect(ancestors.has('macos')).toBe(false)
    for (const name of ancestors) {
      expect(jobs[name]?.if ?? '').not.toContain('needs.macos')
    }
    for (const name of ['publish', 'publish-prerelease', 'publish-signed-test']) {
      expect(jobs[name]?.needs).toContain('macos')
      expect(jobs[name]?.needs).toContain('sign-windows')
    }
  })

  it('uses local npm downloads and bounds Node setup on the persistent UKey signer', async () => {
    const { jobs } = parse(await readFile(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')) as {
      jobs: Record<string, {
        'runs-on'?: string | string[]
        steps: Array<{ uses?: string; with?: { cache?: string }; 'timeout-minutes'?: number }>
      }>
    }
    const persistentJobs = Object.values(jobs).filter(job =>
      Array.isArray(job['runs-on']) && job['runs-on'].includes('self-hosted')
    )
    expect(persistentJobs).toHaveLength(1)
    for (const job of persistentJobs) {
      const setup = job.steps.find(step => step.uses?.startsWith('actions/setup-node@'))
      expect(setup).toBeDefined()
      expect(setup?.with?.cache).toBeUndefined()
      expect(setup?.['timeout-minutes']).toBe(5)
    }
    for (const name of ['macos', 'windows-x64']) {
      const setup = jobs[name]?.steps.find(step => step.uses?.startsWith('actions/setup-node@'))
      expect(setup?.with?.cache).toBe('npm')
    }
  })

  it('does not change Windows security settings during installation', async () => {
    const installer = await readFile(path.join(projectRoot, 'build', 'installer.nsh'), 'utf8')
    expect(installer).not.toMatch(/Add-MpPreference|HKLM|ExecShell\s+"runas"/)
    expect(installer).not.toMatch(/RequestExecutionLevel\s+highest/)
  })

  it('routes stable downloads through the website and previews through GitHub', async () => {
    const readmes = await Promise.all(
      ['README.md', 'README.zh.md', 'README.ja.md', 'README.ru.md', 'README.es.md', 'README.pt.md'].map((file) =>
        readFile(path.join(projectRoot, file), 'utf8')
      )
    )

    for (const readme of readmes) {
      expect(readme).toMatch(/https:\/\/(?:www\.)?dshdesktop\.com\/(?:#download|zh\/)/)
      expect(readme).not.toContain('| Platform | Package | Download |')
      expect(readme).not.toContain('| 平台 | 安装包 | 下载 |')
      expect(readme).not.toContain('Coming soon')
      expect(readme).not.toContain('即将发布')
      expect(readme).toContain('https://github.com/dataelement/dsh-desktop/releases')
      expect(readme).toContain('**Pre-release**')
      for (const asset of releaseAssets) {
        expect(readme).not.toContain(`releases/latest/download/${asset}`)
      }
    }
  })
})

describe('prerelease parity workflow', () => {
  const load = () =>
    readFile(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')

  it('uses a single version input for all dispatch modes', async () => {
    const yml = await load()
    expect(yml).toContain('version:')
    expect(yml).not.toContain('prerelease_tag:')
    expect(yml).not.toContain('windows_prerelease_tag')
    expect(yml).not.toContain('Publish validated Windows development pre-release')
  })

  it('gates signing and both publish jobs so prerelease and release never overlap', async () => {
    const yml = await load()
    const windowsIf = yml.slice(
      yml.indexOf('\n  windows-x64:'),
      yml.indexOf('runs-on: windows-2022')
    )
    const signWindows = yml.slice(
      yml.indexOf('\n  sign-windows:'),
      yml.indexOf('\n  publish:')
    )
    const publishJob = yml.slice(
      yml.indexOf('\n  publish:'),
      yml.indexOf('\n  publish-prerelease:')
    )
    const publishPrerelease = yml.slice(yml.indexOf('\n  publish-prerelease:'))

    expect(yml).toContain('publish-prerelease:')
    expect(yml).toContain('  - development')
    expect(yml).toContain('  - signed')
    expect(yml).toContain('  - prerelease')
    expect(yml).toContain('validate-dispatch:')
    expect(yml).toContain('requires a non-v semver version')
    expect(windowsIf).toContain("inputs.target == 'all' || inputs.target == 'windows'")
    expect(windowsIf).not.toContain('prerelease_tag')
    expect(signWindows).toContain("inputs.mode == 'signed'")
    expect(signWindows).toContain("inputs.mode == 'prerelease'")
    expect(publishJob).toContain("startsWith(github.ref, 'refs/tags/v')")
    expect(publishJob).toContain("inputs.version == ''")
    expect(publishPrerelease).toContain("inputs.mode == 'prerelease'")
    expect(publishPrerelease).toContain("inputs.target == 'all'")
    expect(publishPrerelease).toContain("inputs.version != ''")
    expect(
      yml.match(
        /npm version --no-git-tag-version --allow-same-version "\$\{\{ inputs\.version \}\}"/g
      )
    ).toHaveLength(6)
  })

  it('mirrors a prerelease to an isolated ModelScope directory', async () => {
    const yml = await load()
    expect(yml).toContain('releases/prerelease/')
  })

  it('parametrises the Windows smoke test executable', async () => {
    const yml = await load()
    expect(yml).toContain('SMOKE_EXE')
    expect(yml).toContain('SMOKE_USERDATA')
  })
})

describe('rollback catalog publication', () => {
  it('archives each release and rebuilds the version index', async () => {
    const yml = await readFile(
      path.join(projectRoot, '.github/workflows/release.yml'),
      'utf8'
    )
    expect(yml).toContain('releases/archive/')
    expect(yml).toContain('from append_version_index import append_version_index')
    expect(yml).toContain('releases/versions.json')
  })
})

describe('AI-organized GitHub release body', () => {
  const load = () =>
    readFile(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8')

  it('drops --generate-notes for the real release and uses a notes file', async () => {
    const yml = await load()
    const publishJob = yml.slice(
      yml.indexOf('\n  publish:'),
      yml.indexOf('\n  publish-prerelease:')
    )
    expect(publishJob).not.toContain('--generate-notes')
    expect(publishJob).toContain('--notes-file')
    expect(publishJob).toContain('github_release_notes.py')
    expect(publishJob).toContain('github-release-notes.md')
  })

  it('uses an available Copilot model and keeps generation failures diagnosable', async () => {
    const yml = await load()
    expect(yml).toContain('RELEASE_NOTES_MODEL: gpt-6-luna')
    expect(yml).not.toContain('gpt-5.6-sol')
    // Three detailed notifications plus the separate, fail-closed popup summary.
    expect(yml.match(/--model "\$RELEASE_NOTES_MODEL"/g)).toHaveLength(4)
    expect(yml.match(/2>"\$error_log"/g)).toHaveLength(3)
    expect(yml).not.toContain('2>/dev/null')
    expect(yml.match(/sed -n '1,20\{s\/\^\/copilot: \/;p;\}'/g)).toHaveLength(3)
  })

  it('still lets the prerelease job use --generate-notes', async () => {
    const yml = await load()
    const preJob = yml.slice(yml.indexOf('\n  publish-prerelease:'))
    expect(preJob).toContain('--generate-notes')
  })

  it('ships a RELEASE_NOTES.md style reference', async () => {
    const notes = await readFile(path.join(projectRoot, 'RELEASE_NOTES.md'), 'utf8')
    expect(notes.startsWith('# ')).toBe(true)
  })
})
