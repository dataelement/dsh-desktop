import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { disableProfilePlugin, isProfilePluginDisabledByPatch, readMarketDisabledPackages } from './plugin-disable'

const STATE_FILE = 'desktop-host-plugins.json'
export const BUILTIN_IMAGE_GENERATION = 'dsh-image-generation'
const DEFAULT_DISABLED_HOST_PLUGINS = [BUILTIN_IMAGE_GENERATION]

export async function readDisabledHostPlugins(dshHome: string): Promise<string[]> {
  let source: string
  try {
    source = await readFile(join(dshHome, STATE_FILE), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [...DEFAULT_DISABLED_HOST_PLUGINS]
    throw error
  }
  const state: unknown = JSON.parse(source)
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Desktop host plugin state is not an object')
  }
  const { version, disabled } = state as { version?: unknown; disabled?: unknown }
  if (version !== 1 || !Array.isArray(disabled) || !disabled.every((name) => typeof name === 'string')) {
    throw new Error('Desktop host plugin state has an unsupported format')
  }
  return [...new Set(disabled)]
}

/** Enabling a host package while an active Profile bundle owns the same name
 * would make the next launch fail before the user could reach its settings.
 */
export async function profileContainsBundle(dshHome: string, name: string): Promise<boolean> {
  let source: string
  try {
    source = await readFile(join(dshHome, 'profiles', 'web', 'package.json'), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
  const manifest: unknown = JSON.parse(source)
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('The Profile manifest is not an object')
  }
  const profile = (manifest as { dsh?: { profile?: { bundles?: unknown } } }).dsh?.profile
  return Array.isArray(profile?.bundles) && profile.bundles.includes(name)
}

export async function profileHasEnabledBundle(dshHome: string, name: string): Promise<boolean> {
  if (!(await profileContainsBundle(dshHome, name))) return false
  if ((await readMarketDisabledPackages(dshHome)).includes(name)) return false
  return !(await isProfilePluginDisabledByPatch(dshHome, name))
}

/** Persist a market-side disable before enabling the in-box copy. A patch-row
 * disable alone does not remove the Profile bundle's Loader ID at next boot.
 */
export async function prepareProfileBundleForHostEnable(dshHome: string, name: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await profileContainsBundle(dshHome, name))) return { ok: true }
  if (await profileHasEnabledBundle(dshHome, name)) return { ok: false, reason: 'market-active' }
  const result = await disableProfilePlugin(dshHome, name)
  return result.ok ? { ok: true } : { ok: false, reason: result.detail }
}

let pendingWrite: Promise<void> = Promise.resolve()

/** State is Desktop-owned, outside Profile bundles and market disable records. */
export function setHostPluginEnabled(dshHome: string, name: string, enabled: boolean): Promise<void> {
  const write = async (): Promise<void> => {
    const disabled = new Set(await readDisabledHostPlugins(dshHome))
    if (enabled) disabled.delete(name)
    else disabled.add(name)
    await mkdir(dshHome, { recursive: true })
    const target = join(dshHome, STATE_FILE)
    const temporary = `${target}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify({ version: 1, disabled: [...disabled].sort() }, null, 2)}\n`, 'utf8')
      await rename(temporary, target)
    } finally {
      await rm(temporary, { force: true })
    }
  }
  const operation = pendingWrite.then(write)
  pendingWrite = operation.catch(() => undefined)
  return operation
}
