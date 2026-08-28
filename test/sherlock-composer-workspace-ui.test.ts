import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import {
  Window,
  type CSSStyleRule as HappyDOMCSSStyleRule,
  type Element as HappyDOMElement,
  type Event as HappyDOMEvent,
  type HTMLElement as HappyDOMHTMLElement
} from 'happy-dom'
import { describe, expect, it, vi } from 'vitest'

type ClientBundle = Record<string, unknown>
type ComponentType<Props> = (props: Props) => unknown
type ReactNode = unknown

const requireModule = createRequire(import.meta.url)
const { createElement, StrictMode, useEffect, useLayoutEffect, useSyncExternalStore } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
  StrictMode: unknown
  useLayoutEffect: (effect: () => void | (() => void), dependencies: unknown[]) => void
  useEffect: (effect: () => void | (() => void), dependencies: unknown[]) => void
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

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
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
    researchCanvasStorage?: {
      getItem(key: string): string | null
      setItem(key: string, value: string): boolean
    }
    researchCanvasWheel?: {
      setRegion(value: Record<string, unknown>): boolean
      subscribe(listener: (value: Record<string, unknown>) => void): () => void
    }
    researchPreview?: {
      admitFinderFile?(file: File, identity: { sessionId: string; nodeId: string }): Promise<Record<string, string> | null>
      admitSidebarFile?(value: { sessionId: string; nodeId: string; relativePath: string }): Promise<Record<string, string> | null>
      restore?(value: { sessionId: string; nodeId: string; authorizationId: string }): Promise<Record<string, string> | null>
      release?(value: { sessionId: string; nodeId: string; authorizationId: string; capabilityToken: string }): Promise<{ ok: boolean }>
      revokeNode?(value: { sessionId: string; nodeId: string }): Promise<{ ok: boolean }>
      revokeSession?(sessionId: string): Promise<{ ok: boolean }>
    }
  },
  options?: {
    document?: unknown
    window?: Window
    modules?: Record<string, unknown>
    styles?: InjectedStyle[]
    exposeInputBar?: boolean
    json?: JSON
  }
): Promise<ClientBundle> {
  const bundleSource = await readFile(
    `node_modules/@deepseek-ai/${packageName}/lib/client.js`,
    'utf8'
  )
  const source = options?.exposeInputBar
    ? bundleSource.replace(
        '		exports.apply = apply;',
        '		exports.apply = apply;\n		exports.__testInputBar = InputBar;'
      )
    : bundleSource
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
    AbortController: globalThis.AbortController,
    TextDecoder: globalThis.TextDecoder,
    window: bundleWindow,
    document: styleDocument,
    localStorage: options?.window?.localStorage,
    navigator: options?.window?.navigator,
    HTMLElement: options?.window?.HTMLElement,
    HTMLTextAreaElement: options?.window?.HTMLTextAreaElement,
    Text: options?.window?.Text,
    ResizeObserver: options?.window?.ResizeObserver,
    requestAnimationFrame: options?.window?.requestAnimationFrame?.bind(options.window),
    cancelAnimationFrame: options?.window?.cancelAnimationFrame?.bind(options.window),
    setTimeout,
    clearTimeout,
    JSON: options?.json ?? globalThis.JSON
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (options?.modules?.[id] !== undefined) return options.modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === 'react-dom') return requireModule('react-dom')
    if (id === '@deepseek-ai/dsh-client-ui-primitives') {
      const fallback = fakeModule() as object
      return new Proxy({
        MarkdownText: ({ text }: { text: string }) => createElement('div', null, text)
      }, {
        get(target, property) {
          return Reflect.get(target, property) ?? Reflect.get(fallback, property)
        }
      })
    }
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

function createSnapshotStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    set(next: T) {
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

async function mountConversationRoot(
  initialView: 'chat' | 'research' | 'trajectory' = 'research',
  assistantMessage?: { messageId: string; text: string; settled?: boolean },
  lifecycle?: {
    enterResearch(): void
    leaveResearch(): void
  },
  composerOptions: {
    overlay?: ReactNode
    model?: ReactNode
    composer?: ReactNode
    composerHeight?: number
    sidebarWidth?: number
  } = {}
) {
  const browserWindow = new Window({ url: 'https://sherlock.local/' })
  if (composerOptions.composerHeight !== undefined) {
    const composerHeight = composerOptions.composerHeight
    Object.defineProperty(browserWindow.HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return this.hasAttribute?.('data-composer-seat') ? composerHeight : 0
      }
    })
    Object.defineProperty(browserWindow, 'ResizeObserver', {
      configurable: true,
      value: class TestResizeObserver {
        private readonly callback: () => void
        constructor(callback: () => void) { this.callback = callback }
        observe() { this.callback() }
        disconnect() {}
      }
    })
  }
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
  detailsPortalHost.style.width = `${composerOptions.sidebarWidth ?? 438}px`
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
        width: composerOptions.sidebarWidth ?? 438,
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
      className: 'wSkVaW_viewArea',
      'data-center-session-view': snapshot.view ?? 'chat'
    }, snapshot.view === 'trajectory'
      ? createElement('div', {
          className: 'qBU-ya_root',
          'data-conversation-composer-overlay': '',
          'data-test-trajectory-view': ''
        })
      : null)
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
        overlay?: unknown
        researchFileReferences?: Array<{ id: string; name: string; path?: string }>
        footer?: unknown
        variant?: 'hero' | 'composer'
      } | undefined
      const references = composerOwner?.researchFileReferences ?? []
      const draft = input.get().draft
      const rootClass = composerOwner?.variant === 'hero'
        ? 'uV2eYG_root uV2eYG_hero'
        : 'uV2eYG_root'
      return createElement('div', {
        'data-test-composer-bar': '',
        'data-test-composer-has-accessory': composerOwner?.accessory === undefined
          ? 'false'
          : 'true',
        className: rootClass
      },
        composerOwner?.accessory,
        createElement('div', { className: 'uV2eYG_card' },
          composerOwner?.overlay === undefined
            ? null
            : createElement('div', { className: 'uV2eYG_overlayAnchor' }, composerOwner.overlay),
          createElement('div', { className: 'uV2eYG_scroll' },
            createElement('div', { className: 'uV2eYG_grow' },
              createElement('div', {
                className: 'uV2eYG_backdrop',
                'data-input-backdrop': '',
                'data-test-inline-reference-layer': ''
              },
                ...draft.split('\n').flatMap((line, index) => [
                  index > 0 ? '\n' : '',
                  line,
                  ...(index === draft.split('\n').length - 1 ? [
                    ...references.map((file) => createElement('span', {
                      key: `${file.id}-${index}`,
                      'data-research-file-tag': file.id,
                      'data-reference-source': 'research-file',
                      'aria-invalid': file.path === undefined ? 'true' : undefined
                    }, file.name.split(/[\\/]/).at(-1)))
                  ] : [])
                ])
              ),
              createElement('textarea', {
                className: 'uV2eYG_input',
                defaultValue: draft,
                'data-input-machine-snapshot': draft
              }),
              createElement('div', {
                className: 'uV2eYG_mirror',
                'data-input-mirror': ''
              }, `${draft}\n`)
            )
          ),
          createElement('div', { className: 'uV2eYG_row' },
            createElement('span', null,
              ...input.get().images.map((image) => createElement('span', {
                key: image.id,
                'data-composer-image-id': image.id
              }))
            ),
            composerOptions.model
          )
        ),
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
    if (name === 'conversation.input.overlay') {
      return composerOptions.overlay
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
        composerOptions.composer ?? options.fallback,
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

function createPdfJsHarness(options: {
  pageCount?: number
  pageWidth?: number
  pageHeight?: number
  pageSizes?: Array<{ width: number; height: number }>
  deferPageRequests?: (page: number) => boolean
  getPageError?: Error
  deferRenders?: boolean
  resolveCancelledLate?: boolean
  rejectDestroy?: boolean
} = {}) {
  const pageCount = options.pageCount ?? 3
  const pageWidth = options.pageWidth ?? 600
  const pageHeight = options.pageHeight ?? 800
  const loadingTasks: Array<{ destroyed: number; teardownThenCalls: number }> = []
  const documents: Array<{ destroyed: number; teardownThenCalls: number }> = []
  const renders: Array<{
    page: number
    cancelled: number
    viewport: { width: number; height: number }
    resolve(): void
  }> = []
  const getDocumentInputs: Array<Record<string, unknown>> = []
  const pages: Array<{ page: number; cleanups: number }> = []
  const getPageCalls: number[] = []
  const deferredPageRequests: Array<{
    page: number
    resolved: boolean
    resolve(): void
  }> = []
  const pdfjs = {
    getDocument(input: Record<string, unknown>) {
      getDocumentInputs.push(input)
      const teardown = { destroyed: 0, thenCalls: 0 }
      const destroy = () => {
        teardown.destroyed += 1
        if (!options.rejectDestroy) return undefined
        return {
          then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
            teardown.thenCalls += 1
            reject(new Error('teardown rejected'))
          }
        }
      }
      const loading = {
        get destroyed() { return teardown.destroyed },
        get teardownThenCalls() { return teardown.thenCalls },
        destroy
      }
      loadingTasks.push(loading)
      const document = {
        numPages: pageCount,
        get destroyed() { return teardown.destroyed },
        get teardownThenCalls() { return teardown.thenCalls },
        destroy,
        async getPage(page: number) {
          getPageCalls.push(page)
          if (options.getPageError !== undefined) throw options.getPageError
          if (options.deferPageRequests?.(page) === true) {
            const pending = deferred<void>()
            const request = {
              page,
              resolved: false,
              resolve() {
                if (request.resolved) return
                request.resolved = true
                pending.resolve()
              }
            }
            deferredPageRequests.push(request)
            await pending.promise
          }
          const pageSize = options.pageSizes?.[page - 1] ?? { width: pageWidth, height: pageHeight }
          const pageRecord = { page, cleanups: 0 }
          pages.push(pageRecord)
          return {
            cleanup() { pageRecord.cleanups += 1 },
            getViewport({ scale }: { scale: number }) {
              return { width: pageSize.width * scale, height: pageSize.height * scale }
            },
            render({ viewport }: { viewport: { width: number; height: number } }) {
              const pending = deferred<void>()
              const record = {
                page,
                cancelled: 0,
                viewport,
                resolve() { pending.resolve() }
              }
              renders.push(record)
              if (!options.deferRenders) pending.resolve()
              return {
                promise: pending.promise,
                cancel() {
                  record.cancelled += 1
                  if (!options.resolveCancelledLate) {
                    pending.reject(Object.assign(new Error('cancelled'), { name: 'RenderingCancelledException' }))
                  }
                }
              }
            }
          }
        }
      }
      documents.push(document)
      return {
        get destroyed() { return teardown.destroyed },
        get teardownThenCalls() { return teardown.thenCalls },
        destroy,
        promise: Promise.resolve(document)
      }
    }
  }
  return {
    deferredPageRequests,
    documents,
    getDocumentInputs,
    getPageCalls,
    loadingTasks,
    pages,
    pdfjs,
    renders
  }
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
  dshDesktop?: {
    getPathForFile?(file: File): string
    researchCanvasWheel?: {
      setRegion(value: Record<string, unknown>): boolean
      subscribe(listener: (value: Record<string, unknown>) => void): () => void
    }
    researchPreview?: {
      admitFinderFile?(file: File, identity: { sessionId: string; nodeId: string }): Promise<Record<string, string> | null>
      admitSidebarFile?(value: { sessionId: string; nodeId: string; relativePath: string }): Promise<Record<string, string> | null>
      restore?(value: { sessionId: string; nodeId: string; authorizationId: string }): Promise<Record<string, string> | null>
      release?(value: { sessionId: string; nodeId: string; authorizationId: string; capabilityToken: string }): Promise<{ ok: boolean }>
      revokeNode?(value: { sessionId: string; nodeId: string }): Promise<{ ok: boolean }>
      revokeSession?(sessionId: string): Promise<{ ok: boolean }>
    }
  }
  modules?: Record<string, unknown>
  pdfjs?: Record<string, unknown>
  pdfBodySize?: { width: number; height: number }
  resizeObserverCallbacks?: Array<() => void>
  intersectionObserverCallbacks?: Array<(entries: Array<{ target: HappyDOMElement; isIntersecting: boolean }>) => void>
  animationFrames?: {
    callbacks: Map<number, FrameRequestCallback>
    cancelled: number[]
  }
  strictMode?: boolean
  officePreview?: {
    Component: ComponentType<{ sourceUrl: string; kind: string; title: string }>
    supports(kind: string): boolean
  }
  fetch?: (input: string, init?: { signal?: AbortSignal }) => Promise<Response>
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
  if (options.fetch !== undefined) {
    Object.defineProperty(browserWindow, 'fetch', {
      configurable: true,
      value: options.fetch
    })
  }
  Object.defineProperty(browserWindow, '__sherlockPdfjs', {
    configurable: true,
    value: options.pdfjs
  })
  Object.defineProperty(browserWindow.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({})
  })
  if (options.pdfBodySize !== undefined) {
    const pdfBodySize = options.pdfBodySize
    Object.defineProperties(browserWindow.HTMLElement.prototype, {
      clientWidth: {
        configurable: true,
        get() { return this.hasAttribute?.('data-research-pdf-scroll') ? pdfBodySize.width : 0 }
      },
      clientHeight: {
        configurable: true,
        get() { return this.hasAttribute?.('data-research-pdf-scroll') ? pdfBodySize.height : 0 }
      },
      scrollWidth: {
        configurable: true,
        get() {
          if (!this.hasAttribute?.('data-research-pdf-scroll')) return 0
          const canvas = this.querySelector?.('canvas') as HTMLCanvasElement | null
          return Math.max(pdfBodySize.width, Math.ceil(Number.parseFloat(canvas?.style.width ?? '0') || 0))
        }
      },
      scrollHeight: {
        configurable: true,
        get() {
          if (!this.hasAttribute?.('data-research-pdf-scroll')) return 0
          const canvas = this.querySelector?.('canvas') as HTMLCanvasElement | null
          return Math.max(pdfBodySize.height, Math.ceil(Number.parseFloat(canvas?.style.height ?? '0') || 0))
        }
      }
    })
  }
  if (options.resizeObserverCallbacks !== undefined) {
    const callbacks = options.resizeObserverCallbacks
    Object.defineProperty(browserWindow, 'ResizeObserver', {
      configurable: true,
      value: class TestResizeObserver {
        constructor(callback: () => void) { callbacks.push(callback) }
        observe() {}
        disconnect() {}
      }
    })
  }
  if (options.intersectionObserverCallbacks !== undefined) {
    const callbacks = options.intersectionObserverCallbacks
    Object.defineProperty(browserWindow, 'IntersectionObserver', {
      configurable: true,
      value: class TestIntersectionObserver {
        constructor(callback: (entries: Array<{ target: HappyDOMElement; isIntersecting: boolean }>) => void) {
          callbacks.push(callback)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    })
  }
  if (options.animationFrames !== undefined) {
    const animationFrames = options.animationFrames
    let nextFrameId = 0
    Object.defineProperties(browserWindow, {
      requestAnimationFrame: {
        configurable: true,
        value(callback: FrameRequestCallback) {
          nextFrameId += 1
          animationFrames.callbacks.set(nextFrameId, callback)
          return nextFrameId
        }
      },
      cancelAnimationFrame: {
        configurable: true,
        value(frameId: number) {
          animationFrames.cancelled.push(frameId)
          animationFrames.callbacks.delete(frameId)
        }
      }
    })
  }
  const client = await loadClientBundle('dsh-client-ui-conversation', options.dshDesktop, {
    document: browserWindow.document,
    window: browserWindow,
    modules: options.modules
  })
  const OfficeCoordinator = client.ResearchOfficePreviewCoordinator as new () => {
    attach(service: unknown): () => void
  }
  const researchOfficePreview = new OfficeCoordinator()
  const detachOfficePreview = options.officePreview === undefined
    ? () => {}
    : researchOfficePreview.attach(options.officePreview)
  const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
    for(id: string): {
      getSnapshot(): {
        files: Array<Record<string, unknown>>
        artifacts: Array<Record<string, unknown>>
        selection: { selectedNodeIds: string[]; orderedFileIds: string[] }
        viewport: { scale: number; x: number; y: number }
      }
      setViewport(viewport: { scale: number; x: number; y: number }): void
      setCanvasSize(value: { width: number; height: number }): void
      setSelection(value: { selectedNodeIds: string[]; orderedFileIds: string[] }): void
      selectedFiles(): Array<Record<string, unknown>>
      pendingOrphanRevocations(): string[]
    }
  }
  const researchWorkspaces = new Registry(storage as Storage)
  const workspace = researchWorkspaces.for(sessionId)
  if (options.viewport !== undefined) workspace.setViewport(options.viewport)
  const ResearchCanvas = client.ResearchCanvas as ComponentType<{
    sessionId: string
    t: (key: string) => string
    researchWorkspaces: InstanceType<typeof Registry>
    researchOfficePreview: InstanceType<typeof OfficeCoordinator>
  }>
  const host = browserWindow.document.createElement('div')
  browserWindow.document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    const canvasNode = createElement(ResearchCanvas, {
      sessionId,
      researchWorkspaces,
      researchOfficePreview,
      t: () => '研究画布'
    })
    root.render(options.strictMode ? createElement(StrictMode, null, canvasNode) : canvasNode)
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
    detachOfficePreview,
    researchOfficePreview,
    async cleanup() {
      await act(async () => { root.unmount() })
      detachOfficePreview()
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

  it('reserves a large inline cell for readable Research file tags', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const inputBarCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/InputBar.module.css')
    )?.textContent ?? ''
    const encodedFont = inputBarCss.match(
      /font-family:DshChipCellLarge;src:url\(data:font\/ttf;base64,([^)]*)\)/
    )?.[1]
    expect(encodedFont).toBeTypeOf('string')
    if (encodedFont === undefined) return

    const font = Buffer.from(encodedFont, 'base64')
    const tableCount = font.readUInt16BE(4)
    let horizontalMetricsOffset = -1
    for (let index = 0; index < tableCount; index += 1) {
      const directoryOffset = 12 + index * 16
      if (font.toString('ascii', directoryOffset, directoryOffset + 4) === 'hmtx') {
        horizontalMetricsOffset = font.readUInt32BE(directoryOffset + 8)
        break
      }
    }
    expect(horizontalMetricsOffset).toBeGreaterThanOrEqual(0)
    expect(font.readUInt16BE(horizontalMetricsOffset + 4)).toBeGreaterThanOrEqual(8000)
    expect(inputBarCss).toContain(
      '.uV2eYG_chip{display:inline-block;height:24px;line-height:24px;vertical-align:middle}'
    )
    expect(inputBarCss).toContain(
      '.uV2eYG_chipLabel{width:calc(100% - 12px);height:22px;gap:6px'
    )
    expect(inputBarCss).toContain('font-size:14px;line-height:22px')
    expect(inputBarCss).toContain(
      '.uV2eYG_chipLabelText{min-width:0;text-overflow:ellipsis;overflow:hidden}'
    )
  })

  it('renders Research file tags with readable light-theme colors', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow
    })
    browserWindow.document.body.style.setProperty(
      '--dsw-alias-bg-module-platform',
      'rgb(245, 246, 247)'
    )
    browserWindow.document.body.style.setProperty(
      '--dsw-alias-label-primary',
      'rgb(15, 17, 21)'
    )
    browserWindow.document.body.innerHTML = [
      '<span class="uV2eYG_chip" data-reference-source="research-file">',
      '<span class="uV2eYG_chipLabel">',
      '<span class="uV2eYG_chipLabelText">report.pdf</span>',
      '</span>',
      '</span>'
    ].join('')

    const chip = browserWindow.document.querySelector('[data-reference-source="research-file"]')
    const label = browserWindow.document.querySelector('.uV2eYG_chipLabel')
    expect(chip).not.toBeNull()
    expect(label).not.toBeNull()
    if (chip === null || label === null) return

    expect(browserWindow.getComputedStyle(chip).backgroundColor).toBe(
      'rgb(245, 246, 247)'
    )
    expect(browserWindow.getComputedStyle(label).color).toBe('rgb(15, 17, 21)')
  })

  it('renders light-theme user messages with a neutral surface and dark text', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow
    })
    browserWindow.document.body.style.setProperty(
      '--dsw-alias-bg-module-platform',
      'rgb(245, 246, 247)'
    )
    browserWindow.document.body.style.setProperty(
      '--dsw-alias-label-primary',
      'rgb(15, 17, 21)'
    )
    browserWindow.document.body.innerHTML = [
      '<div class="gdEzaW_bubble">',
      '<div class="_text_1pfhk_1">Research <code>/efund-ppt-maker</code> request</div>',
      '</div>'
    ].join('')

    const bubble = browserWindow.document.querySelector('.gdEzaW_bubble')
    const text = browserWindow.document.querySelector('._text_1pfhk_1')
    const inlineCode = browserWindow.document.querySelector('code')
    expect(bubble).not.toBeNull()
    expect(text).not.toBeNull()
    expect(inlineCode).not.toBeNull()
    if (bubble === null || text === null || inlineCode === null) return

    expect(browserWindow.getComputedStyle(bubble).backgroundColor).toBe(
      'rgb(245, 246, 247)'
    )
    expect(browserWindow.getComputedStyle(text).color).toBe('rgb(15, 17, 21)')
    expect(browserWindow.getComputedStyle(inlineCode).color).toBe('rgb(15, 17, 21)')
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

  it('exposes the behavior-verified Finder reveal channel through the desktop bridge', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')

    expect(preload).toContain(
      "showItemInFolder: (path: string): Promise<{ ok: boolean }> =>"
    )
    expect(preload).toContain(
      "ipcRenderer.invoke('filesystem:show-item-in-folder', path)"
    )
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

  it('deduplicates and bounds the per-session orphan revocation outbox', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
      for(id: string): {
        queueOrphanRevocations(nodeIds: string[]): void
        pendingOrphanRevocations(): string[]
      }
    }
    const storage = new MemoryStorage()
    const workspace = new Registry(storage).for('session-bounded-outbox')
    const nodeIds = Array.from({ length: 300 }, (_, index) => `orphan-${index}`)

    workspace.queueOrphanRevocations([...nodeIds, 'orphan-0', '', 'orphan-1'])

    expect(workspace.pendingOrphanRevocations()).toEqual(nodeIds.slice(0, 256))
    expect(JSON.parse(storage.getItem(
      'sherlock.research.canvas.preview-revocations.v1:session-bounded-outbox'
    ) ?? '[]')).toEqual(nodeIds.slice(0, 256))

    const maximumIds = Array.from({ length: 256 }, (_, index) =>
      `maximum-orphan-${index}`.padEnd(512, 'x')
    )
    new Registry(storage).for('session-maximum-outbox')
      .queueOrphanRevocations(maximumIds)
    expect(new Registry(storage).for('session-maximum-outbox').pendingOrphanRevocations())
      .toEqual(maximumIds)
  })

  it('rejects malformed and oversized orphan outbox payloads and filters bounded ids', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
      for(id: string): { pendingOrphanRevocations(): string[] }
    }
    const raw = new Map<string, string>([
      ['malformed', '{'],
      ['object', '{"0":"node"}'],
      ['oversized', JSON.stringify(['x'.repeat(800_000)])],
      ['mixed', JSON.stringify(['node-a', 'node-a', '', 7, 'x'.repeat(513), 'node-b'])]
    ])
    const storage = {
      getItem(key: string) {
        const sessionId = key.split(':').at(-1) ?? ''
        return raw.get(sessionId) ?? null
      },
      setItem() {}
    } as unknown as Storage
    const registry = new Registry(storage)

    expect(registry.for('malformed').pendingOrphanRevocations()).toEqual([])
    expect(registry.for('object').pendingOrphanRevocations()).toEqual([])
    expect(registry.for('oversized').pendingOrphanRevocations()).toEqual([])
    expect(registry.for('mixed').pendingOrphanRevocations()).toEqual(['node-a', 'node-b'])
  })

  it('stops parsing a large in-limit orphan outbox after 256 ids without indexOf scans', async () => {
    let indexOfReads = 0
    let itemReads = 0
    const observedJson: JSON = {
      [Symbol.toStringTag]: 'JSON',
      parse(text, reviver) {
        const parsed = globalThis.JSON.parse(text, reviver)
        if (!Array.isArray(parsed)) return parsed
        const firstIndexes = new Map<unknown, number>()
        parsed.forEach((value, index) => {
          if (!firstIndexes.has(value)) firstIndexes.set(value, index)
        })
        return new Proxy(parsed, {
          get(target, property, receiver) {
            if (property === 'indexOf') {
              indexOfReads += 1
              return (value: unknown) => firstIndexes.get(value) ?? -1
            }
            if (typeof property === 'string' && /^\d+$/.test(property)) itemReads += 1
            return Reflect.get(target, property, receiver)
          }
        })
      },
      stringify: globalThis.JSON.stringify
    }
    const nodeIds = Array.from({ length: 5_000 }, (_, index) => `large-orphan-${index}`)
    const key = 'sherlock.research.canvas.preview-revocations.v1:session-large-outbox'
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      json: observedJson
    })
    const Registry = client.ResearchWorkspaceRegistry as new (storage: Storage) => {
      for(id: string): { pendingOrphanRevocations(): string[] }
    }
    const workspace = new Registry({
      getItem(storageKey: string) { return storageKey === key ? JSON.stringify(nodeIds) : null },
      setItem() {}
    } as unknown as Storage).for('session-large-outbox')

    const pending = workspace.pendingOrphanRevocations()
    expect(pending).toHaveLength(256)
    expect(pending[0]).toBe('large-orphan-0')
    expect(pending[255]).toBe('large-orphan-255')
    expect(indexOfReads).toBe(0)
    expect(itemReads).toBeLessThanOrEqual(256)
  })

  it('does not create another durable preview admission while orphan revocation is pending', async () => {
    const storage = new MemoryStorage()
    const sessionId = 'session-pending-orphan'
    storage.setItem(
      `sherlock.research.canvas.preview-revocations.v1:${sessionId}`,
      JSON.stringify(['pending-orphan'])
    )
    const admissions: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/new.png',
        researchPreview: {
          admitFinderFile(_file, identity) {
            admissions.push(identity)
            return Promise.resolve({
              authorizationId: 'unexpected-authorization',
              capabilityToken: 'unexpected-capability',
              url: 'sherlock-preview://unexpected-capability/',
              contentType: 'image/png',
              name: 'new.png'
            })
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode() { return { ok: false } }
        }
      }
    })
    try {
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'],
          files: [{ name: 'new.png', type: 'image/png' } as File],
          dropEffect: 'none',
          getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(admissions).toEqual([])
      expect(mounted.workspace.getSnapshot().files).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        path: '/workspace/new.png',
        name: 'new.png',
        previewEligible: false
      })
      expect(JSON.parse(storage.getItem(
        `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
      ) ?? '[]')).toEqual(['pending-orphan'])
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps a rejected legacy outbox migration volatile until desktop persistence succeeds', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const sessionId = 'session-rejected-outbox-migration'
    const key = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    browserWindow.localStorage.setItem(key, '["legacy-orphan"]')
    let writeAttempts = 0
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      researchCanvasStorage: {
        getItem: () => null,
        setItem: () => { writeAttempts += 1; return false }
      }
    }, {
      window: browserWindow
    })
    const Registry = client.ResearchWorkspaceRegistry as new () => {
      for(id: string): {
        pendingOrphanRevocations(): string[]
        queueOrphanRevocations(nodeIds: string[]): boolean
      }
    }
    const workspace = new Registry().for(sessionId)

    expect(workspace.pendingOrphanRevocations()).toEqual(['legacy-orphan'])
    expect(workspace.queueOrphanRevocations(['legacy-orphan'])).toBe(false)
    expect(writeAttempts).toBeGreaterThanOrEqual(2)
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

  it('renders assistant-result source through production MarkdownText and auto-sizes only before manual resize', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const observed: Array<{ target: HappyDOMElement; callback: () => void; disconnected: boolean }> = []
    class TestResizeObserver {
      private readonly record: { target: HappyDOMElement; callback: () => void; disconnected: boolean }
      constructor(callback: () => void) {
        this.record = { target: browserWindow.document.body, callback, disconnected: false }
        observed.push(this.record)
      }
      observe(target: HappyDOMElement) { this.record.target = target }
      disconnect() { this.record.disconnected = true }
    }
    Object.defineProperty(browserWindow, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver
    })
    const markdown = '\n## Finding\n\n- one\n- two\n\n```js\nanswer()\n```\n'
    const renderedMarkdown: string[] = []
    const primitives = new Proxy({
      MarkdownText: ({ text }: { text: string }) => {
        renderedMarkdown.push(text)
        return createElement('div', { 'data-production-markdown': '' }, text)
      }
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    try {
      const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
        document: browserWindow.document,
        window: browserWindow,
        modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives }
      })
      const Card = client.ResearchCanvasArtifactCard as ComponentType<Record<string, unknown>>
      const host = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(host)
      const root = createRoot(host)
      const heights: number[] = []
      const autoNode = {
        id: 'artifact-markdown', kind: 'assistant-result', messageId: 'm1',
        title: '助手回复', excerpt: markdown, x: 100, y: 100,
        width: 360, height: 240, sizeMode: 'auto'
      }
      await act(async () => {
        root.render(createElement(Card, {
          node: autoNode,
          onAutoHeight: (_node: unknown, height: number) => heights.push(height)
        }))
      })
      const body = host.querySelector('[data-research-artifact-content]') as HappyDOMElement | null
      expect(body).not.toBeNull()
      if (body === null) return
      Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 301.4 })
      await act(async () => { observed.at(-1)?.callback() })

      expect(renderedMarkdown).toContain(markdown)
      expect(host.querySelector('[data-production-markdown]')?.textContent).toBe(markdown)
      expect(heights.at(-1)).toBe(333)

      await act(async () => {
        root.render(createElement(Card, {
          node: { ...autoNode, height: 160, sizeMode: 'manual' },
          onAutoHeight: (_node: unknown, height: number) => heights.push(height)
        }))
      })
      expect(observed.at(-1)?.disconnected).toBe(true)
      expect(browserWindow.getComputedStyle(
        host.querySelector('[data-research-preview-body]') as HappyDOMElement
      ).overflowY).toBe('auto')
      expect(host.querySelector('[data-production-markdown]')?.textContent).toBe(markdown)
      await act(async () => { root.unmount() })
    } finally {
      restoreGlobals()
    }
  })

  it('mounts only near-viewport capability images, restores on re-entry, and releases the exact token offscreen', async () => {
    const releases: Array<Record<string, string>> = []
    const restores: Array<Record<string, string>> = []
    const revocations: Array<Record<string, string>> = []
    let tokenSequence = 0
    let cleaned = false
    const mounted = await mountResearchCanvas({
      sessionId: 'session-image-lifecycle',
      files: [{
        id: 'image-1', name: 'revenue.png', source: 'computer',
        authorizationId: 'authorization-1', contentType: 'image/png',
        x: 200, y: 200, width: 320, height: 272, sizeMode: 'auto', aspectRatio: 4 / 3
      }],
      dshDesktop: {
        researchPreview: {
          async restore(value) {
            restores.push(value)
            tokenSequence += 1
            return {
              authorizationId: value.authorizationId,
              capabilityToken: `capability-${tokenSequence}`,
              url: `sherlock-preview://capability-${tokenSequence}/revenue.png`,
              contentType: 'image/png',
              name: 'revenue.png'
            }
          },
          async release(value) {
            releases.push(value)
            return { ok: true }
          },
          async revokeNode(value) { revocations.push(value); return { ok: true } },
          async revokeSession(sessionId) {
            revocations.push({ sessionId, nodeId: 'session-revocation' })
            return { ok: true }
          }
        }
      }
    })
    try {
      const { host, workspace } = mounted
      await act(async () => {
        ;(workspace as unknown as { setCanvasSize(value: { width: number; height: number }): void })
          .setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve()
      })
      const image = host.querySelector('[data-research-image-preview]') as HappyDOMElement | null
      expect(image).not.toBeNull()
      expect(image?.getAttribute('src')).toBe('sherlock-preview://capability-1/revenue.png')
      if (image === null) return
      const viewportBeforeWheel = workspace.getSnapshot().viewport
      image.dispatchEvent(new mounted.browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: 120
      }))
      expect(workspace.getSnapshot().viewport).toEqual(viewportBeforeWheel)
      Object.defineProperties(image, {
        naturalWidth: { configurable: true, value: 1600 },
        naturalHeight: { configurable: true, value: 900 }
      })
      await act(async () => {
        image.dispatchEvent(new mounted.browserWindow.Event('load', { bubbles: false }))
      })
      expect(workspace.getSnapshot().files[0]).toMatchObject({
        authorizationId: 'authorization-1', contentType: 'image/png',
        width: 320, height: 212, aspectRatio: 16 / 9
      })

      await act(async () => { workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(host.querySelector('[data-research-image-preview]')).toBeNull()
      expect(host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
      expect(releases).toEqual([{
        sessionId: 'session-image-lifecycle', nodeId: 'image-1',
        authorizationId: 'authorization-1', capabilityToken: 'capability-1'
      }])

      await act(async () => {
        workspace.setViewport({ scale: 1, x: 0, y: 0 })
        await Promise.resolve()
      })
      expect(restores).toHaveLength(2)
      expect(host.querySelector('[data-research-image-preview]')?.getAttribute('src'))
        .toBe('sherlock-preview://capability-2/revenue.png')
      const restoredImage = host.querySelector('[data-research-image-preview]') as HappyDOMElement | null
      expect(restoredImage).not.toBeNull()
      await act(async () => {
        expect(() => restoredImage?.dispatchEvent(
          new mounted.browserWindow.Event('error', { bubbles: false })
        )).not.toThrow()
        await Promise.resolve()
      })
      expect(host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
      expect(releases).toHaveLength(2)
      expect(releases.at(-1)).toEqual({
        sessionId: 'session-image-lifecycle', nodeId: 'image-1',
        authorizationId: 'authorization-1', capabilityToken: 'capability-2'
      })
      await mounted.cleanup()
      cleaned = true
      expect(releases).toHaveLength(2)
      expect(revocations).toEqual([])
    } finally {
      if (!cleaned) await mounted.cleanup()
    }
  })

  it('routes DOCX, XLSX, and PPTX canvas nodes through the injected Office component only after restore', async () => {
    const rendered: Array<{ sourceUrl: string; kind: string; title: string }> = []
    const restores: Array<Record<string, string>> = []
    const files = ([
      ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    ] as const).map(([kind, contentType], index) => ({
      id: `office-${kind}`,
      name: `report.${kind}`,
      source: 'computer',
      authorizationId: `authorization-${kind}`,
      contentType,
      x: 160 + index * 190,
      y: 200,
      width: 480,
      height: 360,
      sizeMode: 'manual'
    }))
    const mounted = await mountResearchCanvas({
      sessionId: 'session-office-routing',
      files,
      officePreview: {
        supports: (kind) => ['docx', 'xlsx', 'pptx'].includes(kind),
        Component(props) {
          rendered.push(props)
          return createElement('div', {
            'data-test-office-kind': props.kind,
            'data-test-office-url': props.sourceUrl
          })
        }
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          restores.push(value)
          const file = files.find((candidate) => candidate.id === value.nodeId)
          if (file === undefined) return null
          return {
            authorizationId: value.authorizationId,
            capabilityToken: `capability-${value.nodeId}`,
            url: `sherlock-preview://capability-${value.nodeId}/`,
            contentType: file.contentType,
            name: file.name
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 900, height: 600 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(restores.map((value) => value.nodeId).sort()).toEqual(
        ['office-docx', 'office-pptx', 'office-xlsx']
      )
      expect([...new Set(rendered.map((value) => value.kind))].sort()).toEqual(
        ['docx', 'pptx', 'xlsx']
      )
      expect(rendered.every((value) => value.sourceUrl.startsWith('sherlock-preview://'))).toBe(true)
      expect(mounted.host.querySelectorAll('[data-research-office-preview]')).toHaveLength(3)
      expect(mounted.host.textContent).not.toContain('/Users/')

      const office = mounted.host.querySelector(
        '[data-research-office-preview="docx"]'
      ) as HappyDOMElement | null
      expect(office).not.toBeNull()
      if (office !== null) {
        const initialViewport = mounted.workspace.getSnapshot().viewport
        const plainWheel = new mounted.browserWindow.WheelEvent('wheel', {
          bubbles: true, cancelable: true, deltaY: 48
        })
        office.dispatchEvent(plainWheel)
        expect(plainWheel.defaultPrevented).toBe(false)
        expect(mounted.workspace.getSnapshot().viewport).toEqual(initialViewport)

        const metaWheel = new mounted.browserWindow.WheelEvent('wheel', {
          bubbles: true, cancelable: true, deltaY: -100
        })
        Object.defineProperties(metaWheel, {
          metaKey: { value: true },
          clientX: { value: 280 },
          clientY: { value: 190 }
        })
        office.dispatchEvent(metaWheel)
        const zoomed = mounted.workspace.getSnapshot().viewport
        expect(metaWheel.defaultPrevented).toBe(true)
        expect(zoomed.scale).toBeCloseTo(1.105170918, 8)
        expect((280 - zoomed.x) / zoomed.scale).toBeCloseTo(280, 7)
        expect((190 - zoomed.y) / zoomed.scale).toBeCloseTo(190, 7)
      }
    } finally {
      await mounted.cleanup()
    }
  })

  it('unmounts the Office engine and releases its exact capability offscreen, then restores fresh on return and adapter detach', async () => {
    const releases: Array<Record<string, string>> = []
    const mountedKinds: string[] = []
    const disposedKinds: string[] = []
    let sequence = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-office-lifecycle',
      files: [{
        id: 'office-docx', name: 'report.docx', source: 'computer',
        authorizationId: 'authorization-docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        x: 200, y: 200, width: 480, height: 360, sizeMode: 'manual'
      }],
      officePreview: {
        supports: (kind) => kind === 'docx',
        Component(props) {
          useEffect(() => {
            mountedKinds.push(props.kind)
            return () => { disposedKinds.push(props.kind) }
          }, [props.kind, props.sourceUrl])
          return createElement('div', { 'data-test-office-kind': props.kind })
        }
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          sequence += 1
          return {
            authorizationId: value.authorizationId,
            capabilityToken: `capability-office-${sequence}`,
            url: `sherlock-preview://capability-office-${sequence}/`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            name: 'report.docx'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(sequence).toBe(1)
      expect(mountedKinds).toEqual(['docx'])

      await act(async () => { mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(disposedKinds).toEqual(['docx'])
      expect(releases.at(-1)).toMatchObject({ capabilityToken: 'capability-office-1' })
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()

      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: 0, y: 0 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(sequence).toBe(2)
      expect(mountedKinds).toEqual(['docx', 'docx'])

      await act(async () => { mounted.detachOfficePreview() })
      expect(disposedKinds).toEqual(['docx', 'docx'])
      expect(releases.at(-1)).toMatchObject({ capabilityToken: 'capability-office-2' })
      expect(mounted.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('never restores without an Office adapter and releases a restore that resolves after the node leaves view', async () => {
    let missingAdapterRestores = 0
    const missing = await mountResearchCanvas({
      sessionId: 'session-office-missing',
      files: [{
        id: 'office-missing', name: 'report.docx', source: 'computer',
        authorizationId: 'authorization-missing',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        x: 200, y: 200
      }],
      dshDesktop: { researchPreview: {
        async restore() { missingAdapterRestores += 1; return null }
      } }
    })
    try {
      await act(async () => { missing.workspace.setCanvasSize({ width: 800, height: 600 }) })
      expect(missingAdapterRestores).toBe(0)
      expect(missing.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
    } finally {
      await missing.cleanup()
    }

    const pending = deferred<Record<string, string> | null>()
    const releases: Array<Record<string, string>> = []
    let renders = 0
    const late = await mountResearchCanvas({
      sessionId: 'session-office-late',
      files: [{
        id: 'office-late', name: 'late.xlsx', source: 'computer',
        authorizationId: 'authorization-late',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        x: 200, y: 200, width: 480, height: 360
      }],
      officePreview: {
        supports: (kind) => kind === 'xlsx',
        Component() { renders += 1; return createElement('div') }
      },
      dshDesktop: { researchPreview: {
        restore: async () => pending.promise,
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => { late.workspace.setCanvasSize({ width: 800, height: 600 }) })
      await act(async () => { late.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      await act(async () => {
        pending.resolve({
          authorizationId: 'authorization-late',
          capabilityToken: 'capability-late',
          url: 'sherlock-preview://capability-late/',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: 'late.xlsx'
        })
        await pending.promise
      })
      expect(renders).toBe(0)
      expect(releases).toEqual([{
        sessionId: 'session-office-late', nodeId: 'office-late',
        authorizationId: 'authorization-late', capabilityToken: 'capability-late'
      }])
    } finally {
      await late.cleanup()
    }
  })

  it('keeps the titled Office card alive when adapter supports or component rendering throws', async () => {
    const makeFile = () => ({
      id: 'office-error', name: 'error.pptx', source: 'computer',
      authorizationId: 'authorization-error',
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      x: 200, y: 200, width: 480, height: 360
    })
    let supportsRestore = 0
    const supportsError = await mountResearchCanvas({
      sessionId: 'session-office-supports-error',
      files: [makeFile()],
      officePreview: {
        supports() { throw new Error('adapter unavailable') },
        Component() { return createElement('div') }
      },
      dshDesktop: { researchPreview: {
        async restore() { supportsRestore += 1; return null }
      } }
    })
    try {
      await act(async () => { supportsError.workspace.setCanvasSize({ width: 800, height: 600 }) })
      expect(supportsRestore).toBe(0)
      expect(supportsError.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('error.pptx')
      expect(supportsError.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
    } finally {
      await supportsError.cleanup()
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const componentError = await mountResearchCanvas({
      sessionId: 'session-office-component-error',
      files: [makeFile()],
      officePreview: {
        supports: () => true,
        Component() { throw new Error('engine render failed') }
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-error',
            url: 'sherlock-preview://capability-error/',
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            name: 'error.pptx'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        componentError.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(componentError.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('error.pptx')
      expect(componentError.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
    } finally {
      await componentError.cleanup()
      consoleError.mockRestore()
    }
  })

  it('fetches bounded Markdown only near the viewport, renders through MarkdownText, and aborts offscreen', async () => {
    const markdown = '# 结论\n\n- 第一项\n- [来源](https://example.com)\n'
    const renderedMarkdown: string[] = []
    const fetches: Array<{ url: string; signal?: AbortSignal }> = []
    const releases: Array<Record<string, string>> = []
    const primitives = new Proxy({
      MarkdownText: ({ text }: { text: string }) => {
        renderedMarkdown.push(text)
        return createElement('div', { 'data-production-markdown': '' }, text)
      }
    }, {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    })
    const mounted = await mountResearchCanvas({
      sessionId: 'session-markdown-lifecycle',
      files: [{
        id: 'markdown-1', name: 'finding.md', source: 'computer',
        authorizationId: 'authorization-markdown', contentType: 'text/markdown; charset=utf-8',
        x: 200, y: 200, width: 420, height: 320, sizeMode: 'auto'
      }],
      modules: { '@deepseek-ai/dsh-client-ui-primitives': primitives },
      async fetch(url, init) {
        fetches.push({ url, signal: init?.signal })
        return new Response(markdown, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Length': String(Buffer.byteLength(markdown))
          }
        })
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-markdown',
            url: 'sherlock-preview://capability-markdown/',
            contentType: 'text/markdown; charset=utf-8', name: 'finding.md'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(fetches.map((entry) => entry.url)).toEqual([
        'sherlock-preview://capability-markdown/'
      ])
      expect(renderedMarkdown).toContain(markdown)
      expect(mounted.host.querySelector('[data-research-markdown-preview]')?.textContent)
        .toBe(markdown)
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('finding.md')
      expect(mounted.browserWindow.getComputedStyle(
        mounted.host.querySelector('[data-research-markdown-scroll]') as HappyDOMElement
      ).overflowY).toBe('auto')

      await act(async () => { mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(fetches[0]?.signal?.aborted).toBe(true)
      expect(mounted.host.querySelector('[data-research-markdown-preview]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
      expect(releases).toEqual([{
        sessionId: 'session-markdown-lifecycle', nodeId: 'markdown-1',
        authorizationId: 'authorization-markdown', capabilityToken: 'capability-markdown'
      }])
    } finally {
      await mounted.cleanup()
    }
  })

  it('cancels a pending native text body read and releases its exact capability when offscreen', async () => {
    const pendingRead = deferred<{ done: boolean; value?: Uint8Array }>()
    const releases: Array<Record<string, string>> = []
    let readCalls = 0
    let cancelCalls = 0
    let fetchSignal: AbortSignal | undefined
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-pending-read',
      files: [{
        id: 'text-pending', name: 'pending.txt', source: 'computer',
        authorizationId: 'authorization-pending', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200
      }],
      async fetch(_url, init) {
        fetchSignal = init?.signal
        return {
          ok: true,
          headers: new Headers(),
          body: { getReader() { return {
            read() { readCalls += 1; return pendingRead.promise },
            async cancel() { cancelCalls += 1 }
          } } }
        } as unknown as Response
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-pending',
            url: 'sherlock-preview://capability-pending/',
            contentType: 'text/plain; charset=utf-8', name: 'pending.txt'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(readCalls).toBe(1)

      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 })
        await Promise.resolve()
      })
      const cancelCallsWhileReadWasPending = cancelCalls
      expect(fetchSignal?.aborted).toBe(true)
      expect(releases).toEqual([{
        sessionId: 'session-text-pending-read', nodeId: 'text-pending',
        authorizationId: 'authorization-pending', capabilityToken: 'capability-pending'
      }])

      pendingRead.resolve({ done: true })
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(cancelCallsWhileReadWasPending).toBe(1)
      expect(cancelCalls).toBe(1)
      expect(mounted.host.querySelector('[data-research-text-preview]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
    } finally {
      pendingRead.resolve({ done: true })
      await mounted.cleanup()
    }
  })

  it('releases a native text restore that resolves after offscreen without fetching or reviving it', async () => {
    const pendingRestore = deferred<Record<string, string> | null>()
    const releases: Array<Record<string, string>> = []
    let fetches = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-late-restore',
      files: [{
        id: 'text-late', name: 'late.log', source: 'computer',
        authorizationId: 'authorization-late', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200
      }],
      async fetch() {
        fetches += 1
        return new Response('must not be fetched')
      },
      dshDesktop: { researchPreview: {
        async restore() { return pendingRestore.promise },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve()
      })
      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 })
        await Promise.resolve()
      })
      pendingRestore.resolve({
        authorizationId: 'authorization-late', capabilityToken: 'capability-late',
        url: 'sherlock-preview://capability-late/', contentType: 'text/plain; charset=utf-8',
        name: 'late.log'
      })
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(fetches).toBe(0)
      expect(releases).toEqual([{
        sessionId: 'session-text-late-restore', nodeId: 'text-late',
        authorizationId: 'authorization-late', capabilityToken: 'capability-late'
      }])
      expect(mounted.host.querySelector('[data-research-text-preview]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
    } finally {
      pendingRestore.resolve(null)
      await mounted.cleanup()
    }
  })

  it('renders escaped text/code with a language hint and keeps wheel scrolling inside the component', async () => {
    const source = '<script>alert("unsafe")</script>\nconst answer: number = 42 & 1\n'
    const fetches: Array<{ signal?: AbortSignal }> = []
    const releases: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-lifecycle',
      files: [{
        id: 'text-1', name: 'analysis.ts', source: 'computer',
        authorizationId: 'authorization-text', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200, width: 420, height: 320, sizeMode: 'manual'
      }],
      async fetch(_url, init) {
        fetches.push({ signal: init?.signal })
        return new Response(source, {
          headers: { 'Content-Length': String(Buffer.byteLength(source)) }
        })
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-text',
            url: 'sherlock-preview://capability-text/',
            contentType: 'text/plain; charset=utf-8', name: 'analysis.ts'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      const preview = mounted.host.querySelector('[data-research-text-preview]') as HappyDOMElement | null
      expect(preview).not.toBeNull()
      expect(preview?.textContent).toBe(source)
      expect(preview?.querySelector('script')).toBeNull()
      expect(preview?.querySelector('code')?.getAttribute('class')).toBe('language-ts')
      expect(mounted.host.querySelector('[data-research-file-card="text-1"]')?.getAttribute('style'))
        .toContain('width: 420px')
      const viewportBeforeWheel = mounted.workspace.getSnapshot().viewport
      preview?.dispatchEvent(new mounted.browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: 120
      }))
      expect(mounted.workspace.getSnapshot().viewport).toEqual(viewportBeforeWheel)

      await act(async () => { mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(fetches[0]?.signal?.aborted).toBe(true)
      expect(releases).toHaveLength(1)
    } finally {
      await mounted.cleanup()
    }
  })

  it('fails closed before reading oversized native text and keeps the titled component available', async () => {
    let bodyReads = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-oversized',
      files: [{
        id: 'text-large', name: 'large.custom', source: 'computer',
        authorizationId: 'authorization-large', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200
      }],
      async fetch() {
        return {
          ok: true,
          headers: new Headers({ 'Content-Length': String(2 * 1024 * 1024 + 1) }),
          body: { getReader() { bodyReads += 1; throw new Error('body must not be read') } }
        } as unknown as Response
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-large',
            url: 'sherlock-preview://capability-large/',
            contentType: 'text/plain; charset=utf-8', name: 'large.custom'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(bodyReads).toBe(0)
      expect(mounted.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('large.custom')
    } finally {
      await mounted.cleanup()
    }
  })

  it('cancels a native text stream that exceeds two MiB without a Content-Length header', async () => {
    const chunks = [new Uint8Array(1024 * 1024), new Uint8Array(1024 * 1024 + 1)]
    const releases: Array<Record<string, string>> = []
    let reads = 0
    let cancelCalls = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-stream-oversized',
      files: [{
        id: 'text-stream-large', name: 'large.txt', source: 'computer',
        authorizationId: 'authorization-stream-large', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200
      }],
      async fetch() {
        return {
          ok: true,
          headers: new Headers(),
          body: { getReader() { return {
            async read() {
              const value = chunks[reads]
              reads += 1
              return value === undefined ? { done: true } : { done: false, value }
            },
            async cancel() { cancelCalls += 1 }
          } } }
        } as unknown as Response
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-stream-large',
            url: 'sherlock-preview://capability-stream-large/',
            contentType: 'text/plain; charset=utf-8', name: 'large.txt'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(reads).toBe(2)
      expect(cancelCalls).toBe(1)
      expect(releases).toEqual([{
        sessionId: 'session-text-stream-oversized', nodeId: 'text-stream-large',
        authorizationId: 'authorization-stream-large', capabilityToken: 'capability-stream-large'
      }])
      expect(mounted.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps a missing native text source as a titled unavailable component', async () => {
    let fetches = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-text-missing',
      files: [{
        id: 'text-missing', name: 'moved.py', source: 'computer',
        authorizationId: 'authorization-missing', contentType: 'text/plain; charset=utf-8',
        x: 200, y: 200
      }],
      async fetch() {
        fetches += 1
        return new Response('must not be fetched')
      },
      dshDesktop: { researchPreview: {
        async restore() { return null },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(fetches).toBe(0)
      expect(mounted.host.querySelector('[data-research-preview-unavailable]')).not.toBeNull()
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('moved.py')
    } finally {
      await mounted.cleanup()
    }
  })

  it('fails closed before requesting pages when a PDF exceeds the supported page limit', async () => {
    const harness = createPdfJsHarness({
      pageCount: 4_097,
      getPageError: new Error('an oversized PDF must not request page proxies')
    })
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-page-limit',
      files: [{
        id: 'pdf-page-limit', name: 'oversized.pdf', source: 'computer',
        authorizationId: 'authorization-page-limit', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 446, sizeMode: 'auto', aspectRatio: 17 / 22
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: { width: 318, height: 425 },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-page-limit',
            url: 'sherlock-preview://capability-page-limit/',
            contentType: 'application/pdf', name: 'oversized.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-pdf-error]')).not.toBeNull()
      expect(harness.getPageCalls).toEqual([])
      expect(harness.pages).toEqual([])
      expect(harness.documents[0]?.destroyed).toBe(1)
    } finally {
      await mounted.cleanup()
    }
  })

  it('shows a long PDF after page one and measures later placeholders with bounded concurrency', async () => {
    const harness = createPdfJsHarness({
      pageCount: 240,
      pageSizes: [
        { width: 600, height: 800 },
        { width: 1_000, height: 500 }
      ],
      deferPageRequests: (page) => page > 1
    })
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-progressive-metrics',
      files: [{
        id: 'pdf-progressive-metrics', name: 'long-report.pdf', source: 'computer',
        authorizationId: 'authorization-progressive-metrics', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 446, sizeMode: 'auto', aspectRatio: 17 / 22
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: { width: 318, height: 425 },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-progressive-metrics',
            url: 'sherlock-preview://capability-progressive-metrics/',
            contentType: 'application/pdf', name: 'long-report.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    let cleaned = false
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })

      expect(mounted.host.querySelector('[data-research-preview-loading]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-pdf-scroll]')).not.toBeNull()
      const pageElements = Array.from(mounted.host.querySelectorAll('[data-research-pdf-page]'))
      expect(pageElements).toHaveLength(240)
      expect((pageElements[1] as HappyDOMHTMLElement).style.height).toBe('424px')
      expect((pageElements[239] as HappyDOMHTMLElement).style.height).toBe('424px')

      const initiallyRequestedLaterPages = new Set(
        harness.getPageCalls.filter((page) => page > 1)
      )
      expect([...initiallyRequestedLaterPages]).toEqual([2, 3, 4, 5])

      harness.deferredPageRequests
        .filter((request) => request.page === 2)
        .forEach((request) => request.resolve())
      await act(async () => {
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect((mounted.host.querySelector('[data-research-pdf-page="2"]') as HappyDOMHTMLElement).style.height)
        .toBe('159px')

      const lateRequests = harness.deferredPageRequests.filter((request) => !request.resolved)
      await mounted.cleanup()
      cleaned = true
      lateRequests.forEach((request) => request.resolve())
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      const latePages = harness.pages.filter((page) => lateRequests.some((request) => request.page === page.page))
      expect(latePages.length).toBeGreaterThan(0)
      expect(latePages.every((page) => page.cleanups === 1)).toBe(true)
    } finally {
      if (!cleaned) await mounted.cleanup()
    }
  })

  it('renders a continuous PDF stream, keeps wheel scrolling native, and cleans up pages outside the viewport', async () => {
    const harness = createPdfJsHarness({
      deferRenders: true, resolveCancelledLate: true, rejectDestroy: true
    })
    const releases: Array<Record<string, string>> = []
    const bodySize = { width: 318, height: 425 }
    const resizeObserverCallbacks: Array<() => void> = []
    let restoreSequence = 0
    let cleaned = false
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-lifecycle',
      files: [{
        id: 'pdf-1', name: 'filing.pdf', source: 'computer',
        authorizationId: 'authorization-pdf', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 446, sizeMode: 'auto', aspectRatio: 17 / 22
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: bodySize,
      resizeObserverCallbacks,
      dshDesktop: { researchPreview: {
        async restore(value) {
          restoreSequence += 1
          return {
            authorizationId: value.authorizationId,
            capabilityToken: `capability-pdf-${restoreSequence}`,
            url: `sherlock-preview://capability-pdf-${restoreSequence}/`,
            contentType: 'application/pdf', name: 'filing.pdf'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })

      const pdfBody = mounted.host.querySelector('[data-research-pdf-scroll]') as HappyDOMElement | null
      const pdfCanvases = Array.from(mounted.host.querySelectorAll(
        '[data-research-pdf-preview]'
      )) as unknown as HTMLCanvasElement[]
      expect(pdfBody).not.toBeNull()
      expect(mounted.host.querySelectorAll('[data-research-pdf-page]')).toHaveLength(3)
      expect(pdfCanvases).toHaveLength(2)
      await act(async () => {
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('filing.pdf')
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('1 / 3')
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        width: 320, height: 320 / 0.75 + 32, aspectRatio: 0.75, sizeMode: 'auto'
      })
      expect(harness.getDocumentInputs[0]).toEqual({
        url: 'sherlock-preview://capability-pdf-1/',
        cMapUrl: '/sherlock-pdfjs/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/sherlock-pdfjs/standard_fonts/',
        isEvalSupported: false,
        useWasm: false,
        maxImageSize: 8_000_000
      })
      expect(harness.renders.map(({ page }) => page)).toEqual([1, 2])
      expect(pdfCanvases.every((canvas) => canvas.width * canvas.height <= 8_000_000)).toBe(true)
      if (pdfBody === null) return
      const viewportBeforeWheel = mounted.workspace.getSnapshot().viewport
      let bubbledWheels = 0
      mounted.browserWindow.document.addEventListener('wheel', () => { bubbledWheels += 1 })
      const plainWheel = new mounted.browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: 80, deltaMode: 0
      })
      await act(async () => {
        pdfBody.dispatchEvent(plainWheel)
        await Promise.resolve(); await Promise.resolve()
      })
      expect(plainWheel.defaultPrevented).toBe(false)
      expect(bubbledWheels).toBe(0)
      expect(mounted.workspace.getSnapshot().viewport).toEqual(viewportBeforeWheel)

      const metaWheel = new mounted.browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: -100, deltaMode: 0
      })
      Object.defineProperties(metaWheel, {
        metaKey: { value: true },
        clientX: { value: 320 },
        clientY: { value: 240 }
      })
      await act(async () => {
        pdfBody.dispatchEvent(metaWheel)
        await Promise.resolve(); await Promise.resolve()
      })
      const zoomed = mounted.workspace.getSnapshot().viewport
      expect(metaWheel.defaultPrevented).toBe(true)
      expect(bubbledWheels).toBe(1)
      expect(zoomed.scale).toBeCloseTo(1.105170918, 8)
      expect((320 - zoomed.x) / zoomed.scale).toBeCloseTo(320, 7)
      expect((240 - zoomed.y) / zoomed.scale).toBeCloseTo(240, 7)
      pdfBody.scrollTop = 872
      await act(async () => {
        pdfBody.dispatchEvent(new mounted.browserWindow.Event('scroll', { bubbles: true }))
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('3 / 3')
      expect(harness.renders.map(({ page }) => page)).toEqual([1, 2, 3])
      expect(harness.renders[0]!.cancelled).toBe(1)
      await act(async () => {
        harness.renders[0]!.resolve()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-pdf-preview][data-research-pdf-rendered-page="1"]')).toBeNull()

      await act(async () => {
        bodySize.width = 398
        bodySize.height = 531
        ;(mounted.workspace as unknown as {
          updateNodeGeometry(id: string, geometry: Record<string, unknown>): void
        }).updateNodeGeometry('pdf-1', { width: 400, height: 400 / 0.75 + 32 })
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(harness.renders.filter(({ page }) => page === 2 || page === 3).some(({ cancelled }) => cancelled >= 1)).toBe(true)
      expect(harness.renders.at(-1)?.viewport.width).toBeCloseTo(398, 5)

      await act(async () => { mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(mounted.host.querySelector('[data-research-pdf-preview]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
      expect(harness.loadingTasks[0]!.destroyed).toBe(1)
      expect(harness.documents[0]!.destroyed).toBe(1)
      expect(harness.loadingTasks[0]!.teardownThenCalls).toBe(1)
      expect(harness.pages.every(({ cleanups }) => cleanups >= 1)).toBe(true)
      expect(pdfCanvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true)
      expect(releases).toEqual([{
        sessionId: 'session-pdf-lifecycle', nodeId: 'pdf-1',
        authorizationId: 'authorization-pdf', capabilityToken: 'capability-pdf-1'
      }])

      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: 0, y: 0 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(restoreSequence).toBe(2)
      expect(mounted.host.querySelectorAll('[data-research-pdf-page]')).toHaveLength(3)
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        width: 400, height: 400 / 0.75 + 32, aspectRatio: 0.75, sizeMode: 'auto'
      })
      await mounted.cleanup()
      cleaned = true
      expect(harness.loadingTasks[1]!.destroyed).toBe(1)
      expect(harness.documents[1]!.destroyed).toBe(1)
      expect(harness.loadingTasks[1]!.teardownThenCalls).toBe(1)
      expect(releases.at(-1)).toEqual({
        sessionId: 'session-pdf-lifecycle', nodeId: 'pdf-1',
        authorizationId: 'authorization-pdf', capabilityToken: 'capability-pdf-2'
      })
    } finally {
      if (!cleaned) await mounted.cleanup()
    }
  })

  it('uses cached mixed-page dimensions and IntersectionObserver without changing placeholder offsets', async () => {
    const harness = createPdfJsHarness({
      deferRenders: true,
      pageSizes: [
        { width: 600, height: 800 },
        { width: 1_000, height: 500 },
        { width: 600, height: 1_200 }
      ]
    })
    const intersectionObserverCallbacks: Array<(
      entries: Array<{ target: HappyDOMElement; isIntersecting: boolean }>
    ) => void> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-mixed-pages',
      files: [{
        id: 'pdf-mixed', name: 'mixed.pdf', source: 'computer',
        authorizationId: 'authorization-mixed', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 446, sizeMode: 'auto', aspectRatio: 17 / 22
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: { width: 318, height: 200 },
      intersectionObserverCallbacks,
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId, capabilityToken: 'capability-mixed',
            url: 'sherlock-preview://capability-mixed/', contentType: 'application/pdf', name: 'mixed.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      const body = mounted.host.querySelector('[data-research-pdf-scroll]') as HappyDOMElement | null
      const pages = Array.from(mounted.host.querySelectorAll(
        '[data-research-pdf-page]'
      )) as unknown as HappyDOMHTMLElement[]
      expect(body).not.toBeNull()
      expect(pages.map((page) => page.style.minHeight)).toEqual(['424px', '159px', '636px'])
      expect(pages.map((page) => page.style.marginBottom)).toEqual(['12px', '12px', '0px'])
      expect(intersectionObserverCallbacks).toHaveLength(1)
      const stableHeights = pages.map((page) => page.style.minHeight)
      await act(async () => {
        intersectionObserverCallbacks[0]?.([
          { target: pages[0]!, isIntersecting: false },
          { target: pages[1]!, isIntersecting: false },
          { target: pages[2]!, isIntersecting: true }
        ])
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelectorAll('[data-research-pdf-preview]')).toHaveLength(1)
      expect(mounted.host.querySelector('[data-research-pdf-preview]')?.getAttribute('aria-label')).toContain('第 3 页')
      if (body === null) return
      body.scrollTop = 610
      await act(async () => {
        body.dispatchEvent(new mounted.browserWindow.Event('scroll', { bubbles: true }))
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent).toContain('3 / 3')
      expect(pages.map((page) => page.style.minHeight)).toEqual(stableHeights)
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps a malformed PDF as a titled unavailable node without changing manual geometry', async () => {
    const releases: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-error',
      files: [{
        id: 'pdf-error', name: 'encrypted.pdf', source: 'computer',
        authorizationId: 'authorization-error', contentType: 'application/pdf',
        x: 200, y: 200, width: 540, height: 420, sizeMode: 'manual', aspectRatio: 1.4
      }],
      pdfjs: {
        getDocument() {
          return {
            destroy() {},
            promise: Promise.reject(new Error('PasswordException'))
          }
        }
      },
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId, capabilityToken: 'capability-error',
            url: 'sherlock-preview://capability-error/', contentType: 'application/pdf',
            name: 'encrypted.pdf'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('encrypted.pdf')
      expect(mounted.host.querySelector('[data-research-pdf-error]')).not.toBeNull()
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        width: 540, height: 540 / 1.4 + 32, sizeMode: 'manual', aspectRatio: 1.4
      })
      expect(releases).toHaveLength(1)
    } finally {
      await mounted.cleanup()
    }
  })

  it('sizes PDF backing from the bordered preview body across selection and manual resize', async () => {
    const bodySize = { width: 318, height: 425 }
    const resizeObserverCallbacks: Array<() => void> = []
    const harness = createPdfJsHarness({ pageCount: 1, pageWidth: 600, pageHeight: 800 })
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-body-size',
      files: [{
        id: 'pdf-body-size', name: 'body-size.pdf', source: 'computer',
        authorizationId: 'authorization-body-size', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 320 / 0.75 + 32,
        sizeMode: 'auto', aspectRatio: 0.75
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: bodySize,
      resizeObserverCallbacks,
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-body-size',
            url: 'sherlock-preview://capability-body-size/',
            contentType: 'application/pdf', name: 'body-size.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      const body = mounted.host.querySelector('[data-research-pdf-scroll]') as HappyDOMHTMLElement
      const canvas = mounted.host.querySelector(
        '[data-research-pdf-preview]'
      ) as unknown as HTMLCanvasElement
      expect(canvas.style.width).toBe('318px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)

      bodySize.width = 316
      bodySize.height = 423
      await act(async () => {
        mounted.workspace.setSelection({
          selectedNodeIds: ['pdf-body-size'], orderedFileIds: ['pdf-body-size']
        })
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(canvas.style.width).toBe('316px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)

      bodySize.width = 396
      bodySize.height = 529
      await act(async () => {
        ;(mounted.workspace as unknown as {
          updateNodeGeometry(id: string, geometry: Record<string, unknown>): void
        }).updateNodeGeometry('pdf-body-size', {
          width: 400, height: 400 / 0.75 + 32, sizeMode: 'manual'
        })
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(canvas.style.width).toBe('396px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)
    } finally {
      await mounted.cleanup()
    }
  })

  it('waits for measured body bounds and fits landscape PDF pages in both dimensions', async () => {
    const bodySize = { width: 0, height: 0 }
    const resizeObserverCallbacks: Array<() => void> = []
    const harness = createPdfJsHarness({ pageCount: 1, pageWidth: 1_000, pageHeight: 500 })
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-landscape-body-size',
      files: [{
        id: 'pdf-landscape', name: 'landscape.pdf', source: 'computer',
        authorizationId: 'authorization-landscape', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 192,
        sizeMode: 'auto', aspectRatio: 2
      }],
      pdfjs: harness.pdfjs,
      pdfBodySize: bodySize,
      resizeObserverCallbacks,
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId,
            capabilityToken: 'capability-landscape',
            url: 'sherlock-preview://capability-landscape/',
            contentType: 'application/pdf', name: 'landscape.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(harness.pages).toEqual([{ page: 1, cleanups: 1 }])
      expect(harness.renders).toEqual([])

      const body = mounted.host.querySelector('[data-research-pdf-scroll]') as HappyDOMHTMLElement
      const canvas = mounted.host.querySelector(
        '[data-research-pdf-preview]'
      ) as unknown as HTMLCanvasElement
      bodySize.width = 318
      bodySize.height = 158
      await act(async () => {
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(canvas.style.width).toBe('316px')
      expect(canvas.style.height).toBe('158px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)

      bodySize.width = 316
      bodySize.height = 156
      await act(async () => {
        mounted.workspace.setSelection({
          selectedNodeIds: ['pdf-landscape'], orderedFileIds: ['pdf-landscape']
        })
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(canvas.style.width).toBe('312px')
      expect(canvas.style.height).toBe('156px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)

      bodySize.width = 396
      bodySize.height = 196
      await act(async () => {
        ;(mounted.workspace as unknown as {
          updateNodeGeometry(id: string, geometry: Record<string, unknown>): void
        }).updateNodeGeometry('pdf-landscape', {
          width: 400, height: 232, sizeMode: 'manual'
        })
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      expect(canvas.style.width).toBe('392px')
      expect(canvas.style.height).toBe('196px')
      expect(body.scrollWidth).toBe(body.clientWidth)
      expect(body.scrollHeight).toBe(body.clientHeight)
      expect(harness.renders.map(({ viewport }) => viewport.width)).toEqual([316, 312, 392])

      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-pdf-scroll]')).toBeNull()
      const pagesBeforeReentry = harness.pages.length
      const rendersBeforeReentry = harness.renders.length
      bodySize.width = 0
      bodySize.height = 0
      await act(async () => {
        mounted.workspace.setSelection({ selectedNodeIds: [], orderedFileIds: [] })
        ;(mounted.workspace as unknown as {
          updateNodeGeometry(id: string, geometry: Record<string, unknown>): void
        }).updateNodeGeometry('pdf-landscape', {
          width: 440, height: 252, sizeMode: 'manual'
        })
        mounted.workspace.setViewport({ scale: 1, x: 0, y: 0 })
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-pdf-scroll]')).not.toBeNull()
      expect(harness.pages).toHaveLength(pagesBeforeReentry + 1)
      expect(harness.pages.at(-1)).toMatchObject({ page: 1, cleanups: 1 })
      expect(harness.renders).toHaveLength(rendersBeforeReentry)

      bodySize.width = 438
      bodySize.height = 218
      await act(async () => {
        resizeObserverCallbacks.at(-1)?.()
        await Promise.resolve(); await Promise.resolve()
      })
      const restoredBody = mounted.host.querySelector(
        '[data-research-pdf-scroll]'
      ) as HappyDOMHTMLElement
      expect(harness.renders.map(({ viewport }) => viewport.width)).toEqual([316, 312, 392, 436])
      expect(restoredBody.scrollWidth).toBe(restoredBody.clientWidth)
      expect(restoredBody.scrollHeight).toBe(restoredBody.clientHeight)
    } finally {
      await mounted.cleanup()
    }
  })

  it('removes a failed PDF.js loader so a later visible retry can install a fresh module script', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-pdf-loader-retry',
      files: [{
        id: 'pdf-loader', name: 'loader.pdf', source: 'computer',
        authorizationId: 'authorization-loader', contentType: 'application/pdf',
        x: 200, y: 200, width: 320, height: 446, sizeMode: 'auto', aspectRatio: 17 / 22
      }],
      dshDesktop: { researchPreview: {
        async restore(value) {
          return {
            authorizationId: value.authorizationId, capabilityToken: 'capability-loader',
            url: 'sherlock-preview://capability-loader/', contentType: 'application/pdf',
            name: 'loader.pdf'
          }
        },
        async release() { return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve()
      })
      const failedLoader = mounted.browserWindow.document.querySelector(
        'script[data-sherlock-pdfjs-loader]'
      ) as HappyDOMElement | null
      expect(failedLoader).not.toBeNull()
      await act(async () => {
        failedLoader?.dispatchEvent(new mounted.browserWindow.Event('error'))
        await Promise.resolve(); await Promise.resolve()
      })
      expect(mounted.host.querySelector('[data-research-pdf-error]')).not.toBeNull()
      expect(mounted.browserWindow.document.querySelector(
        'script[data-sherlock-pdfjs-loader]'
      )).toBeNull()
    } finally {
      await mounted.cleanup()
    }
  })

  it('mounts interactive HTML only from a capability URL with the exact browser sandbox and releases it offscreen', async () => {
    const releases: Array<Record<string, string>> = []
    let restoreSequence = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-html-lifecycle',
      files: [{
        id: 'html-1', name: 'model.html', source: 'computer',
        authorizationId: 'authorization-html', contentType: 'text/html; charset=utf-8',
        x: 200, y: 200, width: 480, height: 360, sizeMode: 'auto'
      }],
      dshDesktop: { researchPreview: {
        async restore(value) {
          restoreSequence += 1
          return {
            authorizationId: value.authorizationId,
            capabilityToken: `capability-html-${restoreSequence}`,
            url: `sherlock-preview://capability-html-${restoreSequence}/`,
            contentType: 'text/html; charset=utf-8', name: 'model.html'
          }
        },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    try {
      await act(async () => {
        mounted.workspace.setCanvasSize({ width: 800, height: 600 })
        await Promise.resolve(); await Promise.resolve()
      })
      const frame = mounted.host.querySelector('[data-research-html-preview]') as HappyDOMElement | null
      expect(frame).not.toBeNull()
      expect(frame?.getAttribute('src')).toBe('sherlock-preview://capability-html-1/')
      expect(frame?.getAttribute('srcdoc')).toBeNull()
      expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-forms')
      expect(frame?.getAttribute('referrerpolicy')).toBe('no-referrer')
      expect(frame?.getAttribute('loading')).toBe('lazy')
      expect(frame?.getAttribute('allow')).toBe(
        "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; fullscreen 'none'; autoplay 'none'; payment 'none'; usb 'none'; serial 'none'; hid 'none'"
      )
      expect(mounted.host.querySelector('[data-research-node-title]')?.textContent)
        .toContain('model.html')
      const card = mounted.host.querySelector('[data-research-file-card="html-1"]') as HappyDOMHTMLElement
      expect(card.style.width).toBe('480px')
      expect(card.style.height).toBe('360px')
      expect(card.querySelector('[data-research-preview-shield]')).not.toBeNull()
      const viewportBeforeWheel = mounted.workspace.getSnapshot().viewport
      const htmlWheel = new mounted.browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: 120
      })
      frame?.dispatchEvent(htmlWheel)
      expect(htmlWheel.defaultPrevented).toBe(false)
      expect(mounted.workspace.getSnapshot().viewport).toEqual(viewportBeforeWheel)

      await act(async () => {
        mounted.workspace.setSelection({ selectedNodeIds: ['html-1'], orderedFileIds: ['html-1'] })
      })
      expect(mounted.host.querySelector('[data-research-html-preview]')).toBe(frame)

      ;(mounted.canvas as unknown as { focus(): void }).focus()
      const shield = card.querySelector('[data-research-preview-shield]') as HappyDOMElement
      await act(async () => {
        mounted.browserWindow.dispatchEvent(new mounted.browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
      })
      expect(mounted.browserWindow.getComputedStyle(shield).pointerEvents).toBe('auto')
      await act(async () => {
        mounted.browserWindow.dispatchEvent(new mounted.browserWindow.KeyboardEvent('keyup', {
          code: 'Space', key: ' ', bubbles: true
        }))
      })
      expect(mounted.canvas.hasAttribute('data-space-pressed')).toBe(false)

      await act(async () => { mounted.workspace.setViewport({ scale: 1, x: -2_000, y: 0 }) })
      expect(mounted.host.querySelector('[data-research-html-preview]')).toBeNull()
      expect(mounted.host.querySelector('[data-research-offscreen-placeholder]')).not.toBeNull()
      expect(releases).toEqual([{
        sessionId: 'session-html-lifecycle', nodeId: 'html-1',
        authorizationId: 'authorization-html', capabilityToken: 'capability-html-1'
      }])
      await act(async () => {
        mounted.workspace.setViewport({ scale: 1, x: 0, y: 0 })
        await Promise.resolve(); await Promise.resolve()
      })
      expect(restoreSequence).toBe(2)
      const restoredFrame = mounted.host.querySelector('[data-research-html-preview]') as HappyDOMElement | null
      expect(restoredFrame?.getAttribute('src'))
        .toBe('sherlock-preview://capability-html-2/')
    } finally {
      await mounted.cleanup()
    }
  })

  it('releases an exact HTML capability whose restore resolves after unmount', async () => {
    const pending = deferred<Record<string, string> | null>()
    const releases: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-html-late-restore',
      files: [{
        id: 'html-late', name: 'late.html', source: 'computer',
        authorizationId: 'authorization-html-late', contentType: 'text/html; charset=utf-8',
        x: 200, y: 200
      }],
      dshDesktop: { researchPreview: {
        async restore() { return pending.promise },
        async release(value) { releases.push(value); return { ok: true } }
      } }
    })
    await act(async () => {
      mounted.workspace.setCanvasSize({ width: 800, height: 600 })
      await Promise.resolve()
    })
    await mounted.cleanup()
    pending.resolve({
      authorizationId: 'authorization-html-late', capabilityToken: 'capability-html-late',
      url: 'sherlock-preview://capability-html-late/', contentType: 'text/html; charset=utf-8',
      name: 'late.html'
    })
    await Promise.resolve(); await Promise.resolve()
    expect(releases).toEqual([{
      sessionId: 'session-html-late-restore', nodeId: 'html-late',
      authorizationId: 'authorization-html-late', capabilityToken: 'capability-html-late'
    }])
  })

  it('admits only matching Better Sidebar preview identities and leaves mismatches generic', async () => {
    const admissions: Array<Record<string, string>> = []
    const releases: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-sidebar-drop',
      dshDesktop: {
        researchPreview: {
          async admitSidebarFile(value) {
            admissions.push(value)
            return {
              authorizationId: 'authorization-sidebar', capabilityToken: 'capability-sidebar',
              url: 'sherlock-preview://capability-sidebar/', contentType: 'image/png',
              name: 'chart.png'
            }
          },
          async release(value) { releases.push(value); return { ok: true } },
          async restore() { return null }
        }
      }
    })
    try {
      const transfer = (sessionId: string, name = 'chart.png') => ({
        types: ['application/x-sherlock-file'], files: [], dropEffect: 'none',
        getData: () => JSON.stringify({
          path: `/workspace/charts/${name}`, name,
          sessionId, relativePath: `charts/${name}`
        })
      })
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', transfer('session-sidebar-drop'))
        await Promise.resolve()
        await Promise.resolve()
      })
      const admittedNode = mounted.workspace.getSnapshot().files[0]
      expect(admissions).toEqual([{
        sessionId: 'session-sidebar-drop', nodeId: admittedNode?.id,
        relativePath: 'charts/chart.png'
      }])
      expect(admittedNode).toMatchObject({
        authorizationId: 'authorization-sidebar', contentType: 'image/png',
        path: '/workspace/charts/chart.png', width: 320
      })
      expect(releases[0]).toEqual({
        sessionId: 'session-sidebar-drop', nodeId: admittedNode?.id,
        authorizationId: 'authorization-sidebar', capabilityToken: 'capability-sidebar'
      })

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['application/x-sherlock-file'], files: [], dropEffect: 'none',
          getData: () => JSON.stringify({
            path: '/workspace/charts/chart.png', name: 'forged.svg',
            sessionId: 'other-session', relativePath: 'charts/chart.png'
          })
        }, { x: 480, y: 180 })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        id: admittedNode?.id, name: 'chart.png', path: '/workspace/charts/chart.png',
        authorizationId: 'authorization-sidebar', contentType: 'image/png',
        width: 320, x: 480, y: 180
      })
      expect(mounted.workspace.getSnapshot().files[0]).not.toHaveProperty('previewEligible')

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['application/x-sherlock-file'], files: [], dropEffect: 'none',
          getData: () => JSON.stringify({
            path: '/workspace/charts/chart.png', name: 'legacy-forged.png'
          })
        }, { x: 520, y: 220 })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        id: admittedNode?.id, name: 'chart.png',
        authorizationId: 'authorization-sidebar', contentType: 'image/png',
        width: 320, x: 520, y: 220
      })

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', transfer('session-sidebar-drop'), { x: 560, y: 260 })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        id: admittedNode?.id, name: 'chart.png', authorizationId: 'authorization-sidebar',
        contentType: 'image/png', width: 320, x: 560, y: 260
      })

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', transfer('other-session', 'other.png'), { x: 700, y: 200 })
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)
      const mismatch = mounted.workspace.getSnapshot().files.find(
        (node: Record<string, unknown>) => node.x === 700
      )
      expect(mismatch).toMatchObject({ name: 'other.png', width: 220, height: 64 })
      expect(mismatch).not.toHaveProperty('authorizationId')

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['application/x-sherlock-file'], files: [], dropEffect: 'none',
          getData: () => JSON.stringify({
            path: '/workspace/charts/legacy.png', name: 'legacy.png'
          })
        }, { x: 800, y: 200 })
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)
      const legacy = mounted.workspace.getSnapshot().files.find(
        (node: Record<string, unknown>) => node.x === 800
      )
      expect(legacy).toMatchObject({ name: 'legacy.png', width: 220, height: 64 })
      expect(legacy).not.toHaveProperty('authorizationId')
    } finally {
      await mounted.cleanup()
    }
  })

  it('generates a Finder node id before admission and durably revokes that node on Delete', async () => {
    const admissions: Array<{ file: File; identity: Record<string, string> }> = []
    const revocations: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-finder-drop',
      dshDesktop: {
        getPathForFile: () => '/workspace/diagram.svg',
        researchPreview: {
          async admitFinderFile(file, identity) {
            admissions.push({ file, identity })
            return {
              authorizationId: 'authorization-finder', capabilityToken: 'capability-finder',
              url: 'sherlock-preview://capability-finder/', contentType: 'image/svg+xml',
              name: 'diagram.svg'
            }
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { revocations.push(value); return { ok: true } }
        }
      }
    })
    try {
      const file = { name: 'diagram.svg', type: 'image/svg+xml' } as File
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [file], dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
      })
      const node = mounted.workspace.getSnapshot().files[0]
      expect(node?.id).toBeTypeOf('string')
      if (typeof node?.id !== 'string') return
      expect(admissions).toEqual([{ file, identity: {
        sessionId: 'session-finder-drop', nodeId: node.id
      } }])
      expect(node).toMatchObject({
        name: 'diagram.svg', authorizationId: 'authorization-finder',
        contentType: 'image/svg+xml', width: 320
      })
      expect(node).toMatchObject({ path: '/workspace/diagram.svg' })
      mounted.workspace.setSelection({ selectedNodeIds: [node.id], orderedFileIds: [node.id] })
      expect(mounted.workspace.selectedFiles()).toMatchObject([{
        id: node?.id, name: 'diagram.svg', path: '/workspace/diagram.svg'
      }])
      const prompt = (mounted.client.serializeResearchPrompt as (
        files: Array<Record<string, unknown>>, text: string
      ) => string)(mounted.workspace.selectedFiles(), 'inspect')
      expect((mounted.client.parseResearchPrompt as (value: string) => {
        files: Array<Record<string, unknown>>
      })(prompt).files).toMatchObject([{
        id: node?.id, name: 'diagram.svg', path: '/workspace/diagram.svg'
      }])

      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [file], dropEffect: 'none', getData: () => ''
        }, { x: 640, y: 260 })
        await Promise.resolve()
        await Promise.resolve()
      })
      const redropped = mounted.workspace.getSnapshot().files[0]
      expect(redropped?.id).toBeTypeOf('string')
      if (typeof redropped?.id !== 'string') return
      expect(admissions).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files).toHaveLength(1)
      expect(redropped).toMatchObject({
        id: node?.id, authorizationId: 'authorization-finder',
        x: 640, y: 260
      })

      mounted.workspace.setSelection({ selectedNodeIds: [redropped.id], orderedFileIds: [redropped.id] })
      ;(mounted.canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        mounted.browserWindow.dispatchEvent(new mounted.browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
      })
      expect(revocations).toEqual([{
        sessionId: 'session-finder-drop', nodeId: redropped?.id
      }])
      expect(mounted.workspace.getSnapshot().files).toEqual([])
    } finally {
      await mounted.cleanup()
    }
  })

  it.each(['finder', 'sidebar'] as const)(
    'durably journals a %s node before admission and clears it only after rich persistence',
    async (source) => {
      const storage = new MemoryStorage()
      const sessionId = `session-prejournal-${source}`
      const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
      const admissions: Array<Record<string, string>> = []
      const revocations: Array<Record<string, string>> = []
      const admit = async (identity: Record<string, string>) => {
        admissions.push(identity)
        expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([identity.nodeId])
        return {
          authorizationId: `authorization-${source}`,
          capabilityToken: `capability-${source}`,
          url: `sherlock-preview://capability-${source}/`,
          contentType: 'image/png',
          name: `${source}.png`
        }
      }
      const mounted = await mountResearchCanvas({
        sessionId,
        storage,
        dshDesktop: {
          getPathForFile: () => `/workspace/${source}.png`,
          researchPreview: {
            admitFinderFile: (_file, identity) => admit(identity),
            admitSidebarFile: (value) => admit(value),
            async release() { return { ok: true } },
            async restore() { return null },
            async revokeNode(value) { revocations.push(value); return { ok: true } }
          }
        }
      })
      try {
        const transfer = source === 'finder'
          ? {
              types: ['Files'], files: [{ name: 'finder.png', type: 'image/png' } as File],
              dropEffect: 'none', getData: () => ''
            }
          : {
              types: ['application/x-sherlock-file'], files: [], dropEffect: 'none',
              getData: () => JSON.stringify({
                path: '/workspace/sidebar.png', name: 'sidebar.png', sessionId,
                relativePath: 'sidebar.png'
              })
            }
        await act(async () => {
          dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', transfer)
          await Promise.resolve()
          await Promise.resolve()
          await Promise.resolve()
        })

        expect(admissions).toHaveLength(1)
        expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
          id: admissions[0]?.nodeId,
          authorizationId: `authorization-${source}`,
          contentType: 'image/png'
        })
        expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([])
        expect(revocations).toEqual([])
      } finally {
        await mounted.cleanup()
      }
    }
  )

  it('does not call preview admission when the durable pre-journal write fails', async () => {
    const values = new Map<string, string>()
    const sessionId = 'session-prejournal-rejected'
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem(key: string, value: string) {
        if (key.startsWith('sherlock.research.canvas.preview-revocations.v1:')) return false
        values.set(key, value)
        return true
      }
    }
    let admissions = 0
    const mounted = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/rejected.png',
        researchPreview: {
          async admitFinderFile() { admissions += 1; return null },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode() { return { ok: true } }
        }
      }
    })
    try {
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [{ name: 'rejected.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(admissions).toBe(0)
      expect(mounted.workspace.pendingOrphanRevocations()).toEqual([])
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        name: 'rejected.png', previewEligible: false
      })
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps the later rich authorization when one batch repeats a path after a lost response', async () => {
    const storage = new MemoryStorage()
    const sessionId = 'session-batch-same-path-journal'
    const admissions: Array<Record<string, string>> = []
    const revocations: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/repeated.png',
        researchPreview: {
          async admitFinderFile(_file, identity) {
            admissions.push(identity)
            if (admissions.length === 1) throw new Error('first response lost')
            return {
              authorizationId: 'authorization-repeated',
              capabilityToken: 'capability-repeated',
              url: 'sherlock-preview://capability-repeated/',
              contentType: 'image/png', name: 'repeated.png'
            }
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { revocations.push(value); return { ok: true } }
        }
      }
    })
    try {
      const files = [
        { name: 'repeated.png', type: 'image/png' } as File,
        { name: 'repeated.png', type: 'image/png' } as File
      ]
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files, dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(admissions).toHaveLength(2)
      expect(admissions[0]?.nodeId).toBe(admissions[1]?.nodeId)
      expect(mounted.workspace.getSnapshot().files).toMatchObject([{
        id: admissions[0]?.nodeId,
        authorizationId: 'authorization-repeated',
        contentType: 'image/png'
      }])
      expect(revocations).toEqual([])
      expect(mounted.workspace.pendingOrphanRevocations()).toEqual([])
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps the current drop lifecycle active after StrictMode effect replay', async () => {
    const revocations: Array<Record<string, string>> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-strict-lifecycle',
      strictMode: true,
      dshDesktop: {
        getPathForFile: () => '/workspace/strict.png',
        researchPreview: {
          async admitFinderFile() {
            return {
              authorizationId: 'authorization-strict', capabilityToken: 'capability-strict',
              url: 'sherlock-preview://capability-strict/', contentType: 'image/png',
              name: 'strict.png'
            }
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { revocations.push(value); return { ok: true } }
        }
      }
    })
    try {
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [{ name: 'strict.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        authorizationId: 'authorization-strict', contentType: 'image/png'
      })
      expect(revocations).toEqual([])
    } finally {
      await mounted.cleanup()
    }
  })

  it('revokes a journaled admission when the rich files write is rejected before restart', async () => {
    const values = new Map<string, string>()
    const events: string[] = []
    const sessionId = 'session-files-partial-write'
    const filesKey = `sherlock.research.canvas.files.v1:${sessionId}`
    const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    let rejectRichFiles = false
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem(key: string, value: string) {
        if (key === filesKey && rejectRichFiles && value.includes('authorization-files-failed')) {
          events.push('files:rejected')
          return false
        }
        values.set(key, value)
        if (key === outboxKey) events.push(`outbox:${value}`)
        return true
      }
    }
    const revocations: Array<Record<string, string>> = []
    const firstMount = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/files-failed.png',
        researchPreview: {
          async admitFinderFile() {
            return {
              authorizationId: 'authorization-files-failed',
              capabilityToken: 'capability-files-failed',
              url: 'sherlock-preview://capability-files-failed/',
              contentType: 'image/png', name: 'files-failed.png'
            }
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) {
            revocations.push(value)
            events.push('revoke')
            return { ok: true }
          }
        }
      }
    })
    let firstCleaned = false
    try {
      rejectRichFiles = true
      await act(async () => {
        dispatchDrag(firstMount.browserWindow, firstMount.canvas, 'drop', {
          types: ['Files'],
          files: [{ name: 'files-failed.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(revocations).toHaveLength(1)
      expect(JSON.parse(values.get(filesKey) ?? '[]')).toEqual([])
      expect(JSON.parse(values.get(outboxKey) ?? '[]')).toEqual([])
      expect(events.indexOf('revoke')).toBeGreaterThan(events.indexOf('files:rejected'))
      expect(events.indexOf('outbox:[]')).toBeGreaterThan(events.indexOf('revoke'))
      await firstMount.cleanup()
      firstCleaned = true

      const restartRevocations: Array<Record<string, string>> = []
      const secondMount = await mountResearchCanvas({
        sessionId,
        files: JSON.parse(values.get(filesKey) ?? '[]'),
        storage,
        dshDesktop: { researchPreview: {
          async restore() { return null },
          async release() { return { ok: true } },
          async revokeNode(value) { restartRevocations.push(value); return { ok: true } }
        } }
      })
      try {
        await act(async () => { await Promise.resolve(); await Promise.resolve() })
        expect(secondMount.workspace.getSnapshot().files).toEqual([])
        expect(secondMount.workspace.pendingOrphanRevocations()).toEqual([])
        expect(restartRevocations).toEqual([])
      } finally {
        await secondMount.cleanup()
      }
    } finally {
      if (!firstCleaned) await firstMount.cleanup()
    }
  })

  it('retries journal completion without revoking a durable rich file after restart', async () => {
    const values = new Map<string, string>()
    const sessionId = 'session-outbox-clear-partial-write'
    const filesKey = `sherlock.research.canvas.files.v1:${sessionId}`
    const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    let remainingClearFailures = 2
    let clearAttempts = 0
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem(key: string, value: string) {
        if (key === outboxKey && value === '[]') {
          clearAttempts += 1
          if (remainingClearFailures > 0) {
            remainingClearFailures -= 1
            return false
          }
        }
        values.set(key, value)
        return true
      }
    }
    const firstRevocations: Array<Record<string, string>> = []
    const firstMount = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/durable.png',
        researchPreview: {
          async admitFinderFile() {
            return {
              authorizationId: 'authorization-durable', capabilityToken: 'capability-durable',
              url: 'sherlock-preview://capability-durable/', contentType: 'image/png',
              name: 'durable.png'
            }
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { firstRevocations.push(value); return { ok: true } }
        }
      }
    })
    let firstCleaned = false
    try {
      await act(async () => {
        dispatchDrag(firstMount.browserWindow, firstMount.canvas, 'drop', {
          types: ['Files'], files: [{ name: 'durable.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      const durableNode = JSON.parse(values.get(filesKey) ?? '[]')[0] as Record<string, unknown>
      expect(durableNode).toMatchObject({
        authorizationId: 'authorization-durable', contentType: 'image/png'
      })
      expect(JSON.parse(values.get(outboxKey) ?? '[]')).toEqual([durableNode.id])
      expect(firstRevocations).toEqual([])
      await firstMount.cleanup()
      firstCleaned = true

      const restartRevocations: Array<Record<string, string>> = []
      const secondMount = await mountResearchCanvas({
        sessionId,
        files: [durableNode],
        storage,
        dshDesktop: { researchPreview: {
          async restore() { return null },
          async release() { return { ok: true } },
          async revokeNode(value) { restartRevocations.push(value); return { ok: true } }
        } }
      })
      try {
        await act(async () => { await Promise.resolve(); await Promise.resolve() })
        expect(clearAttempts).toBe(2)
        expect(restartRevocations).toEqual([])
        expect(JSON.parse(values.get(outboxKey) ?? '[]')).toEqual([durableNode.id])
        expect(secondMount.workspace.getSnapshot().files[0]).toMatchObject({
          id: durableNode.id, authorizationId: 'authorization-durable'
        })
      } finally {
        await secondMount.cleanup()
      }
    } finally {
      if (!firstCleaned) await firstMount.cleanup()
    }
  })

  it('retries a pre-journaled admission whose IPC response was lost on the next mount', async () => {
    const storage = new MemoryStorage()
    const sessionId = 'session-prejournal-lost-response'
    const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    const firstRevocations: Array<Record<string, string>> = []
    const firstMount = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/lost.png',
        researchPreview: {
          async admitFinderFile() { throw new Error('response lost') },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { firstRevocations.push(value); return { ok: false } }
        }
      }
    })
    let firstCleaned = false
    try {
      await act(async () => {
        dispatchDrag(firstMount.browserWindow, firstMount.canvas, 'drop', {
          types: ['Files'], files: [{ name: 'lost.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      const orphanNodeId = firstRevocations[0]?.nodeId
      expect(orphanNodeId).toBeTypeOf('string')
      expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([orphanNodeId])
      const persistedFiles = firstMount.workspace.getSnapshot().files
      await firstMount.cleanup()
      firstCleaned = true

      const retryCalls: Array<Record<string, string>> = []
      const secondMount = await mountResearchCanvas({
        sessionId,
        files: persistedFiles,
        storage,
        dshDesktop: { researchPreview: {
          async restore() { return null },
          async release() { return { ok: true } },
          async revokeNode(value) { retryCalls.push(value); return { ok: true } }
        } }
      })
      try {
        await act(async () => {
          await Promise.resolve()
          await Promise.resolve()
        })
        expect(retryCalls).toEqual([{ sessionId, nodeId: orphanNodeId }])
        expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([])
      } finally {
        await secondMount.cleanup()
      }
    } finally {
      if (!firstCleaned) await firstMount.cleanup()
    }
  })

  it('blocks a second mount admission while the first mount response is still deferred', async () => {
    const storage = new MemoryStorage()
    const sessionId = 'session-prejournal-cross-mount'
    const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    const firstAdmission = deferred<Record<string, string> | null>()
    const secondRevocation = deferred<{ ok: boolean }>()
    const firstAdmissions: Array<Record<string, string>> = []
    const firstRevocations: Array<Record<string, string>> = []
    const firstMount = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/first.png',
        researchPreview: {
          admitFinderFile(_file, identity) {
            firstAdmissions.push(identity)
            return firstAdmission.promise
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { firstRevocations.push(value); return { ok: true } }
        }
      }
    })
    await act(async () => {
      dispatchDrag(firstMount.browserWindow, firstMount.canvas, 'drop', {
        types: ['Files'], files: [{ name: 'first.png', type: 'image/png' } as File],
        dropEffect: 'none', getData: () => ''
      })
      await Promise.resolve()
    })
    expect(firstAdmissions).toHaveLength(1)
    expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([
      firstAdmissions[0]?.nodeId
    ])
    await firstMount.cleanup()

    const secondAdmissions: Array<Record<string, string>> = []
    const secondRevocations: Array<Record<string, string>> = []
    const secondMount = await mountResearchCanvas({
      sessionId,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/second.png',
        researchPreview: {
          async admitFinderFile(_file, identity) { secondAdmissions.push(identity); return null },
          async release() { return { ok: true } },
          async restore() { return null },
          revokeNode(value) { secondRevocations.push(value); return secondRevocation.promise }
        }
      }
    })
    try {
      await act(async () => {
        dispatchDrag(secondMount.browserWindow, secondMount.canvas, 'drop', {
          types: ['Files'], files: [{ name: 'second.png', type: 'image/png' } as File],
          dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(secondRevocations).toEqual([{
        sessionId, nodeId: firstAdmissions[0]?.nodeId
      }])
      expect(secondAdmissions).toEqual([])
      expect(secondMount.workspace.getSnapshot().files[0]).toMatchObject({
        path: '/workspace/second.png', previewEligible: false
      })

      firstAdmission.resolve({
        authorizationId: 'authorization-first', capabilityToken: 'capability-first',
        url: 'sherlock-preview://capability-first/', contentType: 'image/png', name: 'first.png'
      })
      await act(async () => {
        await firstAdmission.promise
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(firstRevocations).toEqual([{
        sessionId, nodeId: firstAdmissions[0]?.nodeId
      }])
      expect(JSON.parse(
        storage.getItem(`sherlock.research.canvas.files.v1:${sessionId}`) ?? '[]'
      )).toMatchObject([{
        path: '/workspace/second.png', previewEligible: false
      }])
    } finally {
      secondRevocation.resolve({ ok: false })
      await secondMount.cleanup()
    }
  })

  it('serializes simultaneous Finder drops so a same-path node keeps one durable identity', async () => {
    const admission = deferred<Record<string, string> | null>()
    const admissions: Array<{ file: File; identity: Record<string, string> }> = []
    const mounted = await mountResearchCanvas({
      sessionId: 'session-concurrent-finder',
      dshDesktop: {
        getPathForFile: () => '/workspace/chart.png',
        researchPreview: {
          admitFinderFile(file, identity) {
            admissions.push({ file, identity })
            return admission.promise
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode() { return { ok: true } }
        }
      }
    })
    try {
      const file = { name: 'chart.png', type: 'image/png' } as File
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [file], dropEffect: 'none', getData: () => ''
        }, { x: 100, y: 120 })
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [file], dropEffect: 'none', getData: () => ''
        }, { x: 460, y: 280 })
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)
      admission.resolve({
        authorizationId: 'authorization-stable', capabilityToken: 'capability-stable',
        url: 'sherlock-preview://capability-stable/', contentType: 'image/png', name: 'chart.png'
      })
      await act(async () => {
        await admission.promise
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(admissions).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files[0]).toMatchObject({
        id: admissions[0]?.identity.nodeId,
        authorizationId: 'authorization-stable',
        path: '/workspace/chart.png',
        x: 460,
        y: 280
      })
    } finally {
      await mounted.cleanup()
    }
  })

  it('admits only remaining canvas capacity and revokes an admitted node that loses its slot', async () => {
    const admission = deferred<Record<string, string> | null>()
    const admissions: Array<Record<string, string>> = []
    const revocations: Array<Record<string, string>> = []
    const initialFiles = Array.from({ length: 255 }, (_, index) => ({
      id: `existing-${index}`, path: `/workspace/existing-${index}.txt`,
      name: `existing-${index}.txt`, source: 'computer', x: index, y: index
    }))
    const mounted = await mountResearchCanvas({
      sessionId: 'session-capacity-finder',
      files: initialFiles,
      dshDesktop: {
        getPathForFile: (file) => `/workspace/${file.name}`,
        researchPreview: {
          admitFinderFile(_file, identity) {
            admissions.push(identity)
            return admission.promise
          },
          async release() { return { ok: true } },
          async restore() { return null },
          async revokeNode(value) { revocations.push(value); return { ok: true } }
        }
      }
    })
    try {
      const first = { name: 'first.png', type: 'image/png' } as File
      const second = { name: 'second.png', type: 'image/png' } as File
      await act(async () => {
        dispatchDrag(mounted.browserWindow, mounted.canvas, 'drop', {
          types: ['Files'], files: [first, second], dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)

      await act(async () => {
        ;(mounted.workspace as unknown as { setFiles(files: Array<Record<string, unknown>>): void })
          .setFiles([...mounted.workspace.getSnapshot().files, {
            id: 'fills-final-slot', path: '/workspace/fill.txt', name: 'fill.txt',
            source: 'computer', x: 0, y: 0
          }])
      })
      admission.resolve({
        authorizationId: 'authorization-orphan', capabilityToken: 'capability-orphan',
        url: 'sherlock-preview://capability-orphan/', contentType: 'image/png', name: 'first.png'
      })
      await act(async () => {
        await admission.promise
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(admissions).toHaveLength(1)
      expect(mounted.workspace.getSnapshot().files).toHaveLength(256)
      expect(mounted.workspace.getSnapshot().files.some(
        (node: Record<string, unknown>) => node.authorizationId === 'authorization-orphan'
      )).toBe(false)
      expect(revocations).toEqual([{
        sessionId: 'session-capacity-finder', nodeId: admissions[0]?.nodeId
      }])
    } finally {
      await mounted.cleanup()
    }
  })

  it('persists failed orphan cleanup and retries it on the next canvas mount without resurrecting a node', async () => {
    const storage = new MemoryStorage()
    const admission = deferred<Record<string, string> | null>()
    const cleanupAttempt = deferred<{ ok: boolean }>()
    const admissions: Array<Record<string, string>> = []
    const revocations: Array<Record<string, string>> = []
    const initialFiles = Array.from({ length: 255 }, (_, index) => ({
      id: `outbox-existing-${index}`, path: `/workspace/outbox-existing-${index}.txt`,
      name: `outbox-existing-${index}.txt`, source: 'computer', x: index, y: index
    }))
    const sessionId = 'session-orphan-outbox'
    const outboxKey = `sherlock.research.canvas.preview-revocations.v1:${sessionId}`
    const firstMount = await mountResearchCanvas({
      sessionId,
      files: initialFiles,
      storage,
      dshDesktop: {
        getPathForFile: () => '/workspace/orphan.png',
        researchPreview: {
          admitFinderFile(_file, identity) { admissions.push(identity); return admission.promise },
          async release() { return { ok: true } },
          async restore() { return null },
          revokeNode(value) { revocations.push(value); return cleanupAttempt.promise }
        }
      }
    })
    let firstCleaned = false
    try {
      const file = { name: 'orphan.png', type: 'image/png' } as File
      await act(async () => {
        dispatchDrag(firstMount.browserWindow, firstMount.canvas, 'drop', {
          types: ['Files'], files: [file], dropEffect: 'none', getData: () => ''
        })
        await Promise.resolve()
      })
      expect(admissions).toHaveLength(1)
      await act(async () => {
        ;(firstMount.workspace as unknown as { setFiles(files: Array<Record<string, unknown>>): void })
          .setFiles([...firstMount.workspace.getSnapshot().files, {
            id: 'outbox-fills-final-slot', path: '/workspace/outbox-fill.txt',
            name: 'outbox-fill.txt', source: 'computer', x: 0, y: 0
          }])
      })
      admission.resolve({
        authorizationId: 'authorization-outbox', capabilityToken: 'capability-outbox',
        url: 'sherlock-preview://capability-outbox/', contentType: 'image/png', name: 'orphan.png'
      })
      await act(async () => {
        await admission.promise
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      const orphanNodeId = revocations[0]?.nodeId
      expect(orphanNodeId).toBeTypeOf('string')
      expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([orphanNodeId])
      expect(firstMount.workspace.getSnapshot().files.some(
        (node: Record<string, unknown>) => node.authorizationId === 'authorization-outbox'
      )).toBe(false)

      cleanupAttempt.resolve({ ok: false })
      await act(async () => { await cleanupAttempt.promise; await Promise.resolve() })
      expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([orphanNodeId])
      await firstMount.cleanup()
      firstCleaned = true

      const persistedFiles = JSON.parse(
        storage.getItem(`sherlock.research.canvas.files.v1:${sessionId}`) ?? '[]'
      ) as Array<Record<string, unknown>>
      const retryCalls: Array<Record<string, string>> = []
      const secondMount = await mountResearchCanvas({
        sessionId,
        files: persistedFiles,
        storage,
        dshDesktop: { researchPreview: {
          async restore() { return null },
          async release() { return { ok: true } },
          async revokeNode(value) { retryCalls.push(value); return { ok: true } }
        } }
      })
      try {
        await act(async () => {
          await Promise.resolve()
          await Promise.resolve()
          await Promise.resolve()
        })
        expect(retryCalls).toEqual([{ sessionId, nodeId: orphanNodeId }])
        expect(JSON.parse(storage.getItem(outboxKey) ?? '[]')).toEqual([])
        expect(secondMount.workspace.getSnapshot().files).toHaveLength(256)
        expect(secondMount.workspace.getSnapshot().files.some(
          (node: Record<string, unknown>) => node.id === orphanNodeId ||
            node.authorizationId === 'authorization-outbox'
        )).toBe(false)
      } finally {
        await secondMount.cleanup()
      }
    } finally {
      if (!firstCleaned) {
        cleanupAttempt.resolve({ ok: false })
        await firstMount.cleanup()
      }
    }
  })

  it('keeps an authorized node visible until durable revocation succeeds and allows retry after remount', async () => {
    const storage = new MemoryStorage()
    const previewFile = {
      id: 'authorized-file', path: '/workspace/authorized.png', name: 'authorized.png',
      source: 'computer', authorizationId: 'authorization-delete', contentType: 'image/png',
      x: 100, y: 100, width: 320, height: 272
    }
    const firstAttempt = deferred<{ ok: boolean }>()
    const firstCalls: Array<Record<string, string>> = []
    const firstMount = await mountResearchCanvas({
      sessionId: 'session-delete-retry', files: [previewFile], storage,
      dshDesktop: { researchPreview: {
        async restore() { return null },
        async release() { return { ok: true } },
        revokeNode(value) { firstCalls.push(value); return firstAttempt.promise }
      } }
    })
    try {
      firstMount.workspace.setSelection({
        selectedNodeIds: ['authorized-file'], orderedFileIds: ['authorized-file']
      })
      ;(firstMount.canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        firstMount.browserWindow.dispatchEvent(new firstMount.browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
        firstMount.browserWindow.dispatchEvent(new firstMount.browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
        await Promise.resolve()
      })
      expect(firstCalls).toEqual([{ sessionId: 'session-delete-retry', nodeId: 'authorized-file' }])
      expect(firstMount.workspace.getSnapshot().files).toHaveLength(1)
      firstAttempt.resolve({ ok: false })
      await act(async () => { await firstAttempt.promise; await Promise.resolve() })
      expect(firstMount.workspace.getSnapshot().files).toHaveLength(1)
    } finally {
      await firstMount.cleanup()
    }

    const persistedFiles = JSON.parse(
      storage.getItem('sherlock.research.canvas.files.v1:session-delete-retry') ?? '[]'
    ) as Array<Record<string, unknown>>
    const outcomes: Array<'reject' | 'success'> = ['reject', 'success']
    const retryCalls: Array<Record<string, string>> = []
    const secondMount = await mountResearchCanvas({
      sessionId: 'session-delete-retry', files: persistedFiles, storage,
      dshDesktop: { researchPreview: {
        async restore() { return null },
        async release() { return { ok: true } },
        async revokeNode(value) {
          retryCalls.push(value)
          if (outcomes.shift() === 'reject') throw new Error('temporary IPC failure')
          return { ok: true }
        }
      } }
    })
    try {
      const deleteSelected = async () => {
        secondMount.workspace.setSelection({
          selectedNodeIds: ['authorized-file'], orderedFileIds: ['authorized-file']
        })
        ;(secondMount.canvas as unknown as { focus(): void }).focus()
        await act(async () => {
          secondMount.browserWindow.dispatchEvent(new secondMount.browserWindow.KeyboardEvent('keydown', {
            key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
          }))
          await Promise.resolve()
          await Promise.resolve()
        })
      }
      await deleteSelected()
      expect(secondMount.workspace.getSnapshot().files).toHaveLength(1)
      await deleteSelected()
      expect(retryCalls).toHaveLength(2)
      expect(secondMount.workspace.getSnapshot().files).toEqual([])
    } finally {
      await secondMount.cleanup()
    }
  })

  it('removes a persisted node after retrying a revoke whose first successful main mutation lost its IPC response', async () => {
    const storage = new MemoryStorage()
    const previewFile = {
      id: 'lost-response-file', path: '/workspace/lost-response.png', name: 'lost-response.png',
      source: 'computer', authorizationId: 'authorization-lost-response', contentType: 'image/png',
      x: 100, y: 100, width: 320, height: 272
    }
    let durableAuthorizationPresent = true
    const firstMount = await mountResearchCanvas({
      sessionId: 'session-lost-revoke-response', files: [previewFile], storage,
      dshDesktop: { researchPreview: {
        async restore() { return null },
        async release() { return { ok: true } },
        async revokeNode() {
          durableAuthorizationPresent = false
          throw new Error('response lost after durable revoke')
        }
      } }
    })
    try {
      firstMount.workspace.setSelection({
        selectedNodeIds: ['lost-response-file'], orderedFileIds: ['lost-response-file']
      })
      ;(firstMount.canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        firstMount.browserWindow.dispatchEvent(new firstMount.browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(durableAuthorizationPresent).toBe(false)
      expect(firstMount.workspace.getSnapshot().files).toHaveLength(1)
    } finally {
      await firstMount.cleanup()
    }

    const persistedFiles = JSON.parse(
      storage.getItem('sherlock.research.canvas.files.v1:session-lost-revoke-response') ?? '[]'
    ) as Array<Record<string, unknown>>
    const retryCalls: Array<Record<string, string>> = []
    const secondMount = await mountResearchCanvas({
      sessionId: 'session-lost-revoke-response', files: persistedFiles, storage,
      dshDesktop: { researchPreview: {
        async restore() { return null },
        async release() { return { ok: true } },
        async revokeNode(value) {
          retryCalls.push(value)
          return { ok: !durableAuthorizationPresent }
        }
      } }
    })
    try {
      secondMount.workspace.setSelection({
        selectedNodeIds: ['lost-response-file'], orderedFileIds: ['lost-response-file']
      })
      ;(secondMount.canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        secondMount.browserWindow.dispatchEvent(new secondMount.browserWindow.KeyboardEvent('keydown', {
          key: 'Delete', code: 'Delete', bubbles: true, cancelable: true
        }))
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(retryCalls).toEqual([{
        sessionId: 'session-lost-revoke-response', nodeId: 'lost-response-file'
      }])
      expect(secondMount.workspace.getSnapshot().files).toEqual([])
    } finally {
      await secondMount.cleanup()
    }
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
    ], 'compare these', [{ fileId: 'f1', offset: 8 }]) as string

    const html = renderToStaticMarkup(createElement(client.UserStyleBubble, {
      content: [{ type: 'text', text: prompt }],
      imageLoader: async () => '',
      t: (key: string) => key
    }))

    expect(html).toContain('data-research-message-file="f1"')
    expect(html).toContain('data-research-message-files="inline"')
    expect(html).toContain('private␟report.pdf')
    expect(html).toContain('compare ')
    expect(html).toContain('these')
    expect(html.indexOf('compare ')).toBeLessThan(html.lastIndexOf('private␟report.pdf'))
    expect(html.lastIndexOf('private␟report.pdf')).toBeLessThan(html.lastIndexOf('these'))
    expect(html).not.toContain(rawPath)
    expect(html).not.toContain('SHERLOCK_RESEARCH_FILES_V1')
  })

  it('moves inline Research tags through the composer clipboard without arrow controls', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      modules: { '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore } }
    })
    expect(client.ResearchFileTags).toBeUndefined()
    expect(client.serializeInputReferenceClipboard).toBeTypeOf('function')
    expect(client.parseInputReferenceClipboard).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.researchFileReference !== 'function' ||
        typeof client.serializeInputReferenceClipboard !== 'function' ||
        typeof client.parseInputReferenceClipboard !== 'function') return

    const SessionInputShell = client.SessionInputShell as new (deps: Record<string, unknown>) => any
    const shell = new SessionInputShell({ actx: {}, defaultSink: () => undefined })
    shell.setDraft('前后')
    shell.insertReference(
      client.researchFileReference({ id: 'f1', path: '/w/one.pdf', name: '/w/one.pdf' }),
      { start: 1, end: 1, draftRev: shell.snapshot.draftRev }
    )
    const copied = client.serializeInputReferenceClipboard(
      shell.snapshot.draft,
      shell.snapshot.occurrences,
      { start: 1, end: 2 }
    )
    expect(copied.text).toBe('one.pdf')
    expect(copied.payload).toBeTypeOf('string')

    shell.setDraft('前后', { start: 1, end: 2, insertedLength: 0 })
    const components = client.parseInputReferenceClipboard(copied.payload, copied.text)
    shell.pasteBegin(copied.text, { start: 2, end: 2 }, components)

    expect(shell.snapshot.draft).toBe('前后\uFFFC')
    expect(shell.snapshot.occurrences).toMatchObject([
      { source: 'research-file', offset: 2, label: 'one.pdf' }
    ])
  })

  it('accepts pasted Research tags only when their exact file identity belongs to the active InputBar session', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow,
      exposeInputBar: true,
      modules: {
        '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore },
        '@deepseek-ai/dsh-client-ui-primitives': {
          Tooltip: ({ children }: { children: unknown }) => children,
          IconPaperclipOutline16: () => createElement('span', { 'data-paperclip-icon': '' })
        },
        '@deepseek-ai/dsh-client-ui-attachment': {
          DropOverlay: () => null,
          AttachmentRail: () => null
        }
      }
    })
    const InputBar = client.__testInputBar as ComponentType<Record<string, unknown>>
    const SessionInputShell = client.SessionInputShell as new (deps: Record<string, unknown>) => any
    const researchFileReference = client.researchFileReference as ((
      file: { id: string; path: string; name: string }
    ) => Record<string, string>) | undefined
    expect(InputBar).toBeTypeOf('function')
    expect(SessionInputShell).toBeTypeOf('function')
    expect(researchFileReference).toBeTypeOf('function')
    if (typeof InputBar !== 'function' || typeof SessionInputShell !== 'function' ||
        typeof researchFileReference !== 'function') {
      restoreGlobals()
      return
    }
    const activeFile = {
      id: 'file-active', path: '/workspace/report.pdf', name: 'report.pdf',
      displayName: '章节/报告.pdf'
    }

    const paste = async (candidate: { id: string; path: string; name: string }) => {
      const host = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(host)
      const root = createRoot(host)
      const shell = new SessionInputShell({ actx: {}, defaultSink: () => undefined })
      shell.insertReference(researchFileReference(activeFile), {
        start: 0, end: 0, draftRev: shell.snapshot.draftRev
      })
      const payload = JSON.stringify({
        text: candidate.name,
        components: [{
          start: 0,
          end: candidate.name.length,
          reference: {
            source: 'research-file',
            ref: JSON.stringify(candidate),
            label: candidate.name,
            clipboardText: candidate.name
          }
        }]
      })
      const baseProps: Record<string, unknown> = {
        useSession: (select: (state: Record<string, unknown>) => unknown) => select({
          running: false, promptError: null, subagent: null, removed: false
        }),
        useInput: (select: (state: Record<string, unknown>) => unknown) => select(shell.snapshot),
        inputActions: { pruneImages: () => undefined },
        keyboard: shell,
        renderSlot: () => null,
        useNotices: (select: (state: null) => unknown) => select(null),
        useLexicon: (select: (state: Record<string, unknown>) => unknown) => select({}),
        useMenuLauncher: (select: (state: string | null) => unknown) => select(null),
        useProjection: (_name: string, select?: (value: undefined) => unknown) =>
          select === undefined ? undefined : select(undefined),
        researchFileReferences: [activeFile],
        sessionId: 'active-session',
        t: (key: string) => key,
        variant: 'composer'
      }
      try {
        await act(async () => { root.render(createElement(InputBar, baseProps)) })
        const textarea = host.querySelector('textarea') as HappyDOMHTMLElement | null
        expect(textarea).not.toBeNull()
        if (textarea === null) return shell.snapshot
        ;(textarea as unknown as HTMLTextAreaElement).setSelectionRange(
          shell.snapshot.draft.length,
          shell.snapshot.draft.length
        )
        const event = new browserWindow.Event('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'clipboardData', { value: {
          items: [],
          getData(type: string) {
            if (type === 'text/plain') return candidate.name
            if (type === 'application/x-sherlock-input-references') return payload
            return ''
          }
        } })
        await act(async () => { textarea.dispatchEvent(event); await Promise.resolve() })
        return shell.snapshot
      } finally {
        await act(async () => { root.unmount() })
        host.remove()
      }
    }

    try {
      const sameSession = await paste({
        id: activeFile.id, path: activeFile.path, name: activeFile.displayName
      })
      expect(sameSession.occurrences).toHaveLength(2)
      expect(sameSession.occurrences).toMatchObject([
        { source: 'research-file', label: '章节/报告.pdf' },
        { source: 'research-file', label: '章节/报告.pdf' }
      ])

      const forged = await paste({
        id: 'forged-id', path: '/workspace/report.pdf', name: activeFile.displayName
      })
      expect(forged.occurrences).toHaveLength(1)
      expect(forged.draft).toContain(activeFile.displayName)

      const crossSession = await paste({
        id: 'file-active', path: '/other-session/report.pdf', name: activeFile.displayName
      })
      expect(crossSession.occurrences).toHaveLength(1)
      expect(crossSession.draft).toContain(activeFile.displayName)
    } finally {
      restoreGlobals()
    }
  })

  it('moves an inline Research tag as one undoable drag transaction', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      modules: { '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore } }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    expect(client.researchFileReference).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.researchFileReference !== 'function') return

    const SessionInputShell = client.SessionInputShell as new (deps: Record<string, unknown>) => any
    const shell = new SessionInputShell({ actx: {}, defaultSink: () => undefined })
    shell.setDraft('AB')
    shell.insertReference(
      client.researchFileReference({ id: 'f1', path: '/w/one.pdf', name: '/w/one.pdf' }),
      { start: 1, end: 1, draftRev: shell.snapshot.draftRev }
    )
    const before = shell.snapshot
    const occurrenceId = before.occurrences[0].occurrenceId

    expect(shell.moveReferenceOccurrence).toBeTypeOf('function')
    expect(shell.moveReferenceOccurrence(occurrenceId, before.draft.length)).toBe(true)
    expect(shell.snapshot.draft).toBe('A B\uFFFC')
    expect(shell.snapshot.occurrences).toMatchObject([
      { occurrenceId, source: 'research-file', offset: 3, label: 'one.pdf' }
    ])

    shell.undo()
    expect(shell.snapshot.draft).toBe(before.draft)
    expect(shell.snapshot.occurrences).toEqual(before.occurrences)
  })

  it('selects and deletes exactly one inline Research tag with the keyboard', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      modules: { '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore } }
    })
    expect(client.selectedResearchReferenceOccurrenceId).toBeTypeOf('function')
    expect(client.deleteResearchReferenceOccurrence).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.researchFileReference !== 'function' ||
        typeof client.selectedResearchReferenceOccurrenceId !== 'function' ||
        typeof client.deleteResearchReferenceOccurrence !== 'function') return

    const SessionInputShell = client.SessionInputShell as new (deps: Record<string, unknown>) => any
    const shell = new SessionInputShell({ actx: {}, defaultSink: () => undefined })
    shell.setDraft('AB')
    shell.insertReference(
      client.researchFileReference({ id: 'f1', path: '/w/one.pdf', name: '/w/one.pdf' }),
      { start: 1, end: 1, draftRev: shell.snapshot.draftRev }
    )
    const before = shell.snapshot
    const occurrenceId = before.occurrences[0].occurrenceId

    expect(client.selectedResearchReferenceOccurrenceId(before.occurrences, {
      start: 1, end: 2
    })).toBe(occurrenceId)
    expect(client.selectedResearchReferenceOccurrenceId(before.occurrences, {
      start: 1, end: 1
    })).toBeNull()
    expect(client.deleteResearchReferenceOccurrence(shell, occurrenceId)).toBe(1)
    expect(shell.snapshot.draft).toBe('A B')
    expect(shell.snapshot.occurrences).toEqual([])

    shell.undo()
    expect(shell.snapshot.draft).toBe(before.draft)
    expect(shell.snapshot.occurrences).toEqual(before.occurrences)
  })

  it('draws the selected inline Research tag with the business-primary outline', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const inputBarCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/InputBar.module.css')
    )?.textContent ?? ''

    expect(inputBarCss).toContain(
      '.uV2eYG_chip[data-reference-source=research-file][data-selected=true]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}'
    )
  })

  it('rerenders a renamed selected Research tag in place without moving the caret', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow,
      exposeInputBar: true,
      modules: {
        '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore },
        '@deepseek-ai/dsh-client-ui-primitives': {
          Tooltip: ({ children }: { children: unknown }) => children,
          IconPaperclipOutline16: () => createElement('span', { 'data-paperclip-icon': '' })
        },
        '@deepseek-ai/dsh-client-ui-attachment': {
          DropOverlay: () => null,
          AttachmentRail: () => null
        }
      }
    })
    const InputBar = client.__testInputBar as ComponentType<Record<string, unknown>>
    const SessionInputShell = client.SessionInputShell as new (deps: Record<string, unknown>) => any
    expect(InputBar).toBeTypeOf('function')
    expect(SessionInputShell).toBeTypeOf('function')
    if (typeof InputBar !== 'function' || typeof SessionInputShell !== 'function' ||
        typeof client.researchFileReference !== 'function') {
      restoreGlobals()
      return
    }
    const shell = new SessionInputShell({ actx: {}, defaultSink: () => undefined })
    const sourceFile = {
      id: 'file-rename', path: '/workspace/source.pdf', name: 'source.pdf', source: 'computer'
    }
    shell.setDraft('前后')
    shell.insertReference(client.researchFileReference(sourceFile), {
      start: 1, end: 1, draftRev: shell.snapshot.draftRev
    })
    const occurrenceId = shell.snapshot.occurrences[0].occurrenceId
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const render = async (file: Record<string, unknown>) => {
      const props: Record<string, unknown> = {
        useSession: (select: (state: Record<string, unknown>) => unknown) => select({
          running: false, promptError: null, subagent: null, removed: false
        }),
        useInput: (select: (state: Record<string, unknown>) => unknown) =>
          useSyncExternalStore(
            shell.state.subscribe,
            () => select(shell.snapshot),
            () => select(shell.snapshot)
          ),
        inputActions: { pruneImages: () => undefined, submit: () => undefined },
        keyboard: shell,
        renderSlot: () => null,
        useNotices: (select: (state: null) => unknown) => select(null),
        useLexicon: (select: (state: Map<string, string[]>) => unknown) => select(new Map()),
        useMenuLauncher: (select: (state: null) => unknown) => select(null),
        useProjection: (_name: string, select?: (value: undefined) => unknown) =>
          select === undefined ? undefined : select(undefined),
        researchFileReferences: [file],
        sessionId: 'rename-session',
        t: (key: string) => key,
        variant: 'composer'
      }
      await act(async () => { root.render(createElement(InputBar, props)) })
    }

    try {
      await render(sourceFile)
      const initialChip = host.querySelector(
        `[data-occurrence="${occurrenceId}"]`
      ) as HappyDOMElement | null
      const textarea = host.querySelector('textarea') as HappyDOMHTMLElement | null
      expect(initialChip).not.toBeNull()
      expect(textarea).not.toBeNull()
      if (initialChip === null || textarea === null) return
      await act(async () => { click(browserWindow, initialChip) })
      expect(initialChip.getAttribute('data-selected')).toBe('true')
      const selection = {
        start: (textarea as unknown as HTMLTextAreaElement).selectionStart,
        end: (textarea as unknown as HTMLTextAreaElement).selectionEnd
      }
      const draft = shell.snapshot.draft
      const draftRev = shell.snapshot.draftRev

      await render({ ...sourceFile, displayName: '审阅版.pdf' })

      const renamedChip = host.querySelector(
        `[data-occurrence="${occurrenceId}"]`
      ) as HappyDOMElement | null
      expect(renamedChip?.getAttribute('data-selected')).toBe('true')
      expect(renamedChip?.querySelector('.uV2eYG_chipLabelText')?.textContent).toBe('审阅版.pdf')
      expect(shell.snapshot.draft).toBe(draft)
      expect(shell.snapshot.draftRev).toBe(draftRev)
      expect((textarea as unknown as HTMLTextAreaElement).selectionStart).toBe(selection.start)
      expect((textarea as unknown as HTMLTextAreaElement).selectionEnd).toBe(selection.end)
    } finally {
      await act(async () => { root.unmount() })
      host.remove()
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
        remove?.dispatchEvent(new browserWindow.PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, button: 0, pointerId: 17
        }))
      })
      expect(remove?.isConnected).toBe(true)
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

  it('renames generic files and artifacts inline with Enter, Escape, and blur', async () => {
    const storage = new MemoryStorage()
    const mounted = await mountResearchCanvas({
      sessionId: 'session-rename-canvas-cards',
      storage,
      files: [{
        id: 'file-a', path: '/w/source.txt', name: 'source.txt',
        source: 'computer', x: 120, y: 100
      }],
      artifacts: [{
        id: 'artifact-a', kind: 'assistant-result', messageId: 'm1',
        title: '助手回复', excerpt: 'Evidence', x: 500, y: 180
      }]
    })
    try {
      const { browserWindow, host, workspace } = mounted
      const rename = async (target: HappyDOMElement | null) => {
        expect(target).not.toBeNull()
        if (target === null) return null
        await act(async () => {
          target.dispatchEvent(new browserWindow.MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, clientX: 200, clientY: 120
          }))
        })
        const action = host.querySelector('[data-research-context-rename]')
        expect(action?.textContent).toBe('修改名称')
        await act(async () => { click(browserWindow, action) })
        return host.querySelector('[data-research-title-input]') as HappyDOMHTMLElement | null
      }

      const fileInput = await rename(host.querySelector('.rScV5Q_fileName'))
      expect(fileInput?.getAttribute('data-research-title-input')).toBe('file-a')
      expect(browserWindow.document.activeElement).toBe(fileInput)
      expect((fileInput as unknown as HTMLInputElement | null)?.selectionStart).toBe(0)
      expect((fileInput as unknown as HTMLInputElement | null)?.selectionEnd).toBe('source.txt'.length)
      if (fileInput === null) return
      await act(async () => {
        fileInput.dispatchEvent(new browserWindow.MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, clientX: 220, clientY: 130
        }))
      })
      expect(host.querySelector('[data-research-context-rename]')).toBeNull()
      Object.getOwnPropertyDescriptor(
        browserWindow.HTMLInputElement.prototype, 'value'
      )?.set?.call(fileInput, '  研究资料  ')
      await act(async () => {
        fileInput.dispatchEvent(new browserWindow.Event('input', { bubbles: true }))
        fileInput.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', bubbles: true, cancelable: true
        }))
      })
      expect(workspace.getSnapshot().files[0]).toMatchObject({
        name: 'source.txt', path: '/w/source.txt', displayName: '研究资料'
      })
      expect(host.querySelector('.rScV5Q_fileName')?.textContent).toBe('研究资料')

      const cancelled = await rename(host.querySelector('[data-research-node-title]'))
      expect(cancelled?.getAttribute('data-research-title-input')).toBe('artifact-a')
      if (cancelled === null) return
      Object.getOwnPropertyDescriptor(
        browserWindow.HTMLInputElement.prototype, 'value'
      )?.set?.call(cancelled, '不应保存')
      await act(async () => {
        cancelled.dispatchEvent(new browserWindow.Event('input', { bubbles: true }))
        cancelled.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          key: 'Escape', code: 'Escape', bubbles: true, cancelable: true
        }))
        cancelled.blur()
      })
      expect(workspace.getSnapshot().artifacts[0]).toMatchObject({ title: '助手回复' })

      const blurred = await rename(host.querySelector('[data-research-node-title]'))
      if (blurred === null) return
      Object.getOwnPropertyDescriptor(
        browserWindow.HTMLInputElement.prototype, 'value'
      )?.set?.call(blurred, '最终结论')
      await act(async () => {
        blurred.dispatchEvent(new browserWindow.Event('input', { bubbles: true }))
        blurred.blur()
      })
      expect(workspace.getSnapshot().artifacts[0]).toMatchObject({ title: '最终结论' })
      expect(JSON.parse(storage.getItem(
        'sherlock.research.canvas.artifacts.v1:session-rename-canvas-cards'
      ) ?? '[]')[0]).toMatchObject({ title: '最终结论' })
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

  it('claims and isolates proprietary drag types but validates their payloads on drop', async () => {
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
        for (const type of ['dragenter', 'dragover'] as const) {
          const before = bubbled[type]
          const event = dispatchDrag(browserWindow, canvas, type, dataTransfer)
          expect(event.defaultPrevented).toBe(true)
          expect(bubbled[type]).toBe(before)
        }
        const beforeDrop = bubbled.drop
        const drop = dispatchDrag(browserWindow, canvas, 'drop', dataTransfer)
        expect(drop.defaultPrevented).toBe(true)
        expect(bubbled.drop).toBe(beforeDrop)
      }

      const protectedFileDrag = {
        types: ['application/x-sherlock-file'],
        files: [],
        getData: () => '',
        dropEffect: 'none'
      }
      for (const type of ['dragenter', 'dragover'] as const) {
        const before = bubbled[type]
        const event = dispatchDrag(browserWindow, canvas, type, protectedFileDrag)
        expect(event.defaultPrevented).toBe(true)
        expect(bubbled[type]).toBe(before)
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
      const capturedPointers = new Set<number>()
      Object.defineProperties(canvas, {
        setPointerCapture: {
          configurable: true,
          value: (pointerId: number) => capturedPointers.add(pointerId)
        },
        hasPointerCapture: {
          configurable: true,
          value: (pointerId: number) => capturedPointers.has(pointerId)
        },
        releasePointerCapture: {
          configurable: true,
          value: (pointerId: number) => capturedPointers.delete(pointerId)
        }
      })
      ;(canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
        cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 1, x: 100, y: 100
        }))
      })
      expect(canvas.getAttribute('data-space-pressed')).toBe('true')
      expect(canvas.getAttribute('data-research-operation')).toBe('pan')
      expect(canvas.getAttribute('data-dragging')).toBe('true')
      expect(capturedPointers.has(1)).toBe(true)

      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointerleave', {
          pointerId: 1, x: 90, y: 90
        }))
      })
      expect(canvas.hasAttribute('data-space-pressed')).toBe(false)
      expect(canvas.getAttribute('data-research-operation')).toBe('pan')
      expect(canvas.getAttribute('data-dragging')).toBe('true')
      expect(capturedPointers.has(1)).toBe(true)

      await act(async () => {
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 1, x: 120, y: 110
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerenter', {
          pointerId: 1, x: 120, y: 110
        }))
      })
      expect(canvas.getAttribute('data-space-pressed')).toBe('true')

      await act(async () => {
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
      expect(capturedPointers.has(1)).toBe(false)
    } finally {
      await mounted.cleanup()
    }
  })

  it('shows the canvas frame only while Space is held and clears it on keyup or blur', async () => {
    const mounted = await mountResearchCanvas({ sessionId: 'session-space-frame' })
    try {
      const { browserWindow, canvas } = mounted
      ;(canvas as unknown as { focus(): void }).focus()
      expect(canvas.matches(':focus')).toBe(true)
      expect(canvas.hasAttribute('data-space-pressed')).toBe(false)

      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
      })
      expect(canvas.getAttribute('data-space-pressed')).toBe('true')

      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keyup', {
          code: 'Space', key: ' ', bubbles: true
        }))
      })
      expect(canvas.hasAttribute('data-space-pressed')).toBe(false)

      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
        browserWindow.dispatchEvent(new browserWindow.Event('blur'))
      })
      expect(canvas.hasAttribute('data-space-pressed')).toBe(false)
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps Command-wheel pointer anchoring on a blank canvas target', async () => {
    const mounted = await mountResearchCanvas({ sessionId: 'session-blank-wheel' })
    try {
      const { browserWindow, canvas, workspace } = mounted
      const wheel = new browserWindow.WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaY: -100
      })
      Object.defineProperties(wheel, {
        metaKey: { value: true },
        clientX: { value: 360 },
        clientY: { value: 260 }
      })
      await act(async () => { canvas.dispatchEvent(wheel) })
      const zoomed = workspace.getSnapshot().viewport
      expect(wheel.defaultPrevented).toBe(true)
      expect(zoomed.scale).toBeCloseTo(1.105170918, 8)
      expect((360 - zoomed.x) / zoomed.scale).toBeCloseTo(360, 7)
      expect((260 - zoomed.y) / zoomed.scale).toBeCloseTo(260, 7)
    } finally {
      await mounted.cleanup()
    }
  })

  it('registers a monotonic native wheel region and rejects stale, outside, or malformed native events', async () => {
    const regionUpdates: Array<Record<string, unknown>> = []
    const nativeListeners = new Set<(value: Record<string, unknown>) => void>()
    const resizeCallbacks: Array<() => void> = []
    const animationFrames = {
      callbacks: new Map<number, FrameRequestCallback>(),
      cancelled: [] as number[]
    }
    const releases: Array<Record<string, string>> = []
    let unsubscribes = 0
    const mounted = await mountResearchCanvas({
      sessionId: 'session-native-wheel',
      strictMode: true,
      files: [{
        id: 'native-html', name: 'native.html', source: 'computer',
        authorizationId: 'authorization-native-html', contentType: 'text/html',
        x: 100, y: 100, width: 480, height: 360, sizeMode: 'manual'
      }],
      resizeObserverCallbacks: resizeCallbacks,
      animationFrames,
      dshDesktop: {
        researchCanvasWheel: {
          setRegion(value) {
            regionUpdates.push({ ...value })
            return true
          },
          subscribe(listener) {
            nativeListeners.add(listener)
            return () => {
              if (nativeListeners.delete(listener)) unsubscribes += 1
            }
          }
        },
        researchPreview: {
          async restore(value) {
            return {
              authorizationId: value.authorizationId,
              capabilityToken: 'capability-native-html',
              url: 'sherlock-preview://capability-native-html/',
              contentType: 'text/html',
              name: 'native.html'
            }
          },
          async release(value) {
            releases.push(value)
            return { ok: true }
          }
        }
      }
    })
    try {
      const { canvas, workspace } = mounted
      const flushAnimationFrames = async () => {
        const callbacks = [...animationFrames.callbacks.values()]
        animationFrames.callbacks.clear()
        await act(async () => { callbacks.forEach((callback) => callback(0)) })
      }
      await act(async () => { resizeCallbacks.forEach((callback) => callback()) })
      expect(animationFrames.callbacks.size).toBe(1)
      await flushAnimationFrames()
      const initialUpdateCount = regionUpdates.length
      await act(async () => {
        resizeCallbacks.forEach((callback) => callback())
        resizeCallbacks.forEach((callback) => callback())
        mounted.browserWindow.dispatchEvent(new mounted.browserWindow.Event('resize'))
      })
      expect(animationFrames.callbacks.size).toBe(1)
      expect(regionUpdates).toHaveLength(initialUpdateCount)
      await flushAnimationFrames()
      expect(regionUpdates).toHaveLength(initialUpdateCount)
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(mounted.host.querySelector('[data-research-html-preview]')).not.toBeNull()
      const currentRegion = [...regionUpdates].reverse().find((value) => value.active === true)
      expect(currentRegion).toMatchObject({
        active: true, left: 0, top: 0, width: 800, height: 600
      })
      expect(currentRegion?.ownerId).toMatch(/^research-canvas-/)
      expect(currentRegion?.generation).toEqual(expect.any(Number))
      const generation = currentRegion?.generation as number
      const ownerId = currentRegion?.ownerId as string
      expect(regionUpdates.every((value, index, values) =>
        index === 0 || Number(value.generation) > Number(values[index - 1]?.generation)
      )).toBe(true)
      expect(nativeListeners.size).toBe(1)

      const initial = workspace.getSnapshot().viewport
      const sendNative = async (value: Record<string, unknown>) => {
        await act(async () => { nativeListeners.forEach((listener) => listener(value)) })
      }
      const valid = {
        generation,
        ownerId,
        clientX: 300,
        clientY: 150,
        deltaX: 0,
        deltaY: -100,
        deltaMode: 0
      }
      for (const invalid of [
        { ...valid, generation: generation - 1 },
        { ...valid, ownerId: 'retired-canvas' },
        { ...valid, clientX: 800 },
        { ...valid, clientY: Number.NaN },
        { ...valid, deltaY: 4_097 },
        { ...valid, deltaMode: 1 },
        { ...valid, unexpected: true }
      ]) {
        await sendNative(invalid)
        expect(workspace.getSnapshot().viewport).toEqual(initial)
      }

      await sendNative(valid)
      const zoomed = workspace.getSnapshot().viewport
      expect(zoomed.scale).toBeCloseTo(1.105170918, 8)
      expect((300 - zoomed.x) / zoomed.scale).toBeCloseTo(300, 7)
      expect((150 - zoomed.y) / zoomed.scale).toBeCloseTo(150, 7)

      Object.defineProperty(canvas, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ left: 100, top: 50, right: 700, bottom: 550, width: 600, height: 500 })
      })
      await act(async () => {
        resizeCallbacks.forEach((callback) => callback())
        mounted.browserWindow.dispatchEvent(new mounted.browserWindow.Event('resize'))
      })
      expect(animationFrames.callbacks.size).toBe(1)
      await flushAnimationFrames()
      const resizedRegion = [...regionUpdates].reverse().find((value) => value.active === true)
      expect(resizedRegion).toMatchObject({
        active: true, ownerId, left: 100, top: 50, width: 600, height: 500
      })
      expect(Number(resizedRegion?.generation)).toBeGreaterThan(generation)
      await sendNative(valid)
      expect(workspace.getSnapshot().viewport).toEqual(zoomed)
    } finally {
      const lastActive = [...regionUpdates].reverse().find((value) => value.active === true)
      await act(async () => { resizeCallbacks.forEach((callback) => callback()) })
      expect(animationFrames.callbacks.size).toBe(1)
      await mounted.cleanup()
      expect(animationFrames.callbacks.size).toBe(0)
      expect(animationFrames.cancelled.length).toBeGreaterThan(0)
      expect(unsubscribes).toBeGreaterThan(0)
      expect(nativeListeners.size).toBe(0)
      expect(regionUpdates.at(-1)).toMatchObject({
        active: false,
        ownerId: lastActive?.ownerId
      })
      expect(Number(regionUpdates.at(-1)?.generation))
        .toBeGreaterThan(Number(lastActive?.generation))
      expect(releases).toContainEqual({
        sessionId: 'session-native-wheel', nodeId: 'native-html',
        authorizationId: 'authorization-native-html', capabilityToken: 'capability-native-html'
      })
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

  it('renders four corner handles only for selected rich nodes at their normalized size', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-rich-resize-handles',
      files: [
        { id: 'generic', path: '/w/archive.doc', name: 'archive.doc', previewEligible: false, source: 'computer', x: 100, y: 100 }
      ],
      artifacts: [
        { id: 'assistant', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Evidence', x: 400, y: 200 }
      ],
      selection: {
        selectedNodeIds: ['generic', 'assistant'], orderedFileIds: ['generic']
      }
    })
    try {
      const { host } = mounted
      const generic = host.querySelector('[data-research-file-card="generic"]')
      const assistant = host.querySelector('[data-research-artifact-card="assistant"]')
      expect(generic).not.toBeNull()
      expect(assistant).not.toBeNull()
      expect(generic?.querySelector('[data-research-resize-handle]')).toBeNull()
      expect(assistant?.querySelectorAll('[data-research-resize-handle]')).toHaveLength(4)
      expect(Array.from(assistant?.querySelectorAll('[data-research-resize-handle]') ?? [])
        .map((handle) => handle.getAttribute('data-research-resize-handle')).sort())
        .toEqual(['ne', 'nw', 'se', 'sw'])
      expect((generic as HappyDOMHTMLElement | null)?.style.width).toBe('220px')
      expect((generic as HappyDOMHTMLElement | null)?.style.height).toBe('64px')
      expect((assistant as HappyDOMHTMLElement | null)?.style.width).toBe('360px')
      expect((assistant as HappyDOMHTMLElement | null)?.style.height).toBe('240px')
      expect(assistant?.querySelector('[data-research-node-title]')?.textContent).toBe('Answer')
    } finally {
      await mounted.cleanup()
    }
  })

  it('gives resize priority over group move and updates only its node live through zoom', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-live-rich-resize',
      artifacts: [
        { id: 'assistant-a', kind: 'assistant-result', messageId: 'm1', title: 'Answer A', excerpt: 'Evidence A', x: 200, y: 200 },
        { id: 'assistant-b', kind: 'assistant-result', messageId: 'm2', title: 'Answer B', excerpt: 'Evidence B', x: 600, y: 200 }
      ],
      selection: { selectedNodeIds: ['assistant-a', 'assistant-b'], orderedFileIds: [] },
      viewport: { scale: 2, x: 0, y: 0 }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const card = host.querySelector('[data-research-artifact-card="assistant-a"]')
      expect(card).not.toBeNull()
      if (card === null) return
      const handle = card.querySelector('[data-research-resize-handle="se"]')
      const shield = card.querySelector('[data-research-preview-shield]')
      expect(handle).not.toBeNull()
      expect(shield).not.toBeNull()
      if (handle === null || shield === null) return

      await act(async () => {
        handle.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 31, x: 760, y: 640
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 31, x: 840, y: 680
        }))
      })

      expect(canvas.getAttribute('data-dragging')).toBe('true')
      expect(canvas.getAttribute('data-research-operation')).toBe('resize')
      expect(browserWindow.getComputedStyle(shield).pointerEvents).toBe('auto')
      expect(canvas.querySelector('[data-node-dragging="true"]')).toBeNull()
      expect(workspace.getSnapshot().artifacts).toMatchObject([
        { id: 'assistant-a', x: 220, y: 210, width: 400, height: 260, sizeMode: 'manual' },
        { id: 'assistant-b', x: 600, y: 200, width: 360, height: 240, sizeMode: 'auto' }
      ])
      expect((card as HappyDOMHTMLElement).style.width).toBe('400px')
      expect((card as HappyDOMHTMLElement).style.height).toBe('260px')
    } finally {
      await mounted.cleanup()
    }
  })

  it('lets interactive rich preview bodies own pointer events until Space-pan is active', async () => {
    const mounted = await mountResearchCanvas({
      sessionId: 'session-rich-preview-ownership',
      files: [
        { id: 'html', path: '/w/model.html', name: 'model.html', mediaType: 'text/html', source: 'computer', x: 300, y: 220 }
      ],
      selection: { selectedNodeIds: ['html'], orderedFileIds: ['html'] }
    })
    try {
      const { browserWindow, canvas, host, workspace } = mounted
      const body = host.querySelector('[data-research-preview-body]')
      const handle = host.querySelector('[data-research-resize-handle="se"]')
      expect(body).not.toBeNull()
      expect(handle).not.toBeNull()
      if (body === null || handle === null) return

      let previewWheel: HappyDOMEvent | undefined
      await act(async () => {
        previewWheel = new browserWindow.WheelEvent('wheel', {
          bubbles: true, cancelable: true, deltaY: 30
        })
        body.dispatchEvent(previewWheel)
      })
      expect(previewWheel?.defaultPrevented).toBe(false)
      expect(workspace.getSnapshot().viewport).toEqual({ scale: 1, x: 0, y: 0 })

      await act(async () => {
        body.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 41, x: 300, y: 220
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 41, x: 340, y: 240
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 41, x: 340, y: 240
        }))
      })
      expect(workspace.getSnapshot().selection.selectedNodeIds).toEqual(['html'])
      expect(workspace.getSnapshot().files[0]).toMatchObject({ x: 300, y: 220 })
      expect(canvas.querySelector('[data-research-marquee]')).toBeNull()

      ;(canvas as unknown as { focus(): void }).focus()
      await act(async () => {
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
          code: 'Space', key: ' ', bubbles: true, cancelable: true
        }))
        handle.dispatchEvent(pointer(browserWindow, 'pointerdown', {
          pointerId: 42, x: 300, y: 220
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
          pointerId: 42, x: 330, y: 230
        }))
        canvas.dispatchEvent(pointer(browserWindow, 'pointerup', {
          pointerId: 42, x: 330, y: 230
        }))
        browserWindow.dispatchEvent(new browserWindow.KeyboardEvent('keyup', {
          code: 'Space', key: ' ', bubbles: true
        }))
      })
      expect(workspace.getSnapshot().viewport).toEqual({ scale: 1, x: 30, y: 10 })
      expect(workspace.getSnapshot().selection.selectedNodeIds).toEqual(['html'])
      expect(workspace.getSnapshot().files[0]).toMatchObject({
        x: 300, y: 220, width: 480, height: 360, sizeMode: 'auto'
      })
    } finally {
      await mounted.cleanup()
    }
  })

  it('persists one live resize at every pointer finish boundary', async () => {
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
      const sessionId = `session-deferred-resize-${finishMode}`
      const mounted = await mountResearchCanvas({
        sessionId,
        storage,
        artifacts: [
          { id: 'assistant', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Evidence', x: 200, y: 200 }
        ],
        selection: { selectedNodeIds: ['assistant'], orderedFileIds: [] }
      })
      let cleaned = false
      try {
        const { browserWindow, canvas, host, workspace } = mounted
        const handle = host.querySelector('[data-research-resize-handle="se"]')
        expect(handle).not.toBeNull()
        if (handle === null) return
        writes.length = 0

        await act(async () => {
          handle.dispatchEvent(pointer(browserWindow, 'pointerdown', {
            pointerId: 51, x: 380, y: 320
          }))
          canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
            pointerId: 51, x: 400, y: 330
          }))
          canvas.dispatchEvent(pointer(browserWindow, 'pointermove', {
            pointerId: 51, x: 420, y: 340
          }))
        })
        expect(workspace.getSnapshot().artifacts[0]).toMatchObject({
          x: 220, y: 210, width: 400, height: 260, sizeMode: 'manual'
        })
        expect(JSON.parse(values.get(`sherlock.research.canvas.artifacts.v1:${sessionId}`) ?? '[]')[0])
          .not.toMatchObject({ width: 400, height: 260 })
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
                pointerId: 51, x: 420, y: 340
              }))
            }
          })
        }

        expect(writes.map(({ key }) => key)).toEqual([
          `sherlock.research.canvas.files.v1:${sessionId}`,
          `sherlock.research.canvas.artifacts.v1:${sessionId}`,
          `sherlock.research.canvas.selection.v1:${sessionId}`
        ])
        expect(JSON.parse(values.get(`sherlock.research.canvas.artifacts.v1:${sessionId}`) ?? '[]')[0])
          .toMatchObject({ x: 220, y: 210, width: 400, height: 260, sizeMode: 'manual' })
      } finally {
        if (!cleaned) await mounted.cleanup()
      }
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

  it.each([
    { theme: 'light', width: 480, menu: 'slash' },
    { theme: 'dark', width: 352, menu: 'model' }
  ] as const)(
    'keeps the $menu menu above mounted Research messages at $width px in $theme mode',
    async ({ menu, theme, width }) => {
      const menuAction = vi.fn()
      const menuNode = createElement('div', {
        className: menu === 'slash' ? '_3e4SsG_menu' : '_7KE1Ra_menu',
        'data-test-composer-menu': menu
      }, createElement('button', {
        type: 'button',
        onClick: menuAction
      }, menu === 'slash' ? '命令' : '选择模型'))
      const mounted = await mountConversationRoot(
        'chat',
        { messageId: `m-${menu}`, text: '一条会与菜单重叠的消息。' },
        undefined,
        {
          sidebarWidth: width,
          ...(menu === 'slash'
            ? { overlay: menuNode }
            : { model: createElement('div', { 'data-test-model-selector': '' }, menuNode) })
        }
      )
      try {
        const { actions, browserWindow, detailsPortalHost, host } = mounted
        if (theme === 'dark') {
          browserWindow.document.body.setAttribute('data-ds-dark-theme', '')
        }

        const chatSeat = host.querySelector('[data-composer-seat]')
        const chatCard = host.querySelector('.uV2eYG_card')
        expect(chatSeat).not.toBeNull()
        expect(chatCard).not.toBeNull()
        if (chatSeat === null || chatCard === null) return
        const chatStyle = browserWindow.getComputedStyle(chatSeat)
        expect(chatStyle.position).toBe('sticky')
        expect(chatStyle.bottom).toBe('0px')
        expect(chatStyle.zIndex).toBe('7')
        expect(chatStyle.backgroundImage).toBe('none')
        expect(browserWindow.getComputedStyle(chatCard).background).not.toBe('none')

        await act(async () => { actions.setView('research') })
        const conversation = detailsPortalHost.querySelector('.sRp_conversation')
        const messages = detailsPortalHost.querySelector('.sRp_messages')
        const composer = detailsPortalHost.querySelector('.sRp_composer')
        const researchSeat = detailsPortalHost.querySelector('[data-composer-seat]')
        const researchCard = detailsPortalHost.querySelector('.uV2eYG_card')
        const mountedMenu = detailsPortalHost.querySelector('[data-test-composer-menu]')
        expect(conversation).not.toBeNull()
        expect(messages).not.toBeNull()
        expect(composer).not.toBeNull()
        expect(researchSeat).not.toBeNull()
        expect(researchCard).not.toBeNull()
        expect(mountedMenu).not.toBeNull()
        if (conversation === null || messages === null || composer === null ||
            researchSeat === null || researchCard === null || mountedMenu === null) return

        const composerStyle = browserWindow.getComputedStyle(composer)
        expect(composerStyle.position).toBe('sticky')
        expect(composerStyle.bottom).toBe('0px')
        expect(composerStyle.width).toBe('100%')
        expect(composerStyle.maxWidth).toBe('100%')
        expect(composerStyle.overflow).toBe('visible')
        expect(composerStyle.zIndex).toBe('21')
        expect(composerStyle.backgroundImage).toBe('none')
        expect(browserWindow.getComputedStyle(researchCard).background).not.toBe('none')
        expect(composer.closest('[data-conversation-scroll]')).toBe(conversation)
        expect(messages.contains(composer)).toBe(false)
        expect(composer.contains(researchSeat)).toBe(true)
        expect(detailsPortalHost.style.width).toBe(`${width}px`)

        if (menu === 'slash') {
          const overlay = detailsPortalHost.querySelector('.uV2eYG_overlayAnchor')
          expect(overlay).not.toBeNull()
          if (overlay !== null) {
            expect(browserWindow.getComputedStyle(overlay).zIndex).toBe('2')
          }
        }
        const menuButton = mountedMenu.querySelector('button')
        expect(menuButton).not.toBeNull()
        await act(async () => { click(browserWindow, menuButton) })
        expect(menuAction).toHaveBeenCalledOnce()
      } finally {
        await mounted.cleanup()
      }
    }
  )

  it('overlays the active Chat composer without reserving an opaque full-width footer row', async () => {
    const mounted = await mountConversationRoot('chat', {
      messageId: 'm-composer-overlay', text: '输入框后方仍应显示对话内容。'
    }, undefined, {
      composerHeight: 168
    })
    try {
      const { browserWindow, host } = mounted
      const root = host.querySelector('.wSkVaW_root')
      const scroll = host.querySelector('.wSkVaW_scrollBody')
      const centerHost = host.querySelector('[data-center-composer-host]')
      const portalHost = host.querySelector('[data-composer-portal-host]')
      const seat = host.querySelector('[data-composer-seat]')
      const card = host.querySelector('.uV2eYG_card')
      expect(root).not.toBeNull()
      expect(scroll).not.toBeNull()
      expect(centerHost).not.toBeNull()
      expect(portalHost).not.toBeNull()
      expect(seat).not.toBeNull()
      if (root === null || scroll === null || centerHost === null ||
          portalHost === null || seat === null) return

      const centerStyle = browserWindow.getComputedStyle(centerHost)
      expect(centerHost.parentElement).toBe(root)
      expect(scroll.parentElement).toBe(root)
      expect(centerStyle.position).toBe('absolute')
      expect(centerStyle.left).toBe('0px')
      expect(centerStyle.right).toBe('0px')
      expect(centerStyle.bottom).toBe('0px')
      expect(centerStyle.backgroundImage).toBe('none')
      expect(centerStyle.pointerEvents).toBe('none')
      expect(browserWindow.getComputedStyle(portalHost).pointerEvents).toBe('none')
      expect(card).not.toBeNull()
      if (card !== null) {
        expect(browserWindow.getComputedStyle(card).pointerEvents).toBe('auto')
      }
      expect(browserWindow.getComputedStyle(seat).backgroundImage).toBe('none')
      expect((scroll as HappyDOMHTMLElement).style
        .getPropertyValue('--dsh-composer-height')).toBe('168px')
      expect(browserWindow.getComputedStyle(scroll).scrollPaddingBottom).toBe('168px')

    } finally {
      await mounted.cleanup()
    }
  })

  it('lets Trajectory continue behind the floating composer without the Chat tail spacer', async () => {
    const mounted = await mountConversationRoot('trajectory', undefined, undefined, {
      composerHeight: 168
    })
    try {
      const { browserWindow, host } = mounted
      const scroll = host.querySelector('.wSkVaW_scrollBody')
      const trajectory = host.querySelector(
        '[data-test-trajectory-view][data-conversation-composer-overlay]'
      )
      const centerHost = host.querySelector('[data-center-composer-host]')
      expect(scroll).not.toBeNull()
      expect(trajectory).not.toBeNull()
      expect(centerHost).not.toBeNull()
      if (scroll === null || trajectory === null || centerHost === null) return

      expect(browserWindow.getComputedStyle(centerHost).backgroundImage).toBe('none')
      expect(browserWindow.getComputedStyle(scroll).scrollPaddingBottom).toBe('')
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps bounded composer takeover surfaces interactive above the click-through host', async () => {
    const action = vi.fn()
    const mounted = await mountConversationRoot('chat', undefined, undefined, {
      composer: createElement('div', null,
        createElement('div', { className: 'Mbwy4a_frame' },
          createElement('button', { onClick: action }, '回答问题')),
        createElement('div', { className: 'LVzXQa_frame' },
          createElement('button', { onClick: action }, '确认计划')),
        createElement('div', { className: 'bqrRRG_root' },
          createElement('button', { onClick: action }, '批准命令'))
      )
    })
    try {
      const { browserWindow, host } = mounted
      const takeoverSurfaces = [
        host.querySelector('.Mbwy4a_frame'),
        host.querySelector('.LVzXQa_frame'),
        host.querySelector('.bqrRRG_root')
      ]
      for (const surface of takeoverSurfaces) {
        expect(surface).not.toBeNull()
        if (surface !== null) {
          expect(browserWindow.getComputedStyle(surface).pointerEvents).toBe('auto')
          await act(async () => { click(browserWindow, surface.querySelector('button')) })
        }
      }
      expect(action).toHaveBeenCalledTimes(3)
    } finally {
      await mounted.cleanup()
    }
  })

  it('observes the conversation scrollport so a pinned tail follows bottom-panel resizing', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
      'utf8'
    )
    expect(source).toMatch(
      /const el = scrollerOf\(local\);[\s\S]*?observer\.observe\(column\);\s*observer\.observe\(el\);/
    )
  })

  it('keeps Research message actions clickable when no composer menu is mounted', async () => {
    const mounted = await mountConversationRoot('research', {
      messageId: 'm-without-menu', text: '可以加入画布的有效回复。'
    })
    try {
      const { browserWindow, detailsPortalHost, workspace } = mounted
      await act(async () => { workspace.setCanvasSize({ width: 800, height: 600 }) })
      expect(detailsPortalHost.querySelector('.uV2eYG_overlayAnchor')).toBeNull()
      const add = detailsPortalHost.querySelector('button[aria-label="添加到画布"]')
      expect(add).not.toBeNull()
      await act(async () => { click(browserWindow, add) })
      expect(workspace.getSnapshot().artifacts).toMatchObject([{
        messageId: 'm-without-menu', kind: 'assistant-result', x: 400, y: 300
      }])
    } finally {
      await mounted.cleanup()
    }
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
    expect(researchCss).toMatch(
      /\.rScV5Q_root\{[^}]*overflow:clip[^}]*contain:paint[^}]*isolation:isolate[^}]*\}/
    )
    expect(researchCss).toMatch(
      /\.rScV5Q_root\[data-space-pressed=true\]:after\{[^}]*z-index:100[^}]*pointer-events:none[^}]*\}/
    )
    expect(researchCss).toMatch(/\.rScV5Q_contentLayer\{[^}]*z-index:0[^}]*\}/)
    expect(researchCss).not.toContain('.rScV5Q_root:focus-visible')
    expect(researchCss).not.toMatch(/\.rScV5Q_root\[data-file-drop-active=true\]\{[^}]*box-shadow/)
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
    const panelCss = styles
      .filter(({ textContent }) => textContent.includes('.sRp_root') || textContent.includes('.sRp_composer'))
      .map(({ textContent }) => textContent)
      .join('\n')

    expect(panelCss).toContain('.sRp_root{')
    expect(panelCss).toContain('container-type:inline-size')
    expect(panelCss).toContain('.sRp_conversation{min-width:0')
    expect(panelCss).toContain('.sRp_messages{min-width:0')
    expect(panelCss).toContain('.sRp_composer{')
    expect(panelCss).toContain('max-width:100%')
    expect(panelCss).toContain('overflow-wrap:anywhere')
    expect(panelCss).toContain('@container (max-width:360px)')

    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const style = browserWindow.document.createElement('style')
    style.textContent = panelCss ?? ''
    browserWindow.document.head.append(style)
    browserWindow.document.body.innerHTML = [
      '<section class="sRp_root">',
      '<div class="sRp_body sRp_conversation">',
      '<div class="sRp_composer">',
      '<div class="uV2eYG_card">',
      '<div class="dsh-paperclip-wrap"><div class="dsh-paperclip-tip"></div></div>',
      '</div>',
      '</div>',
      '</div>',
      '</section>'
    ].join('')

    const composer = browserWindow.document.querySelector('.sRp_composer')
    const attachmentWrap = browserWindow.document.querySelector('.dsh-paperclip-wrap')
    const attachmentTip = browserWindow.document.querySelector('.dsh-paperclip-tip')
    expect(composer).not.toBeNull()
    expect(attachmentWrap).not.toBeNull()
    expect(attachmentTip).not.toBeNull()
    if (composer === null || attachmentWrap === null || attachmentTip === null) return

    expect(browserWindow.getComputedStyle(composer).overflow).toBe('visible')
    expect(browserWindow.getComputedStyle(attachmentWrap).position).toBe('static')
    expect(browserWindow.getComputedStyle(attachmentTip).left).toBe('12px')
    expect(browserWindow.getComputedStyle(attachmentTip).transform).toBe('none')
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

  it('never reserves a separate accessory row for inline Research file tags', async () => {
    const mounted = await mountConversationRoot('research')
    try {
      const { browserWindow, workspace } = mounted
      const composer = () => browserWindow.document.querySelector('[data-test-composer-bar]')

      expect(composer()?.getAttribute('data-test-composer-has-accessory')).toBe('false')
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

  it('keeps shared composer height and horizontal geometry across Chat and Research portals', async () => {
    const mounted = await mountConversationRoot('chat')
    try {
      const { actions, browserWindow, host, input, detailsPortalHost } = mounted
      const textarea = host.querySelector('textarea')
      const backdrop = host.querySelector('[data-input-backdrop]')
      const mirror = host.querySelector('[data-input-mirror]')
      expect(textarea).not.toBeNull()
      expect(backdrop).not.toBeNull()
      expect(mirror).not.toBeNull()
      if (!(textarea instanceof browserWindow.HTMLTextAreaElement) ||
          backdrop === null || mirror === null) return
      const centerComposerHost = host.querySelector('[data-center-composer-host]')
      const composerPortalHost = host.querySelector('[data-composer-portal-host]')
      const composerSeat = host.querySelector('[data-composer-seat]')
      const composerRoot = host.querySelector('.uV2eYG_root')
      const composerCard = host.querySelector('.uV2eYG_card')
      const composerRow = host.querySelector('.uV2eYG_row')
      expect(centerComposerHost).not.toBeNull()
      expect(composerPortalHost).not.toBeNull()
      expect(composerSeat).not.toBeNull()
      expect(composerRoot).not.toBeNull()
      expect(composerCard).not.toBeNull()
      expect(composerRow).not.toBeNull()
      if (centerComposerHost === null || composerPortalHost === null ||
          composerSeat === null || composerRoot === null ||
          composerCard === null || composerRow === null) return
      expect(centerComposerHost.contains(composerPortalHost)).toBe(true)
      expect(composerPortalHost.contains(composerSeat)).toBe(true)
      expect(composerSeat.contains(composerRoot)).toBe(true)
      expect(composerRoot.contains(composerCard)).toBe(true)
      expect(composerCard.contains(composerRow)).toBe(true)
      expect(composerCard.contains(textarea)).toBe(true)

      await act(async () => { input.update({ draft: '第一行\n第二行' }) })

      const initialStyle = browserWindow.getComputedStyle(textarea)
      const horizontalGeometry = {
        width: initialStyle.width,
        maxWidth: initialStyle.maxWidth,
        paddingLeft: initialStyle.paddingLeft,
        paddingRight: initialStyle.paddingRight
      }
      expect(initialStyle.paddingBottom).toBe('8px')
      expect(browserWindow.getComputedStyle(backdrop).paddingBottom).toBe('8px')
      expect(browserWindow.getComputedStyle(mirror).paddingBottom).toBe('8px')

      await act(async () => { actions.setView('research') })
      const researchTextarea = browserWindow.document.querySelector('textarea')
      expect(researchTextarea).toBe(textarea)
      const researchPortalHost = detailsPortalHost.querySelector('[data-composer-portal-host]')
      const researchSeat = detailsPortalHost.querySelector('[data-composer-seat]')
      const researchRoot = detailsPortalHost.querySelector('.uV2eYG_root')
      const researchCard = detailsPortalHost.querySelector('.uV2eYG_card')
      const researchRow = detailsPortalHost.querySelector('.uV2eYG_row')
      expect(researchPortalHost).toBe(composerPortalHost)
      expect(researchSeat).not.toBeNull()
      expect(researchRoot).not.toBeNull()
      expect(researchCard).not.toBeNull()
      expect(researchRow).not.toBeNull()
      if (researchPortalHost === null || researchSeat === null || researchRoot === null ||
          researchCard === null || researchRow === null) return
      expect(detailsPortalHost.contains(researchPortalHost)).toBe(true)
      expect(researchPortalHost.contains(researchSeat)).toBe(true)
      expect(researchSeat.contains(researchRoot)).toBe(true)
      expect(researchRoot.contains(researchCard)).toBe(true)
      expect(researchCard.contains(researchRow)).toBe(true)
      expect(researchCard.contains(textarea)).toBe(true)
      expect(detailsPortalHost.querySelector('[data-input-backdrop]')).not.toBeNull()
      expect(detailsPortalHost.querySelector('[data-input-mirror]')).not.toBeNull()
      const researchBackdrop = detailsPortalHost.querySelector('[data-input-backdrop]')
      const researchMirror = detailsPortalHost.querySelector('[data-input-mirror]')
      if (researchBackdrop === null || researchMirror === null) return
      expect(researchBackdrop?.querySelectorAll('[data-research-file-tag]')).toHaveLength(2)
      expect(researchBackdrop?.textContent).toContain('第二行')
      expect(researchBackdrop?.textContent).toContain('evidence.pdf')
      expect(researchBackdrop?.textContent).toContain('unresolved.txt')
      const researchStyle = browserWindow.getComputedStyle(textarea)
      expect({
        width: researchStyle.width,
        maxWidth: researchStyle.maxWidth,
        paddingLeft: researchStyle.paddingLeft,
        paddingRight: researchStyle.paddingRight
      }).toEqual(horizontalGeometry)
      expect(researchStyle.paddingBottom).toBe('8px')
      expect(browserWindow.getComputedStyle(researchBackdrop).paddingBottom).toBe('8px')
      expect(browserWindow.getComputedStyle(researchMirror).paddingBottom).toBe('8px')
    } finally {
      await mounted.cleanup()
    }
  })

  it('renders the dependency InputBar layers with synchronized shared spacing', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const primitives = {
      Tooltip: ({ children }: { children: unknown }) => children
    }
    const attachments = {
      DropOverlay: () => null,
      AttachmentRail: () => null
    }
    const client = await loadClientBundle('dsh-client-ui-conversation', undefined, {
      document: browserWindow.document,
      window: browserWindow,
      exposeInputBar: true,
      modules: {
        '@deepseek-ai/dsh-client-ui-primitives': primitives,
        '@deepseek-ai/dsh-client-ui-attachment': attachments
      }
    })
    const InputBar = client.__testInputBar as ComponentType<Record<string, unknown>>
    expect(InputBar).toBeTypeOf('function')
    if (typeof InputBar !== 'function') {
      restoreGlobals()
      return
    }
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const inputState = {
      draft: '第一行\\n第二行',
      imageIds: [],
      occurrences: [],
      phase: 'idle',
      queue: []
    }
    const baseProps: Record<string, unknown> = {
      useSession: (select: (state: Record<string, unknown>) => unknown) => select({
        running: false,
        promptError: null,
        subagent: null,
        removed: false
      }),
      useInput: (select: (state: typeof inputState) => unknown) => select(inputState),
      inputActions: {},
      keyboard: { snapshot: inputState },
      renderSlot: () => null,
      useNotices: (select: (state: null) => unknown) => select(null),
      useLexicon: (select: (state: Record<string, unknown>) => unknown) => select({}),
      useMenuLauncher: (select: (state: string | null) => unknown) => select(null),
      useProjection: (
        _name: string,
        select?: (value: undefined) => unknown
      ) => select === undefined ? undefined : select(undefined),
      sessionId: 'session-inputbar-integration',
      t: (key: string) => key,
      variant: 'composer'
    }
    try {
      await act(async () => {
        root.render(createElement(InputBar, baseProps))
      })
      const rootLayer = host.querySelector('.uV2eYG_root')
      const cardLayer = host.querySelector('.uV2eYG_card')
      const backdropLayer = host.querySelector('[data-input-backdrop]')
      const mirrorLayer = host.querySelector('[data-input-mirror]')
      const textarea = host.querySelector('textarea')
      const rowLayer = host.querySelector('.uV2eYG_row')
      expect(rootLayer).not.toBeNull()
      expect(cardLayer).not.toBeNull()
      expect(backdropLayer).not.toBeNull()
      expect(mirrorLayer).not.toBeNull()
      expect(textarea).not.toBeNull()
      expect(rowLayer).not.toBeNull()
      if (rootLayer === null || cardLayer === null || backdropLayer === null ||
          mirrorLayer === null || textarea === null || rowLayer === null) return
      expect(rootLayer.contains(cardLayer)).toBe(true)
      expect(cardLayer.contains(backdropLayer)).toBe(true)
      expect(cardLayer.contains(textarea)).toBe(true)
      expect(cardLayer.contains(mirrorLayer)).toBe(true)
      expect(cardLayer.contains(rowLayer)).toBe(true)
      const textareaStyle = browserWindow.getComputedStyle(textarea)
      const sharedStyle = browserWindow.getComputedStyle(backdropLayer)
      const mirrorStyle = browserWindow.getComputedStyle(mirrorLayer)
      expect(textareaStyle.paddingBottom).toBe('8px')
      expect(sharedStyle.paddingBottom).toBe('8px')
      expect(mirrorStyle.paddingBottom).toBe('8px')
      expect(sharedStyle.paddingLeft).toBe(textareaStyle.paddingLeft)
      expect(sharedStyle.paddingRight).toBe(textareaStyle.paddingRight)

      await act(async () => {
        root.render(createElement(InputBar, { ...baseProps, variant: 'hero' }))
      })
      const heroMirror = host.querySelector('.uV2eYG_hero [data-input-mirror]')
      expect(heroMirror).not.toBeNull()
      const heroRule = Array.from(browserWindow.document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .find((rule): rule is HappyDOMCSSStyleRule =>
          rule instanceof browserWindow.CSSStyleRule &&
          rule.cssText.includes('.uV2eYG_hero .uV2eYG_mirror')
        )
      expect(heroRule?.style.getPropertyValue('min-height'))
        .toBe('60px')
    } finally {
      await act(async () => { root.unmount() })
      restoreGlobals()
    }
  })

  it('keeps the Hero mirror tall enough for the shared multiline decoration', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const inputBarCss = styles.find(({ pluginCss }) =>
      pluginCss?.endsWith('/InputBar.module.css')
    )?.textContent ?? ''
    expect(inputBarCss).toContain(
      '.uV2eYG_input,.uV2eYG_mirror,.uV2eYG_backdrop{box-sizing:border-box;font-family:\"DshChipCell\", var(--dsw-font-family);font-size:inherit;line-height:inherit;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;padding:4px 12px 8px 16px}'
    )
    expect(inputBarCss).toContain('.uV2eYG_hero .uV2eYG_mirror{min-height:60px}')
  })

  it('keeps the main Chat composer outside the scrolling message region', async () => {
    const mounted = await mountConversationRoot('chat')
    try {
      const { host } = mounted
      const scroll = host.querySelector('[data-conversation-scroll]')
      const centerComposerHost = host.querySelector('[data-center-composer-host]')
      const composerSeat = host.querySelector('[data-composer-seat]')

      expect(scroll).not.toBeNull()
      expect(centerComposerHost).not.toBeNull()
      expect(composerSeat).not.toBeNull()
      if (scroll === null || centerComposerHost === null || composerSeat === null) return
      expect(scroll.contains(centerComposerHost)).toBe(false)
      expect(centerComposerHost.parentElement).toBe(scroll.parentElement)
      expect(centerComposerHost.contains(composerSeat)).toBe(true)
    } finally {
      await mounted.cleanup()
    }
  })

  it('keeps the blank new-conversation composer centered after docking active chats', async () => {
    const styles: InjectedStyle[] = []
    await loadClientBundle('dsh-client-ui-conversation', undefined, { styles })
    const layoutCss = styles
      .map(({ textContent }) => textContent)
      .filter((textContent) =>
        textContent.includes('.wSkVaW_composerHero') ||
        textContent.includes('[data-center-composer-host]')
      )
      .join('\n')

    expect(layoutCss).toContain(
      '.wSkVaW_root[data-phase=hero]>[data-center-composer-host]{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}'
    )
    expect(layoutCss).toContain(
      '.wSkVaW_root[data-phase=hero]>[data-center-composer-host]>[data-composer-portal-host]{width:100%}'
    )
    expect(layoutCss).toContain(
      '.wSkVaW_root[data-phase=hero] .wSkVaW_composerHero{box-sizing:border-box;width:100%;max-width:812px}'
    )
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
