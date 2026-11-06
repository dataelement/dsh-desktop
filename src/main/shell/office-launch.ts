import { basename, dirname, join } from 'node:path'

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
