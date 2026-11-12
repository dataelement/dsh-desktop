import { readFile } from 'node:fs/promises'
import { parseSemver, readInstalledPluginVersion } from '../recovery/plugin-market-check'
import { profilePackageJsonPath } from '../recovery/plugin-recovery'
import type { MarketSharedTreeUpgradeOptions, PluginUpgradeResult } from './plugin-upgrade'

/** @deprecated Historical version marker; ordinary market plugins have no startup baseline. */
export const VERIFIED_MARKET_BASELINE = '1.66.47'

/** @deprecated Compatibility no-op. Market generations remain owned by ordinary projection. */
export async function demoteMarketGeneration(
  _dshHome: string,
  _note?: (line: string) => void
): Promise<boolean> {
  return false
}

/** @deprecated Readability hint only; this does not prove activation or gate startup. */
export async function marketUsableWithoutBaseline(dshHome: string): Promise<boolean> {
  const version = await readInstalledPluginVersion(dshHome, 'dshmarket')
  return !!version && !!parseSemver(version)
}

/** @deprecated Compatibility no-op. Installation and upgrades require an explicit plugin operation. */
export async function ensureMarketBaseline(
  _options: Omit<MarketSharedTreeUpgradeOptions, 'targetVersion'>,
  _upgrade?: (options: MarketSharedTreeUpgradeOptions) => Promise<PluginUpgradeResult>
): Promise<void> {}

/** Read the market declared by the legacy web Profile without changing its installation. */
export async function readProfileMarket(
  dshHome: string
): Promise<{ installedVersion?: string } | undefined> {
  let raw: string
  try {
    raw = await readFile(profilePackageJsonPath(dshHome), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  const manifest = JSON.parse(raw) as {
    dependencies?: Record<string, string>
    dsh?: { profile?: { bundles?: string[] } }
  }
  if (!manifest.dependencies?.dshmarket || !manifest.dsh?.profile?.bundles?.includes('dshmarket')) {
    return undefined
  }
  const installedVersion = await readInstalledPluginVersion(dshHome, 'dshmarket')
  return installedVersion !== undefined ? { installedVersion } : {}
}
