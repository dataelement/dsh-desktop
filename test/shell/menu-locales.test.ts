import { describe, expect, it, vi } from 'vitest'
import { menuMessages, desktopMenuMessages } from '../../src/main/shell/menu-messages'
import { buildDarwinDesktopMenu, buildWindowsApplicationMenu, shortcutFileMenuLabels } from '../../src/main/shell/enterprise-menu'
import { windowsMenuTemplate } from '../../src/main/windows-menu'

const languages = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const

describe('eight-language desktop menus', () => {
  it('keeps all keys and interpolation tokens complete', () => {
    for (const locale of languages) {
      const messages = menuMessages[locale]
      expect(Object.keys(messages).sort()).toEqual(Object.keys(menuMessages.en).sort())
      for (const key of Object.keys(menuMessages.en) as Array<keyof typeof menuMessages.en>) {
        expect(messages[key].trim()).not.toBe('')
        expect(messages[key].match(/\{\w+\}/g) ?? []).toEqual(menuMessages.en[key].match(/\{\w+\}/g) ?? [])
      }
    }
    expect(desktopMenuMessages('fr-FR')).toBe(menuMessages.fr)
    expect(desktopMenuMessages('unknown')).toBe(menuMessages.en)
  })

  it.each(languages)('preserves menu commands, roles and accelerators in %s', locale => {
    const text = menuMessages[locale]
    const action = vi.fn()
    const darwin = buildDarwinDesktopMenu({ locale, appName: 'DSH', openEnterprise: action, showAbout: action, checkForUpdates: action, restart: action, restartSafeMode: action, showHarnessLog: action, hide: action, hideOthers: action, unhideAll: action, quit: action })
    expect(darwin[0]?.submenu?.[0]?.label).toBe(text.about)
    expect(darwin[0]?.submenu?.[5]?.label).toBe(text.log)
    expect(darwin[0]?.submenu?.[7]?.label).toBe(text.hide.replace('{app}', 'DSH'))
    expect(darwin[1]?.submenu?.[0]).toMatchObject({ role: 'undo', label: text.undo })
    darwin[0]?.submenu?.[1]?.click?.()
    expect(action).toHaveBeenCalledOnce()
    expect(shortcutFileMenuLabels(locale)).toEqual({ fileMenu: text.fileMenu, closePage: text.closePage })
    const windows = buildWindowsApplicationMenu({ locale, connectPhone: action, restart: action, showHarnessLog: action, checkForUpdates: action, quit: action })
    expect(windows[0]?.label).toBe(text.application)
    const run = vi.fn()
    const edit = vi.fn()
    const application = windowsMenuTemplate('application', locale, 1.25, { run, sendEditingKey: edit })
    expect(application[0]).toMatchObject({ label: text.phone, accelerator: 'Ctrl+Shift+M', registerAccelerator: false })
    application[0]?.click?.({} as never, {} as never, {} as never)
    expect(run).toHaveBeenCalledWith('connect-phone')
    const view = application[5]?.submenu
    expect(Array.isArray(view) && view[5]?.label).toContain('125%')
    const editing = windowsMenuTemplate('edit', locale, 1, { run, sendEditingKey: edit })
    expect(editing[0]?.label).toBe(text.undo)
    editing[0]?.click?.({} as never, {} as never, {} as never)
    expect(edit).toHaveBeenCalledWith({ keyCode: 'Z', modifiers: ['control'] })
  })
})
