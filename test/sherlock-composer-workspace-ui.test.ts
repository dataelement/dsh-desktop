import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window, type Element as HappyDOMElement, type Event as HappyDOMEvent } from 'happy-dom'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>
type ComponentType<Props> = (props: Props) => unknown
type ReactNode = unknown

const requireModule = createRequire(import.meta.url)
const { createElement, useLayoutEffect, useSyncExternalStore } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
  useLayoutEffect: (effect: () => void | (() => void), dependencies: unknown[]) => void
  useSyncExternalStore: <T>(
    subscribe: (listener: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T
  ) => T
}
const { renderToStaticMarkup } = requireModule('react-dom/server') as {
  renderToStaticMarkup: (node: unknown) => string
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

type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

type InjectedStyle = {
  pluginCss?: string
  textContent: string
}

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
  dshDesktop?: {
    showItemInFolder?(path: string): Promise<{ ok: boolean }>
    getPathForFile?(file: File): string
  },
  options?: {
    document?: unknown
    window?: Window
    modules?: Record<string, unknown>
    styles?: InjectedStyle[]
  }
): Promise<ClientBundle> {
  const source = await readFile(
    `node_modules/@deepseek-ai/${packageName}/lib/client.js`,
    'utf8'
  )
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  let descriptor: BundleDescriptor | undefined

  const styleDocument = options?.document ?? (options?.styles === undefined
    ? undefined
    : {
        querySelector: () => null,
        createElement: () => ({
          dataset: {} as Record<string, string>,
          textContent: ''
        }),
        head: {
          appendChild(tag: {
            dataset: { pluginCss?: string }
            textContent: string
          }) {
            options.styles?.push({
              pluginCss: tag.dataset.pluginCss,
              textContent: tag.textContent
            })
          }
        }
      })

  const bundleWindow = options?.window ?? {}
  Object.assign(bundleWindow, {
    dshDesktop,
    __ModuleLoader__: {
      load(value: BundleDescriptor) {
        descriptor = value
      }
    }
  })

  runInNewContext(source, {
    window: bundleWindow,
    document: styleDocument,
    localStorage: options?.window?.localStorage,
    navigator: options?.window?.navigator,
    HTMLElement: options?.window?.HTMLElement,
    HTMLTextAreaElement: options?.window?.HTMLTextAreaElement,
    ResizeObserver: options?.window?.ResizeObserver,
    requestAnimationFrame: options?.window?.requestAnimationFrame?.bind(options.window),
    cancelAnimationFrame: options?.window?.cancelAnimationFrame?.bind(options.window),
    setTimeout,
    clearTimeout
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (options?.modules?.[id] !== undefined) return options.modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === 'react-dom') return requireModule('react-dom')
    return fakeModule()
  })
}

function createSelectorStore<State extends object>(initial: State) {
  let state = initial
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }
  return {
    useSelector: <Selected>(select: (state: State) => Selected): Selected =>
      useSyncExternalStore(
        subscribe,
        () => select(state),
        () => select(state)
      ),
    get: () => state,
    update(patch: Partial<State>) {
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener())
    }
  }
}

async function mountConversationRoot(
  initialView: 'chat' | 'research' = 'research',
  assistantMessage?: { messageId: string; text: string; settled?: boolean },
  lifecycle?: {
    enterResearch(): void
    leaveResearch(): void
  }
) {
  const browserWindow = new Window({ url: 'https://sherlock.local/' })
  const sessionId = 'session-research-right-panel'
  browserWindow.localStorage.setItem(
    `sherlock.research.canvas.files.v1:${sessionId}`,
    JSON.stringify([
      {
        id: 'file-a',
        path: '/tmp/research/evidence.pdf',
        name: 'evidence.pdf',
        mediaType: 'application/pdf',
        source: 'computer',
        x: 100,
        y: 80
      },
      {
        id: 'file-b',
        name: 'unresolved.txt',
        source: 'sherlock',
        x: 150,
        y: 120
      }
    ])
  )
  browserWindow.localStorage.setItem(
    `sherlock.research.canvas.selection.v1:${sessionId}`,
    JSON.stringify({
      selectedNodeIds: ['file-a', 'file-b'],
      orderedFileIds: ['file-b', 'file-a']
    })
  )
  const restoreGlobals = installBrowserGlobals(browserWindow)
  const primitives = new Proxy({
    Tooltip: ({ children }: { children: unknown }) => children
  }, {
    get(target, property) {
      return Reflect.get(target, property) ?? (() => null)
    }
  })
  const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
    document: browserWindow.document,
    window: browserWindow,
    modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives }
  })
  expect(client.ConversationRoot).toBeTypeOf('function')
  if (typeof client.ConversationRoot !== 'function') {
    restoreGlobals()
    throw new Error('ConversationRoot is not exported')
  }
  const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
    for(id: string): {
      subscribe(listener: () => void): () => void
      getSnapshot(): {
        files: Array<Record<string, unknown>>
        artifacts: Array<Record<string, unknown>>
        viewport: { scale: number; x: number; y: number }
        canvasSize: { width: number; height: number }
        pendingMessageJump: string | null
      }
      assistantActionsActive(): boolean
      removeSelectedFile(fileId: string): void
      setArtifacts(artifacts: Array<Record<string, unknown>>): void
      setViewport(viewport: { scale: number; x: number; y: number }): void
      setCanvasSize(size: { width: number; height: number }): void
    }
  }
  const researchWorkspaces = new Registry(browserWindow.localStorage as Storage)
  type ResearchChatState = {
    selection: Record<string, unknown> | null
    draft: string
    view: string | null
    inspect: { callId: string } | null
    researchRightTab: 'conversation' | 'files' | 'details'
    researchFilesTabOpen: boolean
    researchConversationUnread: boolean
  }
  const createSessionBinding = (overrides: Partial<ResearchChatState> = {}) => {
    const chat = createSelectorStore<ResearchChatState>({
      selection: {
        callId: 'call-1', toolName: 'Web Search', turnSeq: 1
      },
      draft: '研究草稿',
      view: initialView,
      inspect: null,
      researchRightTab: 'details',
      researchFilesTabOpen: true,
      researchConversationUnread: false,
      ...overrides
    })
    const actions = {
      select: (selection: Record<string, unknown> | null) => chat.update({ selection }),
      setView: (view: string) => chat.update({ view }),
      setInspect: (inspect: { callId: string } | null) => chat.update({ inspect }),
      setResearchRightTab: (researchRightTab: 'conversation' | 'files' | 'details') =>
        chat.update({ researchRightTab }),
      setResearchFilesTabOpen: (researchFilesTabOpen: boolean) =>
        chat.update({ researchFilesTabOpen }),
      setResearchConversationUnread: (researchConversationUnread: boolean) =>
        chat.update({ researchConversationUnread })
    }
    return { actions, chat }
  }
  const initialBinding = createSessionBinding()
  const { actions, chat } = initialBinding
  const session = createSelectorStore({
    openState: 'open',
    composerPhase: 'active',
    pending: [] as unknown[],
    blank: false,
    chat: { order: ['message-1'] },
    running: false
  })
  const input = createSelectorStore({
    draft: '研究草稿',
    images: [{ id: 'image-a' }, { id: 'image-b' }]
  })
  const detailsPortalHost = browserWindow.document.createElement('div')
  detailsPortalHost.setAttribute('data-details-portal-host', '')
  browserWindow.document.body.appendChild(detailsPortalHost)
  const host = browserWindow.document.createElement('div')
  browserWindow.document.body.appendChild(host)
  const root = createRoot(host)
  const sidebarRoot = createRoot(detailsPortalHost)
  const transitions = { enter: 0, leave: 0 }
  const translate = (key: string) => ({
    'research.right.conversation': '对话',
    'research.right.files': '文件',
    'research.right.add': '添加标签页',
    'research.right.closeFiles': '关闭文件',
    'research.right.closeDetails': '关闭详情',
    'research.right.pathUnavailable': '路径不可用',
    'research.right.source.computer': '本地电脑',
    'research.right.source.sherlock': 'Sherlock'
  }[key] ?? key)
  let activeSidebarSessionId = sessionId
  let sidebarDescriptor: Record<string, unknown> | undefined
  const sidebarStates = new Map<string, {
    panelOpen: boolean
    width: number
    activePane: string
    splits: Record<string, unknown>
    bottomSplits: Record<string, unknown>
  }>()
  const sidebarStateFor = (id: string) => {
    let value = sidebarStates.get(id)
    if (value === undefined) {
      value = {
        panelOpen: false,
        width: 438,
        activePane: 'pane-1',
        splits: {
          kind: 'leaf', id: 'pane-1', active: 'files-tab',
          tabs: [{ id: 'files-tab', type: 'editor', title: 'Files' }]
        },
        bottomSplits: { kind: 'leaf', id: 'pane-2', active: null, tabs: [] }
      }
      sidebarStates.set(id, value)
    }
    return value
  }
  const researchSidebar = new (client.ResearchSidebarCoordinator as new () => {
    attach(service: Record<string, unknown>, t: (key: string) => string): () => void
  })()
  const detachResearchSidebar = researchSidebar.attach({
    registerTab(descriptor: Record<string, unknown>) {
      sidebarDescriptor = descriptor
      return () => { sidebarDescriptor = undefined }
    },
    getSnapshot: () => ({
      sessionId: activeSidebarSessionId,
      state: sidebarStateFor(activeSidebarSessionId)
    }),
    openTab(seed: Record<string, unknown>, scope: { sessionId: string }) {
      const state = sidebarStateFor(scope.sessionId)
      state.panelOpen = true
      state.splits = {
        kind: 'leaf', id: 'pane-1', active: seed.id,
        tabs: [seed, { id: 'files-tab', type: 'editor', title: 'Files' }]
      }
      transitions.enter += 1
      lifecycle?.enterResearch()
    },
    updateTab: () => undefined,
    closeTab(_tabId: string, scope: { sessionId: string }) {
      sidebarStateFor(scope.sessionId).panelOpen = false
      transitions.leave += 1
      lifecycle?.leaveResearch()
    },
    activateTab: () => undefined,
    setPanelState(patch: { open?: boolean; width?: number }, scope: { sessionId: string }) {
      Object.assign(sidebarStateFor(scope.sessionId), {
        ...(patch.open === undefined ? {} : { panelOpen: patch.open }),
        ...(patch.width === undefined ? {} : { width: patch.width })
      })
    }
  }, translate)
  const renderSidebar = (activeSessionId: string) => {
    const Component = sidebarDescriptor?.component as ComponentType<Record<string, unknown>>
    sidebarRoot.render(createElement(Component, {
      scope: { sessionId: activeSessionId },
      visible: true
    }))
  }
  const renderChatView = (activeSessionId = sessionId) => createElement('div', { 'data-chat-view': '' },
    assistantMessage === undefined
      ? 'message-1'
      : createElement('div', {
          'data-assistant-message-id': assistantMessage.messageId,
          'data-assistant-message-settled': assistantMessage.settled === false
            ? undefined
            : ''
        },
        createElement('span', null, assistantMessage.text),
        createElement(client.ResearchAssistantCanvasAction as ComponentType<Record<string, unknown>>, {
          messageId: assistantMessage.messageId,
          text: assistantMessage.text,
          workspace: researchWorkspaces.for(activeSessionId)
        }))
  )
  const TestSessionBridge = ({ onResearchPresentation, chatStore, sessionActions, activeSessionId }: {
    onResearchPresentation?: (value: Record<string, unknown> | null) => void
    chatStore: typeof chat
    sessionActions: typeof actions
    activeSessionId: string
  }) => {
    const snapshot = chatStore.useSelector((state) => state)
    useLayoutEffect(() => {
      onResearchPresentation?.({
        ...snapshot,
        actions: sessionActions,
        conversationView: renderChatView(activeSessionId)
      })
      return () => onResearchPresentation?.(null)
    }, [activeSessionId, onResearchPresentation, sessionActions, snapshot])
    return createElement('div', {
      'data-center-session-view': snapshot.view ?? 'chat'
    })
  }
  const createRenderSlot = (
    activeSessionId: string,
    chatStore: typeof chat,
    sessionActions: typeof actions
  ) => (name: string, owner?: unknown, options?: { only?: string }) => {
    if (name === 'conversation.session.header') {
      return createElement('div', { 'data-session-header': '' })
    }
    if (name === 'conversation.session') {
      return createElement(TestSessionBridge, {
        ...(owner as Record<string, unknown>),
        activeSessionId,
        chatStore,
        sessionActions
      })
    }
    if (name === 'conversation.composer.bar') {
      const composerOwner = owner as {
        accessory?: unknown
        footer?: unknown
      } | undefined
      return createElement('div', {
        'data-test-composer-bar': '',
        'data-test-composer-has-accessory': composerOwner?.accessory === undefined
          ? 'false'
          : 'true'
      },
        composerOwner?.accessory,
        ...input.get().images.map((image) => createElement('span', {
          key: image.id,
          'data-composer-image-id': image.id
        })),
        createElement('textarea', {
          defaultValue: input.get().draft,
          'data-input-machine-snapshot': input.get().draft
        }),
        composerOwner?.footer
      )
    }
    if (name === 'conversation.input.dock') {
      return createElement('div', null,
        createElement('div', { 'data-queue-strip': '' }),
        createElement('div', { 'data-task-dock': '' })
      )
    }
    if (name === 'conversation.composer.dock') {
      return createElement('div', { 'data-stats-footer': '' })
    }
    if (name === 'conversation.view' && options?.only === 'chat') {
      return renderChatView(activeSessionId)
    }
    return null
  }
  const renderConversation = (
    activeSessionId: string,
    binding = initialBinding
  ) => createElement(client.ConversationRoot, {
      sessionId: activeSessionId,
      useSession: session.useSelector,
      useSessions: (select: (state: unknown) => unknown) => select({
        current: activeSessionId,
        byId: {
          [sessionId]: { cwd: '/tmp/research', blank: false },
          [activeSessionId]: { cwd: '/tmp/research', blank: false }
        }
      }),
      useWorkspaces: (select: (state: unknown) => unknown) => select({
        phase: 'ready',
        items: []
      }),
      useInput: input.useSelector,
      useComposerBlock: (select: (block: undefined) => unknown) => select(undefined),
      useStore: binding.chat.useSelector,
      actions: binding.actions,
      researchWorkspaces,
      researchSidebar,
      renderSlot: createRenderSlot(activeSessionId, binding.chat, binding.actions),
      renderSlotChain: (_name: string, _owner: unknown, options: { fallback: unknown }) =>
        options.fallback,
      selectWorkspace: async () => undefined,
      t: translate
    })
  await act(async () => {
    renderSidebar(sessionId)
    root.render(renderConversation(sessionId))
  })
  return {
    actions,
    browserWindow,
    chat,
    client,
    createSessionBinding,
    detailsPortalHost,
    host,
    input,
    researchWorkspaces,
    session,
    sessionId,
    transitions,
    workspace: researchWorkspaces.for(sessionId),
    async rerenderSession(
      activeSessionId: string,
      binding = initialBinding
    ) {
      activeSidebarSessionId = activeSessionId
      await act(async () => {
        renderSidebar(activeSessionId)
        root.render(renderConversation(activeSessionId, binding))
      })
    },
    async cleanup() {
      await act(async () => {
        root.unmount()
        sidebarRoot.unmount()
      })
      detachResearchSidebar()
      restoreGlobals()
    }
  }
}

