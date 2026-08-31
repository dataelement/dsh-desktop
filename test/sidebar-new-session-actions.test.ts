import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

type ClientBundle = Record<string, unknown>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)
const react = requireModule('react') as Record<string, unknown>
const jsxRuntime = requireModule('react/jsx-runtime') as Record<string, unknown>
const { createElement } = react as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
}
const { act } = react as {
  act: (callback: () => void | Promise<void>) => Promise<void>
}
const { createRoot } = requireModule('react-dom/client') as {
  createRoot(container: unknown): { render(node: unknown): void; unmount(): void }
}

const previousGlobals = {
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  window: globalThis.window
}

function installBrowserGlobals(browserWindow: Window) {
  Object.assign(globalThis, {
    document: browserWindow.document,
    HTMLElement: browserWindow.HTMLElement,
    window: browserWindow,
    IS_REACT_ACT_ENVIRONMENT: true
  })
}

afterEach(() => {
  Object.assign(globalThis, previousGlobals)
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT = false
})

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({})
  })
  return fake
}

async function loadClientBundle(
  packageName: string,
  browserWindow?: Window,
  expose: string[] = []
): Promise<ClientBundle> {
  let source = await readFile(`node_modules/@deepseek-ai/${packageName}/lib/client.js`, 'utf8')
  if (expose.length > 0) {
    source = source.replace(
      '\t\texports.apply = apply;',
      `\t\texports.apply = apply;\n${expose.map((name) => `\t\texports.__test${name} = ${name};`).join('\n')}`
    )
  }
  let descriptor: BundleDescriptor | undefined
  const bundleWindow = browserWindow ?? ({ sessionStorage: undefined } as unknown as Window)
  Object.assign(bundleWindow, {
    __ModuleLoader__: {
      load(value: BundleDescriptor) {
        descriptor = value
      }
    }
  })
  runInNewContext(source, {
    window: bundleWindow,
    document: browserWindow?.document,
    navigator: browserWindow?.navigator ?? { userAgent: '' },
    localStorage: browserWindow?.localStorage,
    sessionStorage: browserWindow?.sessionStorage,
    CustomEvent: browserWindow?.CustomEvent,
    HTMLElement: browserWindow?.HTMLElement,
    requestAnimationFrame: browserWindow?.requestAnimationFrame.bind(browserWindow),
    cancelAnimationFrame: browserWindow?.cancelAnimationFrame.bind(browserWindow),
    queueMicrotask,
    setTimeout,
    clearTimeout,
    console
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === 'react-dom') return requireModule('react-dom')
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      const Tooltip = ({ children }: { children: unknown }) => children
      const IconNewChat = ({ className }: { className?: string }) =>
        createElement('span', { className, 'data-test-icon': 'chat' })
      const IconResearch = ({ className }: { className?: string }) =>
        createElement('span', { className, 'data-test-icon': 'research' })
      return new Proxy({
        Tooltip,
        IconNewChatOutline16: IconNewChat,
        IconSearchOutline16: IconResearch,
        IconPanelLeftOutline16: IconNewChat
      }, { get: (target, property) => Reflect.get(target, property) ?? fakeModule() })
    }
    return fakeModule()
  })
}

