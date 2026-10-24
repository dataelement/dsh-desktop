import { pathToFileURL } from 'node:url'

export interface NavigationTarget {
  isDestroyed(): boolean
  loadURL(url: string): Promise<void>
}

export function isCancelledNavigation(error: unknown): boolean {
  return error instanceof Error && 'code' in error &&
    (error.code === 'ERR_ABORTED' || error.code === -3)
}

/** A failed navigation must never start a second load on a closing or superseded window. */
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

export function desktopFileUrl(filePath: string, query: Record<string, string> = {}): string {
  const url = pathToFileURL(filePath)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return url.href
}
