import { lstat, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { healProfilesModuleFallback } from '@deepseek-ai/dsh-app-boot'
import { listGenerations, readDesired, writeDesired } from 'dsh-desktop-market-installer/generations/registry'
import { compareSemver, parseSemver, readInstalledPluginVersion } from './plugin-market-check'
import { profilePackageJsonPath } from './plugin-recovery'
import { clearProfileInstallMarker } from './profile-install-marker'
import { upgradeMarketInSharedTree, type MarketSharedTreeUpgradeOptions } from './plugin-upgrade'

export const VERIFIED_MARKET_BASELINE = '1.45.1'

const MARKET_PACKAGE = 'dshmarket'

interface MarketManifest {
  dependencies?: Record<string, string>
  dsh?: {
    desktop?: {
      generationProjection?: {
        plugins?: Record<string, { visibleVersion?: string; previousOverride?: { present?: boolean; value?: string } }>
      }
    }
    profile?: { bundles?: string[] }
  }
  pnpm?: { overrides?: Record<string, string> }
}

/**
 * Undo any projection of dshmarket as a generation — before generation
 * projection runs.
 *
 * dshmarket is a core bundle that must always be a real directory in the
 * shared tree (`KEEP_IN_SHARED_TREE` in generation-migration.ts). A stray
 * `desired.json` entry for it is otherwise re-linked by `projectGenerations`
 * on *every* launch, which is why an incompatible build kept coming back
 * after each repair: the repair ran after projection had already recreated
 * the link, or never ran at all because an unrelated pending plugin removal
 * had deferred maintenance.
 *
 * This only rewrites declarations and drops the link; the shared-tree install
 * that follows is `ensureMarketBaseline`'s job. Harness must be stopped.
 * @returns whether anything had to be undone.
 */
export async function demoteMarketGeneration(
  dshHome: string,
  note?: (line: string) => void
): Promise<boolean> {
  const manifestPath = profilePackageJsonPath(dshHome)
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
  const manifest = JSON.parse(raw) as MarketManifest
  const marketPath = join(dirname(manifestPath), 'node_modules', MARKET_PACKAGE)

  const owned = manifest.dsh?.desktop?.generationProjection?.plugins?.[MARKET_PACKAGE]
  const linked = await lstat(marketPath).then((info) => info.isSymbolicLink()).catch(() => false)
  const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const marketGenerations = new Set(
    generations.filter((generation) => generation.pluginName === MARKET_PACKAGE).map((generation) => generation.id)
  )
  const desiredMarket = desired.filter((id) => marketGenerations.has(id))
  if (owned === undefined && !linked && desiredMarket.length === 0) return false

  note?.(`[market-baseline] dshmarket is projected as a generation; restoring it to the shared tree`)

  // Keep the declaration: dropping it would read as "the market was
  // uninstalled" and every later repair would decline to reinstall it.
  manifest.dependencies ??= {}
  manifest.dependencies[MARKET_PACKAGE] = owned?.visibleVersion ?? VERIFIED_MARKET_BASELINE
  if (owned !== undefined) {
    delete manifest.dsh!.desktop!.generationProjection!.plugins![MARKET_PACKAGE]
    if (Object.keys(manifest.dsh!.desktop!.generationProjection!.plugins!).length === 0) {
      delete manifest.dsh!.desktop!.generationProjection
    }
    if (owned.previousOverride?.present && typeof owned.previousOverride.value === 'string') {
      manifest.pnpm ??= {}
      manifest.pnpm.overrides ??= {}
      manifest.pnpm.overrides[MARKET_PACKAGE] = owned.previousOverride.value
    } else if (manifest.pnpm?.overrides) {
      delete manifest.pnpm.overrides[MARKET_PACKAGE]
    }
  } else if (manifest.pnpm?.overrides?.[MARKET_PACKAGE]?.includes('.generations/live/')) {
    delete manifest.pnpm.overrides[MARKET_PACKAGE]
  }
  const bundles = manifest.dsh?.profile?.bundles
  if (Array.isArray(bundles) && !bundles.includes(MARKET_PACKAGE)) bundles.push(MARKET_PACKAGE)
  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')

  if (desiredMarket.length > 0) {
    await writeDesired(dshHome, desired.filter((id) => !marketGenerations.has(id)))
  }
  if (linked) {
    // Only the pointer goes: the generation directory it targets is left for
    // the ordinary sweep, and nothing that already loaded it is disturbed.
    await rm(marketPath, { force: true })
  }
  // No need to clear `.install-complete`: it is a fingerprint over
  // package.json and pnpm-lock.yaml, and the manifest write above already
  // invalidated it.
  return true
}

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
