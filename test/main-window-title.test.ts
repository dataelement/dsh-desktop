import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function windowSource(): Promise<string> {
  const main = await readFile('src/main/index.ts', 'utf8')
  const start = main.indexOf('function createWindow(): BrowserWindow {')
  expect(start).toBeGreaterThanOrEqual(0)
  return main.slice(start, main.indexOf('\nasync function openHarness(', start))
}

// createWindow lives in the application entry point, which starts Electron on import.
describe('main window title', () => {
  it('uses the configured app name before any page loads', async () => {
    const source = await windowSource()

    expect(source).toContain('title: app.getName()')
    expect(source).not.toMatch(/title:\s*(['"])\1/)
  })

  it('keeps the app name when renderer pages update their title', async () => {
    const source = await windowSource()

    expect(source).toMatch(
      /window\.on\('page-title-updated', \(event\) => \{\s*event\.preventDefault\(\)\s*window\.setTitle\(app\.getName\(\)\)\s*\}\)/
    )
    expect(source).not.toMatch(/\.setTitle\((['"])\1\)/)
  })

  it('retains hidden native captions on macOS and Windows', async () => {
    const source = await windowSource()

    expect(source).toMatch(/process\.platform === 'darwin' \? \{\s*titleBarStyle: 'hiddenInset'/)
    expect(source).toMatch(/isWindows\s*\? \{\s*titleBarStyle: 'hidden'/)
    expect(source).toContain('titleBarOverlay: windowsTitleBarOverlay(')
  })

  it('does not give the startup page an empty document title', async () => {
    const splash = await readFile('build/splash.html', 'utf8')

    expect(splash).toContain('<title>DSH Desktop</title>')
  })
})
