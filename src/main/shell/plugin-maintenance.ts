import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PluginHealthReport } from '../state/plugin-market-check'
import { profilePackageJsonPath } from '../state/plugin-recovery'

export function pnpmEntryPath(appPath: string, exists: (path: string) => boolean): string | undefined {
  const root = join(appPath, 'node_modules', 'pnpm', 'bin')
  for (const name of ['pnpm.cjs', 'pnpm.mjs']) {
    const candidate = join(root, name)
    if (exists(candidate)) return candidate
  }
  return undefined
}

export function upgradeTargets(
  plugins: readonly string[],
  reports: readonly PluginHealthReport[]
): { name: string; version: string }[] {
  const byName = new Map(reports.map(report => [report.packageName, report]))
  const targets: { name: string; version: string }[] = []
  for (const name of plugins) {
    const report = byName.get(name)
    if (report?.upgradeReady === true && typeof report.upgradeVersion === 'string' && report.upgradeVersion !== '') {
      targets.push({ name, version: report.upgradeVersion })
    }
  }
  return targets
}

export async function installedPluginVersion(
  dshHome: string,
  profile: string,
  pluginName: string
): Promise<string | undefined> {
  try {
    const raw = await readFile(join(
      profilePackageJsonPath(dshHome, profile),
      '..',
      'node_modules',
      ...pluginName.split('/'),
      'package.json'
    ), 'utf8')
    const manifest: unknown = JSON.parse(raw)
    if (typeof manifest !== 'object' || manifest === null || !('version' in manifest)) return undefined
    return typeof manifest.version === 'string' && manifest.version !== '' ? manifest.version : undefined
  } catch {
    return undefined
  }
}
