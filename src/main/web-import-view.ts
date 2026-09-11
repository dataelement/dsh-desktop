import type { WebHomePreview } from './state/web-home-import'

export type WebImportLocale = 'en' | 'zh'

export interface WebImportViewModel {
  locale: WebImportLocale
  brand: string
  badge: string
  heading: string
  summary: string
  stats: string[]
  plugins: string[]
  pluginsLabel?: string
  safetyNote: string
  primaryLabel: string
  primaryBusyLabel: string
  secondaryLabel: string
  notice?: string
}

export function buildWebImportViewModel(options: {
  locale: WebImportLocale
  preview: WebHomePreview
  notice?: string
}): WebImportViewModel {
  const zh = options.locale === 'zh'
  const sessionCount = options.preview.sessionCount ?? 0
  const workspaceCount = options.preview.workspaceCount ?? 0
  const presetCount = options.preview.presetCount ?? 0
  const plugins = [...(options.preview.plugins ?? [])]
  const stats = zh
    ? [
        `${sessionCount} 个会话`,
        `${workspaceCount} 个工作区`,
        `${presetCount} 个自定义 Preset`,
        options.preview.hasCredentials ? '已保存模型密钥' : '未检测到模型密钥'
      ]
    : [
        `${sessionCount} session${sessionCount === 1 ? '' : 's'}`,
        `${workspaceCount} workspace${workspaceCount === 1 ? '' : 's'}`,
        `${presetCount} custom preset${presetCount === 1 ? '' : 's'}`,
        options.preview.hasCredentials ? 'Model credentials found' : 'No model credentials found'
      ]

  return {
    locale: options.locale,
    brand: 'DSH Desktop',
    badge: zh ? '导入' : 'Import',
    heading: zh ? '发现网页版数据' : 'Web Harness data found',
    summary: zh
      ? '本机已有 DeepSeek Harness 网页版数据。导入后桌面与网页版各自独立，网页版数据不会被改写。'
      : 'This computer already has DeepSeek Harness web data. Import copies it once; the web home is left unchanged and the two copies stay independent.',
    stats,
    plugins,
    pluginsLabel: plugins.length > 0
      ? zh
        ? `将重装 ${plugins.length} 个社区插件`
        : `${plugins.length} community plugin${plugins.length === 1 ? '' : 's'} will be reinstalled`
      : undefined,
    safetyNote: zh
      ? '只复制会话、设置、密钥和工作区清单。网页版可以继续使用。'
      : 'Only sessions, settings, credentials, and workspace records are copied. The web copy remains usable.',
    primaryLabel: zh ? '导入并继续' : 'Import and continue',
    primaryBusyLabel: zh ? '正在导入…' : 'Importing…',
    secondaryLabel: zh ? '从空白开始' : 'Start empty',
    notice: options.notice
  }
}
