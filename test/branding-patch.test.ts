import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {
  it('matches the native window surface to the initial Harness theme', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).toContain("frame: process.platform !== 'darwin'")
    expect(main).toContain("document.body.hasAttribute('data-ds-dark-theme')")
    expect(main).toContain("window.setBackgroundColor(isDark ? '#141416' : '#ffffff')")
    expect(main).toContain('window.setWindowButtonVisibility(true)')
    expect(main).toContain('window.setWindowButtonPosition({ x: 12, y: 9 })')
    expect(main).not.toContain('dsh-desktop-titlebar-style')
    expect(main).not.toContain('--dsh-desktop-titlebar-height')
    expect(main).not.toContain('body { box-sizing: border-box; padding-top:')
    expect(main).toContain("dragRegion.id = 'dsh-desktop-drag-region'")
    expect(main).toContain("dragRegion.style.setProperty('-webkit-app-region', 'drag')")
    expect(main).toContain("left: '80px'")
    expect(main).toContain("right: '220px'")
    expect(main).toContain("height: '24px'")
  })

  it('fills the stock brand slots instead of replacing Sidebar structure', async () => {
    const [patch, client, composition, installedSidebar] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-sidebar'), 'utf8'),
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8'),
      readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8'),
      readFile(
        path.join(
          projectRoot,
          'node_modules',
          '@deepseek-ai',
          'dsh-client-ui-sidebar',
          'lib',
          'client.js'
        ),
        'utf8'
      )
    ])

    expect(client).toContain("ctx.slots.inject('sidebar.brand.mark'")
    expect(client).toContain("ctx.slots.inject('sidebar.brand.name'")
    expect(client).toContain("ctx.slots.inject('conversation.hero.brand.mark'")
    expect(client).toContain("React.createElement(BrandWordmark, { includeMark: false })")
    expect(client).toContain('/dsh-desktop-logo-light.png')
    expect(client).toContain('/dsh-desktop-logo-dark.png')
    expect(client).not.toContain('translateX')
    const normalizedComposition = composition.replaceAll('\r\n', '\n')
    expect(normalizedComposition).toMatch(/- id: ui-brand-official\n  disabled: true/u)
    expect(normalizedComposition).toMatch(
      /- id: dsh-desktop-client-ui\n      name: dsh-desktop-client-ui/u
    )

    expect(patch).not.toContain('DshDesktopLogo')
    expect(patch).not.toContain('DshDesktopBrand')
    expect(patch).not.toContain('brandWordmark')
    expect(patch).toContain('[data-dsh-sidebar-root]')
    expect(patch).toContain('padding-top:32px')
    expect(patch).toContain('navigator.userAgent.includes("Macintosh")')
    expect(patch).toContain('padding:46px 22px 6px')
    expect(installedSidebar).toContain('renderSlot("sidebar.brand.mark"')
    expect(installedSidebar).toContain('renderSlot("sidebar.brand.name"')
    expect(installedSidebar).not.toContain('DshDesktopBrand')
    expect(installedSidebar).not.toContain('brandWordmark')
  })

  it('uses an 80px macOS rail that clears the traffic lights', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-layout'),
      'utf8'
    )

    expect(patch).toContain('navigator.userAgent.includes("Macintosh") ? 80 : 56')
    expect(patch).toContain('sidebar === 0 ? COLLAPSED_SIDEBAR_WIDTH')
  })

  it('provides the phone entry through the public footer slot and a narrow bridge', async () => {
    const [patch, preload, main, client] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-sidebar'), 'utf8'),
      readFile(path.join(projectRoot, 'src', 'preload', 'index.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
    ])

    expect(patch).toContain('data-dsh-sidebar-root')
    expect(patch).toContain('data-dsh-sidebar-wide')
    expect(patch).not.toContain('data-dsh-sidebar-footer')
    expect(patch).not.toContain('data-dsh-sidebar-settings')
    expect(client).toContain("ctx.slots.inject('sidebar.footer.action'")
    expect(client).toContain("id: 'dsh-desktop-mobile'")
    expect(client).toContain('order: 20')
    expect(client).toContain('if (!wide && !connected) return null')
    expect(preload).toContain('openMobilePairing: (): Promise<void>')
    expect(preload).toContain('getMobileStatus: (): Promise<{ connected: boolean }>')
    expect(preload).toContain('onMobileStatusChanged: (listener: (connected: boolean) => void)')
    expect(preload).not.toContain('settingsArea.appendChild')
    expect(main).toContain("ipcMain.handle('mobile:open-pairing'")
    expect(main).toContain("ipcMain.handle('mobile:status'")
  })

  it('installs the source logo into the Harness static frontend', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }
    const installer = await readFile(
      path.join(projectRoot, 'scripts', 'install-brand-assets.mjs'),
      'utf8'
    )

    expect(packageJson.scripts.postinstall).toContain('node scripts/install-brand-assets.mjs')
    expect(installer).toContain("'build', 'icon.png'")
    expect(installer).toContain("'dsh-desktop-logo.png'")
    expect(installer).toContain("'build', 'logo-light.png'")
    expect(installer).toContain("'dsh-desktop-logo-light.png'")
    expect(installer).toContain("'build', 'logo-dark.png'")
    expect(installer).toContain("'dsh-desktop-logo-dark.png'")
    expect(installer).toContain('<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />')
    // The manifest is edited as JSON now rather than as a pinned multi-line
    // string: 0.1.2-alpha.1 added "purpose": "any" to the icon entry, which no
    // fixed text could survive, and key order is not a contract.
    expect(installer).toContain("target.src = '/dsh-desktop-logo.png'")
    expect(installer).toContain("target.sizes = '1254x1254'")
  })
})
