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
import { lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { packageCommandEnvironment } from './profile-plugin-command'

export interface PluginUpgradeOptions {
  dshHome: string
  pluginName: string
  targetVersion: string
  /** Profile that receives the projected generation. The previous shell uses `web`. */
  profile?: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /** The packaged lock-recovery runner the `.desktop-bin` pnpm shim routes through. */
  pnpmRunnerPath?: string
  /** Windows console-hide bootstrap restored by the pnpm shim and passed to pnpm. */
  hideConsoleBootstrapPath?: string
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
  const { dshHome, pluginName, targetVersion, nodeExecutablePath, pnpmEntryPath, pnpmRunnerPath, hideConsoleBootstrapPath, note } = options
  const profile = options.profile ?? 'web'
  const spec = `${pluginName}@${targetVersion}`

  return withRegistryLock(dshHome, async () => {
    note?.(`[plugin-upgrade] installing ${spec} as a generation…`)

    const install: GenerationInstallResult = await installGeneration({
      dshHome,
      pluginSpec: spec,
      expectedVersion: targetVersion,
      nodeExecutablePath,
      pnpmEntryPath,
      environment: await packageCommandEnvironment({ dshHome, nodeExecutablePath, pnpmEntryPath, pnpmRunnerPath, hideConsoleBootstrapPath }),
      // targetVersion came from the market's registry; fetch it from there
      // too rather than from whatever ~/.npmrc happens to name (#337).
      registry: (await resolveMarketRegistry({ profileDir: join(dshHome, 'profiles', profile) })) ?? (
        (process.env.LANG ?? '').toLowerCase().startsWith('zh') ||
        Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Shanghai') ||
        process.env.TZ === 'Asia/Shanghai'
          ? 'https://registry.npmmirror.com'
          : undefined
      ),
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
      await publishInstalledGeneration(dshHome, pluginName, profile, { allowRealDirectory: true, syncBundles: true })
    } catch (error) {
      await writeDesired(dshHome, desired)
      throw error
    }

    note?.(`[plugin-upgrade] successfully upgraded ${pluginName} to v${targetVersion} (${install.generation.id})`)
    return { ok: true }
  })
}

export function marketInstallPendingPath(dshHome: string): string {
  return join(dshHome, 'profiles', 'web', '.desktop-market-install-pending.json')
}

export async function hasPendingMarketInstall(
  dshHome: string,
  note?: (line: string) => void
): Promise<boolean> {
  try {
    await lstat(marketInstallPendingPath(dshHome))
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return false
    // An unreadable marker is not a reason to stop booting: the installed
    // version check still forces a repair when the tree is actually broken.
    note?.(`[plugin-upgrade] market install marker unreadable (${code ?? 'unknown'}); relying on the installed version check`)
    return false
  }
}

export interface MarketSharedTreeUpgradeOptions {
  dshHome: string
  dshEntryPath: string
  targetVersion: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /** Retained for callers of the retired shared-tree upgrade signature. */
  pnpmRunnerPath: string
  /** Windows console-hide bootstrap restored by the pnpm shim. */
  hideConsoleBootstrapPath?: string
  note?: (line: string) => void
}

/** @deprecated Shared-tree market upgrades are retired; use the ordinary plugin upgrade flow. */
export async function upgradeMarketInSharedTree(
  _options: MarketSharedTreeUpgradeOptions
): Promise<PluginUpgradeResult> {
  return { ok: false, detail: 'Shared-tree market upgrades are retired; use the ordinary plugin upgrade flow.' }
}
