import type { RuntimeSnapshot } from '../shared/contracts'

export type PluginRecoveryLocale = 'en' | 'zh'

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
  restartLabel: string
  restartBusyLabel: string
  logLabel: string
  advancedLabel: string
  errorLabel: string
  launchDirectoryLabel: string
  launchDirectory?: string
  rawError: string
  quitLabel: string
  canUninstall: boolean
  canResetData: boolean
  resetLabel: string
  resetBusyLabel: string
  resetDetail: string
  resetSafetyNote: string
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

  if (/failed to import loader entry/i.test(text)) {
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
}): PluginRecoveryViewModel {
  const { snapshot, locale, notice } = options
  const pluginPackages = [...new Set(options.plugins)]
  const plugins = pluginPackages.map(displayPluginName)
  const removedPlugins = [...new Set(options.removedPlugins)].map(displayPluginName)
  const canUninstall = plugins.length > 0
  const description = describePluginFailure(snapshot.logs, locale)
  const multiple = plugins.length > 1

  if (locale === 'zh') {
    return {
      locale,
      brand: 'DSH Desktop',
      badge: '启动修复',
      heading: canUninstall
        ? multiple ? `发现 ${plugins.length} 个导致启动失败的插件` : '发现导致启动失败的插件'
        : 'Harness 暂时无法启动',
      summary: canUninstall
        ? ''
        : '目前还无法定位到具体插件。可以重置 Harness 数据（自动备份后重建）后再次启动，或打开日志查看详细错误。',
      reasonTitle: description.title,
      reasonDetail: description.detail,
      plugins,
      removedPlugins,
      progress: removedPlugins.length > 0
        ? `已处理 ${removedPlugins.length} 个插件，正在继续检查剩余问题。`
        : undefined,
      notice,
      safetyNote: '工作区、会话、模型配置和其他插件不会被删除。',
      primaryLabel: canUninstall
        ? multiple ? `卸载这 ${plugins.length} 个插件并继续检测` : '卸载此插件并继续检测'
        : '重置 Harness 数据',
      primaryBusyLabel: canUninstall ? '正在处理并重新检测…' : '正在备份并重置…',
      restartLabel: '重启 Harness',
      restartBusyLabel: '正在重启…',
      logLabel: '打开 Harness 日志',
      advancedLabel: '查看技术详情',
      errorLabel: '错误信息',
      launchDirectoryLabel: '启动目录',
      launchDirectory: snapshot.launchDirectory,
      rawError: snapshot.message,
      quitLabel: '退出 DSH Desktop',
      canUninstall,
      canResetData: !canUninstall,
      resetLabel: '重置 Harness 数据',
      resetBusyLabel: '正在备份并重置…',
      resetDetail: '备份当前的 Harness 数据后重新创建一个干净的工作目录，再自动尝试启动。',
      resetSafetyNote: '会先备份当前数据再清理；工作区和模型配置会被保留。'
    }
  }

  return {
    locale,
    brand: 'DSH Desktop',
    badge: 'Startup recovery',
    heading: canUninstall
      ? multiple ? `${plugins.length} plugins are preventing startup` : 'A plugin is preventing startup'
      : 'Harness could not start',
    summary: canUninstall
      ? ''
      : 'No specific plugin could be identified. Reset Harness data to back up the current directory and recreate a clean working folder, or open the log to inspect the detailed error.',
    reasonTitle: description.title,
    reasonDetail: description.detail,
    plugins,
    removedPlugins,
    progress: removedPlugins.length > 0
      ? `${removedPlugins.length} plugin${removedPlugins.length === 1 ? '' : 's'} handled. Checking for remaining issues.`
      : undefined,
    notice,
    safetyNote: 'Your workspaces, sessions, model settings, and other plugins will not be removed.',
    primaryLabel: canUninstall
      ? multiple ? `Remove these ${plugins.length} plugins and continue` : 'Remove this plugin and continue'
      : 'Reset Harness data',
    primaryBusyLabel: canUninstall ? 'Removing and checking again…' : 'Backing up and resetting…',
    restartLabel: 'Restart Harness',
    restartBusyLabel: 'Restarting…',
    logLabel: 'Open Harness log',
    advancedLabel: 'View technical details',
    errorLabel: 'Error details',
    launchDirectoryLabel: 'Launch directory',
    launchDirectory: snapshot.launchDirectory,
    rawError: snapshot.message,
    quitLabel: 'Quit DSH Desktop',
    canUninstall,
    canResetData: !canUninstall,
    resetLabel: 'Reset Harness data',
    resetBusyLabel: 'Backing up and resetting…',
    resetDetail: 'Back up the current Harness data and recreate a clean working folder, then retry startup automatically.',
    resetSafetyNote: 'Backs up existing data first; your workspaces and model settings will be preserved.'
  }
}
