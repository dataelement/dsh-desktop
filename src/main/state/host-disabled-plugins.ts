import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse } from 'yaml'
import { readMarketDisabledPackages } from './plugin-disable'
import { bundleEntryIds } from './patch-layer'
import { profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

const OVERLAY_NAME = 'desktop-disabled-plugins.patch.yml'

interface PatchRow {
  id?: unknown
  name?: unknown
  insert?: unknown
  group?: unknown
  config?: unknown
}

function insertedRows(text: string): { id: string; name: string }[] {
  const patches: unknown = parse(text, { logLevel: 'silent' })
  if (!Array.isArray(patches)) return []
  const rows: { id: string; name: string }[] = []
  const scan = (candidate: unknown): void => {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return
    const row = candidate as PatchRow
    if (typeof row.id === 'string' && typeof row.name === 'string') rows.push({ id: row.id, name: row.name })
    if (row.group && Array.isArray(row.config)) row.config.forEach(scan)
  }
  for (const patch of patches) {
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) continue
    const insert = (patch as PatchRow).insert
    if (Array.isArray(insert)) insert.forEach(scan)
  }
  return rows
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

/**
 * The market's package switch owns Profile bundles, not Desktop's in-box rows.
 * This final patch only restores shared rows disabled by older Desktop builds.
 * Safe Mode does not disable Desktop's in-box rows.
 */
export async function prepareHostDisabledPluginsPatch(
  dshHome: string,
  hostSourcePatchPath: string
): Promise<string | undefined> {
  let disabled: Set<string>
  try {
    disabled = new Set(await readMarketDisabledPackages(dshHome))
  } catch {
    // Match the loader: an unreadable market state cannot authorize skipping.
    disabled = new Set()
  }
  const overlayPath = join(dshHome, OVERLAY_NAME)
  if (disabled.size === 0) {
    await rm(overlayPath, { force: true })
    return undefined
  }

  // The runtime patch rewrites package names to file URLs. Keep the source
  // patch's package ownership while retaining the same active row IDs.
  const hostRows = insertedRows(await readFile(hostSourcePatchPath, 'utf8'))
  const activeIds = new Set(hostRows.map((row) => row.id))
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  let bundles: string[] = []
  try {
    const manifest = JSON.parse(await readFile(profilePackageJsonPath(dshHome), 'utf8')) as {
      dsh?: { profile?: { bundles?: unknown } }
    }
    const list = manifest.dsh?.profile?.bundles
    if (Array.isArray(list)) bundles = list.filter((name): name is string => typeof name === 'string')
  } catch {
    // The normal Profile preflight reports an unreadable manifest.
  }

  const disabledBundleIds = new Set<string>()
  for (const name of bundles) {
    const packageDirectory = join(profileDirectory, 'node_modules', name)
    try {
      const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as {
        dsh?: { bundle?: { patch?: unknown } }
      }
      const patch = manifest.dsh?.bundle?.patch
      if (typeof patch !== 'string') continue
      const ids = bundleEntryIds(await readFile(join(packageDirectory, patch), 'utf8'))
      for (const id of ids) (disabled.has(name) ? disabledBundleIds : activeIds).add(id)
    } catch {
      // Disabled packages may be missing or incompatible; boot preflight checks active ones.
    }
  }

  const oldUserPatch = await readIfPresent(profileCordisPatchPath(dshHome)) ?? ''
  const oldDisabledIds = new Set<string>()
  try {
    const patches: unknown = parse(oldUserPatch)
    if (Array.isArray(patches)) {
      for (const patch of patches) {
        if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
          const row = patch as { id?: unknown; disabled?: unknown }
          if (typeof row.id === 'string' && row.disabled === true) oldDisabledIds.add(row.id)
        }
      }
    }
  } catch {
    // The normal Profile preflight reports invalid user YAML.
  }

  const entries: { id: string; disabled: boolean }[] = []
  for (const id of disabledBundleIds) {
    if (oldDisabledIds.has(id) && activeIds.has(id)) entries.push({ id, disabled: false })
  }
  // A market toggle may also disable the in-box row when both packages have
  // the same name. Restore that row after the market bundle is skipped.
  for (const row of hostRows) {
    if (disabled.has(row.name) && oldDisabledIds.has(row.id) && !entries.some((entry) => entry.id === row.id)) {
      entries.push({ id: row.id, disabled: false })
    }
  }
  if (entries.length === 0) {
    await rm(overlayPath, { force: true })
    return undefined
  }
  const text = `# Managed by DSH Desktop. Do not edit.\n${entries.map(({ id, disabled: off }) =>
    `- id: ${JSON.stringify(id)}\n  disabled: ${off}\n`).join('')}`
  if (await readIfPresent(overlayPath) === text) return overlayPath
  const temporary = `${overlayPath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, text, 'utf8')
    await rename(temporary, overlayPath)
  } finally {
    await rm(temporary, { force: true })
  }
  return overlayPath
}
