import { describe, expect, it } from 'vitest'
import {
  DEVELOPER_CONVERSATION_VIEW_IDS,
  DEVELOPER_MODE_STORAGE_KEY,
  DeveloperModeController,
  developerModeNoticeText,
  setDeveloperConversationTabsVisibility,
  setDeveloperSettingsVisibility
} from '../src/preload/developer-mode'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function settingsRow(id: string): { dataset: { settingsSectionId: string }; hidden: boolean } {
  return {
    dataset: { settingsSectionId: id },
    hidden: false
  }
}

function conversationTab(id: string): {
  dataset: { conversationViewId: string }
  hidden: boolean
} {
  return {
    dataset: { conversationViewId: id },
    hidden: false
  }
}

function localizedConversationTab(label: string, selected = false) {
  return {
    dataset: {} as { conversationViewId?: string; sherlockDeveloperTab?: string },
    hidden: false,
    textContent: label,
    clicks: 0,
    getAttribute(name: string): string | null {
      return name === 'aria-selected' ? String(selected) : null
    },
    click(): void {
      this.clicks += 1
    }
  }
}

describe('Sherlock developer mode', () => {
  it('activates only on the fifth consecutive logo click and persists the mode', () => {
    const storage = new MemoryStorage()
    const controller = new DeveloperModeController(storage)

    expect(controller.logoClick(0)).toEqual({ status: 'pending', remaining: 4 })
    expect(controller.logoClick(200)).toEqual({ status: 'pending', remaining: 3 })
    expect(controller.logoClick(400)).toEqual({ status: 'pending', remaining: 2 })
    expect(controller.logoClick(600)).toEqual({ status: 'pending', remaining: 1 })
    expect(controller.isEnabled()).toBe(false)

    expect(controller.logoClick(800)).toEqual({ status: 'activated' })
    expect(controller.isEnabled()).toBe(true)
    expect(storage.getItem(DEVELOPER_MODE_STORAGE_KEY)).toBe('true')
  })

  it('restarts the sequence when adjacent clicks are more than two seconds apart', () => {
    const controller = new DeveloperModeController(new MemoryStorage())

    controller.logoClick(0)
    controller.logoClick(300)
    controller.logoClick(600)
    controller.logoClick(900)

    expect(controller.logoClick(3_001)).toEqual({ status: 'pending', remaining: 4 })
    expect(controller.isEnabled()).toBe(false)
  })

  it('deactivates an already enabled mode only on the fifth consecutive click', () => {
    const storage = new MemoryStorage()
    storage.setItem(DEVELOPER_MODE_STORAGE_KEY, 'true')
    const controller = new DeveloperModeController(storage)

    expect(controller.isEnabled()).toBe(true)
    expect(controller.logoClick(0)).toEqual({ status: 'pending', remaining: 4 })
    expect(controller.logoClick(200)).toEqual({ status: 'pending', remaining: 3 })
    expect(controller.logoClick(400)).toEqual({ status: 'pending', remaining: 2 })
    expect(controller.logoClick(600)).toEqual({ status: 'pending', remaining: 1 })
    expect(controller.isEnabled()).toBe(true)

    expect(controller.logoClick(800)).toEqual({ status: 'deactivated' })
    expect(controller.isEnabled()).toBe(false)
    expect(storage.getItem(DEVELOPER_MODE_STORAGE_KEY)).toBe('false')
  })

  it('keeps About visible while hiding only developer settings rows', () => {
    const rows = [
      settingsRow('general'),
      settingsRow('models'),
      settingsRow('plugins'),
      settingsRow('agent-presets'),
      settingsRow('dsh-update-checker'),
      settingsRow('market'),
      settingsRow('better-sidebar')
    ]

    setDeveloperSettingsVisibility(rows, false)
    expect(rows.filter((row) => row.hidden).map((row) => row.dataset.settingsSectionId)).toEqual([
      'plugins',
      'agent-presets',
      'dsh-update-checker',
      'market',
      'better-sidebar'
    ])

    setDeveloperSettingsVisibility(rows, true)
    expect(rows.some((row) => row.hidden)).toBe(false)
  })

  it('falls back to localized Memory Evolve labels and returns to Chat', () => {
    const chat = localizedConversationTab('对话')
    const memory = localizedConversationTab('🔴 记忆 (2)')
    const skills = localizedConversationTab('技能')
    const todos = localizedConversationTab('待办')
    const settings = localizedConversationTab('Memory Evolve 设置', true)

    setDeveloperConversationTabsVisibility([chat, memory, skills, todos, settings], false)

    expect(chat.clicks).toBe(1)
    expect([memory, skills, todos, settings].every((tab) => tab.hidden)).toBe(true)
    expect(settings.dataset.sherlockDeveloperTab).toBe('true')
  })

  it('hides Memory Evolve conversation tabs outside developer mode', () => {
    const tabs = [
      conversationTab('chat'),
      conversationTab('research'),
      conversationTab('trajectory'),
      ...DEVELOPER_CONVERSATION_VIEW_IDS.map(conversationTab)
    ]

    setDeveloperConversationTabsVisibility(tabs, false)
    expect(tabs.filter((tab) => tab.hidden).map((tab) => tab.dataset.conversationViewId))
      .toEqual([...DEVELOPER_CONVERSATION_VIEW_IDS])
    expect(tabs.filter((tab) => !tab.hidden).map((tab) => tab.dataset.conversationViewId))
      .toEqual(['chat', 'research', 'trajectory'])

    setDeveloperConversationTabsVisibility(tabs, true)
    expect(tabs.some((tab) => tab.hidden)).toBe(false)
  })

  it('describes both entering and exiting developer mode in each supported locale', () => {
    expect(developerModeNoticeText('zh', true)).toBe('已进入开发者模式')
    expect(developerModeNoticeText('zh', false)).toBe('已退出开发者模式')
    expect(developerModeNoticeText('en', true)).toBe('Developer mode enabled')
    expect(developerModeNoticeText('en', false)).toBe('Developer mode disabled')
  })
})
