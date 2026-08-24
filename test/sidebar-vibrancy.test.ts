import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(projectRoot, relativePath), 'utf8')
}

describe('Sherlock macOS sidebar vibrancy', () => {
  it('creates a native macOS sidebar material while preserving solid fallback windows', async () => {
    const main = await readProjectFile('src/main/index.ts')

    expect(main).toContain("const isMacOS = process.platform === 'darwin'")
    expect(main).toContain("vibrancy: 'menu' as const")
    expect(main).toContain("visualEffectState: 'active' as const")
    expect(main).toContain("backgroundColor: '#00000000'")
    expect(main).toContain("window.setBackgroundColor('#00000000')")
    expect(main).toContain("window.setVibrancy('menu')")
    expect(main).not.toContain("nativeTheme.themeSource = isDark ? 'dark' : 'light'")
    expect(main).toContain('startHarnessThemePreferenceSync()')
    expect(main).toContain('nativeTheme.themeSource = preference')
    expect(main).toContain(
      "process.platform === 'win32' || process.platform === 'darwin'"
    )
    expect(main).toContain("isDark ? '#141416' : '#ffffff'")
  })

  it('keeps macOS native material synchronized after live theme changes', async () => {
    const preload = await readProjectFile('src/preload/index.ts')
    const nativeThemeSync = await readProjectFile('src/preload/windows-titlebar.ts')

    expect(preload).toContain("process.platform === 'darwin'")
    expect(preload).toContain('mountNativeThemeSync({ document, ipcRenderer })')
    expect(nativeThemeSync).toContain('export function mountNativeThemeSync')
    expect(nativeThemeSync).toContain(
      "attributeFilter: ['data-ds-dark-theme']"
    )
    expect(nativeThemeSync).toContain(
      "window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change'"
    )
  })

  it('makes only the macOS sidebar window layer transparent', async () => {
    const layoutClient = await readProjectFile(
      'node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js'
    )
    const layoutPatch = await readProjectFile(
      'patches/@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch'
    )

    for (const source of [layoutClient, layoutPatch]) {
      expect(source).toContain('navigator.userAgent.includes("Macintosh")')
      expect(source).toContain('html,body,#root{background-color:transparent!important}')
      expect(source).toContain('.pI_x6G_frame,.pI_x6G_sidebarCol{background:transparent}')
      expect(source).toContain('.pI_x6G_sidebarCol{border-right:0}')
      expect(source).toContain(
        '.pI_x6G_centerCol,.pI_x6G_detailsCol{background:var(--dsw-alias-bg-base)}'
      )
    }
  })

  it('uses a white translucent tint in light mode and a dark tint in dark mode', async () => {
    const sidebarClient = await readProjectFile(
      'node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js'
    )
    const sidebarPatch = await readProjectFile(
      'patches/@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.7.patch'
    )

    for (const source of [sidebarClient, sidebarPatch]) {
      expect(source).toContain('background:var(--dsw-specific-sidebar-fill)')
      expect(source).toContain(
        '.hHd-Xa_root{background:rgba(255,255,255,.62)}body[data-ds-dark-theme] .hHd-Xa_root{background:rgba(18,18,20,.46)}'
      )
    }
  })

  it('removes the session-list fade that becomes a visible bar over vibrancy', async () => {
    const workspaceClient = await readProjectFile(
      'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js'
    )
    const workspacePatch = await readProjectFile(
      'patches/@deepseek-ai+dsh-client-ui-workspace+0.1.0-rc.7.patch'
    )

    for (const source of [workspaceClient, workspacePatch]) {
      expect(source).toContain('.qDHVXG_fade{display:none}')
    }
  })
})
