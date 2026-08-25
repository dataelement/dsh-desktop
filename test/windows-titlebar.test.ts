import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  WINDOWS_TITLEBAR_HEIGHT,
  desktopMenuCommands,
  formatZoomPercentage,
  isDesktopMenuCommand
} from '../src/shared/desktop-menu'
import {
  WINDOWS_CAPTION_CONTROLS_WIDTH,
  WINDOWS_MENU_BUTTON_WIDTH,
  WINDOWS_MENU_PANEL_WIDTH,
  windowsMenuViewBounds
} from '../src/main/windows-menu-view'

describe('Windows titlebar menu', () => {
  it('uses a Windows-only overlay while preserving the macOS frame behavior', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(main).toContain("const isWindows = process.platform === 'win32'")
    expect(main).toContain("frame: process.platform !== 'darwin'")
    expect(main).toContain("titleBarStyle: 'hidden' as const")
    expect(main).toContain('titleBarOverlay: windowsTitleBarOverlay')
    expect(main).toContain('autoHideMenuBar: true')
    expect(main).toContain('window.setMenuBarVisibility(false)')
    expect(main).toContain('Menu.setApplicationMenu(Menu.buildFromTemplate(template))')
  })

  it('keeps the entire Windows app full-height without a visible titlebar band', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    const preload = await readFile('src/preload/windows-titlebar.ts', 'utf8')

    expect(WINDOWS_TITLEBAR_HEIGHT).toBe(36)
    expect(main).toContain("color: '#00000000'")
    expect(preload).not.toContain(`padding-top: \${WINDOWS_TITLEBAR_HEIGHT}px !important`)
    expect(preload).toContain('padding-top: 0 !important')
    expect(preload).toContain('[data-dsh-sidebar-root][data-dsh-sidebar-wide="true"]')
    expect(preload).toContain('padding-top: 6px !important')
    expect(preload).toContain('trackSidebarLayout(document)')
    expect(preload).toContain("document.documentElement.style.setProperty(SIDEBAR_WIDTH_PROPERTY")
    expect(preload).toContain("dragRegion.id = DRAG_REGION_ID")
    expect(preload).toContain('-webkit-app-region: drag')
    expect(preload).toContain('body.dsh-desktop-windows-titlebar-layout > #root')
    expect(preload).toContain('left: 0')
    expect(preload).toContain('pointer-events: none')
    expect(preload).toContain('body.dsh-desktop-windows-titlebar-layout button')
    expect(preload).toContain('-webkit-app-region: no-drag !important')
    expect(preload).toContain("document.documentElement.style.setProperty(SIDEBAR_WIDTH_PROPERTY, '0px')")
  })

  it('accepts only the fixed menu command allowlist', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(desktopMenuCommands).toContain('connect-phone')
    expect(desktopMenuCommands).toContain('safe-mode')
    expect(await readFile('src/preload/windows-menu.ts', 'utf8')).toContain(
      "label: zh ? '以安全模式重启…' : 'Restart as Safe Mode…'"
    )
    expect(desktopMenuCommands).toContain('check-for-updates')
    expect(desktopMenuCommands).toContain('toggle-fullscreen')
    expect(isDesktopMenuCommand('copy')).toBe(true)
    expect(isDesktopMenuCommand('run-shell-command')).toBe(false)
    expect(isDesktopMenuCommand({ command: 'quit' })).toBe(false)
    expect(main).toContain("ipcMain.handle('desktop-menu:execute'")
    expect(main).toContain("ipcMain.handle('desktop-menu:get-zoom-factor'")
    expect(main).toContain('assertTrustedDesktopMenuEvent(event)')
    expect(main).toContain('event.sender === windowsMenuView.webContents')
    expect(main).toContain('if (!isDesktopMenuCommand(command))')
  })

  it('hosts the menu in a fixed-zoom child view instead of counter-scaling Harness content', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    const layoutPreload = await readFile('src/preload/windows-titlebar.ts', 'utf8')
    const menuPreload = await readFile('src/preload/windows-menu.ts', 'utf8')
    const viteConfig = await readFile('electron.vite.config.ts', 'utf8')

    expect(formatZoomPercentage(1)).toBe('100%')
    expect(formatZoomPercentage(Math.sqrt(1.2))).toBe('110%')
    expect(formatZoomPercentage(1 / Math.sqrt(1.2))).toBe('91%')
    expect(main).toContain('contents.getZoomFactor()')
    expect(main).toContain('new WebContentsView')
    expect(main).toContain('window.contentView.addChildView(menuView)')
    expect(main).toContain('menuView.webContents.setZoomFactor(1)')
    expect(main).toContain("preload: join(import.meta.dirname, '../preload/windows-menu.cjs')")
    expect(menuPreload).toContain("ipcRenderer.invoke('desktop-menu:get-zoom-factor')")
    expect(menuPreload).toContain('formatZoomPercentage(zoomFactor)')
    expect(layoutPreload).not.toContain('INVERSE_ZOOM_PROPERTY')
    expect(layoutPreload).not.toContain('menuButton')
    expect(viteConfig).toContain("'windows-menu': resolve('src/preload/windows-menu.ts')")
  })

  it('keeps the closed menu button aligned beside native caption controls at every page zoom', () => {
    expect(WINDOWS_CAPTION_CONTROLS_WIDTH).toBe(140)
    expect(WINDOWS_MENU_BUTTON_WIDTH).toBe(44)
    expect(WINDOWS_MENU_PANEL_WIDTH).toBe(304)

    const closedAt100Percent = windowsMenuViewBounds({ width: 1380, height: 900 }, false)
    const closedAt69Percent = windowsMenuViewBounds({ width: 1380, height: 900 }, false)
    expect(closedAt100Percent).toEqual({ x: 1196, y: 0, width: 44, height: 36 })
    expect(closedAt69Percent).toEqual(closedAt100Percent)

    expect(windowsMenuViewBounds({ width: 1380, height: 900 }, true)).toEqual({
      x: 936,
      y: 0,
      width: 304,
      height: 760
    })
    expect(windowsMenuViewBounds({ width: 900, height: 640 }, false, true)).toEqual({
      x: 856,
      y: 0,
      width: 44,
      height: 36
    })
  })

  it('shows the bundled Harness version and offers an update check from About', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(main).toContain('bundledHarnessVersion(app.getAppPath())')
    expect(main).toContain('if (result.response === 0) await checkForUpdates(true)')
    expect(main).toContain('void showAbout(mainWindow).catch(showUnexpectedError)')
  })

  it('synchronizes the native controls with Harness light and dark themes', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    const preload = await readFile('src/preload/windows-titlebar.ts', 'utf8')

    expect(main).toContain('window.setTitleBarOverlay(windowsTitleBarOverlay(isDark))')
    expect(main).toContain("ipcMain.handle('desktop-titlebar:set-theme'")
    expect(main).toContain("windowsMenuView.webContents.send('desktop-titlebar:theme-changed', isDark)")
    expect(preload).toContain("attributeFilter: ['data-ds-dark-theme', 'class', 'style']")
    expect(preload).toContain("ipcRenderer.invoke('desktop-titlebar:set-theme', isDark)")
  })
})
