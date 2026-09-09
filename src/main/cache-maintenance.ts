export interface HttpCacheSession {
  clearCache(): Promise<void>
}

/**
 * Harness listens on a new random loopback port after each start, so Chromium
 * cannot reuse entries from the previous origin. Clear only the HTTP cache;
 * cookies and storage data belong to separate Electron APIs and stay intact.
 */
export async function clearStaleLoopbackHttpCache(
  session: HttpCacheSession,
  note: (line: string) => void
): Promise<boolean> {
  try {
    await session.clearCache()
    return true
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    note(`[desktop] stale loopback HTTP cache cleanup failed: ${detail}`)
    return false
  }
}
