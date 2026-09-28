import { readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const LOCK_CONTENT = /^(\d+)\n?$/
const MAX_LOCK_BYTES = 32

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
 * pid) whose owner is gone. A killed Harness never releases them, and the
 * library deliberately never breaks an existing lock, so the next launch would
 * time out. Only locks in DSH_HOME and DSH_HOME/profiles are considered.
 */
export async function removeStaleWriterLocks(
  dshHome: string,
  isAlive: (pid: number) => boolean = isProcessAlive
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
      const path = join(directory, name)
      try {
        const content = await readFile(path, 'utf8')
        const match = content.length <= MAX_LOCK_BYTES ? LOCK_CONTENT.exec(content) : null
        if (!match) continue
        const pid = Number(match[1])
        if (pid === process.pid || isAlive(pid)) continue
        await rm(path, { force: true })
        removed.push(path)
      } catch {
        // Directories, unreadable files and races with a live writer are left alone.
      }
    }
  }
  return removed
}
