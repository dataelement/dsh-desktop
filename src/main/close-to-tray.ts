/**
 * Whether closing the main window should hide it instead of ending the app.
 *
 * Hiding is only safe while a tray icon exists to bring the window back, so the
 * caller reports whether one was created. A desktop without a usable
 * StatusNotifier host keeps its native close behavior instead of leaving a
 * running process whose window can never be reached again.
 */
export function shouldKeepRunningInBackground(
  platform: NodeJS.Platform,
  quitting: boolean,
  hasTrayIcon: boolean
): boolean {
  if (quitting || !hasTrayIcon) return false
  return platform === 'win32' || platform === 'linux'
}
