import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {
  it('replaces both sidebar wordmark states with the DSH Desktop logo', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'patches', '@deepseek-ai+dsh-client-ui-sidebar+0.1.0-rc.6.patch'),
      'utf8'
    )

    expect(patch).toContain('DshDesktopLogo')
    expect(patch).toContain('/dsh-desktop-logo.png')
    expect(patch).toContain('collapsed: true')
    expect(patch).toContain('dsh-desktop-logo-knockout')
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
  })
})
