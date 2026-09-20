import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const clientSource = path.join(
  projectRoot,
  'packages',
  'dsh-desktop-workspace-drop',
  'client.js'
)

interface FakeEvent {
  dataTransfer: unknown
  preventDefault: ReturnType<typeof vi.fn>
  stopPropagation: ReturnType<typeof vi.fn>
}

interface FakeElement {
  tagName: string
  dataset: Record<string, string>
  id: string
  className: string
  textContent: string
  isConnected: boolean
  attributes: Record<string, string>
  setAttribute(name: string, value: string): void
  remove(): void
}

/**
 * Minimal document that models capture-then-bubble on one node, so a
 * capture-phase claimant that calls `stopPropagation` really does keep the
 * composer's bubble listener from running — the behaviour under test.
 */
function createDocument() {
  const listeners = new Map<string, Array<(event: FakeEvent) => void>>()
  const created: FakeElement[] = []
  const headChildren: FakeElement[] = []
  const bodyChildren: FakeElement[] = []

  const key = (type: string, capture: boolean): string => `${type}:${capture}`

  function createElement(tagName: string): FakeElement {
    const element: FakeElement = {
      tagName,
      dataset: {},
      id: '',
      className: '',
      textContent: '',
      isConnected: true,
      attributes: {},
      setAttribute(name, value) {
        element.attributes[name] = value
      },
      remove() {
        element.isConnected = false
      }
    }
    created.push(element)
    return element
  }

  const document = {
    createElement: vi.fn(createElement),
    querySelector: vi.fn(() => null),
    head: { appendChild: (node: FakeElement) => headChildren.push(node) },
    body: { appendChild: (node: FakeElement) => bodyChildren.push(node) },
    addEventListener: vi.fn((type: string, listener: (event: FakeEvent) => void, capture?: boolean) => {
      const bucket = listeners.get(key(type, capture === true)) ?? []
      bucket.push(listener)
      listeners.set(key(type, capture === true), bucket)
    }),
    removeEventListener: vi.fn(
      (type: string, listener: (event: FakeEvent) => void, capture?: boolean) => {
        const bucket = listeners.get(key(type, capture === true)) ?? []
        listeners.set(
          key(type, capture === true),
          bucket.filter((entry) => entry !== listener)
        )
      }
    )
  }

  return {
    document,
    created,
    headChildren,
    bodyChildren,
    listenerCount: (type: string, capture: boolean): number =>
      (listeners.get(key(type, capture)) ?? []).length,
    /** Run capture listeners, then bubble listeners unless propagation stopped. */
    dispatch(type: string, event: FakeEvent): void {
      for (const listener of listeners.get(key(type, true)) ?? []) listener(event)
      if (event.stopPropagation.mock.calls.length > 0) return
      for (const listener of listeners.get(key(type, false)) ?? []) listener(event)
    },
    /** Register the composer's own document-level bubble drop listener. */
    onBubbleDrop(listener: (event: FakeEvent) => void): void {
      const bucket = listeners.get(key('drop', false)) ?? []
      bucket.push(listener)
      listeners.set(key('drop', false), bucket)
    }
  }
}

function transferFor(entries: Array<{ isDirectory: boolean; name: string }>) {
  return {
    types: ['Files'],
    dropEffect: '',
    items: entries.map((entry) => ({
      kind: 'file',
      webkitGetAsEntry: () => entry,
      getAsFile: () => ({ name: entry.name })
    }))
  }
}

function eventFor(dataTransfer: unknown): FakeEvent {
  return {
    dataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  }
}

interface HarnessOptions {
  bridge?: { getPathForFile: (file: { name: string }) => string } | undefined
  create?: (input: { path: string }) => Promise<{ workspaceId: string }>
  open?: (workspaceId: string) => Promise<void>
}

async function loadPlugin(options: HarnessOptions = {}) {
  const source = await readFile(clientSource, 'utf8')
  let definition:
    | {
        factory: (require: (id: string) => unknown) => {
          apply: (ctx: unknown) => void
          inject: string[]
        }
      }
    | undefined
  const dom = createDocument()
  const timers: Array<() => void> = []

  const dictionaries = new Map<string, Record<string, Record<string, string>>>()
  const locale = {
    register: vi.fn((ns: string, copy: Record<string, Record<string, string>>) => {
      dictionaries.set(ns, copy)
      return () => dictionaries.delete(ns)
    }),
    bind: (ns: string) => (key: string, params?: Record<string, unknown>) => {
      const template = dictionaries.get(ns)?.zh?.[key] ?? key
      return template.replace(/\{(\w+)\}/gu, (_match, name: string) =>
        String(params?.[name] ?? '')
      )
    }
  }

  const create = vi.fn(
    options.create ?? (async (input: { path: string }) => ({ workspaceId: `id:${input.path}` }))
  )
  const open = vi.fn(options.open ?? (async () => undefined))
  const effects: Array<() => void> = []
  const ctx = {
    locale,
    workspaces: { create },
    uiWorkspace: { openWorkspace: open },
    effect: (callback: () => unknown) => {
      const disposer = callback()
      if (typeof disposer === 'function') effects.push(disposer as () => void)
    }
  }

  vm.runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load: (value: typeof definition) => {
          definition = value
        }
      },
      ...(options.bridge === undefined
        ? {}
        : { dshDesktopFiles: options.bridge })
    },
    document: dom.document,
    console: { warn: vi.fn() },
    setTimeout: (callback: () => void) => {
      timers.push(callback)
      return timers.length
    },
    clearTimeout: vi.fn()
  })

  expect(definition).toBeDefined()
  const plugin = definition!.factory(() => {
    throw new Error('the workspace-drop client requests no modules')
  })
  return { plugin, ctx, dom, dictionaries, create, open, effects, timers }
}

