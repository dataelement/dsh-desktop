interface RaiseableWindow {
  isDestroyed(): boolean
  isMinimized(): boolean
  restore(): void
  show(): void
  showInactive(): void
  focus(): void
}

export type WindowFocusIntent = 'automatic' | 'user'

/**
 * Surface a window without letting an automatic macOS transition activate the
 * application over whichever app the user is currently using.
 *
 * BrowserWindow.show() itself focuses the window, so omitting a later focus()
 * call is not sufficient. showInactive() is the macOS path that preserves the
 * current foreground application. Explicit user actions retain the ordinary
 * restore/show/focus behavior, as do all non-macOS platforms.
 */
export function raiseWindowWithoutStealingFocus(
  window: RaiseableWindow,
  platform: NodeJS.Platform,
  isAppActive: () => boolean,
  intent: WindowFocusIntent = 'automatic'
): void {
  if (window.isDestroyed()) return
  if (platform === 'darwin' && intent === 'automatic' && !isAppActive()) {
    window.showInactive()
    return
  }
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}
