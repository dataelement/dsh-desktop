/**
 * pnpm store hygiene: reclaim staging directories orphaned by aborted runs.
 *
 * pnpm extracts every fetched tarball under the store's `tmp/` directory as
 * `tmp/_tmp_<pid>_<hex>/`. A run that is killed, cancelled, or timed out —
 * or one that hard-fails mid-fetch — never finishes that staging step, so
 * the directory survives. For `github:` sources the staged payload is the
 * WHOLE repository tarball, so a single aborted install can leave hundreds
 * of megabytes behind (e.g. an OpenViking monorepo install killed at ~88MB).
 *
 * The directory name carries the owning pnpm process id, which makes
 * reclamation safe by construction: when that pid is gone, no live download
 * can be using the directory. Live pnpm tmp dirs are never touched.
 */

import { readdirSync, rmSync, type Dirent } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import type { InstallResult, PluginRunner } from './dsh-cli.ts'
import { logEvent } from './log.ts'

/** pnpm store tmp staging prefix: `_tmp_<pid>_<random-hex>/`. */
const ORPHAN_TMP_RE = /^_tmp_(\d+)_/

/** True when the process with this pid is still running (EPERM = exists). */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Remove every orphaned staging directory under a pnpm store's `tmp/` whose
 * owning pid is no longer alive. Directories that do not match the pnpm
 * staging shape, and any that are locked or in use, are left alone.
 * @param storePath - the pnpm store root (as printed by `pnpm store path`).
 * @returns the removed directory names.
 */
export function cleanOrphanedStoreTmp(storePath: string): string[] {
  const tmp = join(storePath, 'tmp')
  let entries: Dirent[]
  try {
    entries = readdirSync(tmp, { withFileTypes: true })
  } catch {
    return [] // no store tmp dir — nothing to reclaim
  }
  const removed: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const m = ORPHAN_TMP_RE.exec(entry.name)
    if (m === null) continue
    const pid = Number(m[1])
    if (pid > 0 && pidAlive(pid)) continue
    try {
      rmSync(join(tmp, entry.name), { recursive: true, force: true })
      removed.push(entry.name)
    } catch {
      // Locked or still being written — leave it for a later run.
    }
  }
  return removed
}

/**
 * Resolve the active profile's pnpm store root through the same runner the
 * market uses for installs (so both the web and Desktop pnpm paths agree)
 * and reclaim its orphaned staging directories.
 * @returns the removed directory names, empty when the store cannot be resolved.
 */
export async function cleanOrphanedStore(run: PluginRunner, profile: string): Promise<string[]> {
  let result: InstallResult
  try {
    result = await run(profile, ['store', 'path'])
  } catch {
    return []
  }
  if (result.exitCode !== 0 || result.cancelled) return []
  const lines = result.stdout.split('\n').map(line => line.trim()).filter(line => line !== '')
  const storePath = lines[lines.length - 1] ?? ''
  if (storePath === '' || !isAbsolute(storePath)) return []
  const removed = cleanOrphanedStoreTmp(storePath)
  if (removed.length > 0) {
    logEvent('info', 'install',
      `removed ${removed.length} orphaned pnpm store tmp dir(s) under ${storePath}: ${removed.slice(0, 3).join(', ')}${removed.length > 3 ? ', …' : ''}`)
  }
  return removed
}
