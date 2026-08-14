import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {
  it('keeps macOS chrome dark while tracking the page theme for branding', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).toContain("frame: process.platform !== 'darwin'")
    expect(main).toContain("if (process.platform === 'darwin') nativeTheme.themeSource = 'dark'")
    expect(main).toContain("window.setBackgroundColor('#141416')")
    expect(main).toContain('window.setWindowButtonVisibility(true)')
    expect(main).toContain('window.setWindowButtonPosition({ x: 12, y: 9 })')
    expect(main).toContain('body[data-ds-dark-theme]')
    expect(main).not.toContain('new MutationObserver')
    expect(main).not.toContain('detectDarkPage')
    expect(main).toContain('background: #141416')
  })

  it('pairs the DSH logo with the original Harness wordmark in the expanded sidebar', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.6.patch'),
      'utf8'
    )

    expect(patch).toContain('DshDesktopLogo')
    expect(patch).toContain('DshDesktopBrand')
    expect(patch).toContain('BrandWordmark')
    expect(patch).toContain('/dsh-desktop-logo-light.png')
    expect(patch).toContain('/dsh-desktop-logo-dark.png')
    expect(patch).toContain('brandWordmark')
    expect(patch).toContain('transform:translateX(-24px)')
    expect(patch).not.toContain('children: "DSH Desktop"')
    expect(patch).toContain('height = 20')
    expect(patch).toContain('height: 18')
    expect(patch).toContain('.hHd-Xa_brand:hover')
    expect(patch).toContain('padding-top:22px')
    expect(patch).toContain('body[data-ds-dark-theme] .dshDesktopLogoLight')
    expect(patch).toContain('body[data-ds-dark-theme] .dshDesktopLogoDark')
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
