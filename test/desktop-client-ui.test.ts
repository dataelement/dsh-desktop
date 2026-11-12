import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('DSH Desktop client slot occupants', () => {
  it.each([false, true])('keeps product seats and gates native content on the bridge: %s', async nativeBridge => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const appended: Array<{ textContent?: string }> = []
    const removeStyle = vi.fn()
    let disposeStyle: (() => void) | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
      head: { appendChild: (node: { textContent?: string }) => appended.push(node) }
    }
    vm.runInNewContext(source, {
      document,
      navigator: { language: 'en-US' },
      window: {
        dshDesktop: { getRepairDraft: vi.fn(), openRepairAgent: vi.fn() },
        ...(nativeBridge ? { dshEnterpriseChat: { present: () => Promise.resolve() } } : {}),
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const BrandWordmark = vi.fn()
    const FishLogo = vi.fn()
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: (effect: () => void | (() => void)) => effect(),
          useState: (initial: unknown) => [initial, vi.fn()],
          useSyncExternalStore: (_sub: unknown, snap: () => unknown) => snap()
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark, FishLogo }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Registration[] = []
    const registerLocale = vi.fn((_namespace: string, _messages: Record<string, unknown>) => () => undefined)
    const slots = {
      inject: (_name: string, callback: () => unknown): unknown => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) {
          for (const _entry of result as Iterable<unknown>) void _entry
        }
        return result
      },
      register: (
        config: Registration['config'],
        component: Registration['component']
      ): (() => void) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({
      slots,
      locale: { register: registerLocale, bind: () => (key: string) => key },
      remote: { session: { openWorkspacePath: () => Promise.resolve({ ok: true, value: { opened: true } }) } },
      sessions: { list: { getSnapshot: () => ({ byId: {} }) } },
      uiWorkspace: {},
      layout: {},
      effect: (setup: () => (() => void) | undefined) => { disposeStyle = setup() }
    })

    expect(plugin.inject).toEqual(['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiWorkspace', 'layout'])
    expect(registrations.map(({ config }) => config.name)).toEqual([
      'shell.overlay',
      'shell.overlay',
      'sidebar.primaryNavigation',
      'sidebar.workspaces.title',
      'desktop.mode.content',
      'sidebar.workspaces.collection',
      'conversation.input.dock',
      'sidebar.settings.action',
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'conversation.hero.brand.title',
      'sidebar.right.tab.document.unpreviewable',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item'
    ].filter(name => nativeBridge || name !== 'desktop.mode.content'))

    // Local BISHENG seats and incoming utilities coexist without duplicate owners.
    const ids = registrations.map(({ config }) => config.id).filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter(id => id === 'desktop-repair-draft')).toHaveLength(1)
    expect(ids.filter(id => id === 'desktop-utilities')).toHaveLength(1)
    expect(registrations.some(({ config }) => config.name === 'settings.sidebar.footer')).toBe(false)
    for (const namespace of ['dsh-desktop-repair', 'dsh-desktop-actions']) {
      const messages = registerLocale.mock.calls.filter(([name]) => name === namespace)
      expect(messages).toHaveLength(1)
      expect(Object.keys(messages[0]?.[1] ?? {}).sort()).toEqual(['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh'])
    }

    // Style injections include both layout navigation styles and gear icon hiding
    expect(appended.length).toBeGreaterThanOrEqual(1)
    const combinedStyles = appended.map((node) => node.textContent || '').join('\n')
    expect(combinedStyles).toContain('[data-dsh-market-nav-icon] span[class*="navIcon"]')
    expect(combinedStyles).toContain('.dshPrimaryNavigation')
    expect(combinedStyles).toContain('.dshSectionAddButton')

    disposeStyle?.()
    expect(removeStyle).toHaveBeenCalled()
  })
})
