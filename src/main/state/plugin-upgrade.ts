import {
  installGeneration,
  type GenerationInstallResult
} from 'dsh-desktop-market-installer/generations/installer'
import { publishInstalledGeneration } from 'dsh-desktop-market-installer/generations/projection'
import {
  listGenerations,
  readDesired,
  withRegistryLock,
  writeDesired
} from 'dsh-desktop-market-installer/generations/registry'
import { resolveMarketRegistry } from 'dsh-desktop-market-installer/market-registry'
import { lstat, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installProfileDependenciesWithDsh } from '../runtime/profile-plugin-command'

export interface PluginUpgradeOptions {
  dshHome: string
  pluginName: string
  targetVersion: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  note?: (line: string) => void
}

export interface PluginUpgradeResult {
  ok: boolean
  detail?: string
}

/**
 * Install the target version of a plugin as an immutable generation and project
 * it into the web profile, replacing any older generation of that plugin.
 * The caller must stop Harness first; this may replace a legacy real directory.
 */
export async function upgradePluginToGeneration(
  options: PluginUpgradeOptions
): Promise<PluginUpgradeResult> {
  const { dshHome, pluginName, targetVersion, nodeExecutablePath, pnpmEntryPath, note } = options
  const spec = `${pluginName}@${targetVersion}`

  return withRegistryLock(dshHome, async () => {
    note?.(`[plugin-upgrade] installing ${spec} as a generation…`)

    const install: GenerationInstallResult = await installGeneration({
      dshHome,
      pluginSpec: spec,
      expectedVersion: targetVersion,
      nodeExecutablePath,
      pnpmEntryPath,
      // targetVersion came from the market's registry; fetch it from there
      // too rather than from whatever ~/.npmrc happens to name (#337).
      registry: await resolveMarketRegistry({ profileDir: join(dshHome, 'profiles', 'web') }),
      onTrace: (line) => note?.(`[plugin-upgrade] ${line}`)
    })

    if (!install.ok || !install.generation) {
      const detail = install.detail ?? 'generation installation failed'
      note?.(`[plugin-upgrade] failed to install ${spec}: ${detail}`)
      return { ok: false, detail }
    }

    const [desired, generations] = await Promise.all([
      readDesired(dshHome),
      listGenerations(dshHome)
    ])
    const byId = new Map(generations.map((g) => [g.id, g]))
    const kept = desired.filter((id) => {
      const g = byId.get(id)
      return g === undefined || g.pluginName !== install.generation!.pluginName
    })

    await writeDesired(dshHome, [...kept, install.generation.id])
    try {
      await publishInstalledGeneration(dshHome, pluginName, 'web', { allowRealDirectory: true, syncBundles: true })
    } catch (error) {
      await writeDesired(dshHome, desired)
      throw error
    }

    note?.(`[plugin-upgrade] successfully upgraded ${pluginName} to v${targetVersion} (${install.generation.id})`)
    return { ok: true }
  })
}

const MARKET_PACKAGE = 'dshmarket'

export interface MarketSharedTreeUpgradeOptions {
  dshHome: string
  dshEntryPath: string
  targetVersion: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /**
   * The generation-aware pnpm runner. Required, not optional: this profile
   * still projects ordinary plugins as generations, and `ensureProfilePnpmShim`
   * refuses to run a plain pnpm against a projected profile rather than let it
   * clobber their links.
   */
  pnpmRunnerPath: string
  note?: (line: string) => void
}

/**
 * Bring `dshmarket` up to `targetVersion` in the shared profile tree —
 * never as a generation.
 *
 * dshmarket is a core bundle the migration keeps hoisted
 * (`KEEP_IN_SHARED_TREE` in generation-migration.ts): its profile entry is
 * meant to always be a real directory. Routing it through the generation
 * model instead (as an earlier build did) let it flip between a real
 * directory and a symlink depending on which code path last touched it,
 * which is how a build incompatible with the host (missing a `dsh-settings`
 * export) reached a live profile with no way back — plugin-recovery
 * excludes core bundles from its candidate list by design, so a broken
 * dshmarket generation could not be detected or rolled back.
 *
 * The caller must stop Harness first: this reinstalls the whole shared
 * profile tree, which is only safe while nothing holds its packages open.
 */
