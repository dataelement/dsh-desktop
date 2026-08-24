import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('Sherlock sidebar branding', () => {
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
    expect(main).toContain("right: 'max(220px, var(--dsh-sidebar-width, 0px))'")
    expect(main).toContain("height: '24px'")
  })

  it('uses the supplied Sherlock vector wordmark in the expanded sidebar', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.7.patch'),
      'utf8'
    )

    expect(patch).toContain('SherlockLogo')
    expect(patch).toContain('/sherlock-logo.svg')
    expect(patch).toContain('-webkit-mask:')
    expect(patch).toContain('width:120px;height:17px')
    expect(patch).toContain('"aria-label": "Sherlock"')
    expect(patch).not.toContain('DshDesktopLogo')
    expect(patch).not.toContain('/dsh-desktop-logo-light.png')
    expect(patch).not.toContain('/dsh-desktop-logo-dark.png')
    expect(patch).not.toContain('children: "DSH Desktop"')
    expect(patch).toContain('.hHd-Xa_brand:hover')
    expect(patch).toContain('padding-top:32px')
    expect(patch).toContain('navigator.userAgent.includes("Macintosh")')
    expect(patch).toContain('.hHd-Xa_root.hHd-Xa_collapsed{padding:46px 22px 6px}')
  })

  it('keeps the Dock icon artwork within the standard macOS visual bounds', async () => {
    const { default: sharp } = await import('sharp')
    const { info } = await sharp(path.join(projectRoot, 'build', 'app-icon.png'))
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer({ resolveWithObject: true })

    expect(info.width).toBe(824)
    expect(info.height).toBe(824)
  })

  it('shows the new truth-seeking headline without the whale mark', async () => {
    const client = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-conversation',
        'lib',
        'client.js'
      ),
      'utf8'
    )
    const heroStart = client.indexOf('function HeroShell({ t, children })')
    const heroEnd = client.indexOf('//#endregion', heroStart)
    const hero = client.slice(heroStart, heroEnd)

    expect(client).toContain('"hero.headline": "迷雾之中，洞见真相"')
    expect(client).toContain('"hero.headline": "Through the Mist, See the Truth"')
    expect(hero).not.toContain('FishLogo')
    expect(hero).toContain('children: t("hero.preview")')
  })

  it('uses an 80px macOS rail that clears the traffic lights', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch'),
      'utf8'
    )

    expect(patch).toContain('navigator.userAgent.includes("Macintosh") ? 80 : 56')
    expect(patch).toContain('sidebar === 0 ? COLLAPSED_SIDEBAR_WIDTH')
  })

  it('does not expose or initialize the retired phone pairing feature', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.7.patch'),
      'utf8'
    )
    const preload = await readFile(path.join(projectRoot, 'src', 'preload', 'index.ts'), 'utf8')
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(patch).toContain('data-dsh-sidebar-root')
    expect(patch).toContain('data-dsh-sidebar-wide')
    expect(patch).not.toContain('data-dsh-sidebar-footer')
    expect(preload).not.toContain('dsh-desktop-mobile-button')
    expect(preload).not.toContain("ipcRenderer.invoke('mobile:")
    expect(main).not.toContain('LanMobileBridge')
    expect(main).not.toContain('showMobilePairing')
    expect(main).not.toContain("ipcMain.handle('mobile:")
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
    expect(installer).toContain("'sherlock-icon.png'")
    expect(installer).toContain("'build', 'sherlock-logo.svg'")
    expect(installer).toContain("'sherlock-logo.svg'")
    expect(installer).toContain('<link rel="icon" type="image/png" href="/sherlock-icon.png" />')
    expect(installer).toContain('"src": "/sherlock-icon.png"')
    expect(installer).toContain('<title>Sherlock</title>')
    expect(installer).toContain('"name": "Sherlock"')

    const logo = await readFile(path.join(projectRoot, 'build', 'sherlock-logo.svg'), 'utf8')
    expect(logo).toContain('viewBox="275 334 1317 180"')
    expect(logo).not.toContain('transform="matrix(')
  })
})
