import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const LOCK_CONTENT = /^(\d+)\n?$/
const MAX_LOCK_BYTES = 32
export const STALE_LOCK_TIMEOUT_MS = 10_000

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM means the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Remove `@deepseek-ai/dsh-atomic-write` locks (`<file>.lock` holding the owner
 * pid) whose owner is gone or whose age exceeds reasonable threshold (>10s).
 * A killed Harness never releases them, and the library deliberately never breaks
 * an existing lock, so the next launch would time out. Only locks in DSH_HOME
 * and DSH_HOME/profiles are considered.
 */
export async function removeStaleWriterLocks(
  dshHome: string,
  isAlive: (pid: number) => boolean = isProcessAlive,
  now: number = Date.now()
): Promise<string[]> {
  const removed: string[] = []
  for (const directory of [dshHome, join(dshHome, 'profiles')]) {
    let names: string[]
    try {
      names = await readdir(directory)
    } catch {
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.lock')) continue
      if (name === 'pnpm.lock' || name === 'package-lock.json') continue
      const path = join(directory, name)
      try {
        const fileStat = await stat(path)
        if (fileStat.isDirectory()) continue

        // Any writer lock older than 10 seconds is considered a stale crash remnant.
        if (now - fileStat.mtimeMs > STALE_LOCK_TIMEOUT_MS) {
          await rm(path, { force: true })
          removed.push(path)
          continue
        }

        const content = await readFile(path, 'utf8')
        const match = content.length <= MAX_LOCK_BYTES ? LOCK_CONTENT.exec(content) : null
        if (match) {
          const pid = Number(match[1])
          if (pid === process.pid || isAlive(pid)) continue
          await rm(path, { force: true })
          removed.push(path)
        } else if (content.length === 0 && now - fileStat.mtimeMs > 2_000) {
          // Empty abandoned lock file older than 2s
          await rm(path, { force: true })
          removed.push(path)
        }
      } catch {
        // Directories, unreadable files and races with a live writer are left alone.
      }
    }
  }
  return removed
}
