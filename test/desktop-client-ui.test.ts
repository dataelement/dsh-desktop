import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop client public boundary', () => {
  it('keeps common desktop slots and excludes enterprise runtime code', async () => {
    const source = await readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
    expect(source).not.toMatch(/Bisheng|enterprise\.work|dshEnterprise|desktop\.chatWork|remote\.skills|SharedCollection|WorkResource/)
    expect(source).toContain('dsh-desktop-enterprise-entry')
    expect(source).toContain('BrandWordmark')

    let definition: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void; inject: string[] } } | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: vi.fn() })),
      head: { appendChild: vi.fn() }
    }
    vm.runInNewContext(source, {
      document,
      window: { dshDesktop: {}, __ModuleLoader__: { load: (value: typeof definition) => { definition = value } } }
    })

    const createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({ type, props: { ...props, children } })
    const plugin = definition!.factory((id) => {
      if (id === 'react') return { createElement, useEffect: (effect: () => void | (() => void)) => effect(), useState: (initial: unknown) => [initial, vi.fn()], useRef: (initial: unknown) => ({ current: initial }), useSyncExternalStore: (_sub: unknown, snap: () => unknown) => snap() }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') return { BrandWordmark: vi.fn(), FishLogo: vi.fn(), MenuItemButton: vi.fn(), Modal: vi.fn(), Button: vi.fn(), Tooltip: vi.fn() }
      throw new Error(`Unexpected client dependency ${id}`)
    })

    const registrations: Array<{ name: string; id?: string }> = []
    const slots = {
      inject: (_name: string, callback: () => unknown) => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) for (const _entry of result as Iterable<unknown>) void _entry
        return result
      },
      register: (config: { name: string; id?: string }) => { registrations.push(config); return () => undefined }
    }
    plugin.apply({
      slots,
      locale: { register: vi.fn(() => () => undefined), bind: () => (key: string) => key },
      remote: { session: { openWorkspacePath: () => Promise.resolve({ ok: true }) } },
      sessions: { list: { getSnapshot: () => ({ byId: {} }) } },
      uiWorkspace: {},
      effect: (setup: () => (() => void) | undefined) => setup(),
      get: () => undefined
    })

    expect(plugin.inject).toEqual(['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiWorkspace'])
    expect(registrations.map(item => item.name)).toEqual(expect.arrayContaining([
      'shell.overlay',
      'settings.sidebar.footer',
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'sidebar.right.tab.document.unpreviewable',
      'sidebar.workspaces.session.menu.item'
    ]))
    expect(new Set(registrations.map(item => item.id).filter(Boolean)).size).toBe(registrations.map(item => item.id).filter(Boolean).length)
  })
})
