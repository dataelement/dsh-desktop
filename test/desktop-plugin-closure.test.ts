import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { patchPath, projectRoot } from './patch-path'

/**
 * Every desktop plugin the composed profile mounts has to be reachable from
 * the profile directory, and the profile does not resolve through the app's
 * own node_modules.
 *
 * Harness mirrors the dependency closure of `@deepseek-ai/dsh` into
 * `$DSH_HOME/profiles/node_modules`, anchored at that package's manifest — not
 * at ours. A desktop plugin therefore reaches the profile only by being
 * injected into that manifest's dependencies, which is what the `dsh` patch
 * does. Adding a row to the profile patch without that injection boots to
 * `Cannot find package ... imported from .../profiles/web/`, which fails the
 * whole plugin tree rather than just that row.
 */
describe('desktop plugin closure', () => {
  it('injects every profile-mounted desktop plugin into the dsh dependency closure', async () => {
    const profilePatch = parseYaml(
      await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')
    ) as { insert?: { name?: string }[] }[]

    const mounted = profilePatch
      .flatMap((row) => row.insert ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => typeof name === 'string' && name.startsWith('dsh-desktop-'))

    expect(mounted.length).toBeGreaterThan(0)

    const dshPatch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    for (const name of mounted) {
      expect(dshPatch).toContain(`+    "${name}":`)
    }
  })

  it('declares every profile-mounted desktop plugin as a production dependency', async () => {
    const profilePatch = parseYaml(
      await readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')
    ) as { insert?: { name?: string }[] }[]

    const manifest = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { dependencies: Record<string, string> }

    for (const row of profilePatch.flatMap((entry) => entry.insert ?? [])) {
      if (typeof row.name !== 'string' || !row.name.startsWith('dsh-desktop-')) continue
      expect(manifest.dependencies[row.name]).toBe(`file:packages/${row.name}`)
    }
  })
})
