export const DEVELOPER_MODE_STORAGE_KEY = 'sherlock.developerMode'

const MAX_CONSECUTIVE_CLICK_GAP_MS = 2_000
const REQUIRED_LOGO_CLICKS = 5
export const DEVELOPER_SETTINGS_SECTION_IDS = [
  'plugins',
  'agent-presets',
  'dsh-update-checker',
  'market',
  'better-sidebar'
] as const
export const DEVELOPER_CONVERSATION_VIEW_IDS = [
  'memory-files',
  'skills-hub',
  'todos-hub',
  'coi-hub',
  'broadcast-hub',
  'prompt-hub',
  'canvas-hub',
  'memory-sync-hub',
  'models-hub',
  'bookmarks-hub',
  'ui-settings-hub',
  'settings-hub'
] as const

const developerSettingsSectionIds = new Set<string>(DEVELOPER_SETTINGS_SECTION_IDS)
const developerConversationViewIds = new Set<string>(DEVELOPER_CONVERSATION_VIEW_IDS)

type DeveloperModeStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type PendingClick = {
  status: 'pending'
  remaining: number
}

type LogoClickResult = PendingClick | { status: 'activated' } | { status: 'deactivated' }

type SettingsSectionRow = {
  dataset: {
    settingsSectionId?: string
  }
  hidden: boolean
}

type ConversationViewTab = {
  dataset: {
    conversationViewId?: string
    sherlockDeveloperTab?: string
  }
  hidden: boolean
  textContent?: string | null
  getAttribute?(name: string): string | null
  click?(): void
}

const developerConversationTabLabels = [
  /^(?:🔴\s*)?(?:记忆|Memory)(?:\s*\(\d+\))?$/u,
  /^(?:🔴\s*)?(?:技能|Skills)(?:\s*\(\d+\))?$/u,
  /^(?:🔴\s*)?(?:待办|Todos)(?:\s*\(\d+\))?$/u,
  /^(?:🔴\s*)?Memory Evolve (?:设置|Settings)$/u
]

function normalizedTabLabel(tab: ConversationViewTab): string {
  return (tab.textContent ?? '').replace(/\s+/gu, ' ').trim()
}

function isConversationChatTab(tab: ConversationViewTab): boolean {
  return tab.dataset.conversationViewId === 'chat' || /^(?:对话|Chat)$/u.test(normalizedTabLabel(tab))
}

function isDeveloperConversationTab(tab: ConversationViewTab): boolean {
  const id = tab.dataset.conversationViewId
  if (id !== undefined && developerConversationViewIds.has(id)) return true
  const label = normalizedTabLabel(tab)
  return developerConversationTabLabels.some((pattern) => pattern.test(label))
}

export class DeveloperModeController {
  private enabled: boolean
  private clickCount = 0
  private lastClickAt: number | undefined

  constructor(private readonly storage: DeveloperModeStorage) {
    this.enabled = this.readPersistedMode()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  logoClick(clickedAt: number): LogoClickResult {
    if (
      this.lastClickAt === undefined ||
      clickedAt < this.lastClickAt ||
      clickedAt - this.lastClickAt > MAX_CONSECUTIVE_CLICK_GAP_MS
    ) {
      this.clickCount = 0
    }

    this.lastClickAt = clickedAt
    this.clickCount += 1

    if (this.clickCount < REQUIRED_LOGO_CLICKS) {
      return {
        status: 'pending',
        remaining: REQUIRED_LOGO_CLICKS - this.clickCount
      }
    }

    this.enabled = !this.enabled
    this.clickCount = 0
    this.lastClickAt = undefined
    try {
      this.storage.setItem(DEVELOPER_MODE_STORAGE_KEY, String(this.enabled))
    } catch (error) {
      console.warn('[developer-mode] unable to persist developer mode', error)
    }
    return { status: this.enabled ? 'activated' : 'deactivated' }
  }

  private readPersistedMode(): boolean {
    try {
      return this.storage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'true'
    } catch (error) {
      console.warn('[developer-mode] unable to read developer mode', error)
      return false
    }
  }
}

export function setDeveloperSettingsVisibility(
  rows: Iterable<SettingsSectionRow>,
  developerModeEnabled: boolean
): void {
  for (const row of rows) {
    const id = row.dataset.settingsSectionId
    row.hidden = !developerModeEnabled && id !== undefined && developerSettingsSectionIds.has(id)
  }
}

export function setDeveloperConversationTabsVisibility(
  tabs: Iterable<ConversationViewTab>,
  developerModeEnabled: boolean
): void {
  const conversationTabs = [...tabs]
  const developerTabs = conversationTabs.filter(isDeveloperConversationTab)
  if (
    !developerModeEnabled &&
    developerTabs.some((tab) => tab.getAttribute?.('aria-selected') === 'true')
  ) {
    conversationTabs.find(isConversationChatTab)?.click?.()
  }

  for (const tab of developerTabs) {
    tab.dataset.sherlockDeveloperTab = 'true'
    tab.hidden = !developerModeEnabled
  }
}

export function developerModeNoticeText(locale: 'zh' | 'en', enabled: boolean): string {
  if (enabled) return locale === 'zh' ? '已进入开发者模式' : 'Developer mode enabled'
  return locale === 'zh' ? '已退出开发者模式' : 'Developer mode disabled'
}
