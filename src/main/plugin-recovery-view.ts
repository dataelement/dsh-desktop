import { buildRepairPlan, type RepairPlan } from './repair-policy'
import { type PluginRecoveryCheck } from './plugin-recovery-market'
import type { RuntimeSnapshot } from '../shared/contracts'

export type PluginRecoveryLocale = 'en' | 'zh'

export interface PluginRecoveryUpgradeCandidate {
  packageName: string
  targetVersion: string
  installedVersion?: string
  upgradeHint?: string
}

/**
 * The plugin market is a core bundle, so it never joins `plugins` (whose
 * removal path refuses core bundles). When the failed launch names it, the
 * page shows it as one more plugin row: upgrade it or remove it.
 */
export interface PluginRecoveryMarketCheck {
  name: string
  installedVersion?: string
  hint: string
  /** Offered only when the market check found a compatible release not yet tried. */
  upgradeLabel?: string
  removeLabel: string
}

export interface PluginRecoveryViewModel {
  locale: PluginRecoveryLocale
  brand: string
  badge: string
  heading: string
  summary: string
  reasonTitle: string
  reasonDetail: string
  plugins: string[]
  removedPlugins: string[]
  progress?: string
  notice?: string
  safetyNote: string
  primaryLabel: string
  primaryBusyLabel: string
  upgradeCandidate?: PluginRecoveryUpgradeCandidate
  pluginChecks?: PluginRecoveryCheck[]
  marketCheck?: PluginRecoveryMarketCheck
  /** The market is the only culprit: the primary button upgrades it, or removes it. */
  marketPrimary: boolean
  retryCheckLabel?: string
  autoProcessLabel?: string
  upgradeLabel?: string
  upgradeBusyLabel?: string
  upgradeHint?: string
  uninstallLabel?: string
  logLabel: string
  advancedLabel: string
  errorLabel: string
  launchDirectoryLabel: string
  launchDirectory?: string
  rawError: string
  quitLabel: string
  safeModeLabel: string
  canUninstall: boolean
  /** Only the explicit Safe Mode Agent action is available, without repair or rollback. */
  safeModeOnly: boolean
  canRepair: boolean
  offerRepairAgent: boolean
  repairDetails?: string[]
  repairDetailsLabel?: string
  rollbackVisible?: boolean
  roundAction?: string
  rollbackLabel?: string
  rollbackUnavailableReason?: string
}

interface FailureDescription {
  title: string
  detail: string
}

function displayPluginName(packageName: string): string {
  if (!packageName.startsWith('@')) return packageName
  return packageName.slice(packageName.indexOf('/') + 1)
}

function latestAttemptText(logs: readonly string[]): string {
  let startIndex = -1
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (logs[index]?.trimStart().startsWith('[desktop] starting ')) {
      startIndex = index
      break
    }
  }
  return logs.slice(startIndex + 1).join('\n')
}

