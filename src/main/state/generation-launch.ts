import {
  commitLastKnownGood,
  readDesired,
  readLastKnownGood,
  revertToLastKnownGood,
  sweepRegistry
} from 'dsh-desktop-market-installer/generations/registry'
import { projectGenerations } from 'dsh-desktop-market-installer/generations/projection'

/**
 * The launch-process half of the generation model. The market plugin installs
 * generations and moves `desired` from inside Harness; this decides which set
 * actually boots and records it.
 *
 * Everything here is a no-op on a profile that has never used a generation —
 * empty pointers, nothing linked, nothing to sweep.
 */

type Note = (line: string) => void

/**
 * Run once per launch while Harness is stopped: physically remove staging
 * leftovers and generations neither pointer references, then reproject so the
 * profile's `node_modules` links match `desired`. Stopped Harness is the only
 * moment a removal is safe — a plugin could still be importing from a
 * generation while it runs.
 */
export async function prepareGenerationsForLaunch(dshHome: string, note: Note): Promise<void> {
  try {
    const { removed, failed } = await sweepRegistry(dshHome)
    if (removed.length > 0) {
      note(`[desktop] swept ${removed.length} unreferenced plugin generation(s)`)
    }
    if (failed.length > 0) {
      // Inert — nothing resolves against them; the next cold start retries.
      note(`[desktop] ${failed.length} generation(s) could not be removed yet, will retry`)
    }
    const projection = await projectGenerations(dshHome)
    if (projection.linked.length > 0 || projection.unlinked.length > 0) {
      note(
        `[desktop] projected generations: ${projection.linked.length} linked, ` +
          `${projection.unlinked.length} unlinked`
      )
    }
  } catch (error) {
    // A projection failure is recoverable on the next launch and must not block
    // this one — Harness reports whatever it can resolve.
    note(`[desktop] generation projection failed: ${error instanceof Error ? error.message : error}`)
  }
}

/**
 * Whether `desired` has moved ahead of the set that last booted. A failed
 * launch after this is true is a new generation set that did not work, and the
 * fix is to fall back — not to a hash that only meant "pnpm exited zero".
 */
export async function desiredIsUntried(dshHome: string): Promise<boolean> {
  const [desired, lkg] = await Promise.all([readDesired(dshHome), readLastKnownGood(dshHome)])
  if (desired.length !== lkg.length) return true
  const known = new Set(lkg)
  return desired.some((id) => !known.has(id))
}

/**
 * Roll `desired` back to the last set that rendered a window, reproject, and
 * report it. The caller relaunches Harness once after this.
 */
export async function rollBackToLastKnownGood(dshHome: string, note: Note): Promise<boolean> {
  const reverted = await revertToLastKnownGood(dshHome)
  await projectGenerations(dshHome).catch(() => undefined)
  note(
    `[desktop] a new plugin set failed to boot; rolled back to the last working set ` +
      `(${reverted.length} generation(s))`
  )
  return true
}

/**
 * Record the currently-desired generation set as known good. Call this only
 * once Harness has reported ready AND the window has rendered — the window is
 * the proof the set works, which `.install-complete` never was.
 */
export async function markGenerationsBooted(dshHome: string, note: Note): Promise<void> {
  try {
    const before = await readLastKnownGood(dshHome)
    await commitLastKnownGood(dshHome)
    const after = await readLastKnownGood(dshHome)
    if (before.length !== after.length || after.some((id) => !before.includes(id))) {
      note('[desktop] committed the current plugin set as last-known-good')
    }
  } catch {
    // A missing LKG file just means the next failed launch has nothing to roll
    // back to — not a reason to fault a successful one.
  }
}
