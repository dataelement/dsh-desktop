import { pathToFileURL } from 'node:url'

export interface NavigationTarget {
  isDestroyed(): boolean
  loadURL(url: string): Promise<void>
}

export interface ShellNavigationTarget extends NavigationTarget {
  webContents: { navigationHistory: { clear(): void } }
}

export function isCancelledNavigation(error: unknown): boolean {
  return error instanceof Error && 'code' in error &&
    (error.code === 'ERR_ABORTED' || error.code === -3)
}

/**
 * Navigate without changing Back/Forward history. Ordinary application/browser
 * navigation, including future side-button navigation, should keep this behavior.
 * A failed load must never start a second load on a closing or superseded window.
 */
export async function navigateDesktopWindow(
  target: NavigationTarget,
  url: string,
  cancelled: () => boolean
): Promise<boolean> {
  if (cancelled() || target.isDestroyed()) return false
  try {
    await target.loadURL(url)
  } catch (error) {
    if (cancelled() || target.isDestroyed() || isCancelledNavigation(error)) return false
    throw error
  }
  return !cancelled() && !target.isDestroyed()
}

/**
 * Replace a shell lifecycle surface, rather than adding a user navigation step.
 * Splash/import/recovery and the Harness handoff share one BrowserWindow. A
 * native Back command can otherwise restore an obsolete static startup page;
 * that page cannot re-run the main-process startup sequence (issue #612).
 *
 * Clearing history is deliberately opt-in at these lifecycle call sites. It
 * removes every preceding entry, so do not use this helper for ordinary pages
 * whose Back/Forward history must remain available. Routing/history entries
 * created by the loaded application afterward are untouched, and no mouse or
 * keyboard events are intercepted here.
 */
export async function replaceDesktopWindowPage(
  target: ShellNavigationTarget,
  url: string,
  cancelled: () => boolean
): Promise<boolean> {
  if (!await navigateDesktopWindow(target, url, cancelled)) return false
  // Recheck after awaiting the navigation helper: a newer navigation or shutdown
  // may have taken ownership before this continuation runs. Never clear its history.
  if (cancelled() || target.isDestroyed()) return false
  target.webContents.navigationHistory.clear()
  return true
}

export function desktopFileUrl(filePath: string, query: Record<string, string> = {}): string {
  const url = pathToFileURL(filePath)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return url.href
}
