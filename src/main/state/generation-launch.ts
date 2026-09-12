import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  initProfile,
  PROFILE_TEMPLATES,
  resolveProfileDir
} from '@deepseek-ai/dsh-app-boot'
import {
  disableGeneration,
  isGenerationPlugin,
  resolveEnabledGenerations,
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
  const { removed, failed } = await sweepRegistry(dshHome)
  if (removed.length > 0) {
    note(`[desktop] swept ${removed.length} unreferenced plugin generation(s)`)
  }
  if (failed.length > 0) {
    // Inert — nothing resolves against them; the next cold start retries.
    note(`[desktop] ${failed.length} generation(s) could not be removed yet, will retry`)
  }
  // Projection must not invent an empty profile manifest. On a first launch,
  // doing so prevents app-boot from installing the shipped web bundles and
  // leaves Desktop overlays waiting forever for services such as connection.
  // Use the same initializer and template app-boot itself uses so its defaults
  // remain the single source of truth.
  const profileDir = resolveProfileDir('web', dshHome)
  if (!existsSync(join(profileDir, 'package.json'))) {
    const template = PROFILE_TEMPLATES.web
    if (template === undefined) throw new Error('Harness does not define the web profile template')
    initProfile(profileDir, template.bundles, template.patchReload)
  }
  try {
    const projection = await projectGenerations(dshHome)
    if (projection.linked.length > 0 || projection.unlinked.length > 0) {
      note(
        `[desktop] projected generations: ${projection.linked.length} linked, ` +
          `${projection.unlinked.length} unlinked`
      )
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    note(`[desktop] generation projection failed: ${detail}`)
    throw new Error(`generation projection failed: ${detail}`)
  }
}

/**
 * Whether this plugin is installed as a generation, and so is projected from
 * `desired` rather than owned by the profile manifest.
 *
 * Callers that report success or failure to the user need this BEFORE
 * attempting the removal. {@link uninstallGenerationPlugin} answers false both
 * for "not a generation, use pnpm instead" and for "is a generation, and
 * disabling it failed" — treating those the same is how an uninstall that left
 * the pointer in place still reported success (#330).
 */
export async function isProjectedGenerationPlugin(
  dshHome: string,
  pluginName: string
): Promise<boolean> {
  return isGenerationPlugin(dshHome, pluginName).catch(() => false)
}

/**
 * Uninstall a plugin that is a generation: drop it from `desired` and
 * reproject. Returns false when the plugin is not a generation, so the caller
 * can fall through to the shared-tree `dsh plugin remove`.
 *
 * The recovery and Safe Mode paths must come here for a generation — a
 * `pnpm remove` edits the shared tree, but projection re-derives the profile
 * from `desired` on the next launch and the plugin comes straight back.
 */
export async function uninstallGenerationPlugin(
  dshHome: string,
  pluginName: string,
  note: Note
): Promise<boolean> {
  if (!(await isGenerationPlugin(dshHome, pluginName).catch(() => false))) return false
  try {
    const removed = await disableGeneration(dshHome, pluginName)
    await projectGenerations(dshHome)
    const stillEnabled = (await resolveEnabledGenerations(dshHome)).has(pluginName)
    if (stillEnabled) {
      note(`[desktop] failed to disable the ${pluginName} generation`)
      return false
    }
    note(
      removed
        ? `[desktop] disabled the ${pluginName} generation; it will be swept on a later cold start`
        : `[desktop] ${pluginName} was already not an enabled generation`
    )
    return true
  } catch (error) {
    note(
      `[desktop] failed to disable the ${pluginName} generation: ` +
        `${error instanceof Error ? error.message : error}`
    )
    return false
  }
}
