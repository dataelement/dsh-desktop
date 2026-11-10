import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u

/** Only the running application's metadata grants installation scope, never a Profile. */
export function readInstallationPlugins(runtimeDir: string, safeMode: boolean): { anchor: string, names: readonly string[] } | undefined {
  if (safeMode) return undefined
  const anchor = join(runtimeDir, 'package.json')
  const manifest: unknown = JSON.parse(readFileSync(anchor, 'utf8'))
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Desktop application manifest must hold an object')
  }
  const names: unknown = Reflect.get(manifest, 'dshDesktopHostPlugins')
  if (names === undefined) return undefined
  if (!Array.isArray(names) || !names.every((name: unknown) => typeof name === 'string' && PACKAGE_NAME.test(name))) {
    throw new Error('dshDesktopHostPlugins must be an array of bare package names')
  }
  return { anchor, names: [...new Set<string>(names)] }
}