export function describePluginFailure(
  logs: readonly string[],
  locale: PluginRecoveryLocale
): FailureDescription {
  const text = latestAttemptText(logs)
  if (text.includes('@deepseek-ai/dsh-workflow-worker-thread')) {
    return locale === 'zh' ? {
      title: '插件引用了旧版工作流组件',
      detail: '当前 Harness 已改用 workflow-ptc。请升级该插件以适配新版工作流引擎。'
    } : {
      title: 'A plugin references the removed workflow implementation',
      detail: 'Current Harness uses workflow-ptc. Update the owning plugin to support the new workflow engine.'
    }
  }
  const duplicateRoute = text.match(/duplicate prefix route ["']([^"']+)["']/i)?.[1]

  if (duplicateRoute) {
    return locale === 'zh'
      ? {
          title: '插件使用了重复的服务入口',
          detail: `启动日志显示 ${duplicateRoute} 被重复注册，因此 Harness 无法继续启动。`
        }
      : {
          title: 'A plugin registered a duplicate service route',
          detail: `The startup log shows that ${duplicateRoute} was registered more than once, so Harness could not continue.`
        }
  }
 
  if (/duplicate loader entry id/i.test(text)) {
    const entryId = text.match(/duplicate loader entry id:\s*([^\s]+)/i)?.[1]
    return locale === 'zh'
      ? {
          title: '插件注册了重复的服务组件',
          detail: `启动日志显示组件 ${entryId ? `"${entryId}"` : ''} 被重复定义，插件之间存在加载冲突，因此 Harness 无法继续启动。`
        }
      : {
          title: 'A plugin registered a duplicate service component',
          detail: `The startup log shows that component ${entryId ? `"${entryId}"` : ''} was registered more than once due to a plugin conflict.`
        }
  }

  if (/cannot resolve profile bundle/i.test(text)) {
    return locale === 'zh'
      ? {
          title: '插件没有完整安装',
          detail: '配置中仍然引用了这个插件，但本地找不到对应的插件包。'
        }
      : {
          title: 'The plugin is not fully installed',
          detail: 'The profile still references this plugin, but its package cannot be found locally.'
        }
  }

  if (/declares no dsh\.bundle/i.test(text)) {
    return locale === 'zh'
      ? {
          title: '安装的包不是兼容的 DSH 插件',
          detail: '这个包缺少 DSH 插件所需的入口声明，因此 Harness 无法加载。'
        }
      : {
          title: 'The package is not a compatible DSH plugin',
          detail: 'It does not declare the entry point required by Harness.'
        }
  }

  if (/single slot\s+["'][^"']+["']\s+already has a registration/i.test(text)) {
    const slotName = text.match(/single slot\s+["']([^"']+)["']/i)?.[1]
    return locale === 'zh'
      ? {
          title: '插件存在界面插槽冲突',
          detail: `检测到界面插槽 ${slotName ? `"${slotName}"` : ''} 存在重复注册，多个第三方插件试图占用相同的界面组件，导致前端无法正常渲染。`
        }
      : {
          title: 'A plugin has a UI slot conflict',
          detail: `UI slot ${slotName ? `"${slotName}"` : ''} has duplicate registrations from conflicting plugins.`
        }
  }

  if (/failed to (?:apply|import) loader entry/i.test(text)) {
    return locale === 'zh'
      ? {
          title: '插件代码加载失败',
          detail: '插件文件可能损坏、缺少依赖，或与当前 Harness 版本不兼容。'
        }
      : {
          title: 'The plugin code could not be loaded',
          detail: 'Its files may be damaged, missing a dependency, or incompatible with this Harness version.'
        }
  }

  return locale === 'zh'
    ? {
        title: '插件启动失败',
        detail: 'Harness 在加载插件时发生错误，但暂时无法自动判断更具体的原因。'
      }
    : {
        title: 'A plugin failed during startup',
        detail: 'Harness reported an error while loading a plugin, but the exact cause could not be determined automatically.'
      }
}

