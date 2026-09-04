import {
  installGeneration,
  type GenerationInstallResult
} from 'dsh-desktop-market-installer/generations/installer'
import { projectGenerations } from 'dsh-desktop-market-installer/generations/projection'
import {
  listGenerations,
  readDesired,
  withRegistryLock,
  writeDesired
} from 'dsh-desktop-market-installer/generations/registry'

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
      nodeExecutablePath,
      pnpmEntryPath,
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
    await projectGenerations(dshHome)

    note?.(`[plugin-upgrade] successfully upgraded ${pluginName} to v${targetVersion} (${install.generation.id})`)
    return { ok: true }
  })
}
