/**
 * Delete a directory tree without `rm`'s recursive mode.
 *
 * Node's recursive `rm` is unusable on this desktop's Windows installs: for
 * any path containing a non-ASCII character it removes nothing and still
 * resolves successfully. A profile lives under the user's home, so a single
 * non-ASCII character in the account name — `C:\Users\数据项素\…` — silently
 * disables every cleanup performed there, and each one reports the removal it
 * did not make:
 *
 *   rmSync('C:\\Users\\Public\\ascii', { recursive: true }) -> gone
 *   rmSync('C:\\Users\\Public\\中文',  { recursive: true }) -> still there
 *
 * The single-entry calls are unaffected, so the walk below is done by hand:
 * `unlink` each file, `rmdir` each directory on the way out. Symlinks are
 * unlinked rather than followed, so a link into pnpm's store never takes the
 * store's contents with it.
 *
 * This is the Harness-side copy of `src/main/state/remove-tree.ts`. The two
 * run in different processes — this one inside Harness, the other in the
 * desktop's main process — and the desktop's build does not reach into this
 * package's sources, so the walk is stated in both places rather than shared
 * through an import that neither side could satisfy.
 */
import { lstat, readdir, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Remove a file or directory tree.
 * @param {string} path - the path to remove; a missing path is not an error.
 */
export async function removeTree(path) {
  let entry
  try {
    entry = await lstat(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }

  // A symlink to a directory reports as one; unlinking is what detaches it
  // without touching what it points at.
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    await unlink(path)
    return
  }

  for (const child of await readdir(path, { withFileTypes: true })) {
    await removeTree(join(path, child.name))
  }
  await rmdir(path)
}

/**
 * Remove a tree, reporting whether it is gone rather than throwing.
 * @param {string} path - the path to remove.
 * @returns {Promise<boolean>} whether the path is no longer present.
 */
export async function removeTreeIfPossible(path) {
  try {
    await removeTree(path)
  } catch {
    // Fall through to the check: a partial removal still counts for nothing.
  }
  try {
    await lstat(path)
    return false
  } catch (error) {
    return error?.code === 'ENOENT'
  }
}
