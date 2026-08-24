import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

const releaseAssets = [
  'sherlock-mac-arm64.dmg',
  'sherlock-mac-x64.dmg',
  'sherlock-windows-x64-setup.exe'
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

    const peerOnlyRuntimePackages = Object.entries(packageLock.packages)
      .filter(
        ([location, metadata]) =>
          location.startsWith('node_modules/@deepseek-ai/') &&
          metadata.peer === true &&
          metadata.dev !== true
      )
      .map(([location]) => location.replace('node_modules/', ''))

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

    expect(packageJson.build.artifactName).toBe('sherlock-${os}-${arch}.${ext}')
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
      from: 'build/dsh-desktop.patch.yml',
      to: 'dsh-desktop.patch.yml'
    })
    expect(packageJson.build.nsis.artifactName).toBe(
      'sherlock-windows-${arch}-setup.${ext}'
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
    expect(splash).toContain('Starting Sherlock')
    expect(splash).toContain('src="dsh-loader.gif"')
    expect(splash).not.toContain('class="track"')
    expect(patch).toMatch(/id: directory-picker\r?\n  disabled: true/)
    expect(patch).not.toContain("name: '@deepseek-ai/dsh-host-directory-picker-native'")
    expect(patch).toContain("name: '@deepseek-ai/dsh-client-ui-directory-picker-native'")
  })

  it('routes manual restarts through the active plugin recovery flow', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).toContain("if (failureRecoveryVisible) resolvePluginRecoveryAction('restart')")
    expect(main).toMatch(/case 'restart-harness':\s+await restartHarness\(\)/)
    expect(main).toContain('click: () => void restartHarness().catch(showUnexpectedError)')
    expect(main).toContain("} else if (action === 'restart') {")
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
      { provider: 'generic', url: 'https://updates.dshdesktop.com/latest/' }
    ])
    expect(packageJson.build.win.verifyUpdateCodeSignature).toBe(false)
    for (const asset of [
      'latest-mac-arm64.yml',
      'latest-mac-x64.yml',
      'latest-mac.yml',
      'latest.yml',
      'sherlock-mac-arm64.zip.blockmap',
      'sherlock-mac-x64.zip.blockmap',
      'sherlock-windows-x64-setup.exe.blockmap'
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
      'package:win'
    ]) {
      expect(packageJson.scripts[script]).toContain('--publish never')
    }
  })

  it('signs and verifies the DMG in the local formal build entrypoint', async () => {
    const buildAndRun = await readFile(
      path.join(projectRoot, 'script', 'build_and_run.sh'),
      'utf8'
    )

    expect(buildAndRun).toContain("security find-identity -v -p codesigning")
    expect(buildAndRun).toContain('Sherlock Desktop Update Signing')
    expect(buildAndRun).toContain('--timestamp=none')
    expect(buildAndRun).toContain('codesign --verify --verbose=2')
    expect(buildAndRun).toContain('dist/sherlock-mac-arm64.dmg')
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
    expect(packageJson.scripts['package:dev:win']).toContain('verify-target.mjs win32 x64')
    expect(packageJson.scripts['package:dev:win']).toContain('electron-builder.dev.cjs')
    expect(packageJson.scripts['package:dev:win']).toContain('--publish never')
    expect(developmentConfig).toContain("appId: 'io.dsh.desktop.dev'")
    expect(developmentConfig).toContain("productName: 'Sherlock Dev'")
    expect(developmentConfig).toContain("output: 'dist-dev'")
    expect(developmentConfig).toContain("dshDesktopChannel: 'development'")
    expect(developmentConfig).toContain(
      "artifactName: 'sherlock-dev-windows-${arch}-setup.${ext}'"
    )
    expect(main).toContain('resolveDesktopIdentity(')
    expect(main).toContain("app.commandLine.getSwitchValue('sherlock-user-data-dir')")
    expect(main).toContain("app.setPath('userData', identity.userData)")
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
    expect(workflow).toContain("$executable = 'dist-dev\\win-unpacked\\Sherlock Dev.exe'")
    expect(workflow).toContain('Packaged Windows Harness smoke test passed.')
    expect(workflow).toContain("Invoke-HarnessRpc 'workspace.create'")
    expect(workflow).toContain("Invoke-HarnessRpc 'session.create'")
    expect(workflow).toContain('Harness process exited after workspace and session creation.')
    expect(workflow).toContain('windows_prerelease_tag:')
    expect(workflow).toContain('Publish validated Windows development pre-release')
    expect(workflow).toContain('gh release create $env:PRERELEASE_TAG')
    expect(workflow).toContain('--prerelease')
    expect(workflow).toContain('name: windows-x64-dev')
    expect(workflow).toContain('dist-dev/sherlock-dev-windows-x64-setup.exe')
    for (const asset of releaseAssets) expect(workflow).toContain(asset)
    expect(
      workflow.match(
        /npm version --no-git-tag-version --allow-same-version "\$\{\{ github\.ref_name \}\}"/g
      )
    ).toHaveLength(3)
  })

  it('signs both macOS architectures without Apple services and atomically publishes Cloudflare', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    for (const secret of [
      'SHERLOCK_MACOS_CSC_LINK',
      'SHERLOCK_MACOS_CSC_KEY_PASSWORD',
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID'
    ]) {
      expect(workflow).toContain(`secrets.${secret}`)
    }
    expect(workflow.match(/Prepare macOS signing keychain/g)).toHaveLength(2)
    expect(workflow.match(/CSC_NAME: \$\{\{ steps\.signing_keychain\.outputs\.identity \}\}/g)).toHaveLength(2)
    expect(workflow.match(/codesign --verify --deep --strict/g)).toHaveLength(2)
    expect(workflow.match(/codesign --keychain .*--timestamp=none --force/g)).toHaveLength(2)
    expect(workflow.match(/CSC_IDENTITY_AUTO_DISCOVERY: 'false'/g)).toHaveLength(2)
    expect(workflow).toContain('npm run release:cloudflare')
    expect(workflow).toContain('--bucket sherlock-releases')
    expect(workflow).toContain('https://updates.dshdesktop.com/latest/latest-mac.yml')
    expect(workflow).toContain('Mirror release assets to ModelScope')
    expect(workflow).not.toContain('notarytool')
    expect(workflow).not.toContain('stapler')
    expect(workflow).not.toContain('spctl --assess')
    expect(workflow).not.toContain('DESKTOP_APPLE_')
    expect(workflow).not.toContain('Developer ID Application')
    expect(workflow).not.toContain("CSC_LINK: ''")
    expect(workflow).toMatch(
      /macos-apple-silicon:\r?\n    name: macOS Apple Silicon\r?\n    runs-on: macos-15\r?\n    steps:/
    )
    expect(workflow).toMatch(
      /macos-intel:\r?\n    name: macOS Intel\r?\n    if: [^\r\n]+\r?\n    runs-on: macos-15-intel\r?\n    steps:/
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
