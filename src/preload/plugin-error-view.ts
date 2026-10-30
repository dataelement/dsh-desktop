import type { UpdateLocale } from './update-view'

export function isPluginLoadError(error: unknown): boolean {
  if (!error) return false
  const message =
    error instanceof Error
      ? `${error.message}\n${error.stack ?? ''}`
      : typeof error === 'string'
        ? error
        : typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : typeof (error as { reason?: unknown }).reason === 'string'
            ? (error as { reason: string }).reason
            : String((error as { reason?: { message?: unknown } }).reason?.message ?? '')

  return (
    /client-modules:\s*bundle\s*script\s*.*failed\s*to\s*load/i.test(message) ||
    /client-modules:.*\bimport\s+failed\b/i.test(message) ||
    /failed\s*to\s*import\s*loader\s*entry/i.test(message) ||
    /client-modules:.*missed\s*the\s*module\s*table/i.test(message)
  )
}

export function extractPluginName(error: unknown): string | undefined {
  if (!error) return undefined
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as { reason?: unknown }).reason ?? (error as { message?: unknown }).message ?? '')

  // Matches pattern: entry <hash> (@scope/pkg or pkg)
  const entryMatch = /loader\s+entry\s+[a-f0-9]+\s+\((@[^)]+|[^)]+)\)/i.exec(message)
  if (entryMatch?.[1]) return entryMatch[1].trim()

  // Matches pattern: /plugins/<name>/client.js
  const scriptMatch = /\/plugins\/((?:@[^/]+\/)?[^/?]+)\/client\.js/i.exec(message)
  if (scriptMatch?.[1]) return scriptMatch[1].trim()

  return undefined
}

export function pluginErrorMessage(
  locale: UpdateLocale,
  pluginName?: string
): { title: string; message: string } {
  const zh = locale === 'zh'
  return {
    title: zh ? '插件加载异常' : 'Plugin Loading Error',
    message: zh
      ? pluginName
        ? `插件 ${pluginName} 加载失败或已被卸载，请重启 Harness 运行时使更改生效。`
        : '检测到插件已被卸载或加载失败，请重启 Harness 运行时使更改生效。'
      : pluginName
        ? `Plugin ${pluginName} failed to load or was uninstalled. Restart Harness to apply changes.`
        : 'A plugin was uninstalled or failed to load. Restart Harness to apply changes.'
  }
}
