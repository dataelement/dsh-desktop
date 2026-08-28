import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

const releaseAssets = [
  'dsh-desktop-mac-arm64.dmg',
  'dsh-desktop-mac-x64.dmg',
  'dsh-desktop-windows-x64-setup.exe'
]

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

  it('uses stable platform-specific artifact names', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      build: {
        artifactName: string
        extraResources: Array<{ from: string; to: string }>
        win: { target: Array<{ target: string; arch: string[] }> }
        nsis: { artifactName: string; include: string }
        portable?: unknown
      }
    }

    expect(packageJson.build.artifactName).toBe('dsh-desktop-${os}-${arch}.${ext}')
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/app-icon.png',
      to: 'icon.png'
    })
    expect(packageJson.build.extraResources).toContainEqual({
      from: 'build/splash.html',
      to: 'splash.html'
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
    expect(packageJson.build.nsis.artifactName).toBe(
      'dsh-desktop-windows-${arch}-setup.${ext}'
    )
    expect(packageJson.build.nsis.include).toBe('build/installer.nsh')
    expect(packageJson.build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }])
    expect(packageJson.build.portable).toBeUndefined()
  })

  it('turns a selected Windows drive root into an application directory', async () => {
    const installer = await readFile(
      path.join(projectRoot, 'build', 'installer.nsh'),
      'utf8'
    )

    expect(installer).toContain('!define MUI_PAGE_CUSTOMFUNCTION_SHOW DshDirectoryPageShow')
    expect(installer).toContain('${NSD_OnChange} $DshDirectoryEdit DshDirectoryChanged')
    expect(installer).toContain('StrCpy $3 "$0\\${APP_FILENAME}"')
    expect(installer).toContain('StrCpy $3 "$0${APP_FILENAME}"')
    expect(installer).toContain('${NSD_SetText} $DshDirectoryEdit $3')
  })

  it('shows a packaged startup surface and pins the Electron directory picker surface', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')
    const splash = await readFile(path.join(projectRoot, 'build', 'splash.html'), 'utf8')
    const patch = await readFile(
      path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'),
      'utf8'
    )

    expect(main).toContain("desktopResourcePath('splash.html')")
    expect(main).toContain('await showSplash()')
    expect(main).toContain("query: { theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' }")
    expect(main).toContain('nativeTheme.themeSource = harnessThemePreference()')
    expect(splash).toContain('Starting DSH Desktop')
    expect(splash).toContain('src="dsh-loader.gif"')
    expect(splash).toContain('src="dsh-loader-dark.gif"')
    expect(splash).toContain("document.documentElement.dataset.theme = splashTheme === 'dark'")
    expect(splash).toContain(":root[data-theme='dark']")
    expect(splash).toContain('brightness(2.4) saturate(0.72)')
    expect(splash).not.toContain('filter: invert(1)')
    expect(splash).not.toContain('class="track"')
    expect(splash).toContain('position: fixed;')
    expect(splash).toContain('html[data-platform="windows"] main { padding-top: 70px; }')
    expect(patch).not.toMatch(/id:\s*directory-picker/)
    expect(patch).not.toContain("name: '@deepseek-ai/dsh-host-directory-picker-native'")
    expect(patch).not.toContain("name: '@deepseek-ai/dsh-client-ui-directory-picker-native'")
  })

  it('routes manual restarts through the active plugin recovery flow', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).toContain("if (failureRecoveryVisible) resolvePluginRecoveryAction('restart')")
    expect(main).toMatch(/case 'restart-harness':\s+await restartHarness\(\)/)
    expect(main).toContain('click: () => void restartHarness().catch(showUnexpectedError)')
    expect(main).toContain("} else if (action === 'restart') {")
  })

  it('replays frontend plugin failures that arrive during an active recovery', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).toContain("resolvePluginRecoveryAction('refresh')")
    expect(main).toContain('if (applyPendingFrontendEvidence()) continue')
    expect(main).toMatch(
      /if \(failureRecoveryVisible\) \{\s+queuePendingFrontendPluginRecovery\(message\)/
    )
    expect(main).toContain('queueMicrotask(() => {')
    expect(main).toContain('logs: [...rendererPluginFailureLogs]')
  })

  it('publishes update metadata for installed desktop builds', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      dependencies: Record<string, string>
      build: {
        publish: Array<{ provider: string; url?: string; owner?: string; repo?: string }>
        win: { verifyUpdateCodeSignature: boolean }
      }
    }
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(packageJson.dependencies['electron-updater']).toBeTruthy()
    expect(packageJson.build.publish).toEqual([
      { provider: 'generic', url: 'https://dshdesktop.com/updates/latest/' }
    ])
    expect(packageJson.build.win.verifyUpdateCodeSignature).toBe(false)
    for (const asset of [
      'latest-mac-arm64.yml',
      'latest-mac-x64.yml',
      'latest-mac.yml',
      'latest.yml',
      'dsh-desktop-mac-arm64.zip.blockmap',
      'dsh-desktop-mac-x64.zip.blockmap',
      'dsh-desktop-windows-x64-setup.exe.blockmap'
    ]) {
      expect(workflow).toContain(asset)
    }
    expect(workflow).toContain('merge-mac-update-metadata.mjs')
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

  it('packages an isolated development channel from the current workspace', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }
    const developmentConfig = await readFile(
      path.join(projectRoot, 'electron-builder.dev.cjs'),
      'utf8'
    )
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(packageJson.scripts['package:dev:dir']).toContain('npm run build')
    expect(packageJson.scripts['package:dev:dir']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:mac:arm64']).toContain('verify-target.mjs darwin arm64')
    expect(packageJson.scripts['package:dev:mac:arm64']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:mac:x64']).toContain('verify-target.mjs darwin x64')
    expect(packageJson.scripts['package:dev:mac:x64']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:win']).toContain('verify-target.mjs win32 x64')
    expect(packageJson.scripts['package:dev:win']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:win']).toContain('--publish never')
    expect(developmentConfig).toContain("appId: 'io.dsh.desktop.dev'")
    expect(developmentConfig).toContain("productName: 'DSH Desktop Dev'")
    expect(developmentConfig).toContain("output: 'dist-dev'")
    expect(developmentConfig).toContain("dshDesktopChannel: 'development'")
    expect(developmentConfig).toContain(
      "artifactName: 'dsh-desktop-dev-${os}-${arch}.${ext}'"
    )
    expect(developmentConfig).toContain(
      "artifactName: 'dsh-desktop-dev-windows-${arch}-setup.${ext}'"
    )
    expect(main).toContain("app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop-dev'))")
    expect(main).toContain("app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop'))")
    expect(main).toContain('if (!developmentBuild)')
  })

  it('builds and publishes every supported platform', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain('runs-on: macos-15')
    expect(workflow).toContain('runs-on: macos-15-intel')
    expect(workflow).toContain('runs-on: windows-2022')
    expect(workflow).toContain('npm run package:dev:win')
    expect(workflow).toContain('Smoke test packaged Windows Harness')
    expect(workflow).toContain("$executable = 'dist-dev\\win-unpacked\\DSH Desktop Dev.exe'")
    expect(workflow).toContain('if (-not [string]::IsNullOrEmpty($log))')
    expect(workflow).toContain("dsh web: (http://127\\.0\\.0\\.1:\\d+/\\?token=[^\\s]+)")
    expect(workflow).toContain('-SessionVariable harnessSession')
    expect(workflow).toContain('-WebSession $harnessSession')
    expect(workflow).toContain('Packaged Windows Harness smoke test passed.')
    expect(workflow).toContain("Invoke-HarnessRpc 'workspace.create'")
    expect(workflow).toContain("Invoke-HarnessRpc 'session.create'")
    expect(workflow).toContain('Harness process exited after workspace and session creation.')
    expect(workflow).toContain('windows_prerelease_tag:')
    expect(workflow).toContain('Publish validated Windows development pre-release')
    expect(workflow).toContain('gh release create $env:PRERELEASE_TAG')
    expect(workflow).toContain('--prerelease')
    expect(workflow).toContain('name: windows-x64-dev')
    expect(workflow).toContain('dist-dev/dsh-desktop-dev-windows-x64-setup.exe')
    for (const asset of releaseAssets) expect(workflow).toContain(asset)
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
    expect(workflow.match(/Prepare macOS signing keychain/g)).toHaveLength(2)
    expect(workflow.match(/xcrun stapler validate/g)).toHaveLength(4)
    expect(workflow.match(/xcrun notarytool submit/g)).toHaveLength(2)
    expect(workflow.match(/CSC_IDENTITY_AUTO_DISCOVERY: 'false'/g)).toHaveLength(2)
    expect(workflow).not.toContain("CSC_LINK: ''")
    expect(workflow).toMatch(
      /macos-apple-silicon:\r?\n\s+name: macOS Apple Silicon\r?\n(?:[\s\S]*?)runs-on: macos-15\r?\n\s+steps:/
    )
    expect(workflow).toMatch(
      /macos-intel:\r?\n\s+name: macOS Intel\r?\n(?:[\s\S]*?)runs-on: macos-15-intel\r?\n\s+steps:/
    )
    expect(workflow).toMatch(
      /windows-x64:\r?\n\s+name: Windows x64\r?\n(?:[\s\S]*?)runs-on: windows-2022\r?\n\s+steps:/
    )
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
    expect(workflow).toContain('version="${GITHUB_REF_NAME#v}"')
    expect(workflow).toContain('pattern: macos-*')
    expect(workflow).toMatch(
      /publish:[\s\S]*?needs\.sign-windows\.result == 'success'[\s\S]*?- sign-windows/
    )
  })

  it('routes the published download through the official website', async () => {
    const readmes = await Promise.all(
      ['README.md', 'README.zh.md'].map((file) =>
        readFile(path.join(projectRoot, file), 'utf8')
      )
    )

    for (const readme of readmes) {
      expect(readme).toContain('https://www.dshdesktop.com/#download')
      expect(readme).not.toContain('| Platform | Package | Download |')
      expect(readme).not.toContain('| 平台 | 安装包 | 下载 |')
      expect(readme).not.toContain('Coming soon')
      expect(readme).not.toContain('即将发布')
      expect(readme).not.toContain('github.com/dataelement/dsh-desktop/releases')
      for (const asset of releaseAssets) {
        expect(readme).not.toContain(`releases/latest/download/${asset}`)
      }
    }
  })
})