export function buildPluginRecoveryViewModel(options: {
  snapshot: RuntimeSnapshot
  plugins: readonly string[]
  removedPlugins: readonly string[]
  locale: PluginRecoveryLocale
  notice?: string
  upgradeCandidate?: PluginRecoveryUpgradeCandidate
  pluginChecks?: PluginRecoveryCheck[]
  repairPlan?: RepairPlan
  /** A previous repair or rollback failed; always leave the next action to the user. */
  repairAttempted?: boolean
  rollbackVersion?: string
  rollbackSimulation?: boolean
  rollbackUnavailableReason?: string
  market?: {
    installedVersion?: string
    upgradeVersion?: string
    hint?: string
  }
}): PluginRecoveryViewModel {
  const { snapshot, locale, notice, upgradeCandidate } = options
  const zh = locale === 'zh'
  const pluginPackages = [...new Set(options.plugins)]
  const plan = options.repairPlan ?? buildRepairPlan({
    plugins: [...pluginPackages, ...(options.market?.upgradeVersion ? ['dshmarket'] : [])],
    upgrades: [
      ...(options.pluginChecks ?? []).flatMap(check => check.upgradeCandidate ? [check.upgradeCandidate] : []),
      ...(upgradeCandidate ? [upgradeCandidate] : []),
      ...(options.market?.upgradeVersion ? [{ packageName: 'dshmarket', targetVersion: options.market.upgradeVersion }] : [])
    ]
  })
  const canRepair = plan.kind === 'known' && plan.action !== undefined
  const description = describePluginFailure(snapshot.logs, locale)
  const roundAction = plan.action === 'upgrade'
    ? zh ? `本轮将升级 ${plan.plugins.length} 个相关插件并重启验证。若仍未解决，下轮将停用相关插件。` : `This round updates ${plan.plugins.length} related plugins and restarts to verify. If startup still fails, the next round disables them.`
    : plan.action === 'disable'
      ? zh ? `本轮将停用 ${plan.plugins.length} 个相关插件并重启验证。插件文件和数据保留。` : `This round disables ${plan.plugins.length} related plugins and restarts to verify. Plugin files and data are kept.`
      : plan.action === 'configuration'
        ? zh ? '本轮将修复已识别的配置问题并重启验证。' : 'This round repairs the identified configuration issue and restarts to verify.'
        : undefined
  return {
    locale,
    brand: 'DSH Desktop',
    badge: zh ? '启动修复' : 'Startup recovery',
    heading: zh ? '启动遇到问题，DSH 暂时无法正常启动' : 'A startup error is preventing DSH from opening',
    summary: canRepair ? (zh ? '别着急，我们已找到可尝试的修复方案。展开查看后，同意方案可点击“一键修复”；也可以选择回退应用版本。' : 'We have a repair plan you can try. Review it below, then choose Repair now or roll back the app version.') : (zh ? '暂时无法自动修复。进入维修 Agent 模式后，将在安全模式下继续排查问题。' : 'Automatic repair is unavailable. The repair Agent will continue investigating in Safe Mode.'),
    roundAction,
    repairDetailsLabel: zh ? '查看修复方案' : 'View repair plan',
    repairDetails: canRepair ? [
      ...(roundAction ? [roundAction] : []),
      ...(plan.action === 'upgrade' ? plan.upgrades.map(candidate => zh
        ? `升级插件 ${displayPluginName(candidate.packageName)}${candidate.installedVersion ? `（当前 ${candidate.installedVersion}）` : ''} 至 ${candidate.targetVersion}`
        : `Update plugin ${displayPluginName(candidate.packageName)}${candidate.installedVersion ? ` (currently ${candidate.installedVersion})` : ''} to ${candidate.targetVersion}`)
        : plan.action === 'disable' ? plan.plugins.map(name => zh ? `停用插件 ${displayPluginName(name)}（保留插件文件和数据）` : `Disable plugin ${displayPluginName(name)} (keep files and data)`) : [])
    ] : undefined,
    rollbackVisible: plan.kind === 'known',
    reasonTitle: description.title,
    reasonDetail: description.detail,
    plugins: pluginPackages.map(displayPluginName),
    removedPlugins: [...options.removedPlugins].map(displayPluginName),
    notice: notice ?? (options.repairAttempted
      ? zh ? '上次修复后仍无法正常启动，请选择下一步。' : 'Startup still failed after the last repair. Choose what to do next.'
      : undefined),
    safetyNote: zh ? '修复不会卸载插件；你的工作区、会话和模型配置会保留。' : 'Repair does not uninstall plugins. Your workspaces, sessions and model settings are kept.',
    primaryLabel: canRepair ? zh ? '一键修复' : 'Repair now' : zh ? '让 Agent 帮我修' : 'Ask Agent to help',
    primaryBusyLabel: canRepair ? zh ? '正在执行本轮修复…' : 'Applying this repair…' : zh ? '正在进入维修 Agent…' : 'Opening repair Agent…',
    autoProcessLabel: canRepair ? zh ? '一键修复' : 'Repair now' : undefined,
    rollbackUnavailableReason: plan.kind === 'known' && !options.rollbackVersion ? options.rollbackUnavailableReason ?? (zh ? '当前没有可回退的应用版本。' : 'No app version is available to roll back to.') : undefined,
    rollbackLabel: plan.kind === 'known' && options.rollbackVersion ? zh ? `回退应用至 ${options.rollbackVersion}${options.rollbackSimulation ? '（模拟）' : ''}` : `Restore app ${options.rollbackVersion}${options.rollbackSimulation ? ' (simulation)' : ''}` : undefined,
    upgradeCandidate,
    pluginChecks: options.pluginChecks,
    marketPrimary: false,
    logLabel: zh ? '打开日志' : 'Open log',
    advancedLabel: zh ? '查看报错详情' : 'Error details',
    errorLabel: zh ? '错误信息' : 'Error details',
    launchDirectoryLabel: zh ? '启动目录' : 'Launch directory',
    launchDirectory: snapshot.launchDirectory,
    rawError: snapshot.message,
    quitLabel: zh ? '退出 DSH Desktop' : 'Quit DSH Desktop',
    safeModeLabel: zh ? '让 Agent 帮我修' : 'Ask Agent to help',
    canUninstall: false,
    canRepair,
    offerRepairAgent: false,
    safeModeOnly: !canRepair && !(plan.kind === 'known' && options.rollbackVersion)
  }
}
