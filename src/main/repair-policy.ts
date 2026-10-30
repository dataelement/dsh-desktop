import type { PluginRecoveryUpgradeCandidate } from './plugin-recovery-view'

export interface RepairAttempt {
  action: 'upgrade' | 'disable' | 'configuration'
  plugins: string[]
  versions?: Record<string, string>
  status?: 'pending' | 'restart' | 'failed' | 'verified'
}

export interface RepairPlan {
  kind: 'known' | 'unknown'
  action?: RepairAttempt['action']
  plugins: string[]
  upgrades: PluginRecoveryUpgradeCandidate[]
}

/** Agent fallback is available only after identified automatic repairs are exhausted. */
export function canOpenRecoveryAgent(plan: RepairPlan): boolean {
  return plan.kind === 'unknown' || plan.action === undefined
}

/** A round never mixes upgrades and disables: verify the restart between them. */
export function buildRepairPlan(options: {
  plugins: readonly string[]
  upgrades?: readonly PluginRecoveryUpgradeCandidate[]
  upgradeOnlyPlugins?: readonly string[]
  attempts?: readonly RepairAttempt[]
  configurationRepairable?: boolean
}): RepairPlan {
  const attempts = (options.attempts ?? []).filter(attempt => attempt.status !== 'verified')
  const disabled = new Set(attempts.filter(attempt => attempt.action === 'disable').flatMap(attempt => attempt.plugins))
  const upgradeOnly = new Set(options.upgradeOnlyPlugins ?? [])
  const allPlugins = [...new Set([...options.plugins, ...upgradeOnly])]
  const plugins = allPlugins.filter(plugin => !disabled.has(plugin))
  const upgrades = (options.upgrades ?? []).filter(candidate => plugins.includes(candidate.packageName) && !attempts.some(attempt =>
    attempt.action === 'upgrade' && attempt.versions?.[candidate.packageName] === candidate.targetVersion))
  if (upgrades.length > 0) return { kind: 'known', action: 'upgrade', plugins: upgrades.map(candidate => candidate.packageName), upgrades }
  const disablePlugins = plugins.filter(plugin => !upgradeOnly.has(plugin))
  if (disablePlugins.length > 0) return { kind: 'known', action: 'disable', plugins: disablePlugins, upgrades: [] }
  if (options.configurationRepairable && !attempts.some(attempt => attempt.action === 'configuration')) {
    return { kind: 'known', action: 'configuration', plugins: [], upgrades: [] }
  }
  return { kind: allPlugins.length > 0 || options.configurationRepairable ? 'known' : 'unknown', plugins: [], upgrades: [] }
}