describe('Sherlock sidebar new-session actions', () => {
  it('renders distinct New Chat and New Research buttons and routes each action separately', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-sidebar', browserWindow, ['SidebarRoot'])
    const SidebarRoot = client.__testSidebarRoot as (props: Record<string, unknown>) => unknown
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const startSession = vi.fn()
    const startResearchSession = vi.fn()
    const labels: Record<string, string> = {
      'session.new': '新对话',
      'session.new.label': '新建对话',
      'session.newResearch': '新研究',
      'session.newResearch.label': '新建研究'
    }

    try {
      await act(async () => {
        root.render(createElement(SidebarRoot, {
          collapsed: false,
          width: 280,
          startSession,
          startResearchSession,
          toggleSidebar: vi.fn(),
          t: (key: string) => labels[key] ?? key,
          renderSlot: () => null
        }))
      })

      const chat = host.querySelector('button[aria-label="新建对话"]') as HTMLElement | null
      const research = host.querySelector('button[aria-label="新建研究"]') as HTMLElement | null
      expect(chat?.textContent).toContain('新对话')
      expect(research?.textContent).toContain('新研究')
      expect(chat?.querySelector('[data-test-icon]')?.outerHTML)
        .not.toBe(research?.querySelector('[data-test-icon]')?.outerHTML)

      await act(async () => { chat?.click() })
      await act(async () => { research?.click() })
      expect(startSession).toHaveBeenCalledOnce()
      expect(startResearchSession).toHaveBeenCalledOnce()
    } finally {
      await act(async () => { root.unmount() })
    }
  })

  it('prepares a requested session before opening it', async () => {
    const client = await loadClientBundle('dsh-client-runtime')
    const WorkspaceRuntime = client.WorkspaceRuntime as new (
      context: Record<string, unknown>, api: Record<string, unknown>, sessions: Record<string, unknown>
    ) => {
      list: { update(mutator: (draft: Record<string, unknown>) => void): void }
      connectWorkspace(workspaceId: string): Promise<string>
      startSession(workspaceId?: string, beforeOpen?: (sessionId: string) => void): void
    }
    const events: string[] = []
    const sessions = {
      list: {
        subscribe: () => () => {},
        getSnapshot: () => ({ current: undefined, ids: [], byId: {} })
      },
      open: (sessionId: string) => { events.push(`open:${sessionId}`) },
      clear: vi.fn(),
      create: vi.fn()
    }
    const runtime = new WorkspaceRuntime({
      reflect: { provide: vi.fn() }
    }, {}, sessions)
    runtime.list.update((draft) => {
      draft.items = [{ workspaceId: 'workspace-1', path: '/workspace', sessionIds: [] }]
      draft.recentWorkspaceId = 'workspace-1'
    })
    runtime.connectWorkspace = async () => 'session-new-research'

    runtime.startSession('workspace-1', (sessionId) => {
      events.push(`prepare:${sessionId}`)
    })
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))

    expect(events).toEqual([
      'prepare:session-new-research',
      'open:session-new-research'
    ])
  })

  it('renders the requested Research view on the new session first frame', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    installBrowserGlobals(browserWindow)
    browserWindow.sessionStorage.setItem(
      'sherlock.conversation.initial-research-session.v1',
      'session-new-research'
    )
    const client = await loadClientBundle(
      'dsh-client-ui-conversation', browserWindow, ['ConversationSession']
    )
    const ConversationSession = client.__testConversationSession as (
      props: Record<string, unknown>
    ) => unknown
    const renderedViews: string[] = []
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const state = {
      view: null,
      draft: '',
      selection: null,
      inspect: null,
      researchRightTab: 'conversation',
      researchFilesTabOpen: true,
      researchConversationUnread: false
    }

    try {
      await act(async () => {
        root.render(createElement(ConversationSession, {
          sessionId: 'session-new-research',
          useSession: (selector: (value: Record<string, unknown>) => unknown) => selector({
            composerPhase: 'active', blank: false
          }),
          useInput: (selector: (value: Record<string, unknown>) => unknown) => selector({ draft: '' }),
          inputActions: { setDraft: vi.fn() },
          useStore: (selector: (value: typeof state) => unknown) => selector(state),
          actions: {
            setView: vi.fn(), setDraft: vi.fn(), setInspect: vi.fn()
          },
          views: {
            subscribe: () => () => {},
            version: () => 1,
            list: () => [{ id: 'chat', label: '对话' }, { id: 'research', label: '研究' }]
          },
          renderSlot: (_name: string, _props: unknown, options: { only: string }) => {
            renderedViews.push(options.only)
            return createElement('div', { 'data-rendered-view': options.only })
          },
          bindDraftMirror: () => () => {},
          releaseSessionImages: vi.fn(),
          releaseResearchWorkspace: vi.fn()
        }))
      })

      expect(renderedViews.at(-1)).toBe('research')
      expect(host.querySelector('[data-rendered-view="research"]')).not.toBeNull()
      expect(host.querySelector('[data-rendered-view="chat"]')).toBeNull()
    } finally {
      await act(async () => { root.unmount() })
    }
  })
})
