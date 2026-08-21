import { existsSync } from 'node:fs'
import { readFile, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isDisposableModuleDirectory, profilePackageJsonPath } from './plugin-recovery'

/**
 * What a failed package operation leaves behind, and how the next launch gets
 * rid of it.
 *
 * A pnpm run that dies partway through — the Windows locked rename is the one
 * that keeps happening — leaves a directory under the profile's node_modules
 * that carries a package's name without being one. pnpm cannot rename its
 * staging directory onto that name afterwards, so every later attempt fails
 * the same way: the profile is stuck until someone deletes the leftover by
 * hand.
 *
 * Nothing holds these directories before Harness starts, which makes the
 * launch path the one place they can be cleared safely. Clearing alone would
 * amputate — the packages are still wanted — so a damaged profile is followed
 * by an install that puts them back, and only what the install could not
 * restore is pruned from the manifest afterwards.
 */

/** Entries pnpm owns that are not packages and must never be judged as ones. */
function isReservedEntry(name: string): boolean {
  return name.startsWith('.')
}

async function isMaterializedPackage(directory: string): Promise<boolean> {
  try {
    const manifest = await readFile(join(directory, 'package.json'), 'utf8')
    return typeof (JSON.parse(manifest) as { name?: unknown }).name === 'string'
  } catch {
    return false
  }
}

/**
 * Package directories that carry a name without being a package: no readable
 * manifest behind it. Scoped directories are inspected one level down, where
 * the packages actually live. Symlinks are left alone — pnpm's isolated layout
 * points them into the virtual store, and a broken link is not ours to judge.
 * @param dshHome - the desktop's DSH home.
 * @returns absolute paths, in the order found.
 */
export async function findDamagedPackageDirectories(dshHome: string): Promise<string[]> {
  const nodeModulesPath = join(dirname(profilePackageJsonPath(dshHome)), 'node_modules')
  const damaged: string[] = []

  const scan = async (directory: string, allowScopes: boolean): Promise<void> => {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (isReservedEntry(entry.name) || entry.isSymbolicLink() || !entry.isDirectory()) continue
      const path = join(directory, entry.name)

      if (isDisposableModuleDirectory(entry.name)) {
        damaged.push(path)
        continue
      }
      if (allowScopes && entry.name.startsWith('@')) {
        await scan(path, false)
        continue
      }
      if (!(await isMaterializedPackage(path))) damaged.push(path)
    }
  }

  await scan(nodeModulesPath, true)
  return damaged
}

/**
 * Clear what {@link findDamagedPackageDirectories} found.
 * @returns the paths actually removed.
 */
export async function clearDamagedPackageDirectories(dshHome: string): Promise<string[]> {
  const damaged = await findDamagedPackageDirectories(dshHome)
  const removed: string[] = []

  for (const path of damaged) {
    try {
      await rm(path, { recursive: true, force: true })
      removed.push(path)
    } catch {
      // Still held by something. The install below will fail on this name and
      // report it, which beats deleting half of it here.
    }
  }

  return removed
}

/** Whether the profile is worth repairing at all — no profile, nothing to do. */
export function hasProfile(dshHome: string): boolean {
  return existsSync(profilePackageJsonPath(dshHome))
}
