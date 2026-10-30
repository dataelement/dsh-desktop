import type { BrowserWindow } from 'electron'

/** Match Harness's native sidebar material and avoid transparent restore flashes. */
export function applyMacosWindowBackdrop(
  window: Pick<BrowserWindow, 'isDestroyed' | 'isMinimized' | 'isVisible' | 'setVibrancy' | 'setBackgroundColor'>,
  isDark: boolean
): void {
  if (window.isDestroyed()) return
  if (window.isMinimized() || !window.isVisible()) {
    window.setVibrancy(null)
    window.setBackgroundColor(isDark ? '#1b1b1c' : '#f9fafb')
  } else {
    window.setVibrancy('sidebar')
    window.setBackgroundColor('#00000000')
  }
}
