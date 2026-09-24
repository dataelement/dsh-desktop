import { lstat, readFile, readlink, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { healProfilesModuleFallback, resolveBundleDir } from '@deepseek-ai/dsh-app-boot'
import { listGenerations, readDesired, writeDesired } from 'dsh-desktop-market-installer/generations/registry'
import { compareSemver, parseSemver, readInstalledPluginVersion } from './plugin-market-check'
import { profilePackageJsonPath } from './plugin-recovery'
import { clearProfileInstallMarker } from './profile-install-marker'
import { hasPendingMarketInstall, upgradeMarketInSharedTree, type MarketSharedTreeUpgradeOptions } from './plugin-upgrade'

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
  const linked = await lstat(marketPath)
    .then(async (info) => {
      if (!info.isSymbolicLink()) return false
      const target = await readlink(marketPath)
      return target.includes('.generations')
    })
    .catch(() => false)
  const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const marketGenerations = new Set(
    generations.filter((generation) => generation.pluginName === MARKET_PACKAGE).map((generation) => generation.id)
  )
  const desiredMarket = desired.filter((id) => marketGenerations.has(id))
  if (owned === undefined && !linked && desiredMarket.length === 0) return false

  note?.(`[market-baseline] dshmarket is projected as a generation; restoring it to the shared tree`)

  // Keep the declaration: dropping it would read as "the market was
  // uninstalled" and every later repair would decline to reinstall it.
  // If a newer version >= VERIFIED_MARKET_BASELINE was installed, preserve it
  // rather than forcing a fallback to VERIFIED_MARKET_BASELINE.
  let actualInstalledVersion: string | undefined
  try {
    actualInstalledVersion = await readInstalledPluginVersion(dshHome, MARKET_PACKAGE)
  } catch {
    // unreadable or missing
  }
  const isMeetsBaseline = (v?: string): boolean => {
    const clean = v?.replace(/^[~^v=><\s]+/g, '')
    return !!clean && !!parseSemver(clean) && compareSemver(clean, VERIFIED_MARKET_BASELINE) >= 0
  }

  const candidateVersion =
    owned?.visibleVersion ??
    (isMeetsBaseline(actualInstalledVersion) ? actualInstalledVersion : undefined) ??
    (isMeetsBaseline(manifest.dependencies?.[MARKET_PACKAGE]) ? manifest.dependencies?.[MARKET_PACKAGE] : undefined) ??
    (isMeetsBaseline(generations.find((g) => g.pluginName === MARKET_PACKAGE)?.version)
      ? generations.find((g) => g.pluginName === MARKET_PACKAGE)?.version
      : undefined) ??
    VERIFIED_MARKET_BASELINE

  manifest.dependencies ??= {}
  manifest.dependencies[MARKET_PACKAGE] = candidateVersion
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

/**
 * Warn when Harness would load a different dshmarket than the profile's.
 *
 * Harness resolves every profile bundle from its own installation before the
 * profile (`resolveBundleDir`), so a dshmarket shipped next to dsh would win
 * over the copy the market installs and upgrades — and the profile version
 * everything here reads would no longer be the one that runs. Packaged builds
 * do not ship it; a development checkout still has it as a devDependency.
 */
async function noteShadowedMarket(
  installAnchor: string,
  profileDir: string,
  note?: (line: string) => void
): Promise<void> {
  let effective: string
  let profileCopy: string
  try {
    effective = await realpath(resolveBundleDir('dsh-desktop', MARKET_PACKAGE, installAnchor, profileDir))
    profileCopy = await realpath(join(profileDir, 'node_modules', MARKET_PACKAGE))
  } catch {
    return
  }
  if (effective === profileCopy) return
  const version = await readFile(join(effective, 'package.json'), 'utf8')
    .then((raw) => (JSON.parse(raw) as { version?: string }).version)
    .catch(() => undefined)
  note?.(
    `[market-baseline] dshmarket in the profile is shadowed by ${version ?? '(unknown)'} at ${effective}; Harness loads that copy instead`
  )
}

/**
 * Whether the market already in the profile can carry this boot on its own.
 *
 * A baseline install that fails is common in the field — pnpm reports 404s,
 * fetch failures and EPERM from restricted or offline networks — and that must
 * not cost the user their normal Profile when the market they already have
 * still loads. Only a market that is absent, unreadable or still owned by a
 * generation blocks startup. The pending marker survives either way, so the
 * repair is retried on the next launch.
 */
export async function marketUsableWithoutBaseline(dshHome: string): Promise<boolean> {
  const profileDir = dirname(profilePackageJsonPath(dshHome))
  const marketPath = join(profileDir, 'node_modules', MARKET_PACKAGE)
  try {
    const info = await lstat(marketPath)
    // A generation link is re-linked by projection on every launch, so a market
    // left in that shape is exactly the boot loop the baseline exists to break.
    if (info.isSymbolicLink() && (await readlink(marketPath)).includes('.generations')) return false
  } catch {
    return false
  }
  const version = await readInstalledPluginVersion(dshHome, MARKET_PACKAGE)
  return !!version && !!parseSemver(version)
}

/** Run only after startup recovery gates, before generation migration/projection, with Harness stopped. */
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
  // generation link (pointing to .generations/live/…) forces a repair even
  // when its version reads as current, so a stray generation from an earlier
  // build cannot linger. A pnpm isolated-store symlink (pointing to .pnpm/…)
  // is left alone: it is pnpm's normal representation in non-hoisted profiles.
  const dshmarketPath = join(dirname(profilePackageJsonPath(options.dshHome)), 'node_modules', 'dshmarket')
  const isGenerationLink = await lstat(dshmarketPath)
    .then(async (info) => {
      if (!info.isSymbolicLink()) return false
      const target = await readlink(dshmarketPath)
      return target.includes('.generations')
    })
    .catch(() => false)
  const profileDir = dirname(profilePackageJsonPath(options.dshHome))
  const installAnchor = join(dirname(options.dshEntryPath), '..', 'package.json')
  if (meetsBaseline(installed) && !isGenerationLink && !await hasPendingMarketInstall(options.dshHome, options.note)) {
    await noteShadowedMarket(installAnchor, profileDir, options.note)
    return
  }

  // The installer pins and verifies an exact version, so a declared range
  // (`^0.5.0`) is reduced to the version it names.
  const declaredClean = manifest.dependencies.dshmarket.replace(/^[~^v=><\s]+/g, '')
  // A partial install may already expose a newer version. Finish that install
  // rather than downgrade it merely because the previous manifest was restored.
  const targetVersion = [VERIFIED_MARKET_BASELINE, declaredClean, installed]
    .filter((version): version is string => !!version && !!parseSemver(version))
    .reduce((latest, version) => compareSemver(version, latest) > 0 ? version : latest, VERIFIED_MARKET_BASELINE)

  options.note?.(
    isGenerationLink
      ? `[market-baseline] dshmarket ${installed ?? '(unknown)'} is a generation link; reinstalling into the shared tree`
      : `[market-baseline] upgrading dshmarket ${installed ?? '(missing)'} to ${targetVersion}`
  )
  // Ensure the profile directory has a valid pnpm-workspace.yaml so pnpm --workspace-root succeeds.
  const workspaceYamlPath = join(profileDir, 'pnpm-workspace.yaml')
  try {
    await readFile(workspaceYamlPath, 'utf8')
  } catch {
    await writeFile(workspaceYamlPath, 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n', 'utf8')
  }

  // This normally happens inside Harness boot, which has not run yet. Ensure
  // generation peer validation sees this installation's host packages first.
  await healProfilesModuleFallback({
    installAnchor,
    home: options.dshHome
  })
  await clearProfileInstallMarker(options.dshHome)
  const result = await upgrade({ ...options, targetVersion })
  if (!result.ok) throw new Error(result.detail ?? 'dshmarket installation failed')

  const actual = await readInstalledPluginVersion(options.dshHome, 'dshmarket')
  if (!meetsBaseline(actual)) {
    throw new Error(`dshmarket installation reported success, but the active version is ${actual ?? 'missing'}; requires >=${VERIFIED_MARKET_BASELINE}`)
  }
  options.note?.(`[market-baseline] verified active dshmarket ${actual}`)
  await noteShadowedMarket(installAnchor, profileDir, options.note)
}

/**
 * The market Safe Mode can act on: the one the normal profile declares and
 * boots. A market the user removed stays out of view, like it stays out of
 * `ensureMarketBaseline`.
 * @returns undefined when the profile does not declare the market.
 */
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
  const manifest = JSON.parse(raw) as MarketManifest
  if (!manifest.dependencies?.[MARKET_PACKAGE] || !manifest.dsh?.profile?.bundles?.includes(MARKET_PACKAGE)) {
    return undefined
  }
  const installedVersion = await readInstalledPluginVersion(dshHome, MARKET_PACKAGE)
  return installedVersion !== undefined ? { installedVersion } : {}
}
