import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = join(import.meta.dirname, '..')

describe('main window title', () => {
  it('uses the desktop window chrome and does not set an empty title', async () => {
    const source = await readFile(join(sourceRoot, 'src/main/shell/app.ts'), 'utf8')
    const chrome = await readFile(join(sourceRoot, 'src/main/shell/window-chrome.ts'), 'utf8')

    expect(source).toContain('...desktopWindowChrome(process.platform, nativeTheme.shouldUseDarkColors)')
    expect(source).toContain('title: app.getName()')
    expect(source).toContain('window.setTitle(app.getName())')
    expect(source).toContain('window.setMenuBarVisibility(false)')
    expect(source).toContain('buildWindowsApplicationMenu(')
    expect(source).toContain('windowsChromeBackground(isDark)')
    expect(source).not.toContain('window.setMenu(null)')
    expect(source).not.toContain('Menu.setApplicationMenu(null)')
    expect(source).not.toMatch(/title:\s*(['"])\1/)
    expect(chrome).toContain("titleBarStyle: 'hiddenInset'")
    expect(chrome).toContain("titleBarStyle: 'hidden'")
  })

  it('does not give the startup page an empty document title', async () => {
    const splash = await readFile(join(sourceRoot, 'build/splash.html'), 'utf8')

    expect(splash).toContain('<title>DSH Desktop</title>')
  })
})
