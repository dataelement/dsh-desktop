import type { PluginHealthReport, PluginUpgradeCandidate } from './state/plugin-market-check'

export interface PluginRecoveryCheck {
  packageName: string
  hint: string
  upgradeCandidate?: PluginUpgradeCandidate
}

/** Keep one failed registry check from hiding the other blocking plugins. */
export async function checkBlockingPluginUpdates(options: {
  plugins: readonly string[]
  check: (plugin: string) => Promise<PluginHealthReport>
  attemptedUpgrades: ReadonlyMap<string, string>
  locale: 'zh' | 'en'
}): Promise<PluginRecoveryCheck[]> {
  return Promise.all([...new Set(options.plugins)].map(async (packageName) => {
    try {
      const report = await options.check(packageName)
      const attempted = report.upgradeVersion !== undefined &&
        options.attemptedUpgrades.get(packageName) === report.upgradeVersion
      const upgradeCandidate = report.upgradeReady && report.upgradeVersion && !attempted
        ? { packageName, targetVersion: report.upgradeVersion, installedVersion: report.installedVersion, upgradeHint: report.detail }
        : undefined
      return {
        packageName,
        hint: attempted
          ? options.locale === 'zh' ? '已尝试此版本，仍有启动问题，请卸载此插件并继续检测。' : 'This version was already attempted; remove the plugin and continue checking.'
          : report.detail ?? report.healthLabel,
        upgradeCandidate
      }
    } catch {
      return {
        packageName,
        hint: options.locale === 'zh' ? '未能检查更新，可卸载此插件或进入安全模式。' : 'Update check failed; remove this plugin or enter Safe Mode.'
      }
    }
  }))
}

/** Resolve only exact package identities in this recovery screen's allowlist. */
export function selectPluginRecoveryTarget(action: string, plugins: readonly string[]): { type: 'upgrade' | 'uninstall'; plugin: string } | undefined {
  const match = /^(upgrade|uninstall):(.+)$/.exec(action)
  if (!match || !plugins.includes(match[2]!)) return undefined
  return { type: match[1] as 'upgrade' | 'uninstall', plugin: match[2]! }
}
