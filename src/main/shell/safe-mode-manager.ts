import { buildSafeModeViewModel, type SafeModeLocale } from '../safe-mode'
import type { PluginHealthReport } from '../recovery/plugin-market-check'
import type { PluginRemovalBackup } from '../profile/plugin-removal'
import {
  disableProfilePlugin,
  enableProfilePlugin,
  listDisabledProfilePlugins
} from '../profile/plugin-disable'
import { listInstalledProfilePlugins } from '../recovery/plugin-recovery'
import { readSafeModeManagerAction, safeModePageUrl } from './safe-mode-page'

export interface SafeModeManagerOptions {
  dshHome: string
  profile: string
  locale: SafeModeLocale
  theme: string
  show: (url: string) => void
  nextAction: () => Promise<{ action: unknown; selection: unknown }>
  quit: () => void
  exitSafeMode: () => void
  /** Opens a repair session on the running Host. Absent callers keep the old notice. */
  openAgent?: (prompt: string | undefined) => Promise<{ ok: boolean; error?: string }>
  loadBackups?: () => Promise<readonly PluginRemovalBackup[]>
  loadHealthReports?: () => Promise<readonly PluginHealthReport[]>
  upgradePlugins?: (plugins: readonly string[]) => Promise<{ ok: boolean; notice: string }>
  openRecoveryDirectory?: () => Promise<{ ok: boolean; notice: string }>
  openBackup?: (removalId: string) => Promise<{ ok: boolean; notice: string }>
  restoreBackup?: (removalId: string) => Promise<{ ok: boolean; notice: string }>
  deleteBackup?: (removalId: string) => Promise<{ ok: boolean; notice: string }>
  isQuitting: () => boolean
}

/**
 * Show the existing Safe Mode page over the running core profile.
 * Disable and re-enable write the normal profile. Leaving Safe Mode is a
 * relaunch without `--safe-mode`. When `openAgent` is connected, the repair
 * link opens a session on this Host and the page steps aside. Upgrade and
 * backup handlers write the named profile. Shortcuts, the sidebar browser and
 * file drag stay unwired.
 */
export async function runSafeModeManager(options: SafeModeManagerOptions): Promise<void> {
  let notice: string | undefined
  let noticeTone: 'success' | 'error' | undefined
  let seq = 0
  while (!options.isQuitting()) {
    const plugins = await listInstalledProfilePlugins(options.dshHome, options.profile)
    const disabled = await listDisabledProfilePlugins(options.dshHome, plugins, options.profile)
    const backups = await options.loadBackups?.().catch(() => []) ?? []
    const healthReports = await options.loadHealthReports?.().catch(() => []) ?? []
    const model = buildSafeModeViewModel({
      locale: options.locale,
      plugins,
      disabledPlugins: disabled,
      backups,
      healthReports,
      notice,
      noticeTone
    })
    notice = undefined
    noticeTone = undefined
    seq += 1
    options.show(safeModePageUrl(model, String(seq), options.theme))
    const incoming = await options.nextAction()
    if (options.isQuitting()) return
    const action = readSafeModeManagerAction(incoming.action, incoming.selection)
    if (action === undefined) {
      notice = options.locale === 'zh' ? '这个操作还不可用。' : 'That action is not available.'
      noticeTone = 'error'
      continue
    }
    if (action.type === 'quit') {
      options.quit()
      return
    }
    if (action.type === 'restart') {
      options.exitSafeMode()
      return
    }
    if (action.type === 'agent') {
      if (options.openAgent === undefined) {
        notice = options.locale === 'zh'
          ? '智能修复代理还没有接上。这一页可以停用或重新启用插件。'
          : 'The repair agent is not connected. This page can disable or re-enable plugins.'
        noticeTone = 'error'
        continue
      }
      const opened = await options.openAgent(action.prompt)
      if (options.isQuitting()) return
      if (opened.ok) return
      notice = opened.error ?? (options.locale === 'zh'
        ? '无法打开智能修复 Agent 会话。'
        : 'The repair agent session could not be opened.')
      noticeTone = 'error'
      continue
    }
    if (action.type === 'recovery-open' || action.type === 'backup-open' || action.type === 'backup-restore' || action.type === 'backup-delete' || action.type === 'upgrade') {
      // Maintenance failures must not take down the running recovery Host.
      const result = await runMaintenance(options, action).catch((error: unknown) => {
        console.error(`[safe-mode] ${action.type} failed`, error)
        const detail = error instanceof Error ? error.message : String(error)
        return {
          ok: false,
          notice: options.locale === 'zh' ? `操作失败：${detail}` : `Operation failed: ${detail}`
        }
      })
      if (options.isQuitting()) return
      notice = result.notice
      noticeTone = result.ok ? 'success' : 'error'
      continue
    }
    const selectable = action.type === 'enable'
      ? disabled
      : plugins.filter(name => !disabled.includes(name))
    const targets = action.plugins.filter(name => selectable.includes(name))
    if (targets.length === 0) {
      notice = options.locale === 'zh' ? '请选择要处理的插件。' : 'Select at least one plugin.'
      noticeTone = 'error'
      continue
    }
    const failed: string[] = []
    for (const plugin of targets) {
      const result = action.type === 'enable'
        ? await enableProfilePlugin(options.dshHome, plugin, options.profile)
        : await disableProfilePlugin(options.dshHome, plugin, options.profile)
      if (!result.ok) failed.push(plugin)
    }
    notice = failed.length === 0
      ? changedNotice(options.locale, action.type, targets.length)
      : options.locale === 'zh'
        ? `以下插件未能处理：${failed.join('、')}`
        : `These plugins could not be changed: ${failed.join(', ')}`
    noticeTone = failed.length === 0 ? 'success' : 'error'
  }
}

async function runMaintenance(
  options: SafeModeManagerOptions,
  action: { type: 'upgrade'; plugins: string[] } | { type: 'recovery-open' } | { type: 'backup-open'; removalId: string } | { type: 'backup-restore'; removalId: string } | { type: 'backup-delete'; removalId: string }
): Promise<{ ok: boolean; notice: string }> {
  const zh = options.locale === 'zh'
  const unavailable = zh ? '这个操作还不可用。' : 'That action is not available.'
  if (action.type === 'upgrade') {
    if (options.upgradePlugins === undefined) return { ok: false, notice: unavailable }
    return options.upgradePlugins(action.plugins)
  }
  if (action.type === 'recovery-open') {
    if (options.openRecoveryDirectory === undefined) return { ok: false, notice: unavailable }
    return options.openRecoveryDirectory()
  }
  if (action.type === 'backup-open') {
    if (options.openBackup === undefined) return { ok: false, notice: unavailable }
    return options.openBackup(action.removalId)
  }
  if (action.type === 'backup-restore') {
    if (options.restoreBackup === undefined) return { ok: false, notice: unavailable }
    return options.restoreBackup(action.removalId)
  }
  if (options.deleteBackup === undefined) return { ok: false, notice: unavailable }
  return options.deleteBackup(action.removalId)
}

function changedNotice(locale: SafeModeLocale, action: 'apply' | 'enable', count: number): string {
  if (locale === 'zh') {
    return action === 'enable'
      ? `已重新启用 ${count} 个插件，退出安全模式后生效。`
      : `已停用 ${count} 个插件，退出安全模式后生效。`
  }
  const noun = count === 1 ? 'plugin' : 'plugins'
  return action === 'enable'
    ? `Re-enabled ${count} ${noun}; they load after you exit Safe Mode.`
    : `Disabled ${count} ${noun}; they stay off after you exit Safe Mode.`
}
