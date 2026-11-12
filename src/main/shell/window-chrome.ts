import { usesDesktopCaption, WINDOWS_TITLEBAR_HEIGHT } from '../../shared/desktop-menu'

/** Native caption buttons drawn over the page on Windows and Linux. */
export interface WindowsTitleBarOverlay {
  color: string
  symbolColor: string
  height: number
}

/** Native window chrome. macOS draws the traffic lights inside the sidebar row. */
export interface DesktopWindowChrome {
  titleBarStyle?: 'hiddenInset' | 'hidden'
  titleBarOverlay?: WindowsTitleBarOverlay
  trafficLightPosition?: { x: number; y: number }
  vibrancy?: 'sidebar'
  visualEffectState?: 'active'
  backgroundColor?: string
  autoHideMenuBar?: boolean
}

/**
 * Transparent overlay so Harness paints the caption. The symbol color follows
 * the theme the main process knows before the page reports its own.
 */
export function windowsTitleBarOverlay(isDark: boolean): WindowsTitleBarOverlay {
  return {
    color: '#00000000',
    symbolColor: isDark ? '#f3f4f6' : '#202124',
    height: WINDOWS_TITLEBAR_HEIGHT
  }
}

/** Window background once the page reports its theme. The first frame uses a paper color. */
export function windowsChromeBackground(isDark: boolean): string {
  return isDark ? '#141416' : '#ffffff'
}

/**
 * macOS keeps the close buttons and the sidebar collapse control on one row.
 * Windows and Linux hide the native frame so the page caption (应用 / 编辑) is the menu.
 * A normal title bar would stack Electron's File menu above that caption.
 */
export function desktopWindowChrome(platform: string, isDark = false): DesktopWindowChrome {
  if (platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 18 },
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      backgroundColor: '#00000000'
    }
  }
  if (usesDesktopCaption(platform)) {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: windowsTitleBarOverlay(isDark),
      autoHideMenuBar: true,
      backgroundColor: isDark ? '#141416' : '#f8f8f6'
    }
  }
  return {}
}