export async function upgradeMarketInSharedTree(
  options: MarketSharedTreeUpgradeOptions
): Promise<PluginUpgradeResult> {
  const { dshHome, dshEntryPath, targetVersion, nodeExecutablePath, pnpmEntryPath, pnpmRunnerPath, note } = options
  const profileDirectory = join(dshHome, 'profiles', 'web')
  const manifestPath = join(profileDirectory, 'package.json')
  const marketPath = join(profileDirectory, 'node_modules', MARKET_PACKAGE)

  return withRegistryLock(dshHome, async () => {
    const before = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(before) as {
      dependencies?: Record<string, string>
      dsh?: {
        desktop?: { generationProjection?: { plugins?: Record<string, { previousOverride?: { present?: boolean; value?: string } }> } }
        profile?: { bundles?: string[] }
      }
      pnpm?: { overrides?: Record<string, string> }
    }
    let modified = false

    // An earlier build may have projected dshmarket as a generation. Undo
    // that ownership before pnpm is allowed to touch the path, restoring
    // whatever override (or absence of one) preceded it.
    const owned = manifest.dsh?.desktop?.generationProjection?.plugins?.[MARKET_PACKAGE]
    if (owned) {
      delete manifest.dsh!.desktop!.generationProjection!.plugins![MARKET_PACKAGE]
      if (owned.previousOverride?.present) {
        manifest.pnpm ??= {}
        manifest.pnpm.overrides ??= {}
        manifest.pnpm.overrides[MARKET_PACKAGE] = owned.previousOverride.value as string
      } else if (manifest.pnpm?.overrides) {
        delete manifest.pnpm.overrides[MARKET_PACKAGE]
      }
      modified = true
    }
    manifest.dependencies ??= {}
    if (manifest.dependencies[MARKET_PACKAGE] !== targetVersion) {
      manifest.dependencies[MARKET_PACKAGE] = targetVersion
      modified = true
    }
    if (modified) await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')

    try {
      const entry = await lstat(marketPath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw error
      })
      if (entry?.isSymbolicLink()) {
        note?.(`[plugin-upgrade] dropping the ${MARKET_PACKAGE} generation link before reinstalling`)
        // Remove only the pointer. The generation directory it targets is
        // left alone, so nothing that already loaded it is disturbed.
        await rm(marketPath, { force: true })
      }

      note?.(`[plugin-upgrade] installing ${MARKET_PACKAGE}@${targetVersion} into the shared profile…`)
      const registry = await resolveMarketRegistry({ profileDir: profileDirectory })
      const result = await installProfileDependenciesWithDsh({
        dshHome,
        dshEntryPath,
        nodeExecutablePath,
        pnpmEntryPath,
        pnpmRunnerPath,
        environment: registry !== null ? { ...process.env, npm_config_registry: registry } : undefined
      })
      if (!result.ok) throw new Error(result.detail ?? 'shared-tree install failed')

      // A zero exit code can be a CLI no-op. Verify the public Profile path
      // before retiring any generation ownership or reporting success.
      const installed = JSON.parse(await readFile(join(marketPath, 'package.json'), 'utf8')) as { version?: string }
      if (installed.version !== targetVersion || (await lstat(marketPath)).isSymbolicLink()) {
        throw new Error(`Market install expected a shared directory at ${targetVersion}, found ${installed.version ?? 'missing'} or a link`)
      }

      // A dshmarket generation from an earlier build has no further purpose
      // once the shared-tree copy is current; drop its desired.json entry.
      const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
      const stale = new Set(
        generations.filter((generation) => generation.pluginName === MARKET_PACKAGE).map((generation) => generation.id)
      )
      if (desired.some((id) => stale.has(id))) {
        await writeDesired(dshHome, desired.filter((id) => !stale.has(id)))
      }

      note?.(`[plugin-upgrade] successfully upgraded ${MARKET_PACKAGE} to v${targetVersion}`)
      return { ok: true }
    } catch (error) {
      await writeFile(manifestPath, before, 'utf8')
      const detail = error instanceof Error ? error.message : String(error)
      note?.(`[plugin-upgrade] failed to install ${MARKET_PACKAGE}@${targetVersion}: ${detail}`)
      return { ok: false, detail }
    }
  })
}