const bridge = {
  getPathForFile: (file: { name: string }): string => `/Users/me/${file.name}`
}

describe('desktop workspace folder drop', () => {
  it('requires the workspace services and registers both dictionaries', async () => {
    const { plugin, ctx, dictionaries } = await loadPlugin({ bridge })
    plugin.apply(ctx)

    expect(plugin.inject).toEqual(['locale', 'workspaces', 'uiWorkspace'])
    const copy = dictionaries.get('desktop.workspaceDrop')
    expect(copy?.zh?.failed).toBe('无法打开拖入的文件夹：{message}')
    expect(copy?.en?.failed).toBe('Could not open the dropped folder: {message}')
    expect(copy?.zh?.unresolved).toBeDefined()
    expect(copy?.en?.unresolved).toBeDefined()
  })

  it('opens a dropped folder as a workspace and claims the drop', async () => {
    const { plugin, ctx, dom, create, open } = await loadPlugin({ bridge })
    plugin.apply(ctx)

    const composerDrop = vi.fn()
    dom.onBubbleDrop(composerDrop)
    const event = eventFor(transferFor([{ isDirectory: true, name: 'project' }]))
    dom.dispatch('drop', event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
    // The composer's own document-level drop listener must not see the folder.
    expect(composerDrop).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith({ path: '/Users/me/project' })
    await vi.waitFor(() => {
      expect(open).toHaveBeenCalledWith('id:/Users/me/project')
    })
  })

  it('leaves a dropped file to the composer attachment flow', async () => {
    const { plugin, ctx, dom, create, open } = await loadPlugin({ bridge })
    plugin.apply(ctx)

    const composerDrop = vi.fn()
    dom.onBubbleDrop(composerDrop)
    const event = eventFor(transferFor([{ isDirectory: false, name: 'shot.png' }]))
    dom.dispatch('drop', event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(composerDrop).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('leaves a mixed folder-and-file drop to the composer', async () => {
    const { plugin, ctx, dom, create } = await loadPlugin({ bridge })
    plugin.apply(ctx)

    const composerDrop = vi.fn()
    dom.onBubbleDrop(composerDrop)
    dom.dispatch(
      'drop',
      eventFor(
        transferFor([
          { isDirectory: true, name: 'project' },
          { isDirectory: false, name: 'shot.png' }
        ])
      )
    )

    expect(composerDrop).toHaveBeenCalledTimes(1)
    expect(create).not.toHaveBeenCalled()
  })

  it('installs nothing when the desktop bridge is absent', async () => {
    const { plugin, ctx, dom } = await loadPlugin({ bridge: undefined })
    plugin.apply(ctx)

    expect(dom.listenerCount('drop', true)).toBe(0)
    expect(dom.listenerCount('dragover', true)).toBe(0)
    expect(dom.listenerCount('dragenter', true)).toBe(0)
  })

  it('reports a rejected adoption instead of failing silently', async () => {
    const { plugin, ctx, dom } = await loadPlugin({
      bridge,
      create: async () => {
        throw new Error('workspace/name-conflict')
      }
    })
    plugin.apply(ctx)

    dom.dispatch('drop', eventFor(transferFor([{ isDirectory: true, name: 'project' }])))

    await vi.waitFor(() => {
      expect(dom.bodyChildren).toHaveLength(1)
    })
    const notice = dom.bodyChildren[0]!
    expect(notice.textContent).toContain('无法打开拖入的文件夹')
    expect(notice.textContent).toContain('workspace/name-conflict')
    expect(notice.attributes.role).toBe('status')
    expect(notice.attributes['aria-live']).toBe('polite')
    // The notice stylesheet is namespaced to this plugin and injected once.
    expect(dom.headChildren).toHaveLength(1)
    expect(dom.headChildren[0]!.dataset.plugin).toBe('dsh-desktop-workspace-drop')
  })

  it('reuses one notice node across failures and removes its effects on dispose', async () => {
    const { plugin, ctx, dom, effects } = await loadPlugin({
      bridge,
      create: async () => {
        throw new Error('workspace/invalid-path')
      }
    })
    plugin.apply(ctx)

    dom.dispatch('drop', eventFor(transferFor([{ isDirectory: true, name: 'a' }])))
    await vi.waitFor(() => expect(dom.bodyChildren).toHaveLength(1))
    dom.dispatch('drop', eventFor(transferFor([{ isDirectory: true, name: 'b' }])))
    expect(dom.bodyChildren).toHaveLength(1)

    for (const dispose of effects) dispose()
    expect(dom.listenerCount('drop', true)).toBe(0)
    expect(dom.bodyChildren[0]!.isConnected).toBe(false)
  })
})
