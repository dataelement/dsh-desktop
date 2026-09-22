import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { loadOverlayPatches, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'

export interface ProfileBootInputProblem {
  /** The failure chain, innermost cause last. */
  message: string
  /**
   * The bundle that failed to prepare, when Harness named one.
   *
   * Crash reports show that the message alone is often all that survives — the
   * loader wraps resolution failures in an error without `code` — so the
   * package name is carried as data rather than parsed back out of the text.
   */
  packageName?: string
}

/** Read the same bundle manifests and YAML layers as Harness, without mounting
 * plugins, evaluating config expressions, or repairing the installation. This
 * checks necessary startup inputs only; runtime activation remains Harness's job.
 */
export async function inspectProfileBootInputs(
  dshHome: string,
  dshEntryPath: string
): Promise<ProfileBootInputProblem | undefined> {
  const profile = join(dshHome, 'profiles', 'web')
  try {
    try {
      await stat(join(profile, 'package.json'))
    } catch (error) {
      // Harness initializes a genuinely new Profile on its first launch.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
    loadProfileDirectory('dsh-desktop', profile, join(dirname(dshEntryPath), '..', 'package.json'))
    const homePatch = join(dshHome, 'cordis.patch.yml')
    try {
      await stat(homePatch)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
    loadOverlayPatches('dsh-desktop', homePatch)
    return undefined
  } catch (error) {
    const messages: string[] = []
    const seen = new Set<unknown>()
    let packageName: string | undefined
    let current: unknown = error
    while (current instanceof Error && !seen.has(current)) {
      seen.add(current)
      messages.push(current.message)
      packageName ??= (current as { dshPluginFailure?: { packageName?: string } })
        .dshPluginFailure?.packageName
      current = current.cause
    }
    return {
      message: messages.length ? messages.join('\nCaused by: ') : String(error),
      ...(packageName !== undefined ? { packageName } : {})
    }
  }
}
