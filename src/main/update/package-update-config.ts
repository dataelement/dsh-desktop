import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDesktopUpdateConfig, type DesktopUpdateConfig } from './update-config'

/** The main process supplies app.getAppPath(), including the installed app.asar. */
export function readPackageUpdateConfig(appPath: string): Readonly<DesktopUpdateConfig> {
  const metadata: unknown = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8'))
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) throw new Error('Invalid application package metadata')
  return parseDesktopUpdateConfig((metadata as Record<string, unknown>).dshDesktopUpdates)
}
