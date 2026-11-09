import { disableProfilePlugin } from '../profile/plugin-disable'
import type { PluginRecoveryLocale } from '../plugin-recovery-view'
import { readStartupRecoveryNavigation, startupRecoveryPageUrl, startupRecoveryViewModel } from './startup-recovery'

export interface StartupRecoverySessionOptions {
  dshHome: string
  profile: string
  message: string
  plugins: readonly string[]
  launchDirectory: string
  locale: PluginRecoveryLocale
  operationLines?: readonly string[]
  theme: string
  show: (url: string) => void
  nextAction: () => Promise<unknown>
  relaunch: () => void
  quit: () => void
  openLog: () => void
  isQuitting: () => boolean
}

/**
 * Show the existing startup recovery page for plugins named by a failed launch.
 * The only repair is disabling those plugins on the named profile and relaunching.
 * The repair agent, plugin upgrades and uninstall backups stay on the previous shell.
 */
export async function runStartupRecovery(options: StartupRecoverySessionOptions): Promise<void> {
  const plugins = [...options.plugins]
  let notice: string | undefined
  let seq = 0
  while (!options.isQuitting()) {
    seq += 1
    options.show(startupRecoveryPageUrl(startupRecoveryViewModel({
      message: options.message,
      plugins,
      launchDirectory: options.launchDirectory,
      locale: options.locale,
      ...(options.operationLines === undefined ? {} : { operationLines: options.operationLines }),
      ...(notice === undefined ? {} : { notice })
    }), String(seq), options.theme))
    notice = undefined
    const action = readStartupRecoveryNavigation(String(await options.nextAction()))
    if (options.isQuitting()) return
    if (action === 'quit') {
      options.quit()
      return
    }
    if (action === 'show-log') {
      options.openLog()
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
    if (action !== 'auto-process') {
      notice = options.locale === 'zh' ? '这个操作还不可用。' : 'That action is not available.'
      continue
    }
    const failed: string[] = []
    for (const plugin of plugins) {
      const result = await disableProfilePlugin(options.dshHome, plugin, options.profile)
      if (!result.ok) failed.push(`${plugin}: ${result.detail}`)
    }
    if (failed.length > 0) {
      notice = failed.join('\n')
      continue
    }
    options.relaunch()
    return
  }
}