function installBrowserGlobals(browserWindow: Window): () => void {
  const keys = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'] as const
  const descriptors = new Map(keys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key)
  ]))
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: browserWindow },
    document: { configurable: true, value: browserWindow.document },
    navigator: { configurable: true, value: browserWindow.navigator },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true }
  })
  return () => {
    for (const key of keys) {
      const descriptor = descriptors.get(key)
      if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key]
      else Object.defineProperty(globalThis, key, descriptor)
    }
  }
}

function dispatchDrag(
  browserWindow: Window,
  target: HappyDOMElement,
  type: string,
  dataTransfer: {
    types: string[]
    files: Array<{ name: string; type: string }>
    getData(type: string): string
    dropEffect: string
  },
  point = { x: 120, y: 90 }
): HappyDOMEvent {
  const event = new browserWindow.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    dataTransfer: { value: dataTransfer },
    clientX: { value: point.x },
    clientY: { value: point.y }
  })
  target.dispatchEvent(event)
  return event
}

function pointer(
  browserWindow: Window,
  type: string,
  options: {
    pointerId: number
    x: number
    y: number
    button?: number
    metaKey?: boolean
    shiftKey?: boolean
  }
): HappyDOMEvent {
  const event = new browserWindow.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId },
    clientX: { value: options.x },
    clientY: { value: options.y },
    button: { value: options.button ?? 0 },
    metaKey: { value: options.metaKey ?? false },
    shiftKey: { value: options.shiftKey ?? false }
  })
  return event
}

function click(browserWindow: Window, target: HappyDOMElement | null): void {
  target?.dispatchEvent(new browserWindow.Event('click', { bubbles: true, cancelable: true }))
}

async function mountResearchCanvas(options: {
  sessionId: string
  files?: Array<Record<string, unknown>>
  artifacts?: Array<Record<string, unknown>>
  selection?: { selectedNodeIds: string[]; orderedFileIds: string[] }
  viewport?: { scale: number; x: number; y: number }
  storage?: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
}) {
  const browserWindow = new Window({ url: 'https://sherlock.local/' })
  const { sessionId } = options
  const storage = options.storage ?? browserWindow.localStorage
  storage.setItem(
    `sherlock.research.canvas.files.v1:${sessionId}`,
    JSON.stringify(options.files ?? [])
  )
  storage.setItem(
    `sherlock.research.canvas.artifacts.v1:${sessionId}`,
    JSON.stringify(options.artifacts ?? [])
  )
  storage.setItem(
    `sherlock.research.canvas.selection.v1:${sessionId}`,
    JSON.stringify(options.selection ?? { selectedNodeIds: [], orderedFileIds: [] })
  )
  const restoreGlobals = installBrowserGlobals(browserWindow)
  const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
    document: browserWindow.document,
    window: browserWindow
  })
  const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
    for(id: string): {
      getSnapshot(): {
        files: Array<Record<string, unknown>>
        artifacts: Array<Record<string, unknown>>
        selection: { selectedNodeIds: string[]; orderedFileIds: string[] }
        viewport: { scale: number; x: number; y: number }
      }
      setViewport(viewport: { scale: number; x: number; y: number }): void
    }
  }
  const researchWorkspaces = new Registry(storage as Storage)
  const workspace = researchWorkspaces.for(sessionId)
  if (options.viewport !== undefined) workspace.setViewport(options.viewport)
  const ResearchCanvas = client.ResearchCanvas as ComponentType<{
    sessionId: string
    t: (key: string) => string
    researchWorkspaces: InstanceType<typeof Registry>
  }>
  const host = browserWindow.document.createElement('div')
  browserWindow.document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(createElement(ResearchCanvas, {
      sessionId,
      researchWorkspaces,
      t: () => '研究画布'
    }))
  })
  const canvas = host.querySelector('[data-research-canvas]') as HappyDOMElement | null
  expect(canvas).not.toBeNull()
  if (canvas === null) throw new Error('Research canvas did not render')
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 })
  })
  return {
    browserWindow,
    canvas,
    client,
    host,
    workspace,
    async cleanup() {
      await act(async () => { root.unmount() })
      restoreGlobals()
    }
  }
}

