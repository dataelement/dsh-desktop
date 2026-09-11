import type { PluginHealthReport, PluginUpgradeCandidate } from './state/plugin-market-check'
import type { ProfileCompatibilityIssue } from './state/profile-compatibility'

/** Successful installs invalidate the old failure evidence for that plugin.
 * A fresh launch or a current blocking inspection can establish a new failure.
 */
export class PluginRecoveryEvidence {
  private repaired = new Set<string>()
  private blockers: string[] = []

  installed(plugin: string): void { this.repaired.add(plugin) }
  inspect(issues: readonly ProfileCompatibilityIssue[]): void {
    this.blockers = issues.filter(issue => issue.severity === 'blocking' && issue.resolution === 'disable-plugin')
      .map(issue => issue.target)
  }
  freshLaunch(): void { this.repaired.clear(); this.blockers = [] }
  targets(detected: readonly string[], removed: readonly string[]): string[] {
    return [...new Set([...detected.filter(plugin => !this.repaired.has(plugin)), ...this.blockers])]
      .filter(plugin => !removed.includes(plugin))
  }
}

/** Use this screen's chosen versions, serially, and preserve partial success. */
export async function runPluginRecoveryUpgrades(
  candidates: readonly PluginUpgradeCandidate[],
  upgrade: (candidate: PluginUpgradeCandidate) => Promise<{ ok: boolean; detail?: string }>
): Promise<Array<{ candidate: PluginUpgradeCandidate; ok: boolean; detail?: string }>> {
  const results = []
  for (const candidate of candidates) {
    try { results.push({ candidate, ...await upgrade(candidate) }) }
    catch (error) { results.push({ candidate, ok: false, detail: error instanceof Error ? error.message : String(error) }) }
  }
  return results
}

export interface PluginRecoveryCheck {
  packageName: string
  hint: string
  upgradeCandidate?: PluginUpgradeCandidate
  removalRecommended?: boolean
}

export function planPluginRecovery(checks: readonly PluginRecoveryCheck[]): {
  upgrades: PluginUpgradeCandidate[]; removals: string[]; skipped: string[]
} {
  const upgrades: PluginUpgradeCandidate[] = []
  const removals: string[] = []
  const skipped: string[] = []
  for (const check of checks) {
    if (check.upgradeCandidate) upgrades.push(check.upgradeCandidate)
    else if (check.removalRecommended) removals.push(check.packageName)
    else skipped.push(check.packageName)
  }
  return { upgrades, removals, skipped }
}

export async function runPluginRecoveryPlan(
  plan: ReturnType<typeof planPluginRecovery>,
  handlers: {
    upgrade: (candidate: PluginUpgradeCandidate) => Promise<{ ok: boolean; detail?: string }>
    remove: (plugin: string) => Promise<{ removed: boolean; pending?: boolean; detail?: string }>
  }
) {
  const upgrades = await runPluginRecoveryUpgrades(plan.upgrades, handlers.upgrade)
  const removals = []
  for (const plugin of plan.removals) {
    try { removals.push({ plugin, ...await handlers.remove(plugin) }) }
    catch (error) { removals.push({ plugin, removed: false, detail: error instanceof Error ? error.message : String(error) }) }
  }
  return { upgrades, removals }
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
        upgradeCandidate,
        removalRecommended: attempted || report.healthStatus === 'incompatible-no-fix'
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
