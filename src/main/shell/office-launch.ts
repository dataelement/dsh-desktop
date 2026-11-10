import { basename, dirname, join } from 'node:path'

/** Match office:prepare in development and the installation resource layout in packages. */
export function resolvePrimaryRuntime(
  appPath: string,
  resourcesPath: string,
  packaged: boolean,
  developmentOverride?: string
): string {
  if (packaged) return join(resourcesPath, 'office-runtime', 'primary-runtime')
  return developmentOverride || join(appPath, '.build', 'office-runtime', 'primary-runtime')
}

/**
 * Office resources sit beside `primary-runtime`. The CLI is packaged next to
 * that resources directory. A repository `.build/office-runtime` keeps the CLI
 * in `build/office-cli.mjs`, matching the previous shell entry.
 */
export function officeLaunchPaths(primaryRuntime: string): { resources: string; cli: string } | undefined {
  if (basename(primaryRuntime) !== 'primary-runtime') return undefined
  const resources = dirname(primaryRuntime)
  if (basename(resources) !== 'office-runtime') return undefined
  const parent = dirname(resources)
  const cli = basename(parent) === '.build'
    ? join(dirname(parent), 'build', 'office-cli.mjs')
    : join(parent, 'office-cli.mjs')
  return { resources, cli }
}
