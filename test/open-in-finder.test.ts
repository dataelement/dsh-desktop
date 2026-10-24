import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('workspace Open in file manager integration', () => {
  it('resolves the selected session directory through the current session list', async () => {
    const source = await readFile(path.join(projectRoot, 'packages/dsh-desktop-client-ui/client.js'), 'utf8')
    let definition: { factory: (require: (name: string) => unknown) => { apply: (ctx: unknown) => void } } | undefined
    const openInFinder = vi.fn(async () => undefined)
    const window = {
      __ModuleLoader__: { load: (value: typeof definition) => { definition = value } },
      dshDesktop: { openInFinder }
    }
    vm.runInNewContext(source, { window, document: { documentElement: { lang: 'en' } } })
    const MenuItemButton = () => null
    const registrations: Array<{ config: { id?: string; inject?: () => Record<string, unknown> }; component: (props: Record<string, unknown>) => unknown }> = []
    const plugin = definition!.factory((name) => {
      if (name === 'react') return { createElement: (type: unknown, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props: { ...props, children } }) }
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return { MenuItemButton }
      throw new Error(`Unexpected dependency ${name}`)
    })
    plugin.apply({
      effect: vi.fn(),
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (config: (typeof registrations)[number]['config'], component: (props: Record<string, unknown>) => unknown) => {
          registrations.push({ config, component })
        }
      },
      get: (name: string) => name === 'sessions'
        ? { list: { getSnapshot: () => ({ byId: { session1: { cwd: '/workspace/project' } } }) } }
        : undefined
    })
    const folder = registrations.find(({ config }) => config.id === 'desktop-open-session-folder')!
    const injected = folder.config.inject!()
    const element = folder.component({ sessionId: 'session1', useMenuOpenState: () => [true, vi.fn()], ...injected }) as { type: unknown; props: { onSelect: () => void } }
    expect(element.type).toBe(MenuItemButton)
    element.props.onSelect()
    await vi.waitFor(() => expect(openInFinder).toHaveBeenCalledWith('/workspace/project'))
  })
})
