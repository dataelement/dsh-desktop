import { lstat, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { healProfilesModuleFallback } from '@deepseek-ai/dsh-app-boot'
import { compareSemver, parseSemver, readInstalledPluginVersion } from './plugin-market-check'
import { profilePackageJsonPath } from './plugin-recovery'
import { clearProfileInstallMarker } from './profile-install-marker'
import { upgradeMarketInSharedTree, type MarketSharedTreeUpgradeOptions } from './plugin-upgrade'

export const VERIFIED_MARKET_BASELINE = '1.45.1'

/** Run only after startup recovery gates and generation projection, with Harness stopped. */
export async function ensureMarketBaseline(
  options: Omit<MarketSharedTreeUpgradeOptions, 'targetVersion'>,
  upgrade: (options: MarketSharedTreeUpgradeOptions) => ReturnType<typeof upgradeMarketInSharedTree> = upgradeMarketInSharedTree
): Promise<void> {
  let raw: string
  try {
    raw = await readFile(profilePackageJsonPath(options.dshHome), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  const manifest = JSON.parse(raw) as {
    dependencies?: Record<string, string>
    dsh?: { profile?: { bundles?: string[] } }
  }
  // A removed/disabled market stays removed. First-install UI owns adding it.
  if (!manifest.dependencies?.dshmarket || !manifest.dsh?.profile?.bundles?.includes('dshmarket')) return

  const meetsBaseline = (version: string | undefined): boolean =>
    !!version && !!parseSemver(version) && compareSemver(version, VERIFIED_MARKET_BASELINE) >= 0
  const installed = await readInstalledPluginVersion(options.dshHome, 'dshmarket')
  // dshmarket must never be a generation (it is a core bundle the migration
  // keeps hoisted — see KEEP_IN_SHARED_TREE in generation-migration.ts). A
  // symlinked entry forces a repair even when its version already reads as
  // current, so a stray generation from an earlier build cannot linger.
  const isGenerationLink = await lstat(
    join(dirname(profilePackageJsonPath(options.dshHome)), 'node_modules', 'dshmarket')
  ).then((info) => info.isSymbolicLink()).catch(() => false)
  if (meetsBaseline(installed) && !isGenerationLink) return

  options.note?.(
    isGenerationLink
      ? `[market-baseline] dshmarket ${installed ?? '(unknown)'} is a generation link; reinstalling into the shared tree`
      : `[market-baseline] upgrading dshmarket ${installed ?? '(missing)'} to ${VERIFIED_MARKET_BASELINE}`
  )
  // This normally happens inside Harness boot, which has not run yet. Ensure
  // generation peer validation sees this installation's host packages first.
  await healProfilesModuleFallback({
    installAnchor: join(dirname(options.dshEntryPath), '..', 'package.json'),
    home: options.dshHome
  })
  await clearProfileInstallMarker(options.dshHome)
  const result = await upgrade({ ...options, targetVersion: VERIFIED_MARKET_BASELINE })
  if (!result.ok) throw new Error(result.detail ?? 'dshmarket installation failed')

  const actual = await readInstalledPluginVersion(options.dshHome, 'dshmarket')
  if (!meetsBaseline(actual)) {
    throw new Error(`dshmarket installation reported success, but the active version is ${actual ?? 'missing'}; requires >=${VERIFIED_MARKET_BASELINE}`)
  }
  options.note?.(`[market-baseline] verified active dshmarket ${actual}`)
}
