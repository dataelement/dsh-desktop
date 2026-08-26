import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'

const requireModule = createRequire(import.meta.url)
const { createElement } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
}
const { act } = requireModule('react') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
}
const { createRoot } = requireModule('react-dom/client') as {
  createRoot: (container: unknown) => {
    render(node: unknown): void
    unmount(): void
  }
}

type ClientBundle = Record<string, unknown>

async function loadLayoutBundle(browserWindow: Window): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js',
    'utf8'
  )
  let descriptor: {
    factory(require: (id: string) => unknown): ClientBundle
  } | undefined
  Object.assign(browserWindow, {
    __ModuleLoader__: {
      load(value: typeof descriptor) {
        descriptor = value
      }
    }
  })
  runInNewContext(source, {
    window: browserWindow,
    document: browserWindow.document,
    navigator: browserWindow.navigator,
    localStorage: browserWindow.localStorage,
    ResizeObserver: browserWindow.ResizeObserver,
    requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
    cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow)
  })
  if (descriptor === undefined) throw new Error('layout bundle did not register')
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === '@deepseek-ai/dsh-client-runtime/client') {
      return { defineStore: (definition: unknown) => definition }
    }
    return {}
  })
}

describe('Sherlock desktop shell controls', () => {
  it('centers the Better Sidebar panel toggles lower in the macOS titlebar', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')
    const shellStyles = await readFile('src/preload/shell-style.ts', 'utf8')

    expect(preload).toContain('mountDesktopShellStyles(document)')
    expect(shellStyles).toContain('.t8lSSG_toggleCluster')
    expect(shellStyles).toContain('top: calc(8px + env(safe-area-inset-top)) !important')
  })

  it('opens Research at the saved width and restores the exact prior details state', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const client = await loadLayoutBundle(browserWindow)
    const LayoutController = client.LayoutController as new () => {
      attachPanels(actions: Record<string, (...args: unknown[]) => void>): void
      observePanels(state: {
        sidebar: number
        details: number
        narrow: boolean
        narrowExpanded: boolean
      }): void
      enterResearch(): void
      leaveResearch(): void
    }
    const layout = new LayoutController()
    const writes: unknown[][] = []
    layout.attachPanels({
      setDetails: (px) => writes.push(['setDetails', px]),
      closeDetails: () => writes.push(['closeDetails'])
    })

    layout.observePanels({ sidebar: 280, details: 0, narrow: false, narrowExpanded: false })
    layout.enterResearch()
    expect(writes).toEqual([['setDetails', 420]])

    layout.observePanels({ sidebar: 280, details: 472, narrow: false, narrowExpanded: false })
    layout.leaveResearch()
    expect(writes.at(-1)).toEqual(['closeDetails'])

    layout.observePanels({ sidebar: 280, details: 360, narrow: false, narrowExpanded: false })
    layout.enterResearch()
    layout.leaveResearch()
    expect(writes.at(-1)).toEqual(['setDetails', 360])
  })

  it('reports AppFrame panel snapshots and owns a details portal host', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const client = await loadLayoutBundle(browserWindow)
    expect(client.AppFrame).toBeTypeOf('function')
    if (typeof client.AppFrame !== 'function') return

    const previousEnvironment = {
      window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
      document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
      navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
      act: Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
    }
    Object.defineProperties(globalThis, {
      window: { configurable: true, value: browserWindow },
      document: { configurable: true, value: browserWindow.document },
      navigator: { configurable: true, value: browserWindow.navigator },
      IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true }
    })
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const panels = { sidebar: 280, details: 360, narrow: false, narrowExpanded: false }
    const reports: Array<typeof panels> = []
    try {
      await act(async () => {
        root.render(createElement(client.AppFrame, {
          useStore: (select: (state: typeof panels) => unknown) => select(panels),
          useSessions: (select: (state: unknown) => unknown) => select({
            current: 'session-1',
            byId: { 'session-1': { blank: false } }
          }),
          actions: {
            setNarrow: () => undefined,
            closeDetails: () => undefined,
            setSidebar: () => undefined,
            setDetails: () => undefined
          },
          reportPanels: (snapshot: typeof panels) => reports.push(snapshot),
          renderSlot: (name: string) => createElement('div', { 'data-slot-name': name })
        }))
      })

      const portal = host.querySelector('[data-details-portal-host]')
      expect(portal).not.toBeNull()
      expect(portal?.parentElement?.querySelector('[data-slot-name="details"]'))
        .not.toBeNull()
      expect(reports).toEqual([panels])
    } finally {
      await act(async () => { root.unmount() })
      for (const [key, descriptor] of Object.entries(previousEnvironment)) {
        const name = key === 'act' ? 'IS_REACT_ACT_ENVIRONMENT' : key
        if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[name]
        else Object.defineProperty(globalThis, name, descriptor)
      }
    }
  })
})
