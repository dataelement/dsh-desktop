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

  it('pairs the DSH logo with the original Harness wordmark in the expanded sidebar', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-sidebar'),
      'utf8'
    )

    expect(patch).toContain('DshDesktopLogo')
    expect(patch).toContain('DshDesktopBrand')
    expect(patch).toContain('BrandWordmark')
    expect(patch).toContain('/dsh-desktop-logo-light.png')
    expect(patch).toContain('/dsh-desktop-logo-dark.png')
    expect(patch).toContain('brandWordmark')
    expect(patch).toContain('gap:4px')
    expect(patch).toContain('transform:translateX(-24px)')
    expect(patch).not.toContain('children: "DSH Desktop"')
    expect(patch).toContain('height = 20')
    expect(patch).toContain('brandMark{width:30px;height:26px')
    expect(patch).toContain('height: 20')
    expect(patch).toContain('.hHd-Xa_brand:hover')
    expect(patch).toContain('padding-top:32px')
    expect(patch).toContain('navigator.userAgent.includes("Macintosh")')
    expect(patch).toContain('.hHd-Xa_root.hHd-Xa_collapsed{padding:46px 22px 6px}')
    expect(patch).toContain('body[data-ds-dark-theme] .dshDesktopLogoLight')
    expect(patch).toContain('body[data-ds-dark-theme] .dshDesktopLogoDark')
  })

  it('uses an 80px macOS rail that clears the traffic lights', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-layout'),
      'utf8'
    )

    expect(patch).toContain('navigator.userAgent.includes("Macintosh") ? 80 : 56')
    expect(patch).toContain('sidebar === 0 ? COLLAPSED_SIDEBAR_WIDTH')
  })

  it('provides a sidebar phone entry that follows expanded and connected state', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-sidebar'),
      'utf8'
    )
    const preload = await readFile(path.join(projectRoot, 'src', 'preload', 'index.ts'), 'utf8')
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(patch).toContain('data-dsh-sidebar-root')
    expect(patch).toContain('data-dsh-sidebar-wide')
    expect(patch).toContain('data-dsh-sidebar-footer')
    expect(patch).toContain('data-dsh-sidebar-settings')
    expect(preload).toContain("document.querySelector<HTMLElement>('[data-dsh-sidebar-settings]')")
    expect(preload).toContain('settingsArea.appendChild(button)')
    expect(preload).not.toContain('footer.appendChild(button)')
    expect(preload).toContain("button.hidden = !wide && !phoneConnected")
    expect(preload).toContain("button.classList.toggle('is-connected', phoneConnected)")
    expect(preload).toContain("ipcRenderer.invoke('mobile:open-pairing')")
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
    expect(installer).toContain('"src": "/dsh-desktop-logo.png"')
  })
})