describe('Sherlock workspace and composer controls', () => {
  it('opens details for the selected Inspect call while preserving trajectory', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
      'utf8'
    )

    expect(source).toContain(`inspectCall: (callId) => {
\t\t\t\t\t\t\tactions.select({ callId });
\t\t\t\t\t\t\tlayout.openDetails();
\t\t\t\t\t\t\tactions.setInspect({ callId });
\t\t\t\t\t\t\tactions.setView("trajectory");
\t\t\t\t\t\t}`)
  })

  it('omits the Session log button from the conversation header', async () => {
    const primitives = new Proxy(
      {
        Modal: () => null
      },
      {
        get(target, property) {
          return Reflect.get(target, property) ?? (() => null)
        }
      }
    )
    const client = await loadClientBundle('dsh-session-log-export', undefined, {
      modules: {
        '@deepseek-ai/dsh-client-ui-primitives': primitives
      }
    })
    expect(client.SessionLogDownloadHeaderAction).toBeTypeOf('function')
    if (typeof client.SessionLogDownloadHeaderAction !== 'function') return

    const SessionLogDownloadHeaderAction =
      client.SessionLogDownloadHeaderAction as ComponentType<{
        sessionId: string
        useSessionLogDownload: (selector: (state: unknown) => unknown) => unknown
        request: (sessionId: string) => void
        dismiss: (sessionId: string) => void
        t: (key: string) => string
      }>
    const html = renderToStaticMarkup(
      createElement(SessionLogDownloadHeaderAction, {
        sessionId: 'session-1',
        useSessionLogDownload: (
          selector: (state: { bySession: Record<string, unknown> }) => unknown
        ) => selector({ bySession: {} }),
        request: () => undefined,
        dismiss: () => undefined,
        t: (key: string) => key
      })
    )

    expect(html).not.toContain('Session log')
    expect(html).not.toContain('<button')
  })

  it('uses theme-aware monochrome surfaces for both send and stop actions', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const inputBarCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/InputBar.module.css')
    )?.textContent

    expect(inputBarCss).toContain('.uV2eYG_primary{background:#0f1115}')
    expect(inputBarCss).toContain(
      '.uV2eYG_primary:hover:not(:disabled){background:#23262b}'
    )
    expect(inputBarCss).toContain(
      'body[data-ds-dark-theme] .uV2eYG_primary{background:#f5f5f5;color:#202124}'
    )
    expect(inputBarCss).toContain(
      'body[data-ds-dark-theme] .uV2eYG_primary:hover:not(:disabled){background:#fff}'
    )
  })

  it('uses a gray outline icon for the expanded current workspace', async () => {
    const primitives = new Proxy(
      {
        IconFolderOpenOutline16: () =>
          createElement('svg', { 'data-icon': 'folder-open-outline' }),
        IconFolderClose16: () =>
          createElement('svg', { 'data-icon': 'folder-close' })
      },
      {
        get(target, property) {
          return Reflect.get(target, property) ?? (() => null)
        }
      }
    )
    const styles: InjectedStyle[] = []
    const client = await loadClientBundle('dsh-client-ui-workspace', undefined, {
      modules: {
        '@deepseek-ai/dsh-client-ui-primitives': primitives
      },
      styles
    })
    expect(client.WorkspaceFolderIcon).toBeTypeOf('function')
    if (typeof client.WorkspaceFolderIcon !== 'function') return

    const WorkspaceFolderIcon = client.WorkspaceFolderIcon as ComponentType<{
      expanded: boolean
    }>
    const html = renderToStaticMarkup(
      createElement(WorkspaceFolderIcon, { expanded: true })
    )
    const rowsCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/Rows.module.css')
    )?.textContent

    expect(html).toContain('data-icon="folder-open-outline"')
    expect(rowsCss).toContain(
      '.YDXeBa_folderActive{color:var(--dsw-alias-label-secondary)}'
    )
  })

  it('offers Finder before rename and delete in the workspace menu', async () => {
    const client = await loadClientBundle('dsh-client-ui-workspace')
    expect(client.workspaceMenuItems).toBeTypeOf('function')
    if (typeof client.workspaceMenuItems !== 'function') return

    const labels: Record<string, string> = {
      'openInFinder': '在 Finder 中显示',
      'rename': '重命名',
      'delete.workspace': '删除工作区'
    }
    const items = client.workspaceMenuItems((key: string) => labels[key] ?? key) as Array<{
      id: string
      label: string
    }>

    expect(items.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'finder', label: '在 Finder 中显示' },
      { id: 'rename', label: '重命名' },
      { id: 'delete', label: '删除工作区' }
    ])
  })

  it('opens the workspace path when the Finder menu item is selected', async () => {
    const client = await loadClientBundle('dsh-client-ui-workspace')
    expect(client.runWorkspaceMenuAction).toBeTypeOf('function')
    if (typeof client.runWorkspaceMenuAction !== 'function') return

    let selected = ''
    client.runWorkspaceMenuAction('finder', {
      open: () => {
        selected = 'finder'
      },
      rename: () => {
        selected = 'rename'
      },
      delete: () => {
        selected = 'delete'
      }
    })

    expect(selected).toBe('finder')
  })

  it('uses the native desktop bridge to reveal a workspace in Finder', async () => {
    const revealed: string[] = []
    const client = await loadClientBundle('dsh-client-ui-workspace', {
      async showItemInFolder(path: string) {
        revealed.push(path)
        return { ok: true }
      }
    })
    expect(client.showWorkspaceInFinder).toBeTypeOf('function')
    if (typeof client.showWorkspaceInFinder !== 'function') return

    let usedFallback = false
    await client.showWorkspaceInFinder('/Users/example/project', async () => {
      usedFallback = true
    })

    expect(revealed).toEqual(['/Users/example/project'])
    expect(usedFallback).toBe(false)
  })

  it('wires the Finder reveal bridge through a trusted Electron IPC handler', async () => {
    const [preload, main] = await Promise.all([
      readFile('src/preload/index.ts', 'utf8'),
      readFile('src/main/index.ts', 'utf8')
    ])

    expect(preload).toContain(
      "showItemInFolder: (path: string): Promise<{ ok: boolean }> =>"
    )
    expect(preload).toContain(
      "ipcRenderer.invoke('filesystem:show-item-in-folder', path)"
    )
    expect(main).toContain(
      "ipcMain.handle('filesystem:show-item-in-folder', (event, path: unknown) =>"
    )
    expect(main).toContain('shell.showItemInFolder(path)')
  })

  it('renders the command launcher as an equal-sided rounded rectangle containing a slash', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.CommandLauncherButton).toBeTypeOf('function')
    if (typeof client.CommandLauncherButton !== 'function') return

    const CommandLauncherButton = client.CommandLauncherButton as ComponentType<{
      label: string
      expanded: boolean
      disabled: boolean
    }>
    const html = renderToStaticMarkup(
      createElement(CommandLauncherButton, {
        label: '命令',
        expanded: false,
        disabled: false
      })
    )

    expect(html).toContain('style="width:32px;height:32px;border-radius:9px"')
    expect(html).toContain('>/</span>')
  })

  it('places attachment extensions immediately before permission controls', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.ComposerLeadingControls).toBeTypeOf('function')
    if (typeof client.ComposerLeadingControls !== 'function') return

    const ComposerLeadingControls = client.ComposerLeadingControls as ComponentType<{
      command: ReactNode
      attachments: ReactNode
      permissions: ReactNode
    }>
    const html = renderToStaticMarkup(
      createElement(ComposerLeadingControls, {
        command: createElement('span', null, 'slash'),
        attachments: createElement('span', null, 'attachment'),
        permissions: createElement('span', null, 'permission')
      })
    )

    expect(html).toBe(
      '<span>slash</span><span>attachment</span><span>permission</span>'
    )
  })

  it('registers Research between Chat and Trajectory', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.registerResearchCanvasView).toBeTypeOf('function')
    if (typeof client.registerResearchCanvasView !== 'function') return

    const registrations: Array<{
      options: { id: string; order: number; label: () => string; store?: unknown }
      component: unknown
    }> = []
    client.registerResearchCanvasView({
      register(
        options: { id: string; order: number; label: () => string },
        component: unknown
      ) {
        registrations.push({ options, component })
      }
    }, (key: string) => key === 'view.research' ? '研究' : key)

    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.options.id).toBe('research')
    expect(registrations[0]?.options.order).toBe(5)
    expect(registrations[0]?.options.label()).toBe('研究')
    expect('store' in (registrations[0]?.options ?? {})).toBe(false)
    expect(registrations[0]?.component).toBe(client.ResearchCanvas)
  })

  it('keeps the optional Conversation root free of the session-scoped chat store', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
      'utf8'
    )
    const rootStart = source.indexOf('name: "conversation"')
    const sessionStart = source.indexOf('name: "conversation.session"', rootStart + 1)
    expect(rootStart).toBeGreaterThan(-1)
    expect(sessionStart).toBeGreaterThan(rootStart)
    expect(source.slice(rootStart, sessionStart)).not.toContain('store: chatStore')

    const panelStart = source.indexOf('function ResearchConversationPanel')
    const rootFunctionStart = source.indexOf('function ConversationRoot', panelStart)
    expect(panelStart).toBeGreaterThan(-1)
    expect(rootFunctionStart).toBeGreaterThan(panelStart)
    expect(source.slice(panelStart, rootFunctionStart)).not.toContain(
      'renderSlot("conversation.view"'
    )

    const sessionEnd = source.indexOf('}, ConversationSession);', sessionStart)
    expect(sessionEnd).toBeGreaterThan(sessionStart)
    const sessionRegistration = source.slice(sessionStart, sessionEnd)
    expect(sessionRegistration).toContain('releaseResearchWorkspace:')
    expect(sessionRegistration).toContain('researchWorkspaces.release(id)')
  })

  it('attaches the optional global sidebar only after every shared chat-store seat is mounted', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
      'utf8'
    )
    const sessionStart = source.indexOf('name: "conversation.session"')
    const detailsStart = source.indexOf('name: "details"', sessionStart)
    const detailsEnd = source.indexOf('}, DetailsPanel);', detailsStart)
    const sidebarInjectStart = source.indexOf('ctx.inject(["betterSidebar"]')

    expect(sessionStart).toBeGreaterThan(-1)
    expect(detailsStart).toBeGreaterThan(sessionStart)
    expect(detailsEnd).toBeGreaterThan(detailsStart)
    expect(sidebarInjectStart).toBeGreaterThan(detailsEnd)
  })

  it('registers Research conversation as the pinned first tab in the global sidebar', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.ResearchSidebarCoordinator).toBeTypeOf('function')
    if (typeof client.ResearchSidebarCoordinator !== 'function') return

    let descriptor: Record<string, unknown> | undefined
    const calls: Array<{ name: string; args: unknown[] }> = []
    const state = {
      panelOpen: false,
      width: 438,
      activePane: 'pane-1',
      splits: {
        kind: 'leaf', id: 'pane-1', active: 'files-tab',
        tabs: [{ id: 'files-tab', type: 'editor', title: 'Files' }]
      },
      bottomSplits: { kind: 'leaf', id: 'pane-2', active: null, tabs: [] }
    }
    const service = {
      registerTab(value: Record<string, unknown>) {
        descriptor = value
        return () => { descriptor = undefined }
      },
      getSnapshot: () => ({ sessionId: 'research-session', state }),
      subscribeState: () => () => undefined,
      openTab: (...args: unknown[]) => { calls.push({ name: 'openTab', args }) },
      updateTab: (...args: unknown[]) => { calls.push({ name: 'updateTab', args }) },
      closeTab: (...args: unknown[]) => { calls.push({ name: 'closeTab', args }) },
      activateTab: (...args: unknown[]) => { calls.push({ name: 'activateTab', args }) },
      setPanelState: (...args: unknown[]) => { calls.push({ name: 'setPanelState', args }) }
    }
    const Coordinator = client.ResearchSidebarCoordinator as new () => {
      attach(service: Record<string, unknown>, t: (key: string) => string): () => void
      enter(sessionId: string): void
      leave(sessionId: string): void
    }
    const coordinator = new Coordinator()
    coordinator.attach(service, (key: string) => key === 'research.right.conversation' ? '对话' : key)

    expect(descriptor).toMatchObject({
      id: 'sherlock-research-conversation',
      hidden: true,
      single: true
    })
    expect((descriptor?.title as () => string)()).toBe('对话')

    coordinator.enter('research-session')
    expect(calls[0]).toEqual({
      name: 'openTab',
      args: [{
        id: 'sherlock-research-conversation',
        type: 'sherlock-research-conversation',
        title: '对话',
        path: 'sherlock://research/conversation',
        meta: { sherlockPinned: true, sherlockClosable: false }
      }, { sessionId: 'research-session' }]
    })
    expect(calls[1]).toEqual({
      name: 'setPanelState',
      args: [{ open: true }, { sessionId: 'research-session' }]
    })

    coordinator.leave('research-session')
    expect(calls.slice(2)).toEqual([
      {
        name: 'updateTab',
        args: ['sherlock-research-conversation', {
          meta: { sherlockPinned: false, sherlockClosable: true }
        }, { sessionId: 'research-session' }]
      },
      {
        name: 'closeTab',
        args: ['sherlock-research-conversation', { sessionId: 'research-session' }]
      },
      {
        name: 'activateTab',
        args: ['files-tab', { sessionId: 'research-session' }]
      },
      {
        name: 'setPanelState',
        args: [{ open: false, width: 438 }, { sessionId: 'research-session' }]
      }
    ])
  })

  it('renders the Research sidebar content without its own duplicate tab strip', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow
    })
    expect(client.ResearchConversationPanel).toBeTypeOf('function')
    if (typeof client.ResearchConversationPanel !== 'function') {
      restoreGlobals()
      return
    }
    const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
      for(id: string): {
        subscribe(listener: () => void): () => void
        getSnapshot(): Record<string, unknown>
      }
    }
    const registry = new Registry(browserWindow.localStorage as Storage)
    try {
      const html = renderToStaticMarkup(createElement(client.ResearchConversationPanel, {
        active: true,
        sessionId: 'research-session',
        useSession: (select: (state: Record<string, unknown>) => unknown) => select({
          running: false, chat: { order: [] }
        }),
        presentation: {
          researchRightTab: 'conversation', researchFilesTabOpen: true,
          researchConversationUnread: false, selection: null,
          conversationView: createElement('div', null, 'answer')
        },
        actions: {
          setResearchRightTab: () => undefined,
          setResearchFilesTabOpen: () => undefined,
          setResearchConversationUnread: () => undefined
        },
        renderSlot: () => null,
        researchWorkspaces: registry,
        composerHostRef: { current: null },
        t: (key: string) => key
      }))

      expect(html).toContain('data-research-conversation-panel')
      expect(html).toContain('data-research-conversation-host')
      expect(html).not.toContain('answer')
      expect(html).not.toContain('role="tablist"')
      expect(html).not.toContain('data-research-right-tab')
    } finally {
      restoreGlobals()
    }
  })

  it('publishes the session-scoped Research presentation to the optional root owner', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow
    })
    expect(client.ConversationSession).toBeTypeOf('function')
    if (typeof client.ConversationSession !== 'function') {
      restoreGlobals()
      return
    }
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const chat = createSelectorStore({
      view: 'research',
      selection: { callId: 'call-bridge', toolName: 'Bridge', turnSeq: 1 },
      inspect: null,
      draft: '',
      researchRightTab: 'files',
      researchFilesTabOpen: true,
      researchConversationUnread: true
    })
    const presentations: Array<Record<string, unknown> | null> = []
    const actions = {
      select: () => undefined,
      setDraft: () => undefined,
      setView: () => undefined,
      setInspect: () => undefined,
      setResearchRightTab: () => undefined,
      setResearchFilesTabOpen: () => undefined,
      setResearchConversationUnread: () => undefined
    }
    const releasedImages: string[] = []
    const releasedResearchWorkspaces: string[] = []
    const renderSession = (sessionId: string) => createElement(
      client.ConversationSession as ComponentType<Record<string, unknown>>,
      {
        sessionId,
        useSession: (select: (state: Record<string, unknown>) => unknown) => select({
          composerPhase: 'active', blank: false
        }),
        useInput: (select: (state: Record<string, unknown>) => unknown) => select({
          draft: ''
        }),
        inputActions: { setDraft: () => undefined },
        useStore: chat.useSelector,
        actions,
        renderSlot: () => createElement('div', { 'data-bridged-view': '' }),
        views: {
          subscribe: () => () => undefined,
          version: () => 1,
          list: () => [
            { id: 'chat', label: '对话' },
            { id: 'research', label: '研究' }
          ]
        },
        bindDraftMirror: () => () => undefined,
        releaseSessionImages: (id: string) => { releasedImages.push(id) },
        releaseResearchWorkspace: (id: string) => {
          releasedResearchWorkspaces.push(id)
        },
        onResearchPresentation: (value: Record<string, unknown> | null) => {
          presentations.push(value)
        }
      }
    )
    try {
      await act(async () => {
        root.render(renderSession('session-bridge'))
      })
      expect(presentations.at(-1)).toMatchObject({
        view: 'research',
        selection: { callId: 'call-bridge' },
        researchRightTab: 'files',
        researchFilesTabOpen: true,
        researchConversationUnread: true,
        actions
      })
      expect(renderToStaticMarkup(
        (presentations.at(-1)?.conversationView ?? null) as ReactNode
      )).toContain('data-bridged-view')

      await act(async () => {
        root.render(renderSession('session-bridge-next'))
      })
      expect(releasedImages).toEqual(['session-bridge'])
      expect(releasedResearchWorkspaces).toEqual(['session-bridge'])
    } finally {
      await act(async () => { root.unmount() })
      restoreGlobals()
    }
  })

  it('keeps the session header mounted in Research so Chat and Trajectory remain reachable', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      expect(mounted.host.querySelectorAll('[data-session-header]')).toHaveLength(1)
      expect(mounted.host.querySelector('[data-center-session-view]')?.getAttribute(
        'data-center-session-view'
      )).toBe('research')
    } finally {
      await mounted.cleanup()
    }
  })

  it('adds a finalized assistant response only through the explicit action strip', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const primitives = new Proxy({
      Tooltip: ({ children }: { children: unknown }) => children,
      IconCheckOutline16: () => createElement('span'),
      IconCopyOutline16: () => createElement('span'),
      IconBranchOutline16: () => createElement('span'),
      writeClipboard: async () => true
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    try {
      const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
        document: browserWindow.document,
        window: browserWindow,
        modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives }
      })
      expect(client.registerResearchAssistantActions).toBeTypeOf('function')
      expect(client.TurnTailNodeView).toBeTruthy()
      expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
      if (typeof client.registerResearchAssistantActions !== 'function' ||
          client.TurnTailNodeView === undefined ||
          typeof client.ResearchWorkspaceRegistry !== 'function') return

      const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
        for(id: string): {
          getSnapshot(): {
            artifacts: Array<Record<string, unknown>>
          }
          assistantActionsActive(): boolean
          setAssistantActionsActive(active: boolean): void
          setCanvasSize(size: { width: number; height: number }): void
          setViewport(viewport: { scale: number; x: number; y: number }): void
        }
      }
      const registry = new Registry(browserWindow.localStorage as Storage)
      const workspace = registry.for('session-action')
      expect(workspace.assistantActionsActive).toBeTypeOf('function')
      expect(workspace.setAssistantActionsActive).toBeTypeOf('function')
      if (typeof workspace.assistantActionsActive !== 'function' ||
          typeof workspace.setAssistantActionsActive !== 'function') return
      workspace.setCanvasSize({ width: 800, height: 600 })
      let registration: {
        options: {
          name: string
          id: string
          order: number
          inject(sessionId: string): Record<string, unknown>
        }
        component: ComponentType<Record<string, unknown>>
      } | undefined
      client.registerResearchAssistantActions({
        register(
          options: {
            name: string
            id: string
            order: number
            inject(sessionId: string): Record<string, unknown>
          },
          component: ComponentType<Record<string, unknown>>
        ) {
          registration = { options, component }
          return undefined
        }
      }, registry)
      expect(registration?.options).toMatchObject({
        name: 'conversation.chat.assistant-actions',
        id: 'research-add-to-canvas'
      })
      if (registration === undefined) return

      const host = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(host)
      const root = createRoot(host)
      const actionProps = registration.options.inject('session-action')
      const owners: Array<Record<string, unknown>> = []
      await act(async () => {
        root.render(createElement(
          client.TurnTailNodeView as ComponentType<Record<string, unknown>>,
          {
            node: {
              key: 'tail-1',
              location: { kind: 'turn', turn: {} },
              data: {
                turn: 1,
                seq: 2,
                closing: {
                  finalNode: { seq: 2, messageId: 'm1' },
                  blocks: [{ kind: 'text', text: 'Revenue improved.' }]
                }
              }
            },
            openFile: () => undefined,
            forkAt: () => undefined,
            renderSlot: (name: string, owner: Record<string, unknown>) => {
              if (name !== 'conversation.chat.assistant-actions') return null
              owners.push(owner)
              return createElement(registration?.component as ComponentType<Record<string, unknown>>, {
                ...owner,
                ...actionProps
              })
            },
            renderSlotChain: () => null,
            t: (key: string) => key,
            useSession: (select: (state: unknown) => unknown) => select({
              chat: { locations: { getTurn: () => ['tail-1'] } }
            })
          }
        ))
      })

      expect(owners).toEqual([{
        messageId: 'm1', text: 'Revenue improved.'
      }])
      expect(workspace.getSnapshot().artifacts).toEqual([])
      expect(workspace.assistantActionsActive()).toBe(false)
      expect(host.querySelector('button[aria-label="添加到画布"]')).toBeNull()

      await act(async () => { workspace.setAssistantActionsActive(true) })
      const add = host.querySelector('button[aria-label="添加到画布"]')
      expect(add).not.toBeNull()
      await act(async () => { click(browserWindow, add) })
      expect(workspace.getSnapshot().artifacts).toMatchObject([{
        messageId: 'm1', kind: 'assistant-result', excerpt: 'Revenue improved.',
        x: 400, y: 300
      }])

      workspace.setViewport({ scale: 1, x: 100, y: 50 })
      await act(async () => { click(browserWindow, add) })
      expect(workspace.getSnapshot().artifacts).toMatchObject([{
        messageId: 'm1', kind: 'assistant-result',
        x: 300, y: 250
      }])
      expect(workspace.getSnapshot().artifacts).toHaveLength(1)
      await act(async () => { workspace.setAssistantActionsActive(false) })
      expect(host.querySelector('button[aria-label="添加到画布"]')).toBeNull()
      await act(async () => { root.unmount() })
    } finally {
      restoreGlobals()
    }
  })

  it('shows 添加到画布 only in the active Research right Conversation', async () => {
    const mounted = await mountConversationRoot('chat', {
      messageId: 'm-research-only', text: 'Research-only result.'
    })
    try {
      const { actions, browserWindow, detailsPortalHost, host, workspace } = mounted
      await act(async () => { workspace.setCanvasSize({ width: 800, height: 600 }) })
      expect(host.querySelector('button[aria-label="添加到画布"]')).toBeNull()

      await act(async () => { actions.setView('research') })
      const add = detailsPortalHost.querySelector('button[aria-label="添加到画布"]')
      expect(add).not.toBeNull()
      await act(async () => { click(browserWindow, add) })
      expect(workspace.getSnapshot().artifacts).toMatchObject([{
        messageId: 'm-research-only', kind: 'assistant-result',
        x: 400, y: 300
      }])

      await act(async () => { actions.setResearchRightTab('files') })
      expect(detailsPortalHost.querySelector('button[aria-label="添加到画布"]')).not.toBeNull()
      await act(async () => { actions.setView('chat') })
      expect(host.querySelector('button[aria-label="添加到画布"]')).toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('marks the real settled assistant wrapper with its durable message identity', async () => {
    const primitives = new Proxy({
      MarkdownText: ({ text }: { text: string }) => createElement('span', null, text)
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives }
    })
    expect(client.AssistantNodeView).toBeTruthy()
    if (client.AssistantNodeView === undefined) return

    const html = renderToStaticMarkup(createElement(
      client.AssistantNodeView as ComponentType<Record<string, unknown>>,
      {
        node: {
          location: { kind: 'turn', turn: { status: 'closed' } },
          data: {
            status: 'complete',
            finalNode: { seq: 2, messageId: 'm1' },
            blocks: [{ kind: 'text', text: 'Revenue improved.' }]
          }
        },
        useTurnData: () => ({ closing: { finalNode: { seq: 2 } } }),
        openFile: () => undefined,
        loadImage: async () => '',
        fileMentions: () => undefined,
        t: (key: string) => key
      }
    ))

    expect(html).toContain('data-assistant-message-id="m1"')
    expect(html).toContain('data-assistant-message-settled=""')
    expect(html).toContain('Revenue improved.')
  })

  it('marks conversation tabs with their stable view id for desktop visibility gates', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.conversationViewTabProps).toBeTypeOf('function')
    if (typeof client.conversationViewTabProps !== 'function') return

    const selected: string[] = []
    const props = client.conversationViewTabProps(
      { id: 'memory-files', label: '记忆' },
      'research',
      (id: string) => selected.push(id)
    ) as Record<string, unknown>

    expect(props['data-conversation-view-id']).toBe('memory-files')
    expect(props['aria-selected']).toBe(false)
    expect(props.children).toBe('记忆')
    expect(props.onClick).toBeTypeOf('function')
    if (typeof props.onClick === 'function') props.onClick()
    expect(selected).toEqual(['memory-files'])
  })

  it('renders theme-aware light and dark dotted research surfaces', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document
    })
    expect(client.ResearchCanvas).toBeTypeOf('function')
    if (typeof client.ResearchCanvas !== 'function') return

    const ResearchCanvas = client.ResearchCanvas as ComponentType<{
      t: (key: string) => string
    }>
    browserWindow.document.body.innerHTML = renderToStaticMarkup(
      createElement(ResearchCanvas, {
        t: (key: string) => key === 'research.canvas' ? '研究画布' : key
      })
    )
    const canvas = browserWindow.document.querySelector('[data-research-canvas]')
    expect(canvas).not.toBeNull()
    if (canvas === null) return

    expect(canvas.getAttribute('tabindex')).toBe('0')
    expect(browserWindow.getComputedStyle(canvas).backgroundPosition).toBe(
      '-10px -10px'
    )
    expect(browserWindow.getComputedStyle(canvas).backgroundColor).toBe(
      'rgb(247, 248, 250)'
    )
    browserWindow.document.body.setAttribute('data-ds-dark-theme', '')
    expect(browserWindow.getComputedStyle(canvas).backgroundColor).toBe(
      'rgb(23, 25, 29)'
    )
  })

  it('renders a compact file card inside the transformed Research world layer', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.ResearchCanvasFileCard).toBeTypeOf('function')
    expect(client.researchCanvasContentTransform).toBeTypeOf('function')
    if (typeof client.ResearchCanvasFileCard !== 'function' ||
        typeof client.researchCanvasContentTransform !== 'function') return
    const FileCard = client.ResearchCanvasFileCard as ComponentType<{
      node: {
        id: string
        path: string
        name: string
        mediaType: string
        source: string
        x: number
        y: number
      }
    }>

    const html = renderToStaticMarkup(createElement(FileCard, {
      node: {
        id: 'file-1', path: '/w/report.pdf', name: 'report.pdf',
        mediaType: 'application/pdf', source: 'computer', x: 120, y: 80
      }
    }))

    expect(html).toContain('data-research-file-card="file-1"')
    expect(html).toContain('data-research-node-id="file-1"')
    expect(html).toContain('role="option"')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-selected="false"')
    expect(html).toContain('report.pdf')
    expect(html).not.toContain('/w/report.pdf</')
    expect(client.researchCanvasContentTransform({ scale: 1.5, x: 30, y: -10 }))
      .toBe('translate(30px, -10px) scale(1.5)')
  })

  it('selects the focused Research file card with Enter', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-keyboard-file',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 300, y: 100 }
      ],
      selection: { selectedNodeIds: ['file-b'], orderedFileIds: ['file-b'] }
    })
    try {
      const { browserWindow, host, workspace } = mounted
      const cardA = host.querySelector(
        '[data-research-file-card="file-a"]'
      ) as HappyDOMElement | null
      expect(cardA).not.toBeNull()
      if (cardA === null) return
      ;(cardA as unknown as { focus(): void }).focus()

      await act(async () => {
        cardA.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
        }))
      })

      expect(workspace.getSnapshot().selection).toEqual({
        selectedNodeIds: ['file-a'], orderedFileIds: ['file-a']
      })
      expect(cardA.getAttribute('aria-selected')).toBe('true')
      expect(host.querySelector('[data-research-file-card="file-b"]')
        ?.getAttribute('aria-selected')).toBe('false')
    } finally {
      await mounted.cleanup()
    }
  })

  it('projects only basenames from the owned Research prefix in sent user messages', async () => {
    const primitives = new Proxy({
      MessageText: ({ text }: { text: string }) => createElement('span', null, text)
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const attachment = new Proxy({
      ImageGallery: () => null
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      modules: {
        '@deepseek-ai/dsh-client-ui-primitives': primitives,
        '@deepseek-ai/dsh-client-ui-attachment': attachment
      }
    })
    expect(client.UserStyleBubble).toBeTypeOf('function')
    expect(client.serializeResearchPrompt).toBeTypeOf('function')
    if (typeof client.UserStyleBubble !== 'function' ||
        typeof client.serializeResearchPrompt !== 'function') return
    const rawPath = '/w/private␟report.pdf'
    const prompt = client.serializeResearchPrompt([
      { id: 'f1', name: rawPath, path: rawPath }
    ], 'compare these') as string

    const html = renderToStaticMarkup(createElement(client.UserStyleBubble, {
      content: [{ type: 'text', text: prompt }],
      imageLoader: async () => '',
      t: (key: string) => key
    }))

    expect(html).toContain('data-research-message-file="f1"')
    expect(html).toContain('private␟report.pdf')
    expect(html).toContain('compare these')
    expect(html).not.toContain(rawPath)
    expect(html).not.toContain('SHERLOCK_RESEARCH_FILES_V1')
  })

  it('renders ordered Research files as a compact reference context and mutates that selection', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const sessionId = 'session-file-tags'
    browserWindow.localStorage.setItem(
      `sherlock.research.canvas.files.v1:${sessionId}`,
      JSON.stringify([
        { id: 'f1', path: '/w/one.pdf', name: '/w/one.pdf', source: 'computer', x: 10, y: 20 },
        { id: 'f2', name: 'two.pdf', source: 'sherlock', x: 30, y: 40 }
      ])
    )
    browserWindow.localStorage.setItem(
      `sherlock.research.canvas.selection.v1:${sessionId}`,
      JSON.stringify({
        selectedNodeIds: ['f1', 'f2'], orderedFileIds: ['f2', 'f1']
      })
    )
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const primitives = new Proxy({
      IconCloseOutline16: () => createElement('span', { 'data-test-close-icon': '' })
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow,
      modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives }
    })
    expect(client.ResearchFileTags).toBeTypeOf('function')
    if (typeof client.ResearchFileTags !== 'function') {
      restoreGlobals()
      return
    }
    const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
      for(id: string): {
        getSnapshot(): {
          files: Array<Record<string, unknown>>
          selection: { selectedNodeIds: string[]; orderedFileIds: string[] }
        }
        selectionSnapshot(): { selectedNodeIds: string[]; orderedFileIds: string[] }
      }
    }
    const registry = new Registry(browserWindow.localStorage as Storage)
    const workspace = registry.for(sessionId)
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const tagOrder = () => Array.from(host.querySelectorAll('[data-research-file-tag]'))
      .map((tag) => tag.getAttribute('data-research-file-tag'))

    try {
      await act(async () => {
        root.render(createElement(client.ResearchFileTags, {
          sessionId,
          researchWorkspaces: registry
        }))
      })

      const referenceContext = host.querySelector('[data-research-file-tag-list]')
      expect(referenceContext?.getAttribute('role')).toBe('group')
      expect(referenceContext?.getAttribute('aria-label')).toBe('参考文件')
      expect(host.querySelector('[data-research-reference-label]')?.textContent).toBe('参考')
      expect(tagOrder()).toEqual(['f2', 'f1'])
      expect(host.querySelector('[data-research-file-tag="f2"]')?.getAttribute('aria-invalid'))
        .toBe('true')
      expect(host.textContent).toContain('one.pdf')
      expect(host.innerHTML).not.toContain('/w/one.pdf')
      expect(workspace.getSnapshot().files).toMatchObject([
        { id: 'f1', x: 10, y: 20 },
        { id: 'f2', x: 30, y: 40 }
      ])
      expect(host.querySelector('button[aria-label="左移"]')).toBeNull()
      expect(host.querySelector('button[aria-label="右移"]')).toBeNull()
      expect(host.querySelectorAll('[data-research-file-tag] button')).toHaveLength(2)

      const payloads = new Map<string, string>()
      const source = host.querySelector('[data-research-file-tag="f1"]')
      const target = host.querySelector('[data-research-file-tag="f2"]')
      await act(async () => {
        const dragStart = new browserWindow.Event('dragstart', { bubbles: true })
        Object.defineProperty(dragStart, 'dataTransfer', {
          value: {
            effectAllowed: 'none',
            setData: (type: string, value: string) => { payloads.set(type, value) }
          }
        })
        source?.dispatchEvent(dragStart)
        const dragOver = new browserWindow.Event('dragover', {
          bubbles: true, cancelable: true
        })
        Object.defineProperty(dragOver, 'dataTransfer', {
          value: { types: ['application/x-sherlock-research-file-tag'] }
        })
        target?.dispatchEvent(dragOver)
        expect(dragOver.defaultPrevented).toBe(true)
        const drop = new browserWindow.Event('drop', { bubbles: true, cancelable: true })
        Object.defineProperty(drop, 'dataTransfer', {
          value: { getData: (type: string) => payloads.get(type) ?? '' }
        })
        target?.dispatchEvent(drop)
      })
      expect(tagOrder()).toEqual(['f1', 'f2'])
      expect(workspace.selectionSnapshot().selectedNodeIds).toEqual(['f1', 'f2'])
      expect(workspace.getSnapshot().files).toMatchObject([
        { id: 'f1', x: 10, y: 20 },
        { id: 'f2', x: 30, y: 40 }
      ])

      await act(async () => {
        host.querySelector('[data-research-file-tag="f1"]')?.dispatchEvent(
          new browserWindow.KeyboardEvent('keydown', {
            key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
          })
        )
      })
      expect(tagOrder()).toEqual(['f2'])
      expect(workspace.selectionSnapshot()).toEqual({
        selectedNodeIds: ['f2'], orderedFileIds: ['f2']
      })

      await act(async () => {
        host.querySelector('[data-research-file-tag="f2"]')?.dispatchEvent(
          new browserWindow.KeyboardEvent('keydown', {
            key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true
          })
        )
      })
      expect(tagOrder()).toEqual([])
      expect(workspace.selectionSnapshot()).toEqual({
        selectedNodeIds: [], orderedFileIds: []
      })
    } finally {
      await act(async () => { root.unmount() })
      restoreGlobals()
    }
  })

  it('deletes selected canvas cards with Delete and the right-click menu', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-delete-canvas-cards',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 350, y: 100 }
      ],
      artifacts: [
        { id: 'artifact-a', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Evidence', x: 550, y: 100 }
      ],
      selection: {
        selectedNodeIds: ['file-a', 'file-b'],
        orderedFileIds: ['file-a', 'file-b']
      }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      ;(canvas as unknown as { focus(): void }).focus()

      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
      })
      expect(workspace.getSnapshot().files).toEqual([])
      expect(workspace.getSnapshot().artifacts).toHaveLength(1)
      expect(workspace.getSnapshot().selection).toEqual({
        selectedNodeIds: [], orderedFileIds: []
      })

      const artifact = host.querySelector('[data-research-artifact-card="artifact-a"]')
      expect(artifact).not.toBeNull()
      if (artifact === null) return
      await act(async () => {
        artifact.dispatchEvent(new browserWindow.MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, clientX: 420, clientY: 160
        }))
      })
      const remove = host.querySelector('[data-research-context-remove]')
      expect(remove?.textContent).toBe('从画布删除')
      await act(async () => {
        click(browserWindow, remove as HappyDOMElement | null)
      })
      expect(workspace.getSnapshot().artifacts).toEqual([])
      expect(workspace.getSnapshot().selection).toEqual({
        selectedNodeIds: [], orderedFileIds: []
      })
    } finally {
      await mounted.cleanup()
    }
  })

  it('owns accepted drops at the canvas root and restores their cards by session', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      getPathForFile: () => '/tmp/report.pdf'
    }, {
      document: browserWindow.document,
      window: browserWindow
    })
    expect(client.ResearchCanvas).toBeTypeOf('function')
    if (typeof client.ResearchCanvas !== 'function') {
      restoreGlobals()
      return
    }
    const ResearchCanvas = client.ResearchCanvas as ComponentType<{
      sessionId: string
      t: (key: string) => string
    }>
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    let documentDragovers = 0
    let documentDrops = 0
    browserWindow.document.addEventListener('dragover', () => { documentDragovers += 1 })
    browserWindow.document.addEventListener('drop', () => { documentDrops += 1 })

    try {
      await act(async () => {
        root.render(createElement(ResearchCanvas, {
          sessionId: 'session-drop',
          t: () => '研究画布'
        }))
      })
      const canvas = host.querySelector('[data-research-canvas]')
      expect(canvas).not.toBeNull()
      if (canvas === null) return
      const unrecognized = {
        types: ['text/plain'], files: [], getData: () => '', dropEffect: 'none'
      }
      const invalidFiles = {
        types: ['Files'], files: [], getData: () => '', dropEffect: 'none'
      }
      const accepted = {
        types: ['Files'],
        files: [{ name: 'report.pdf', type: 'application/pdf' }],
        getData: () => '',
        dropEffect: 'none'
      }

      const unrecognizedOver = dispatchDrag(
        browserWindow, canvas, 'dragover', unrecognized
      )
      expect(unrecognizedOver.defaultPrevented).toBe(false)
      expect(documentDragovers).toBe(1)

      const acceptedEnter = dispatchDrag(
        browserWindow, canvas, 'dragenter', accepted
      )
      expect(acceptedEnter.defaultPrevented).toBe(true)
      expect(canvas.getAttribute('data-file-drop-active')).toBe('true')
      const acceptedOver = dispatchDrag(
        browserWindow, canvas, 'dragover', accepted
      )
      expect(acceptedOver.defaultPrevented).toBe(true)
      expect(accepted.dropEffect).toBe('copy')
      expect(documentDragovers).toBe(1)

      const invalidDrop = dispatchDrag(
        browserWindow, canvas, 'drop', invalidFiles
      )
      expect(invalidDrop.defaultPrevented).toBe(false)
      expect(documentDrops).toBe(1)

      await act(async () => {
        const acceptedDrop = dispatchDrag(
          browserWindow, canvas, 'drop', accepted
        )
        expect(acceptedDrop.defaultPrevented).toBe(true)
      })
      expect(documentDrops).toBe(1)
      expect(canvas.hasAttribute('data-file-drop-active')).toBe(false)
      expect(host.querySelector('[data-research-file-card]')?.textContent)
        .toContain('report.pdf')

      await act(async () => { root.unmount() })
      const remount = createRoot(host)
      await act(async () => {
        remount.render(createElement(ResearchCanvas, {
          sessionId: 'session-drop',
          t: () => '研究画布'
        }))
      })
      expect(host.querySelector('[data-research-file-card]')?.textContent)
        .toContain('report.pdf')
      await act(async () => { remount.unmount() })
    } finally {
      restoreGlobals()
    }
  })

  it('does not claim malformed or cross-session proprietary drags', async () => {
    const mounted = await mountResearchCanvas({ sessionId: 'session-drag-ownership' })
    try {
      const { browserWindow, canvas, workspace } = mounted
      const bubbled = { dragenter: 0, dragover: 0, drop: 0 }
      browserWindow.document.addEventListener('dragenter', () => { bubbled.dragenter += 1 })
      browserWindow.document.addEventListener('dragover', () => { bubbled.dragover += 1 })
      browserWindow.document.addEventListener('drop', () => { bubbled.drop += 1 })
      const transfer = (type: string, raw: string) => ({
        types: [type],
        files: [],
        getData: (requested: string) => requested === type ? raw : '',
        dropEffect: 'none'
      })
      const mixedArtifactTransfer = (raw: string) => ({
        types: ['Files', 'application/x-sherlock-research-artifact'],
        files: [{ name: 'fallback.pdf', type: 'application/pdf' }],
        getData: (requested: string) =>
          requested === 'application/x-sherlock-research-artifact' ? raw : '',
        dropEffect: 'none'
      })
      const invalid = [
        transfer('application/x-sherlock-file', '{bad-json'),
        transfer('application/x-sherlock-research-artifact', '{bad-json'),
        transfer('application/x-sherlock-research-artifact', JSON.stringify({
          sessionId: 'another-session', messageId: 'm1', kind: 'assistant-result',
          title: 'Answer', excerpt: 'Evidence'
        })),
        mixedArtifactTransfer('{bad-json'),
        mixedArtifactTransfer(JSON.stringify({
          sessionId: 'another-session', messageId: 'm1', kind: 'assistant-result',
          title: 'Answer', excerpt: 'Evidence'
        }))
      ]

      for (const dataTransfer of invalid) {
        for (const type of ['dragenter', 'dragover', 'drop'] as const) {
          const before = bubbled[type]
          const event = dispatchDrag(browserWindow, canvas, type, dataTransfer)
          expect(event.defaultPrevented).toBe(false)
          expect(bubbled[type]).toBe(before + 1)
        }
      }

      const valid = [
        transfer('application/x-sherlock-file', JSON.stringify({
          path: '/w/report.pdf', name: 'report.pdf'
        })),
        transfer('application/x-sherlock-research-artifact', JSON.stringify({
          sessionId: 'session-drag-ownership', messageId: 'm1',
          kind: 'assistant-result', title: 'Answer', excerpt: 'Evidence'
        }))
      ]
      for (const dataTransfer of valid) {
        for (const type of ['dragenter', 'dragover'] as const) {
          const before = bubbled[type]
          const event = dispatchDrag(browserWindow, canvas, type, dataTransfer)
          expect(event.defaultPrevented).toBe(true)
          expect(bubbled[type]).toBe(before)
        }
      }

      const validMixed = mixedArtifactTransfer(JSON.stringify({
        sessionId: 'session-drag-ownership', messageId: 'm-mixed',
        kind: 'assistant-result', title: 'Mixed answer', excerpt: 'Artifact wins'
      }))
      await act(async () => {
        const drop = dispatchDrag(browserWindow, canvas, 'drop', validMixed)
        expect(drop.defaultPrevented).toBe(true)
      })
      expect(workspace.getSnapshot().artifacts).toMatchObject([
        { messageId: 'm-mixed', title: 'Mixed answer' }
      ])
      expect(workspace.getSnapshot().files).toEqual([])
    } finally {
      await mounted.cleanup()
    }
  })

  it('isolates valid Research file and artifact drops from the global composer listener', async () => {
    const mounted = await mountResearchCanvas({ sessionId: 'session-drop-isolation' })
    try {
      const { browserWindow, canvas } = mounted
      const composerDrops: string[] = []
      browserWindow.document.addEventListener('drop', (event) => {
        const transfer = (event as unknown as { dataTransfer?: { types?: string[] } })
          .dataTransfer
        if (transfer?.types?.includes('Files')) composerDrops.push('files')
        else composerDrops.push('unrelated')
      })
      const transfer = (types: string[], data: Record<string, string>, files: Array<{
        name: string
        type: string
      }> = []) => ({
        types,
        files,
        getData: (type: string) => data[type] ?? '',
        dropEffect: 'none'
      })

      await act(async () => {
        const fileDrop = dispatchDrag(browserWindow, canvas, 'drop', transfer(
          ['application/x-sherlock-file'],
          {
            'application/x-sherlock-file': JSON.stringify({
              path: '/tmp/research/drop.pdf', name: 'drop.pdf'
            })
          }
        ))
        expect(fileDrop.defaultPrevented).toBe(true)

        const artifactDrop = dispatchDrag(browserWindow, canvas, 'drop', transfer(
          ['application/x-sherlock-research-artifact'],
          {
            'application/x-sherlock-research-artifact': JSON.stringify({
              sessionId: 'session-drop-isolation', messageId: 'message-drop',
              kind: 'assistant-result', title: 'Answer', excerpt: 'Evidence'
            })
          }
        ))
        expect(artifactDrop.defaultPrevented).toBe(true)
      })
      expect(composerDrops).toEqual([])

      const textDrop = dispatchDrag(browserWindow, canvas, 'drop', transfer(
        ['text/plain'], { 'text/plain': 'ordinary dragged text' }
      ))
      expect(textDrop.defaultPrevented).toBe(false)
      expect(composerDrops).toEqual(['unrelated'])
    } finally {
      await mounted.cleanup()
    }
  })

  it('selects a persisted card and marquee-selects two cards', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-marquee',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 300, y: 130 }
      ]
    })
    try {
      const { browserWindow, canvas, host } = mounted
      const cardA = host.querySelector('[data-research-file-card="file-a"]')
      expect(cardA).not.toBeNull()
      if (cardA === null) return

      expect(cardA.getAttribute('aria-selected')).toBe('false')
      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 100, y: 100
        }))
      })
      expect(cardA.getAttribute('aria-selected')).toBe('true')

      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 2, x: 20, y: 20
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 2, x: 360, y: 180
        }))
      })
      expect(canvas.querySelector('[data-research-marquee]')).not.toBeNull()
      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 2, x: 360, y: 180
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(2)
    } finally {
      await mounted.cleanup()
    }
  })

  it('supports Command-toggle, Shift-add, blank clear, and Escape clear', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-selection-modes',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 350, y: 100 }
      ]
    })
    try {
      const { browserWindow, canvas, host } = mounted
      const cardA = host.querySelector('[data-research-file-card="file-a"]')
      const cardB = host.querySelector('[data-research-file-card="file-b"]')
      expect(cardA).not.toBeNull()
      expect(cardB).not.toBeNull()
      if (cardA === null || cardB === null) return

      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 100, y: 100, metaKey: true
        }))
      })
      expect(cardA.getAttribute('aria-selected')).toBe('true')
      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 2, x: 100, y: 100, metaKey: true
        }))
      })
      expect(cardA.getAttribute('aria-selected')).toBe('false')

      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 3, x: 100, y: 100
        }))
        cardB.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 4, x: 350, y: 100, shiftKey: true
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(2)

      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 5, x: 700, y: 500
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 5, x: 700, y: 500
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(0)

      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 6, x: 100, y: 100
        }))
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Escape', key: 'Escape', bubbles: true, cancelable: true
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(0)
    } finally {
      await mounted.cleanup()
    }
  })

  it('selects files and artifacts with Command-A only while the canvas owns focus', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-command-a',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 }
      ],
      artifacts: [
        { id: 'artifact-a', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Evidence', x: 350, y: 100 }
      ]
    })
    try {
      const { browserWindow, canvas, host } = mounted
      const outside = browserWindow.document.createElement('button')
      browserWindow.document.body.appendChild(outside)
      outside.focus()
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'KeyA', key: 'a', metaKey: true, bubbles: true, cancelable: true
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(0)

      ;(canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'KeyA', key: 'a', metaKey: true, bubbles: true, cancelable: true
        }))
      })
      expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(2)
      expect(host.querySelector('[data-research-artifact-card="artifact-a"]')).not.toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('gives Space-pan priority over node selection and movement', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-space-pan',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 }
      ]
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const cardA = host.querySelector('[data-research-file-card="file-a"]')
      expect(cardA).not.toBeNull()
      if (cardA === null) return
      ;(canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 100, y: 100
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 1, x: 120, y: 110
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 1, x: 120, y: 110
        }))
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keyup', {
          code: 'Space', key: ' ', bubbles: true
        }))
      })

      expect(workspace.getSnapshot().selection.selectedNodeIds).toEqual([])
      expect(workspace.getSnapshot().files[0]).toMatchObject({ x: 100, y: 100 })
      expect(workspace.getSnapshot().viewport).toEqual({ scale: 1, x: 20, y: 10 })
    } finally {
      await mounted.cleanup()
    }
  })

  it('replaces selection before dragging an unselected node', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-unselected-drag',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 350, y: 100 }
      ],
      selection: { selectedNodeIds: ['file-b'], orderedFileIds: ['file-b'] }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const cardA = host.querySelector('[data-research-file-card="file-a"]')
      expect(cardA).not.toBeNull()
      if (cardA === null) return
      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 100, y: 100
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 1, x: 120, y: 100
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 1, x: 120, y: 100
        }))
      })

      expect(workspace.getSnapshot().selection.selectedNodeIds).toEqual(['file-a'])
      expect(workspace.getSnapshot().files).toMatchObject([
        { id: 'file-a', x: 120, y: 100 },
        { id: 'file-b', x: 350, y: 100 }
      ])
    } finally {
      await mounted.cleanup()
    }
  })

  it('moves a selected group in world units at 2x zoom', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-group-drag',
      files: [
        { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
        { id: 'file-b', path: '/w/b.pdf', name: 'b.pdf', source: 'computer', x: 350, y: 100 }
      ],
      selection: {
        selectedNodeIds: ['file-a', 'file-b'], orderedFileIds: ['file-a', 'file-b']
      },
      viewport: { scale: 2, x: 0, y: 0 }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const cardA = host.querySelector('[data-research-file-card="file-a"]')
      expect(cardA).not.toBeNull()
      if (cardA === null) return
      await act(async () => {
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 200, y: 200
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 1, x: 220, y: 200
        }))
      })
      expect(canvas.querySelectorAll('[data-node-dragging="true"]')).toHaveLength(2)
      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 1, x: 220, y: 200
        }))
      })

      expect(workspace.getSnapshot().files).toMatchObject([
        { id: 'file-a', x: 110, y: 100 },
        { id: 'file-b', x: 360, y: 100 }
      ])
      expect(canvas.querySelector('[data-node-dragging="true"]')).toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('persists a moved group once at every pointer finish boundary', async () => {
    const finishModes = ['pointerup', 'pointercancel', 'blur', 'cleanup'] as const
    for (const finishMode of finishModes) {
      const values = new Map<string, string>()
      const writes: Array<{ key: string; value: string }> = []
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem(key: string, value: string) {
          values.set(key, value)
          writes.push({ key, value })
        }
      }
      const sessionId = `session-deferred-move-${finishMode}`
      const mounted = await mountResearchCanvas({
        sessionId,
        storage,
        files: [
          { id: 'file-a', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 }
        ],
        selection: { selectedNodeIds: ['file-a'], orderedFileIds: ['file-a'] }
      })
      let cleaned = false
      try {
        const { browserWindow, canvas, host, workspace } = mounted
        const cardA = host.querySelector('[data-research-file-card="file-a"]')
        expect(cardA).not.toBeNull()
        if (cardA === null) return
        writes.length = 0

        await act(async () => {
          cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
            pointerId: 1, x: 100, y: 100
          }))
          canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
            pointerId: 1, x: 110, y: 100
          }))
          canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
            pointerId: 1, x: 130, y: 100
          }))
        })
        expect(workspace.getSnapshot().files[0]).toMatchObject({ x: 130, y: 100 })
        expect(JSON.parse(values.get(`sherlock.research.canvas.files.v1:${sessionId}`) ?? '[]')[0])
          .toMatchObject({ x: 100, y: 100 })
        expect(writes).toEqual([])

        if (finishMode === 'cleanup') {
          await mounted.cleanup()
          cleaned = true
        } else {
          await act(async () => {
            if (finishMode === 'blur') {
              browserWindow.dispatchEvent(new browserWindow.Event('blur'))
            } else {
              canvas.dispatchEvent(pointer(browserWindow, finishMode, {
                pointerId: 1, x: 130, y: 100
              }))
            }
          })
        }

        expect(writes.map(({ key }) => key)).toEqual([
          `sherlock.research.canvas.files.v1:${sessionId}`,
          `sherlock.research.canvas.artifacts.v1:${sessionId}`,
          `sherlock.research.canvas.selection.v1:${sessionId}`
        ])
        expect(JSON.parse(values.get(`sherlock.research.canvas.files.v1:${sessionId}`) ?? '[]')[0])
          .toMatchObject({ x: 130, y: 100 })
      } finally {
        if (!cleaned) await mounted.cleanup()
      }
    }
  })

  it('places a same-session research artifact through the shared workspace drop path', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-artifact-drop',
      viewport: { scale: 2, x: 50, y: 20 }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const transfer = {
        types: ['application/x-sherlock-research-artifact'],
        files: [],
        getData: (type: string) => type === 'application/x-sherlock-research-artifact'
          ? JSON.stringify({
              sessionId: 'session-artifact-drop', messageId: 'm1',
              kind: 'assistant-result', title: 'Answer', excerpt: 'Evidence'
            })
          : '',
        dropEffect: 'none'
      }
      await act(async () => {
        const drop = dispatchDrag(browserWindow, canvas, 'drop', transfer, { x: 250, y: 180 })
        expect(drop.defaultPrevented).toBe(true)
      })

      expect(workspace.getSnapshot().artifacts).toMatchObject([
        { messageId: 'm1', kind: 'assistant-result', x: 100, y: 80 }
      ])
      expect(host.querySelector('[data-research-artifact-card]')?.textContent)
        .toContain('Answer')
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps the dotted research canvas visible behind the floating composer', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document
    })
    expect(client.ResearchCanvas).toBeTypeOf('function')
    if (typeof client.ResearchCanvas !== 'function') return

    const ResearchCanvas = client.ResearchCanvas as ComponentType<{
      t: (key: string) => string
    }>
    const canvasHtml = renderToStaticMarkup(
      createElement(ResearchCanvas, { t: () => '研究画布' })
    )
    browserWindow.document.body.innerHTML = [
      '<div class="wSkVaW_root" data-phase="active">',
      '<div class="wSkVaW_scrollBody">',
      canvasHtml,
      '<div class="wSkVaW_composerSeat" data-composer-seat></div>',
      '</div>',
      '</div>'
    ].join('')
    const composerSeat = browserWindow.document.querySelector(
      '[data-composer-seat]'
    )
    expect(composerSeat).not.toBeNull()
    if (composerSeat === null) return

    expect(browserWindow.getComputedStyle(composerSeat).backgroundImage).toBe(
      'none'
    )
  })

  it('places the Research divider chrome directly on the canvas edge', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const researchCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/ResearchCanvas.module.css')
    )?.textContent

    expect(researchCss).toContain(
      '.wSkVaW_root:has(.rScV5Q_root) .wSkVaW_header:after{bottom:0}'
    )
    expect(researchCss).toContain(
      '.wSkVaW_root:has(.rScV5Q_root) .wSkVaW_tab:after{bottom:0}'
    )
    expect(researchCss).toContain('.rScV5Q_root:focus{outline:none}')
    expect(researchCss).toContain('[data-file-drop-active=true]')
    expect(researchCss).toContain('.rScV5Q_fileCard')
    expect(researchCss).toContain('body[data-ds-dark-theme] .rScV5Q_fileCard')
    expect(researchCss).toContain('[data-selected=true]')
    expect(researchCss).toContain('[data-path-unavailable=true]')
    expect(researchCss).toContain('.rScV5Q_marquee')
    expect(researchCss).toContain('.rScV5Q_artifactCard')
    expect(researchCss).toContain('[data-node-dragging=true]')
    expect(researchCss).toContain(':focus-visible')
    expect(researchCss).toContain('body[data-ds-dark-theme] .rScV5Q_artifactCard')
  })

  it('keeps the global Research conversation tab fluid at narrow sidebar widths', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const panelCss = styles.find(({ textContent }) => textContent.includes('.sRp_root'))
      ?.textContent

    expect(panelCss).toContain('.sRp_root{')
    expect(panelCss).toContain('container-type:inline-size')
    expect(panelCss).toContain('.sRp_conversation{min-width:0')
    expect(panelCss).toContain('.sRp_messages{min-width:0')
    expect(panelCss).toContain('.sRp_composer{')
    expect(panelCss).toContain('max-width:100%')
    expect(panelCss).toContain('overflow-wrap:anywhere')
    expect(panelCss).toContain('@container (max-width:360px)')
  })

  it('keeps an inactive global Research conversation tab inert', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow
    })
    browserWindow.document.body.innerHTML = [
      '<section class="sRp_root" data-research-active="false">',
      '<button>对话</button>',
      '</section>'
    ].join('')
    const panel = browserWindow.document.querySelector('.sRp_root')
    const inactiveControl = browserWindow.document.querySelector('.sRp_root button')
    expect(panel).not.toBeNull()
    expect(inactiveControl).not.toBeNull()
    if (panel === null || inactiveControl === null) return

    expect(browserWindow.getComputedStyle(inactiveControl).pointerEvents).toBe('none')
  })

  it('removes the mounted Research panel from keyboard and accessibility navigation outside Research', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { actions, browserWindow, detailsPortalHost, workspace } = mounted
      const panel = detailsPortalHost.querySelector('[data-research-conversation-panel]')
      const conversationTab = () => detailsPortalHost.querySelector(
        '[data-research-right-tab="conversation"]'
      ) as unknown as HTMLElement | null
      const sequentiallyReachable = () => Array.from(panel?.querySelectorAll(
        'button, textarea, input, select, a[href], [tabindex]'
      ) ?? []).filter((node) => {
        const element = node as unknown as HTMLElement
        return element.tabIndex >= 0 && element.closest('[inert]') === null
      })

      expect(panel).not.toBeNull()
      expect(panel?.hasAttribute('inert')).toBe(false)
      expect(panel?.getAttribute('aria-hidden')).toBeNull()
      expect(workspace.assistantActionsActive()).toBe(true)

      await act(async () => { actions.setView('chat') })
      expect(panel?.hasAttribute('inert')).toBe(true)
      expect(panel?.getAttribute('aria-hidden')).toBe('true')
      expect(sequentiallyReachable()).toHaveLength(0)
      expect(workspace.assistantActionsActive()).toBe(false)

      await act(async () => { actions.setView('trajectory') })
      expect(panel?.hasAttribute('inert')).toBe(true)
      expect(panel?.getAttribute('aria-hidden')).toBe('true')
      expect(sequentiallyReachable()).toHaveLength(0)
      expect(workspace.assistantActionsActive()).toBe(false)

      await act(async () => { actions.setView('research') })
      expect(panel?.hasAttribute('inert')).toBe(false)
      expect(panel?.getAttribute('aria-hidden')).toBeNull()
      expect(workspace.assistantActionsActive()).toBe(true)
    } finally {
      await mounted.cleanup()
    }
  })

  it('moves the complete composer into the single global Research conversation tab', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { browserWindow, chat, detailsPortalHost, host, transitions } = mounted
      expect(transitions.enter).toBe(1)
      expect(chat.get().researchRightTab).toBe('conversation')

      const composerSeats = browserWindow.document.querySelectorAll('[data-composer-seat]')
      expect(composerSeats).toHaveLength(1)
      expect(composerSeats[0]?.closest('[data-research-conversation-panel]')).not.toBeNull()

      const center = host.querySelector('[data-research-center]')
      expect(center).not.toBeNull()
      expect(center?.querySelector('[data-composer-seat]')).toBeNull()
      expect(center?.querySelector('[data-queue-strip]')).toBeNull()
      expect(center?.querySelector('[data-task-dock]')).toBeNull()
      expect(center?.querySelector('[data-stats-footer]')).toBeNull()
      const rightComposer = detailsPortalHost.querySelector('[data-research-composer-host]')
      expect(rightComposer?.querySelector('[data-queue-strip]')).not.toBeNull()
      expect(rightComposer?.querySelector('[data-task-dock]')).not.toBeNull()
      expect(rightComposer?.querySelector('[data-stats-footer]')).not.toBeNull()
      expect(rightComposer?.querySelector('textarea')?.getAttribute('data-input-machine-snapshot'))
        .toBe('研究草稿')

      expect(detailsPortalHost.querySelector('[data-research-conversation-panel]')).not.toBeNull()
      expect(detailsPortalHost.querySelector('[role="tablist"]')).toBeNull()
      expect(detailsPortalHost.querySelector('[data-research-file-row]')).toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('captures and drags only a plain selection contained by one settled assistant message', async () => {
    const mounted = await mountConversationRoot('research', {
      messageId: 'm1', text: 'Margin expanded.'
    })
    try {
      const { browserWindow, detailsPortalHost, sessionId, workspace } = mounted
      const wrapper = detailsPortalHost.querySelector(
        '[data-assistant-message-id="m1"]'
      )
      const text = wrapper?.querySelector('span')?.firstChild
      const chatView = detailsPortalHost.querySelector('[data-chat-view]')
      expect(wrapper).not.toBeNull()
      expect(text).toBeDefined()
      expect(chatView).not.toBeNull()
      if (wrapper === null || text == null || chatView === null) return

      const outside = browserWindow.document.createElement('span')
      outside.textContent = 'Outside'
      chatView.appendChild(outside)
      const outsideText = outside.firstChild
      expect(outsideText).toBeDefined()
      if (outsideText === null) return
      const invalid = browserWindow.document.createRange()
      invalid.setStart(text, 0)
      invalid.setEnd(outsideText, 3)
      browserWindow.getSelection()?.removeAllRanges()
      browserWindow.getSelection()?.addRange(invalid)
      await act(async () => {
        wrapper.dispatchEvent(new browserWindow.Event('mouseup', { bubbles: true }))
      })
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).toBeNull()

      const selection = browserWindow.document.createRange()
      selection.setStart(text, 0)
      selection.setEnd(text, 15)
      browserWindow.getSelection()?.removeAllRanges()
      browserWindow.getSelection()?.addRange(selection)
      await act(async () => {
        wrapper.dispatchEvent(new browserWindow.Event('mouseup', { bubbles: true }))
      })
      const add = detailsPortalHost.querySelector('button[aria-label="加入画布"]')
      expect(add).not.toBeNull()

      const payloads = new Map<string, string>()
      const outsidePayloads = new Map<string, string>()
      const outsideDrag = new browserWindow.Event('dragstart', {
        bubbles: true, cancelable: true
      })
      Object.defineProperty(outsideDrag, 'dataTransfer', {
        value: {
          effectAllowed: 'none',
          setData(type: string, value: string) { outsidePayloads.set(type, value) }
        }
      })
      outside.dispatchEvent(outsideDrag)
      expect(outsidePayloads.has(
        'application/x-sherlock-research-artifact'
      )).toBe(false)

      const transfer = {
        effectAllowed: 'none',
        setData(type: string, value: string) { payloads.set(type, value) }
      }
      const dragStart = new browserWindow.Event('dragstart', {
        bubbles: true, cancelable: true
      })
      Object.defineProperty(dragStart, 'dataTransfer', { value: transfer })
      wrapper.dispatchEvent(dragStart)
      const payload = JSON.parse(payloads.get(
        'application/x-sherlock-research-artifact'
      ) ?? '{}')
      expect(Object.keys(payload).sort()).toEqual([
        'excerpt', 'kind', 'messageId', 'sessionId', 'title'
      ])
      expect(payload).toEqual({
        sessionId,
        messageId: 'm1',
        kind: 'assistant-excerpt',
        title: '助手摘录',
        excerpt: 'Margin expanded'
      })
      expect(transfer.effectAllowed).toBe('copy')

      await act(async () => { click(browserWindow, add) })
      expect(workspace.getSnapshot().artifacts).toMatchObject([{
        messageId: 'm1', kind: 'assistant-excerpt',
        title: '助手摘录', excerpt: 'Margin expanded'
      }])

      const passage = wrapper.querySelector('span')
      if (passage === null) return
      passage.textContent = 'x'.repeat(16_434)
      const longText = passage.firstChild
      if (longText === null) return
      const longSelection = browserWindow.document.createRange()
      longSelection.setStart(longText, 0)
      longSelection.setEnd(longText, 16_434)
      browserWindow.getSelection()?.removeAllRanges()
      browserWindow.getSelection()?.addRange(longSelection)
      await act(async () => {
        wrapper.dispatchEvent(new browserWindow.Event('mouseup', { bubbles: true }))
      })
      const boundedPayloads = new Map<string, string>()
      const boundedDrag = new browserWindow.Event('dragstart', {
        bubbles: true, cancelable: true
      })
      Object.defineProperty(boundedDrag, 'dataTransfer', {
        value: {
          effectAllowed: 'none',
          setData(type: string, value: string) { boundedPayloads.set(type, value) }
        }
      })
      wrapper.dispatchEvent(boundedDrag)
      expect(JSON.parse(boundedPayloads.get(
        'application/x-sherlock-research-artifact'
      ) ?? '{}').excerpt).toHaveLength(16_384)
    } finally {
      await mounted.cleanup()
    }
  })

  it('clears the saved excerpt action when Conversation is hidden or the session changes', async () => {
    const mounted = await mountConversationRoot('research', {
      messageId: 'm-selection', text: 'Selection belongs to one session.'
    })
    try {
      const { actions, browserWindow, detailsPortalHost } = mounted
      const selectExcerpt = async () => {
        const wrapper = detailsPortalHost.querySelector(
          '[data-assistant-message-id="m-selection"]'
        )
        const text = wrapper?.querySelector('span')?.firstChild
        expect(wrapper).not.toBeNull()
        expect(text).toBeDefined()
        if (wrapper === null || text == null) return
        const range = browserWindow.document.createRange()
        range.setStart(text, 0)
        range.setEnd(text, 9)
        browserWindow.getSelection()?.removeAllRanges()
        browserWindow.getSelection()?.addRange(range)
        await act(async () => {
          wrapper.dispatchEvent(new browserWindow.Event('mouseup', { bubbles: true }))
        })
      }

      await selectExcerpt()
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).not.toBeNull()

      await act(async () => { actions.setView('chat') })
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).toBeNull()

      await act(async () => { actions.setView('research') })
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).toBeNull()

      await selectExcerpt()
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).not.toBeNull()
      await mounted.rerenderSession('session-research-second')
      expect(detailsPortalHost.querySelector('button[aria-label="加入画布"]')).toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('opens an artifact source safely and reports a missing source without removing its snapshot', async () => {
    const sourceMessageId = 'm1"][data-owned="false'
    const mounted = await mountConversationRoot('research', {
      messageId: sourceMessageId, text: 'Revenue improved.'
    })
    const canvasHost = mounted.browserWindow.document.createElement('div')
    mounted.browserWindow.document.body.appendChild(canvasHost)
    const canvasRoot = createRoot(canvasHost)
    try {
      const {
        actions, browserWindow, chat, client, detailsPortalHost,
        researchWorkspaces, sessionId, workspace
      } = mounted
      await act(async () => {
        workspace.setArtifacts([
          {
            id: 'artifact-source', kind: 'assistant-result', messageId: sourceMessageId,
            title: '助手回复', excerpt: 'Revenue improved.', x: 100, y: 80
          },
          {
            id: 'artifact-missing', kind: 'assistant-excerpt', messageId: 'm-missing',
            title: '助手摘录', excerpt: 'Missing snapshot', x: 300, y: 160
          }
        ])
      })
      await act(async () => {
        canvasRoot.render(createElement(client.ResearchCanvas as ComponentType<Record<string, unknown>>, {
          sessionId,
          researchWorkspaces,
          t: (key: string) => key === 'research.canvas' ? '研究画布' : key
        }))
      })
      const source = detailsPortalHost.querySelector(
        '[data-assistant-message-id]'
      ) as HappyDOMElement | null
      expect(source).not.toBeNull()
      expect(source?.getAttribute('data-assistant-message-id')).toBe(sourceMessageId)
      if (source === null) return
      let scrolls = 0
      Object.defineProperty(source, 'scrollIntoView', {
        configurable: true,
        value: () => { scrolls += 1 }
      })

      const sourceCard = canvasHost.querySelector(
        '[data-research-artifact-card="artifact-source"]'
      )
      expect(sourceCard?.textContent).toContain('助手回复')
      expect(sourceCard?.textContent).toContain('来源消息')
      await act(async () => {
        sourceCard?.dispatchEvent(new browserWindow.Event('dblclick', {
          bubbles: true, cancelable: true
        }))
      })
      expect(scrolls).toBe(1)
      expect(browserWindow.document.activeElement).toBe(source)
      expect(workspace.getSnapshot().pendingMessageJump).toBeNull()

      const missingCard = canvasHost.querySelector(
        '[data-research-artifact-card="artifact-missing"]'
      )
      await act(async () => {
        missingCard?.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
        }))
      })
      expect(workspace.getSnapshot().pendingMessageJump).toBeNull()
      expect(detailsPortalHost.querySelector('[role="status"]')?.textContent)
        .toContain('来源消息不可用')
      const missingSnapshot = canvasHost.querySelector(
        '[data-research-artifact-card="artifact-missing"]'
      )
      expect(missingSnapshot).not.toBeNull()
      expect(missingSnapshot?.textContent).toContain('来源消息不可用')

      await act(async () => { actions.setView('chat') })
      expect(detailsPortalHost.querySelector('[role="status"]')).toBeNull()

      await act(async () => { actions.setView('research') })

      await act(async () => {
        missingCard?.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
        }))
      })
      expect(detailsPortalHost.querySelector('[role="status"]')?.textContent)
        .toContain('来源消息不可用')
      await act(async () => { actions.setView('chat') })
      expect(detailsPortalHost.querySelector('[role="status"]')).toBeNull()

      await mounted.rerenderSession('session-research-second')
      expect(detailsPortalHost.querySelector('[role="status"]')).toBeNull()
    } finally {
      await act(async () => { canvasRoot.unmount() })
      await mounted.cleanup()
    }
  })

  it('shows the workspace-backed file tags only while the top-level Research view is active', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { actions, browserWindow } = mounted
      const tags = () => browserWindow.document.querySelectorAll('[data-research-file-tag]')

      expect(Array.from(tags()).map((tag) => tag.getAttribute('data-research-file-tag')))
        .toEqual(['file-b', 'file-a'])
      expect(browserWindow.document.querySelector('[data-research-file-tag="file-b"]')
        ?.getAttribute('aria-invalid')).toBe('true')

      await act(async () => { actions.setView('chat') })
      expect(tags()).toHaveLength(0)

      await act(async () => { actions.setView('research') })
      expect(Array.from(tags()).map((tag) => tag.getAttribute('data-research-file-tag')))
        .toEqual(['file-b', 'file-a'])
    } finally {
      await mounted.cleanup()
    }
  })

  it('does not reserve an accessory row when Research has no selected files', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { browserWindow, workspace } = mounted
      const composer = () => browserWindow.document.querySelector('[data-test-composer-bar]')

      expect(composer()?.getAttribute('data-test-composer-has-accessory')).toBe('true')
      await act(async () => {
        workspace.removeSelectedFile('file-b')
        workspace.removeSelectedFile('file-a')
      })

      expect(browserWindow.document.querySelectorAll('[data-research-file-tag]')).toHaveLength(0)
      expect(composer()?.getAttribute('data-test-composer-has-accessory')).toBe('false')
    } finally {
      await mounted.cleanup()
    }
  })

  it('moves one composer host without remounting the textarea or losing IME state', async () => {
    const mounted = await mountConversationRoot('chat')
    try {
      const { actions, browserWindow, host, transitions } = mounted
      const initialScroll = host.querySelector('[data-conversation-scroll]')
      const textarea = host.querySelector('textarea')
      expect(initialScroll).not.toBeNull()
      expect(textarea).not.toBeNull()
      if (!(textarea instanceof browserWindow.HTMLTextAreaElement)) return
      textarea.value = '研究中的中文输入'
      textarea.focus()
      textarea.setSelectionRange(2, 6)
      const compositionStart = new browserWindow.CompositionEvent('compositionstart', {
        bubbles: true
      })
      Object.defineProperty(compositionStart, 'data', { value: '研究' })
      textarea.dispatchEvent(compositionStart)

      await act(async () => { actions.setView('research') })
      const researchTextarea = browserWindow.document.querySelector('textarea')
      expect(researchTextarea).toBe(textarea)
      expect(browserWindow.document.activeElement).toBe(textarea)
      expect(textarea.selectionStart).toBe(2)
      expect(textarea.selectionEnd).toBe(6)
      expect(textarea.value).toBe('研究中的中文输入')
      expect(textarea.closest('[data-research-conversation-panel]')).not.toBeNull()
      expect(host.querySelector('[data-conversation-scroll]')).toBe(initialScroll)
      expect(transitions.enter).toBe(1)

      await act(async () => {
        actions.select({ callId: 'research-call', turnSeq: 2 })
        actions.setView('chat')
      })
      expect(host.querySelector('textarea')).toBe(textarea)
      expect(browserWindow.document.activeElement).toBe(textarea)
      expect(textarea.selectionStart).toBe(2)
      expect(textarea.selectionEnd).toBe(6)
      expect(textarea.value).toBe('研究中的中文输入')
      expect(host.querySelector('[data-conversation-scroll]')).toBe(initialScroll)
      expect(transitions.leave).toBe(1)
      expect(mounted.chat.get().selection).toEqual({
        callId: 'call-1', toolName: 'Web Search', turnSeq: 1
      })
      expect(browserWindow.document.querySelectorAll('[data-composer-seat]')).toHaveLength(1)
    } finally {
      await mounted.cleanup()
    }
  })

  it('restores each session own Details selection when switching Research sessions before leaving', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { actions: actionsA, chat: chatA, createSessionBinding } = mounted
      await act(async () => {
        actionsA.select({ callId: 'research-a', toolName: 'Research A', turnSeq: 11 })
      })
      const bindingB = createSessionBinding({
        view: 'research',
        selection: { callId: 'call-b', toolName: 'Search B', turnSeq: 21 }
      })

      await mounted.rerenderSession('session-research-b', bindingB)
      expect(bindingB.chat.get().selection).toEqual({
        callId: 'call-b', toolName: 'Search B', turnSeq: 21
      })
      await act(async () => {
        bindingB.actions.select({ callId: 'research-b', toolName: 'Research B', turnSeq: 22 })
        bindingB.actions.setView('chat')
      })

      expect(bindingB.chat.get().selection).toEqual({
        callId: 'call-b', toolName: 'Search B', turnSeq: 21
      })
      expect(chatA.get().selection).toEqual({
        callId: 'research-a', toolName: 'Research A', turnSeq: 11
      })
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps one draft lifecycle across Chat, Research, Trajectory, and Research re-entry', async () => {
    const mounted = await mountConversationRoot('chat')
    try {
      const { actions, browserWindow, chat, detailsPortalHost, host, input, transitions, workspace } = mounted
      const textarea = host.querySelector('textarea')
      expect(textarea).not.toBeNull()
      expect(browserWindow.document.querySelectorAll('[data-composer-seat]')).toHaveLength(1)

      await act(async () => { actions.setView('research') })
      expect(transitions.enter).toBe(1)
      expect(chat.get().researchRightTab).toBe('conversation')
      expect(browserWindow.document.querySelectorAll('[data-composer-seat]')).toHaveLength(1)
      expect(browserWindow.document.querySelector('textarea')).toBe(textarea)
      expect(detailsPortalHost.querySelector('[data-research-conversation-panel]')).not.toBeNull()
      expect(detailsPortalHost.querySelector('[role="tablist"]')).toBeNull()
      expect(input.get()).toEqual({
        draft: '研究草稿', images: [{ id: 'image-a' }, { id: 'image-b' }]
      })
      expect(Array.from(browserWindow.document.querySelectorAll('[data-composer-image-id]'))
        .map((node) => node.getAttribute('data-composer-image-id')))
        .toEqual(['image-a', 'image-b'])
      expect(Array.from(browserWindow.document.querySelectorAll('[data-research-file-tag]'))
        .map((node) => node.getAttribute('data-research-file-tag')))
        .toEqual(['file-b', 'file-a'])

      await act(async () => {
        actions.select({ callId: 'research-call', toolName: 'Research', turnSeq: 2 })
        actions.setView('trajectory')
      })
      expect(transitions.leave).toBe(1)
      expect(chat.get().selection).toEqual({
        callId: 'call-1', toolName: 'Web Search', turnSeq: 1
      })
      expect(host.querySelector('textarea')).toBe(textarea)

      await act(async () => { actions.setView('research') })
      expect(transitions.enter).toBe(2)
      expect(browserWindow.document.querySelector('textarea')).toBe(textarea)
      expect(Array.from(browserWindow.document.querySelectorAll('[data-research-file-tag]'))
        .map((node) => node.getAttribute('data-research-file-tag')))
        .toEqual(['file-b', 'file-a'])
      expect(workspace.getSnapshot().artifacts).toEqual([])
      expect(workspace.getSnapshot().files).toHaveLength(2)
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps the single Research conversation panel active while messages update', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { detailsPortalHost, session, workspace } = mounted
      const panel = detailsPortalHost.querySelector('[data-research-conversation-panel]')
      expect(panel).not.toBeNull()
      expect(detailsPortalHost.querySelector('[role="tablist"]')).toBeNull()

      await act(async () => {
        session.update({ chat: { order: ['message-1', 'message-2'] }, running: true })
      })

      expect(detailsPortalHost.querySelector('[data-research-conversation-panel]')).toBe(panel)
      expect(panel?.getAttribute('aria-hidden')).toBeNull()
      expect(workspace.assistantActionsActive()).toBe(true)
    } finally {
      await mounted.cleanup()
    }
  })

  it('ignores wheel zoom when Command is not held', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.nextResearchCanvasViewport).toBeTypeOf('function')
    if (typeof client.nextResearchCanvasViewport !== 'function') return

    const initial = { scale: 1, x: 0, y: 0 }
    const next = client.nextResearchCanvasViewport(initial, {
      metaKey: false,
      deltaY: -100,
      pointerX: 100,
      pointerY: 80
    })

    expect(next).toBe(initial)
  })

  it('keeps the pointer anchored while Command-wheel zooms the canvas', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.nextResearchCanvasViewport).toBeTypeOf('function')
    if (typeof client.nextResearchCanvasViewport !== 'function') return

    const next = client.nextResearchCanvasViewport(
      { scale: 1, x: 0, y: 0 },
      {
        metaKey: true,
        deltaY: -100,
        pointerX: 100,
        pointerY: 80
      }
    ) as { scale: number; x: number; y: number }

    expect(next.scale).toBeCloseTo(1.105170918, 8)
    expect(next.x).toBeCloseTo(-10.5170918, 7)
    expect(next.y).toBeCloseTo(-8.41367344, 7)
  })

  it('pans the research viewport without changing its zoom', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.nextResearchCanvasPan).toBeTypeOf('function')
    if (typeof client.nextResearchCanvasPan !== 'function') return

    const next = client.nextResearchCanvasPan(
      { scale: 1.75, x: -20, y: 10 },
      { deltaX: 35, deltaY: -12 }
    )

    expect(next).toEqual({ scale: 1.75, x: 15, y: -2 })
  })

  it('uses unmodified vertical and horizontal wheel deltas to pan the canvas', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.nextResearchCanvasWheel).toBeTypeOf('function')
    if (typeof client.nextResearchCanvasWheel !== 'function') return

    const next = client.nextResearchCanvasWheel(
      { scale: 1.25, x: 10, y: 20 },
      {
        metaKey: false,
        deltaX: 24,
        deltaY: 80,
        pointerX: 300,
        pointerY: 200
      }
    )

    expect(next).toEqual({ scale: 1.25, x: -14, y: -60 })
  })
})
