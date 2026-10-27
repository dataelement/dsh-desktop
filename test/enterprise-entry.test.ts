import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

describe('Enterprise app menu entry', () => {
  it.each(['zh', 'en'])('opens the enterprise website below updates in %s', async locale => {
    const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const start = source.indexOf('function installMenu(): void {')
    const end = source.indexOf('\n/**', start)
    const openExternal = vi.fn().mockResolvedValue(undefined)
    const showUnexpectedError = vi.fn()
    const buildFromTemplate = vi.fn(value => value)
    // Execute the actual menu builder without starting Electron or touching a Profile.
    const hide = vi.fn()
    const quit = vi.fn()
    const sendActionToFirstResponder = vi.fn()
    const context = {
      harnessLocale: () => locale, process: { platform: 'darwin' }, app: { name: 'DSH Desktop', hide, quit },
      shell: { openExternal }, showUnexpectedError, developmentRepairDemo: undefined,
      Menu: { buildFromTemplate, setApplicationMenu: vi.fn(), sendActionToFirstResponder }
    }
    vm.runInNewContext(ts.transpile(source.slice(start, end)) + '\ninstallMenu()', context)
    const menu = buildFromTemplate.mock.calls[0]?.[0][0].submenu
    expect(menu[0].label).toBe(locale === 'zh' ? '关于 DSH Desktop' : 'About DSH Desktop')
    expect(menu[1].label).toBe(locale === 'zh' ? '检查更新…' : 'Check for Updates…')
    expect(menu[2].label).toBe(locale === 'zh' ? '了解企业版' : 'Explore Enterprise')
    expect(menu[4].label).toBe(locale === 'zh' ? '隐藏 DSH Desktop' : 'Hide DSH Desktop')
    expect(menu[4].accelerator).toBe('Command+H')
    expect(menu[4].role).toBeUndefined()
    expect(menu[5].label).toBe(locale === 'zh' ? '隐藏其他' : 'Hide Others')
    expect(menu[5].accelerator).toBe('Command+Alt+H')
    expect(menu[6].label).toBe(locale === 'zh' ? '全部显示' : 'Show All')
    expect(menu[8].label).toBe(locale === 'zh' ? '退出 DSH Desktop' : 'Quit DSH Desktop')
    expect(menu[8].accelerator).toBe('Command+Q')
    menu[4].click()
    menu[5].click()
    menu[6].click()
    menu[8].click()
    expect(hide).toHaveBeenCalledOnce()
    expect(sendActionToFirstResponder).toHaveBeenNthCalledWith(1, 'hideOtherApplications:')
    expect(sendActionToFirstResponder).toHaveBeenNthCalledWith(2, 'unhideAllApplications:')
    expect(quit).toHaveBeenCalledOnce()
    menu[2].click()
    await Promise.resolve()
    expect(openExternal).toHaveBeenCalledWith('https://dshdesktop.com/zh/enterprise/')
    const failure = new Error('browser unavailable')
    openExternal.mockRejectedValueOnce(failure)
    menu[2].click()
    await Promise.resolve()
    expect(showUnexpectedError).toHaveBeenCalledWith(failure)
  })
})

describe('Settings sidebar footer seam', () => {
  it.each([{ contributions: [] }, { contributions: ['enterprise'] }, { contributions: ['enterprise', 'A second contribution with a long accessible label'] }])('renders footer contributions once after navigation: $contributions', ({ contributions }) => {
    const source = readFileSync(new URL('../node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js', import.meta.url), 'utf8')
    const start = source.indexOf('function SettingsPanel(')
    const end = source.indexOf('\n\t\tfunction ', start + 1)
    const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props })
    const renderSlot = vi.fn((name: string) => name === 'settings.sidebar.footer' ? contributions : name)
    const context = {
      react: { useId: () => 'title', useRef: () => ({ current: null }) },
      react_dom: { createPortal: (node: unknown) => node },
      react_jsx_runtime: { jsx, jsxs: jsx },
      _deepseek_ai_dsh_client_ui_primitives: { useModalLayer: vi.fn(), IconCloseOutlineRegular: 'icon' },
      document: { body: {} }, clsx: (...values: unknown[]) => values.filter(Boolean).join(' '),
      SettingsRoot_module_css_default: new Proxy({}, { get: (_target, key) => key }),
      navIcon: () => null, renderSlot
    }
    const tree = vm.runInNewContext(source.slice(start, end) + '\nSettingsPanel({ rows:[{id:"general",label:"General"}], renderSlot, activeId:"general", onSelect() {}, onClose() {} })', context)
    const panel = tree.props.children[1]
    const nav = panel.props.children[0]
    expect(nav.type).toBe('nav')
    expect(nav.props.children[1].props.className).toBe('navList')
    expect(nav.props.children[2].props['data-dsh-settings-sidebar-footer']).toBe(true)
    expect(nav.props.children[2].props.children).toEqual(contributions)
    expect(renderSlot.mock.calls.filter(([name]) => name === 'settings.sidebar.footer')).toHaveLength(1)
    expect(renderSlot.mock.calls.find(([name]) => name === 'settings.section')).toEqual(['settings.section', { close: expect.any(Function) }, { only: 'general' }])
  })
})
