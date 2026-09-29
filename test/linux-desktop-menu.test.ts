import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Windows reaches the Harness commands from its custom titlebar menu
 * (`src/preload/windows-menu.ts`, mounted only on win32) and macOS from the
 * application menu. Linux cannot keep a GTK menu while hiding the row of
 * top-level menus it draws, so Linux installs no menu at all and those commands
 * are registered in the settings panel header instead.
 *
 * `installMenu` builds the template inline in `src/main/index.ts`, which pulls
 * in Electron and cannot be imported by a unit test, so this is a source
 * contract. The absence of the menu bar and the presence of the settings entry
 * were both read back from a running app; see `docs/linux-port.md`.
 */
const projectRoot = path.resolve(import.meta.dirname, '..')

/** Line wrapping is not part of any contract here. */
async function readSource(...segments: string[]): Promise<string> {
  const source = await readFile(path.join(projectRoot, ...segments), 'utf8')
  return source.replace(/\s+/g, ' ')
}

async function readMainProcessSource(): Promise<string> {
  return readSource('src', 'main', 'index.ts')
}

async function readDesktopClientSource(): Promise<string> {
  return readSource('packages', 'dsh-desktop-client-ui', 'client.js')
}

describe('Linux desktop menu', () => {
  it('installs no application menu, so the window keeps no menu-bar row', async () => {
    const source = await readMainProcessSource()

    expect(source).toContain("if (process.platform === 'linux') { Menu.setApplicationMenu(null) return }")
    // The Linux-only entries it used to carry are gone rather than left as dead
    // definitions behind the early return.
    expect(source).not.toContain('nativeMenuOnly')
    expect(source).not.toContain('exportSessionEntry')
  })

  it('offers every Harness command from the settings panel header', async () => {
    const source = await readDesktopClientSource()

    expect(source).toContain("ctx.slots.inject('settings.action'")
    for (const command of [
      'connect-phone',
      'restart-harness',
      'safe-mode',
      'show-harness-log',
      'check-for-updates',
      'export-session',
      'about'
    ]) {
      expect(source, command).toContain(`'${command}'`)
    }
  })

  it('runs them through the shared command path rather than a second implementation', async () => {
    const [main, plugin] = await Promise.all([readMainProcessSource(), readDesktopClientSource()])

    expect(plugin).toContain('window.dshDesktop.runMenuCommand(command)')
    expect(main).toContain("ipcMain.handle('desktop-menu:execute'")
    expect(main).toContain('executeDesktopMenuCommand(command)')
  })

  it('hands the command to main, which validates it against the shared list', async () => {
    const [main, preload] = await Promise.all([
      readMainProcessSource(),
      readSource('src', 'preload', 'index.ts')
    ])

    // Type-only in the preload: a runtime import here would split the preload
    // into a chunk a sandboxed preload cannot load (see
    // test/preload-sandbox-imports.test.ts), so validation lives in main.
    expect(preload).toContain("import type { DesktopMenuCommand } from '../shared/desktop-menu'")
    expect(preload).toContain("ipcRenderer.invoke('desktop-menu:execute', command)")
    expect(main).toContain('if (!isDesktopMenuCommand(command)) {')
  })

  it('labels the menu in Chinese and English', async () => {
    const source = await readDesktopClientSource()

    expect(source).toContain("trigger: '应用菜单'")
    expect(source).toContain("trigger: 'Application menu'")
    expect(source).toContain("exportSession: '导出 Session 日志…'")
    expect(source).toContain("exportSession: 'Export Session Log…'")
  })

  it('keeps About reachable on macOS as well', async () => {
    const source = await readMainProcessSource()

    // The darwin app menu is untouched; losing its About would be a regression
    // on the reference platform.
    expect(source).toContain('submenu: [ aboutEntry, {')
  })
})
