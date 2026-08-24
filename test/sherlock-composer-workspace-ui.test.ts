import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
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

  const styleDocument = options?.styles === undefined
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
      }

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
})
