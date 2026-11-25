import { lstat, readdir, rm, rmdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Delete a directory tree without `rm`'s recursive mode.
 *
 * Node's recursive `rm` is unusable on this desktop's Windows installs: for
 * any path containing a non-ASCII character it removes nothing and still
 * resolves successfully. A profile lives under the user's home, so a single
 * non-ASCII character in the account name — `C:\Users\数据项素\…` — silently
 * disables every cleanup the desktop performs, and each one reports the
 * removal it did not make:
 *
 *   rmSync('C:\\Users\\Public\\ascii', { recursive: true }) -> gone
 *   rmSync('C:\\Users\\Public\\中文',  { recursive: true }) -> still there
 *
 * The single-entry calls are unaffected, so the walk below is done by hand:
 * `unlink` each file, `rmdir` each directory on the way out. Symlinks are
 * unlinked rather than followed, so a link into pnpm's store never takes the
 * store's contents with it.
 *
 * pnpm's own cleanup is the same broken call (`@zkochan/rimraf` is a wrapper
 * around `fs.rmSync(p, { recursive: true, force: true })`), which is why a
 * package that has to be replaced on these installs can never be: pnpm's
 * recovery from a blocked rename deletes the destination first, that delete
 * does nothing, and the retry it guards then fails for the full minute it
 * allows. Nothing here can fix pnpm, but everything the desktop clears for it
 * has to actually clear.
 *
 * @param path - the file or directory to remove; a missing path is not an error.
 */
export async function removeTree(path: string): Promise<void> {
  let entry
  try {
    entry = await lstat(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  // A symlink to a directory reports as one; unlinking is what detaches it
  // without touching what it points at.
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    await unlink(path)
    return
  }

  const children = await readdir(path, { withFileTypes: true })
  for (const child of children) {
    await removeTree(join(path, child.name))
  }
  await rmdir(path)
}

/**
 * Remove a tree, reporting whether it is gone rather than throwing. Useful
 * where a leftover that cannot be removed is worth reporting but not worth
 * failing over — the caller's next step usually names it anyway.
 * @param path - the file or directory to remove.
 * @returns whether the path is no longer present.
 */
export async function removeTreeIfPossible(path: string): Promise<boolean> {
  try {
    await removeTree(path)
    return true
  } catch {
    // A last try through the platform's own recursion: it is a no-op on the
    // paths this module exists for, but it costs nothing and covers whatever
    // the hand-walk could not express.
    try {
      await rm(path, { recursive: true, force: true })
      await lstat(path)
      return false
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT'
    }
  }
}
