import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { loadOverlayPatches, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'

/** Read the same bundle manifests and YAML layers as Harness, without mounting
 * plugins, evaluating config expressions, or repairing the installation. This
 * checks necessary startup inputs only; runtime activation remains Harness's job.
 */
export async function inspectProfileBootInputs(
  dshHome: string,
  dshEntryPath: string
): Promise<string | undefined> {
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
    let current: unknown = error
    while (current instanceof Error && !seen.has(current)) {
      seen.add(current)
      messages.push(current.message)
      current = current.cause
    }
    return messages.length ? messages.join('\nCaused by: ') : String(error)
  }
}
