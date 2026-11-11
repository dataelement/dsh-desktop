import { desktopResourceUrl, resolveDesktopResourceName } from '../desktop-protocol'
import { extractPluginFailureReferences } from '../recovery/harness-log'
import type { PluginRecoveryLocale, PluginRecoveryViewModel } from '../plugin-recovery-view'

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

export function startupRecoveryViewModel(options: {
  message: string
  plugins: readonly string[]
  launchDirectory: string
  locale: PluginRecoveryLocale
  notice?: string
  operationLines?: readonly string[]
}): PluginRecoveryViewModel {
  const zh = options.locale === 'zh'
  return {
    locale: options.locale,
    brand: 'DSH Desktop',
    badge: zh ? '启动修复' : 'Startup recovery',
    heading: zh ? '启动遇到问题，DSH 暂时无法正常启动' : 'A startup error is preventing DSH from opening',
    summary: operationSummary(zh, options.operationLines ?? []),
    reasonTitle: zh ? '插件启动失败' : 'A plugin failed during startup',
    reasonDetail: zh
      ? '相关插件会在这一轮被停用，文件和数据会保留。'
      : 'The related plugins are disabled in this round. Files and data are kept.',
    plugins: [...options.plugins],
    removedPlugins: [],
    ...(options.notice === undefined ? {} : { notice: options.notice }),
    safetyNote: zh
      ? '停用不会卸载插件；你的工作区、会话和模型配置会保留。'
      : 'Disabling does not uninstall plugins. Your workspaces, sessions and model settings are kept.',
    primaryLabel: zh ? '停用并重启' : 'Disable and restart',
    primaryBusyLabel: zh ? '正在停用并重启…' : 'Disabling and restarting…',
    marketPrimary: false,
    logLabel: zh ? '打开日志' : 'Open log',
    advancedLabel: zh ? '查看报错详情' : 'Error details',
    errorLabel: zh ? '错误信息' : 'Error details',
    launchDirectoryLabel: zh ? '启动目录' : 'Launch directory',
    launchDirectory: options.launchDirectory,
    rawError: operationError(options.message, zh, options.operationLines ?? []),
    quitLabel: zh ? '退出 DSH Desktop' : 'Quit DSH Desktop',
    safeModeLabel: zh ? '进入安全模式' : 'Enter Safe Mode',
    canUninstall: false,
    safeModeOnly: false,
    canRepair: true,
    offerRepairAgent: false,
    repairDetailsLabel: zh ? '查看修复方案' : 'View repair plan',
    repairDetails: [
      ...options.plugins.map(name => zh
        ? `停用插件 ${name}（保留插件文件和数据）`
        : `Disable plugin ${name} (keep files and data)`),
      ...(options.operationLines ?? []).map(line => zh ? `插件操作 ${line}` : `Plugin operation ${line}`)
    ],
    rollbackVisible: false
  }
}

function operationSummary(zh: boolean, lines: readonly string[]): string {
  const base = zh
    ? '这一轮会停用相关插件并重新启动。插件文件和数据会保留。'
    : 'This round disables the related plugins and restarts. Plugin files and data are kept.'
  if (lines.length === 0) return base
  return zh
    ? `${base} 修复方案里列出最近 ${String(lines.length)} 条插件操作。`
    : `${base} The repair plan lists the latest ${String(lines.length)} plugin operations.`
}

function operationError(message: string, zh: boolean, lines: readonly string[]): string {
  if (lines.length === 0) return message
  return `${message}\n\n${zh ? '最近的插件操作' : 'Recent plugin operations'}\n${lines.join('\n')}`
}

function mentionsPackage(message: string, name: string): boolean {
  if (name.length === 0) return false
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|${PACKAGE_BOUNDARY})${escaped}(?=$|${PACKAGE_BOUNDARY})`).test(message)
}
