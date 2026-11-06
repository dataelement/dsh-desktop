import type { HarnessLocale } from '../application-locale'

/** Heading of the workspace folder panel. The panel controls come from the app itself. */
export function workspaceDirectoryPrompt(locale: HarnessLocale): string {
  return locale === 'zh' ? '选择工作区目录' : 'Select Workspace Directory'
}
