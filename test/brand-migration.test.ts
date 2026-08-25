import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

async function projectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

describe('Sherlock client brand migration', () => {
  it('ships Sherlock application and installer display names', async () => {
    const packageJson = JSON.parse(await projectFile('package.json')) as {
      description: string
      scripts: Record<string, string>
      build: {
        productName: string
        artifactName: string
        nsis: { artifactName: string }
      }
    }
    const developmentConfig = await projectFile('electron-builder.dev.cjs')

    expect(packageJson.description).toBe('Sherlock local-first desktop knowledge assistant.')
    expect(packageJson.build.productName).toBe('Sherlock')
    expect(packageJson.build.artifactName).toBe('sherlock-${os}-${arch}.${ext}')
    expect(packageJson.build.nsis.artifactName).toBe('sherlock-windows-${arch}-setup.${ext}')
    expect(packageJson.scripts['package:mac:arm64']).toContain('dist/mac-arm64/Sherlock.app')
    expect(packageJson.scripts['package:mac:x64']).toContain('dist/mac/Sherlock.app')
    expect(developmentConfig).toContain("productName: 'Sherlock Dev'")
    expect(developmentConfig).toContain("artifactName: 'sherlock-dev-windows-${arch}-setup.${ext}'")
  })

  it('uses Sherlock across Electron-owned user interfaces', async () => {
    const files = await Promise.all([
      'src/main/index.ts',
      'src/main/runtime/harness-runtime.ts',
      'src/main/runtime/profile-plugin-command.ts',
      'src/main/plugin-recovery-view.ts',
      'src/preload/index.ts',
      'src/preload/update-view.ts',
      'src/preload/windows-titlebar.ts',
      'src/main/mobile/lan-mobile-pages.ts',
      'build/splash.html',
      'build/plugin-recovery.html'
    ].map(projectFile))
    const ownedSurfaces = files.join('\n')

    expect(ownedSurfaces).toContain('Sherlock')
    expect(ownedSurfaces).not.toMatch(/DSH Desktop|DSH Mobile|DeepSeek Harness/)
    expect(ownedSurfaces).not.toMatch(/compatible DSH plugin|兼容的 DSH 插件/)
  })

  it('brands the embedded web shell and patched visible copy as Sherlock', async () => {
    const [index, manifest, installer, settings, pluginSettings, presets, directoryPicker, workspace] =
      await Promise.all([
        projectFile('node_modules/@deepseek-ai/dsh-web-frontend/dist/index.html'),
        projectFile('node_modules/@deepseek-ai/dsh-web-frontend/dist/manifest.webmanifest'),
        projectFile('packages/dsh-desktop-market-installer/client.js'),
        projectFile('node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js'),
        projectFile('node_modules/@deepseek-ai/dsh-client-ui-settings-plugins/lib/client.js'),
        projectFile('node_modules/@deepseek-ai/dsh-client-ui-agent-preset/lib/client.js'),
        projectFile('node_modules/@deepseek-ai/dsh-client-ui-directory-picker-native/lib/client.js'),
        projectFile('node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js')
      ])

    expect(index).toContain('<title>Sherlock</title>')
    expect(manifest).toContain('"name": "Sherlock"')
    expect(manifest).toContain('"short_name": "Sherlock"')
    expect(installer).not.toContain('DSH Desktop')
    expect(installer).toContain('inside Sherlock')

    expect(settings).not.toContain('displayName: "DeepSeek"')
    expect(settings).not.toMatch(/DSH will|DSH 会/)
    expect(settings).not.toMatch(/DeepSeek Harness|DSH plugin ecosystem|DSH 插件生态/)
    expect(settings).toMatch(/Sherlock will|Sherlock 会/)
    expect(settings).toContain('useState)("openai")')
    expect(pluginSettings).not.toMatch(/The DeepSeek search provider|DeepSeek 搜索提供方/)
    expect(pluginSettings).toMatch(/Optional web search provider|可选网页搜索提供方/)

    expect(presets).not.toMatch(/Created with DSH|another DSH version|由 DSH|另一个 DSH 版本/)
    expect(presets).toContain('Created with Sherlock')
    expect(presets).toContain('children: "Sherlock"')
    expect(directoryPicker).not.toContain('DSH Desktop directory picker')
    expect(workspace).not.toContain('acknowledged by DSH Desktop')
  })

  it('keeps compatibility identifiers while hiding them from product copy', async () => {
    const [main, appIdentity, runtime, packageJson] = await Promise.all([
      projectFile('src/main/index.ts'),
      projectFile('src/main/app-identity.ts'),
      projectFile('src/main/runtime/harness-runtime.ts'),
      projectFile('package.json')
    ])

    expect(main).toContain('resolveDesktopIdentity(')
    expect(appIdentity).toContain("channel === 'notarized'")
    expect(appIdentity).toContain("'sherlock-desktop'")
    expect(appIdentity).toContain("'dsh-desktop'")
    expect(runtime).toContain('DSH_BUNDLED_SKILL_DIR')
    expect(packageJson).toContain('"@deepseek-ai/dsh"')
  })
})
