import type { BrowserWindow } from 'electron'

type BackdropWindow = Pick<BrowserWindow, 'isDestroyed' | 'isMinimized' | 'isVisible' | 'setVibrancy' | 'setBackgroundColor'>
const resolvedThemes = new WeakMap<BackdropWindow, boolean>()

/** Both palettes reveal native sidebar material, with a solid fallback while hidden. */
export function applyMacosWindowBackdrop(window: BackdropWindow, isDark?: boolean): void {
  if (window.isDestroyed()) return
  const dark = isDark ?? resolvedThemes.get(window) ?? false
  resolvedThemes.set(window, dark)
  if (window.isVisible() && !window.isMinimized()) {
    window.setVibrancy('sidebar')
    window.setBackgroundColor('#00000000')
  } else {
    window.setVibrancy(null)
    window.setBackgroundColor(dark ? '#1b1b1c' : '#f9fafb')
  }
}
