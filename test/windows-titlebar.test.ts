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

  it('accepts only the fixed menu command allowlist', () => {
    expect(desktopMenuCommands).toContain('connect-phone')
    expect(desktopMenuCommands).toContain('safe-mode')
    expect(desktopMenuCommands).toContain('check-for-updates')
    expect(desktopMenuCommands).toContain('toggle-fullscreen')
    expect(isDesktopMenuCommand('copy')).toBe(true)
    expect(isDesktopMenuCommand('run-shell-command')).toBe(false)
    expect(isDesktopMenuCommand({ command: 'quit' })).toBe(false)
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
})
