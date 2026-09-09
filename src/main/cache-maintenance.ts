import { readFile, writeFile } from 'node:fs/promises'

export interface HttpCacheSession {
  clearCache(): Promise<void>
}

/**
 * Keep cache entries while Harness stays on the same origin. When the stable
 * preferred port is unavailable, or when upgrading from the former random-port
 * behavior, clear only the HTTP cache before loading the new origin. Cookies
 * and storage data belong to separate Electron APIs and stay intact.
 */
export async function clearStaleLoopbackHttpCache(
  session: HttpCacheSession,
  originStatePath: string,
  nextOrigin: string,
  note: (line: string) => void
): Promise<'unchanged' | 'cleared' | 'failed'> {
  try {
    if ((await readFile(originStatePath, 'utf8')).trim() === nextOrigin) return 'unchanged'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const detail = error instanceof Error ? error.message : String(error)
      note(`[desktop] loopback HTTP cache origin state read failed: ${detail}`)
    }
  }

  try {
    await session.clearCache()
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    note(`[desktop] stale loopback HTTP cache cleanup failed: ${detail}`)
    return 'failed'
  }

  try {
    await writeFile(originStatePath, `${nextOrigin}\n`, 'utf8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    note(`[desktop] loopback HTTP cache origin state write failed: ${detail}`)
  }
  return 'cleared'
}
