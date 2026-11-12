import { disableProfilePlugin } from '../profile/plugin-disable'
import type { PluginRecoveryLocale } from '../plugin-recovery-view'
import { buildRepairPlan, type RepairPlan } from '../repair-policy'
import { readStartupRecoveryNavigation, startupRecoveryPageUrl, startupRecoveryViewModel } from './startup-recovery'

/** A navigation from the recovery page, or an explicit cancellation. Cancellation is not an action. */
export type RecoveryActionResult =
  | { readonly kind: 'action'; readonly url: string }
  | { readonly kind: 'cancelled' }

export interface StartupRecoverySessionOptions {
  dshHome: string
  profile: string
  message: string
  plugins: readonly string[]
  launchDirectory: string
  locale: PluginRecoveryLocale
  /** Host failure lines already collected. The page classifies these; it does not invent a plan from them. */
  logs?: readonly string[]
  /** Reads the market and the repair journal. Defaults to disabling the named plugins. */
  loadPlan?: () => Promise<RepairPlan>
  upgradePlugin?: (name: string, version: string) => Promise<{ ok: boolean; detail?: string }>
  recordRound?: (plan: RepairPlan, status: 'pending' | 'restart' | 'failed') => Promise<void>
  theme: string
  /** True when the recovery page is open. False and a rejection are both a failed presentation. */
  show: (url: string) => boolean | Promise<boolean>
  /**
   * Install this round's receiver before the page loads.
   * `deliver` accepts one navigation. `cancel` ends the wait.
   * The returned function removes only this round's receiver and listeners.
   */
  bindRound: (deliver: (url: string) => void, cancel: () => void) => () => void
  relaunch: () => void
  quit: () => void
  openLog: () => void
  /** Normal shutdown. A destroyed window by itself is not a shutdown. */
  isQuitting: () => boolean
}

interface RecoveryRound {
  promise: Promise<RecoveryActionResult>
  deliver: (url: string) => void
  cancel: () => void
  current: () => RecoveryActionResult | undefined
}

/**
 * Show the existing startup recovery page for plugins named by a failed launch.
 * One click runs the current round: upgrade a compatible version, or disable when that version was already tried.
 */
export async function runStartupRecovery(options: StartupRecoverySessionOptions): Promise<void> {
  const plugins = [...options.plugins]
  let notice: string | undefined
  let seq = 0
  while (!options.isQuitting()) {
    seq += 1
    const plan = await (options.loadPlan ?? (async () => buildRepairPlan({ plugins })))()
    const url = startupRecoveryPageUrl(startupRecoveryViewModel({
      message: options.message,
      plugins,
      launchDirectory: options.launchDirectory,
      locale: options.locale,
      plan,
      ...(options.logs === undefined ? {} : { logs: options.logs }),
      ...(notice === undefined ? {} : { notice })
    }), String(seq), options.theme)
    const round = createRecoveryRound()
    const unbind = options.bindRound(round.deliver, round.cancel)
    let detached = false
    const detach = (): void => {
      if (detached) return
      detached = true
      unbind()
    }
    let opened = false
    try {
      try {
        opened = await options.show(url)
      } catch (error) {
        round.cancel()
        if (options.isQuitting()) return
        throw error
      }
      if (options.isQuitting()) return
      const early = round.current()
      if (early?.kind === 'cancelled' || !opened) {
        round.cancel()
        // The page never became usable. Closing during shutdown stays quiet.
        if (!opened && !options.isQuitting()) throw new Error('The startup recovery page did not open')
        return
      }
      const outcome = early ?? await round.promise
      // The first result owns the round. Later clicks, navigations and close events do not run again.
      detach()
      if (outcome.kind === 'cancelled') return
      const action = readStartupRecoveryNavigation(outcome.url)
      if (options.isQuitting()) return
      if (action === 'quit') {
        options.quit()
        return
      }
      if (action === 'show-log') {
        options.openLog()
        notice = undefined
        continue
      }
      if (action === 'agent') {
        notice = options.locale === 'zh'
          ? '修复代理要等应用重新启动后，从侧边栏或安全模式页打开。这一页可以停用相关插件并重新启动。'
          : 'Open the repair agent from the sidebar or the Safe Mode page after the app restarts. This page can disable the related plugins and restart.'
        continue
      }
      if (action === 'rollback') {
        notice = options.locale === 'zh'
          ? '应用版本回退还在更新卡片。这一页可以停用相关插件并重新启动。'
          : 'App rollback stays on the update card. This page can disable the related plugins and restart.'
        continue
      }
      if (action !== 'auto-process' || plan.action === undefined) {
        notice = options.locale === 'zh' ? '这个操作还不可用。' : 'That action is not available.'
        continue
      }
      if (plan.action === 'upgrade') {
        try {
          await options.recordRound?.(plan, 'pending')
        } catch (error) {
          notice = error instanceof Error ? error.message : String(error)
          continue
        }
        const failed: string[] = []
        for (const candidate of plan.upgrades) {
          try {
            const result = options.upgradePlugin === undefined
              ? { ok: false, detail: candidate.packageName }
              : await options.upgradePlugin(candidate.packageName, candidate.targetVersion)
            if (!result.ok) failed.push(result.detail ?? candidate.packageName)
          } catch (error) {
            failed.push(error instanceof Error ? error.message : String(error))
          }
        }
        try {
          await options.recordRound?.(plan, failed.length > 0 ? 'failed' : 'restart')
        } catch (error) {
          console.error(error)
        }
        if (failed.length > 0) {
          notice = failed.join('\n')
          continue
        }
        options.relaunch()
        return
      }
      if (plan.action !== 'disable') {
        notice = options.locale === 'zh' ? '这个操作还不可用。' : 'That action is not available.'
        continue
      }
      const failed: string[] = []
      for (const plugin of plan.plugins) {
        const result = await disableProfilePlugin(options.dshHome, plugin, options.profile)
        if (!result.ok) failed.push(`${plugin}: ${result.detail}`)
      }
      if (failed.length > 0) {
        notice = failed.join('\n')
        continue
      }
      try {
        await options.recordRound?.(plan, 'restart')
      } catch (error) {
        console.error(error)
      }
      options.relaunch()
      return
    } finally {
      round.cancel()
      detach()
    }
  }
}

function createRecoveryRound(): RecoveryRound {
  let settled: RecoveryActionResult | undefined
  let resolve: (result: RecoveryActionResult) => void = () => undefined
  const promise = new Promise<RecoveryActionResult>(done => { resolve = done })
  const finish = (result: RecoveryActionResult): void => {
    if (settled !== undefined) return
    settled = result
    resolve(result)
  }
  return {
    promise,
    deliver: url => { finish({ kind: 'action', url }) },
    cancel: () => { finish({ kind: 'cancelled' }) },
    current: () => settled
  }
}
