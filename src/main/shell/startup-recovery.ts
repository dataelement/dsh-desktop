import { desktopResourceUrl, resolveDesktopResourceName } from '../desktop-protocol'
import { checkBlockingPluginUpdates } from '../plugin-recovery-market'
import { buildPluginRecoveryViewModel, type PluginRecoveryLocale, type PluginRecoveryViewModel } from '../plugin-recovery-view'
import { evaluatePluginMarketCompatibility } from '../recovery/plugin-market-check'
import { readRepairJournal, recordRepairAttempt, repairAttemptsForVersion } from '../recovery/repair-job'
import { extractPluginFailureReferences } from '../recovery/harness-log'
import { buildRepairPlan, type RepairAttempt, type RepairPlan } from '../repair-policy'
import { installedPluginVersion } from './plugin-maintenance'

const RECOVERY_PAGE = 'plugin-recovery.html'
const PACKAGE_BOUNDARY = '[^A-Za-z0-9._@/-]'

export type StartupRecoveryAction = 'auto-process' | 'quit' | 'show-log' | 'rollback' | 'agent'

/**
 * Installed third-party packages named by this failure.
 * An explicit loader reference in the short message or Host diagnostic wins.
 * When one exists but none of those packages are installed, other names in the
 * text are not added. Whole-token matching stays on the short message, and
 * only when the text has no explicit reference.
 */
export function startupRecoveryTargets(
  message: string,
  installed: readonly string[],
  diagnostic = ''
): string[] {
  const explicit = explicitRecoveryReferences(message, diagnostic)
  if (explicit.length > 0) {
    const allowed = new Set(installed)
    return [...new Set(explicit.filter(name => allowed.has(name)))]
  }
  return installed.filter(name => mentionsPackage(message, name))
}

/** Adapt bare Host text to the log extractor, which only reads `[stderr] ` lines. */
function explicitRecoveryReferences(message: string, diagnostic: string): string[] {
  const text = [message, diagnostic].filter(part => part.length > 0).join('\n')
  if (text.length === 0) return []
  const lines = text.split(/\r?\n/).map(line => line.startsWith('[stderr] ') ? line : `[stderr] ${line}`)
  return extractPluginFailureReferences(lines)
}

export function isStartupRecoveryPageUrl(rawUrl: string): boolean {
  return resolveDesktopResourceName(rawUrl) === RECOVERY_PAGE
}

/** The existing page navigates here when the recovery bridge is absent. */
export function readStartupRecoveryNavigation(rawUrl: string): StartupRecoveryAction | undefined {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return undefined
  }
  if (url.protocol !== 'dsh-recovery:') return undefined
  if (url.hostname === 'auto-process' || url.hostname === 'quit' || url.hostname === 'show-log'
    || url.hostname === 'rollback' || url.hostname === 'agent') return url.hostname
  return undefined
}

export function startupRecoveryPageUrl(model: PluginRecoveryViewModel, seq: string, theme: string): string {
  return desktopResourceUrl(RECOVERY_PAGE, {
    state: JSON.stringify(model),
    theme,
    seq
  })
}

/** The existing recovery page. One round is either the untried upgrade or a disable. */
export function startupRecoveryViewModel(options: {
  message: string
  plugins: readonly string[]
  launchDirectory: string
  locale: PluginRecoveryLocale
  notice?: string
  logs?: readonly string[]
  plan?: RepairPlan
}): PluginRecoveryViewModel {
  return buildPluginRecoveryViewModel({
    snapshot: {
      phase: 'failed',
      message: options.message,
      launchDirectory: options.launchDirectory,
      logs: [...(options.logs ?? [options.message])]
    },
    plugins: options.plugins,
    removedPlugins: [],
    locale: options.locale,
    ...(options.notice === undefined ? {} : { notice: options.notice }),
    ...(options.plan === undefined ? {} : { repairPlan: options.plan })
  })
}

/**
 * Choose this round from the market and the repair journal.
 * An upgrade version already recorded for this app version is not offered again.
 */
export async function loadStartupRecoveryPlan(options: {
  dshHome: string
  profile: string
  plugins: readonly string[]
  appVersion: string
  runtimeVersion: string
  locale: PluginRecoveryLocale
  fetchFn?: typeof fetch
}): Promise<RepairPlan> {
  let attempts: RepairAttempt[] = []
  try {
    attempts = repairAttemptsForVersion(await readRepairJournal(options.dshHome), options.appVersion)
  } catch (error) {
    console.error(error)
  }
  const checks = await checkBlockingPluginUpdates({
    plugins: options.plugins,
    attemptedUpgrades: attemptedUpgradeVersions(attempts),
    locale: options.locale,
    check: async plugin => evaluatePluginMarketCompatibility({
      packageName: plugin,
      installedVersion: await installedPluginVersion(options.dshHome, options.profile, plugin),
      currentRuntimeVersion: options.runtimeVersion,
      hasLocalIssue: true,
      locale: options.locale,
      timeoutMs: 2_500,
      ...(options.fetchFn === undefined ? {} : { fetchFn: options.fetchFn })
    })
  })
  return buildRepairPlan({
    plugins: options.plugins,
    upgrades: checks.flatMap(check => check.upgradeCandidate ? [check.upgradeCandidate] : []),
    attempts
  })
}

/** Persist the round before its side effect, then update the same record with the result. */
export function recordStartupRepairRound(
  dshHome: string,
  appVersion: string,
  plan: RepairPlan,
  status: 'pending' | 'restart' | 'failed'
): Promise<void> {
  if (plan.action !== 'upgrade' && plan.action !== 'disable') return Promise.resolve()
  const versions = Object.fromEntries(plan.upgrades.map(candidate => [candidate.packageName, candidate.targetVersion]))
  return recordRepairAttempt(dshHome, {
    key: JSON.stringify([appVersion, plan.action, [...plan.plugins].sort(), versions]),
    action: plan.action,
    appVersion,
    plugins: [...plan.plugins],
    versions,
    status
  }).then(() => undefined)
}

function attemptedUpgradeVersions(attempts: readonly RepairAttempt[]): Map<string, string> {
  const versions = new Map<string, string>()
  for (const attempt of attempts) {
    if (attempt.action !== 'upgrade' || attempt.status === 'verified' || attempt.versions === undefined) continue
    for (const [name, version] of Object.entries(attempt.versions)) {
      if (version !== '') versions.set(name, version)
    }
  }
  return versions
}

function mentionsPackage(message: string, name: string): boolean {
  if (name.length === 0) return false
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|${PACKAGE_BOUNDARY})${escaped}(?=$|${PACKAGE_BOUNDARY})`).test(message)
}
