import { RepairDrafts } from '../repair-drafts'
import { rememberRepairReturnNavigation } from '../repair-navigation'

export const REPAIR_SESSION_KEY = 'dsh.sessions.current'
export const REPAIR_NAVIGATION_KEY = 'dsh.desktop.repair-navigation.v1'

const SIDEBAR_PROMPT = {
  zh: '请协助排查使用中的问题，先询问我遇到的问题和复现步骤，再结合已有诊断信息分析。',
  en: 'Help diagnose a problem during use. First ask what happened and how to reproduce it, then inspect the available diagnostics.'
} as const

export function sidebarRepairPrompt(locale: 'zh' | 'en'): string {
  return SIDEBAR_PROMPT[locale]
}

const SAFE_MODE_PROMPT = {
  zh: '请结合诊断事实和 harness.log，定位导致启动失败的确切根因。先说明结论和建议的最小可逆操作，在我明确确认之前不要修改任何文件或配置。',
  en: 'Using the diagnostic facts and harness.log, find the exact root cause of the startup failure. Explain the conclusion and the smallest reversible fix first, and do not change any file or setting until I explicitly confirm.'
} as const

export function safeModeRepairPrompt(locale: 'zh' | 'en'): string {
  return SAFE_MODE_PROMPT[locale]
}

/** Point the open document at the repair session and leave a draft for the user to send. */
export function applyRepairNavigation(options: {
  storage: {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
  drafts: RepairDrafts
  sessionId: string
  prompt: string
  rememberReturn: boolean
  previousSessionId?: string
}): void {
  if (options.rememberReturn) {
    rememberRepairReturnNavigation(options.storage, options.previousSessionId ?? options.sessionId)
  }
  options.storage.setItem(REPAIR_SESSION_KEY, JSON.stringify({ sessionId: options.sessionId }))
  options.drafts.set(options.sessionId, options.prompt)
  // Workbench restoration runs after the native session has been restored.
  options.storage.setItem(REPAIR_NAVIGATION_KEY, JSON.stringify({ sessionId: options.sessionId, createdAt: Date.now() }))
}
