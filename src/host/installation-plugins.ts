import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseDeclaredHostPlugins } from '../shared/host-plugin-name'

/** Only the running application's metadata grants installation scope, never a Profile. */
export function readInstallationPlugins(runtimeDir: string, safeMode: boolean): { anchor: string, names: readonly string[] } | undefined {
  if (safeMode) return undefined
  const anchor = join(runtimeDir, 'package.json')
  const manifest: unknown = JSON.parse(readFileSync(anchor, 'utf8'))
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Desktop application manifest must hold an object')
  }
  const names = parseDeclaredHostPlugins(manifest)
  if (names === undefined) return undefined
  return { anchor, names }
}
