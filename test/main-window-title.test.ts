import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('main window title', () => {
  it('uses the desktop window chrome and does not set an empty title', async () => {
    const source = await readFile('src/main/shell/app.ts', 'utf8')
    const chrome = await readFile('src/main/shell/window-chrome.ts', 'utf8')

    expect(source).toContain('...desktopWindowChrome(process.platform)')
    expect(source).not.toMatch(/title:\s*(['"])\1/)
    expect(chrome).toContain("titleBarStyle: 'hiddenInset'")
  })

  it('does not give the startup page an empty document title', async () => {
    const splash = await readFile('build/splash.html', 'utf8')

    expect(splash).toContain('<title>DSH Desktop</title>')
  })
})
