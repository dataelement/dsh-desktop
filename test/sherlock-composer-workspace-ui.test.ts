import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window, type Element as HappyDOMElement, type Event as HappyDOMEvent } from 'happy-dom'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>
type ComponentType<Props> = (props: Props) => unknown
type ReactNode = unknown

const requireModule = createRequire(import.meta.url)
const { createElement } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
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
    localStorage: options?.window?.localStorage
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (options?.modules?.[id] !== undefined) return options.modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
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

async function mountResearchCanvas(options: {
  sessionId: string
  files?: Array<Record<string, unknown>>
  artifacts?: Array<Record<string, unknown>>
  selection?: { selectedNodeIds: string[]; orderedFileIds: string[] }
  viewport?: { scale: number; x: number; y: number }
}) {
  const browserWindow = new Window({ url: 'https://sherlock.local/' })
  const { sessionId } = options
  browserWindow.localStorage.setItem(
    `sherlock.research.canvas.files.v1:${sessionId}`,
    JSON.stringify(options.files ?? [])
  )
  browserWindow.localStorage.setItem(
    `sherlock.research.canvas.artifacts.v1:${sessionId}`,
    JSON.stringify(options.artifacts ?? [])
  )
  browserWindow.localStorage.setItem(
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
  const researchWorkspaces = new Registry(browserWindow.localStorage)
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
      options: { id: string; order: number; label: () => string }
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
    expect(registrations[0]?.component).toBe(client.ResearchCanvas)
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

      canvas.focus()
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
      canvas.focus()
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

  it('places a same-session research artifact through the shared workspace drop path', async () => {
    const mounted = await mountResearchCanvas({ sessionId: 'session-artifact-drop' })
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
        const drop = dispatchDrag(browserWindow, canvas, 'drop', transfer, { x: 240, y: 160 })
        expect(drop.defaultPrevented).toBe(true)
      })

      expect(workspace.getSnapshot().artifacts).toMatchObject([
        { messageId: 'm1', kind: 'assistant-result', x: 240, y: 160 }
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
