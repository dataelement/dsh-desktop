import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('DSH Desktop client public boundary', () => {
  it('keeps common desktop slots, styling, branding, and excludes enterprise runtime code', async () => {
    const source = await readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
    expect(source).not.toMatch(/Bisheng|enterprise\.work|dshEnterprise|desktop\.chatWork|remote\.skills|SharedCollection|WorkResource/)
    expect(source).toContain('dsh-desktop-enterprise-entry')
    expect(source).toContain('BrandWordmark')

    let definition: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void; inject: string[] } } | undefined
    const appended: Array<{ textContent?: string }> = []
    const removeStyle = vi.fn()
    const effects: Array<() => void> = []
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
      head: { appendChild: (node: { textContent?: string }) => { appended.push(node) } }
    }
    vm.runInNewContext(source, {
      document,
      window: { dshDesktop: {}, __ModuleLoader__: { load: (value: typeof definition) => { definition = value } } }
    })

    const createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({ type, props: { ...props, children } })
    const BrandWordmark = vi.fn()
    const FishLogo = vi.fn()
    const plugin = definition!.factory((id) => {
      if (id === 'react') return { createElement, useEffect: (effect: () => void | (() => void)) => effect(), useState: (initial: unknown) => [initial, vi.fn()], useRef: (initial: unknown) => ({ current: initial }), useSyncExternalStore: (_sub: unknown, snap: () => unknown) => snap() }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') return { BrandWordmark, FishLogo, MenuItemButton: vi.fn(), Modal: vi.fn(), Button: vi.fn(), Tooltip: vi.fn() }
      throw new Error(`Unexpected client dependency ${id}`)
    })

    const registrations: Registration[] = []
    const slots = {
      inject: (_name: string, callback: () => unknown) => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) for (const _entry of result as Iterable<unknown>) void _entry
        return result
      },
      register: (config: Registration['config'], component: Registration['component']) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({
      slots,
      locale: { register: vi.fn(() => () => undefined), bind: () => (key: string) => key },
      remote: { session: { openWorkspacePath: () => Promise.resolve({ ok: true }) } },
      sessions: { list: { getSnapshot: () => ({ byId: {} }) } },
      uiWorkspace: {},
      effect: (setup: () => (() => void) | undefined) => {
        const dispose = setup()
        if (dispose) effects.push(dispose)
      },
      get: () => undefined
    })

    expect(plugin.inject).toEqual(['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiWorkspace'])
    expect(registrations.map(({ config }) => config.name)).toEqual(expect.arrayContaining([
      'shell.overlay',
      'settings.sidebar.footer',
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'sidebar.right.tab.document.unpreviewable',
      'sidebar.workspaces.session.menu.item'
    ]))
    expect(new Set(registrations.map(({ config }) => config.id).filter(Boolean)).size).toBe(registrations.map(({ config }) => config.id).filter(Boolean).length)

    const enterprise = registrations.find(({ config }) => config.name === 'settings.sidebar.footer')
    expect(enterprise?.config.id).toBe('desktop-enterprise-entry')
    const entry = enterprise!.component({ t: () => '了解企业版' }) as { type: unknown; props: Record<string, unknown> }
    expect(entry.type).toBe('a')
    expect(entry.props.href).toBe('https://dshdesktop.com/zh/enterprise/')
    expect(entry.props.target).toBe('_blank')
    expect(entry.props.rel).toBe('noopener noreferrer')
    expect(entry.props.children).toContain('了解企业版')

    expect(appended).toHaveLength(1)
    expect(appended[0]?.textContent).toContain('[data-dsh-preset-search]')
    expect(appended[0]?.textContent).toContain('[data-dsh-market-nav-icon] span[class*="navIcon"]')
    expect(appended[0]?.textContent).toContain('[data-dsh-better-sidebar-settings-nav] span[class*="navIcon"]')
    expect(appended[0]?.textContent).toContain('[data-dsh-enterprise-entry]')

    const sidebarName = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.name'
    )!.component({}) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarName.type).toBe(BrandWordmark)
    expect(sidebarName.props.includeMark).toBe(false)

    const sidebarMark = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.mark'
    )!.component({ size: 24 }) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarMark.type).toBe('svg')
    expect(sidebarMark.props.height).toBe(17)
    const [markPath] = sidebarMark.props.children as Array<{ type: unknown; props: Record<string, unknown> }>
    if (!markPath) throw new Error('Expected the sidebar brand SVG path')
    expect(markPath.type).toBe('path')
    expect(markPath.props.fill).toBe('currentColor')

    const heroMark = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.mark'
    )!.component({ size: 48 }) as { type: unknown; props: Record<string, unknown> }
    expect(heroMark.type).toBe(FishLogo)
    expect(heroMark.props.size).toBe(48)

    for (const dispose of effects) dispose()
    expect(removeStyle).toHaveBeenCalledOnce()
  })
})
