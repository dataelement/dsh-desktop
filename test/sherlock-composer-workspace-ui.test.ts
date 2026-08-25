import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window } from 'happy-dom'
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
  dshDesktop?: { showItemInFolder(path: string): Promise<{ ok: boolean }> },
  options?: {
    document?: unknown
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

  runInNewContext(source, {
    window: {
      dshDesktop,
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    },
    document: styleDocument
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (options?.modules?.[id] !== undefined) return options.modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
}

describe('Sherlock workspace and composer controls', () => {
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
