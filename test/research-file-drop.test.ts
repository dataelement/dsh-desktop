import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { safePathForFile } from '../src/preload/research-file-path'

type ClientBundle = Record<string, any>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)

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
  modules: Record<string, unknown> = {}
): Promise<ClientBundle> {
  const source = await readFile(
    `node_modules/@deepseek-ai/${packageName}/lib/client.js`,
    'utf8'
  )
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  let descriptor: BundleDescriptor | undefined

  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    },
    document: undefined
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register`)

  return descriptor.factory((id) => {
    if (modules[id] !== undefined) return modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
}

const loadConversationClient = () =>
  loadClientBundle('dsh-client-ui-conversation')

describe('Research canvas file drops', () => {
  it('exposes Electron webUtils.getPathForFile through the existing desktop bridge', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')

    expect(preload).toContain("import { contextBridge, ipcRenderer, webUtils } from 'electron'")
    expect(preload).toContain('getPathForFile: (file: File): string =>')
    expect(preload).toContain('safePathForFile(file, webUtils.getPathForFile)')
  })

  it('returns a resolved Electron file path and safely absorbs resolver failures', () => {
    const file = { name: 'report.pdf' } as File

    expect(safePathForFile(file, () => '/tmp/report.pdf')).toBe('/tmp/report.pdf')
    expect(safePathForFile(file, () => undefined)).toBe('')
    expect(safePathForFile(file, () => { throw new Error('unavailable') })).toBe('')
  })

  it('parses only bounded Sherlock file drag payloads', async () => {
    const client = await loadConversationClient()
    expect(client.parseSherlockFileDrag).toBeTypeOf('function')
    if (typeof client.parseSherlockFileDrag !== 'function') return

    expect(client.parseSherlockFileDrag(
      '{"path":"/w/report.pdf","name":"report.pdf"}'
    )).toEqual({ path: '/w/report.pdf', name: 'report.pdf', source: 'sherlock' })
    expect(client.parseSherlockFileDrag('not-json')).toBeNull()
    expect(client.parseSherlockFileDrag('{"path":42,"name":"x"}')).toBeNull()
    expect(client.parseSherlockFileDrag(JSON.stringify({ name: 'x'.repeat(513) }))).toBeNull()
  })

  it('rejects an oversized raw Sherlock file drag payload before parsing', async () => {
    const client = await loadConversationClient()
    expect(client.parseSherlockFileDrag).toBeTypeOf('function')
    if (typeof client.parseSherlockFileDrag !== 'function') return

    expect(client.parseSherlockFileDrag(JSON.stringify({
      name: 'x',
      ignored: 'x'.repeat(2_048)
    }))).toBeNull()
  })

  it('reads Finder files and gives the Sherlock MIME payload precedence', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasDropFiles).toBeTypeOf('function')
    if (typeof client.researchCanvasDropFiles !== 'function') return
    const transfer = {
      files: [{ name: 'finder.pdf', type: 'application/pdf' }],
      getData: (type: string) => type === 'application/x-sherlock-file'
        ? '{"path":"/w/internal.md","name":"internal.md"}'
        : '',
      types: ['Files', 'application/x-sherlock-file']
    }

    expect(client.researchCanvasDropFiles(transfer, () => '/tmp/finder.pdf')).toEqual([
      { path: '/w/internal.md', name: 'internal.md', source: 'sherlock' }
    ])

    const finderTransfer = {
      files: [
        { name: 'local.pdf', type: 'application/pdf' },
        { name: 'README', type: '' }
      ],
      getData: () => '',
      types: ['Files']
    }
    const paths = ['/tmp/local.pdf', '']
    expect(client.researchCanvasDropFiles(
      finderTransfer,
      () => paths.shift() ?? ''
    )).toEqual([
      {
        path: '/tmp/local.pdf', name: 'local.pdf',
        mediaType: 'application/pdf', source: 'computer'
      },
      { name: 'README', source: 'computer' }
    ])
  })

  it('owns only Finder files and the exact Sherlock MIME type', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasOwnsFileDrag).toBeTypeOf('function')
    if (typeof client.researchCanvasOwnsFileDrag !== 'function') return

    expect(client.researchCanvasOwnsFileDrag(['Files'])).toBe(true)
    expect(client.researchCanvasOwnsFileDrag([
      'application/x-sherlock-file'
    ])).toBe(true)
    expect(client.researchCanvasOwnsFileDrag(['text/plain'])).toBe(false)
  })

  it('places dropped files in world coordinates and repositions a repeated path', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasWorldPoint).toBeTypeOf('function')
    expect(client.placeResearchCanvasFiles).toBeTypeOf('function')
    if (typeof client.researchCanvasWorldPoint !== 'function' ||
        typeof client.placeResearchCanvasFiles !== 'function') return
    const point = client.researchCanvasWorldPoint(
      { scale: 2, x: 40, y: -20 },
      { x: 240, y: 180 }
    )
    expect(point).toEqual({ x: 100, y: 100 })

    const nodes = client.placeResearchCanvasFiles(
      [{ id: 'old', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 1, y: 2 }],
      [
        { path: '/w/a.pdf', name: 'a.pdf', source: 'computer' },
        { path: '/w/b.md', name: 'b.md', source: 'computer' }
      ],
      point,
      (() => { let n = 0; return () => `new-${++n}` })()
    )

    expect(nodes).toEqual([
      { id: 'old', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
      { id: 'new-1', path: '/w/b.md', name: 'b.md', source: 'computer', x: 118, y: 118 }
    ])
  })

  it('loads only finite, well-shaped persisted file nodes', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasStorageKey).toBeTypeOf('function')
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    if (typeof client.researchCanvasStorageKey !== 'function' ||
        typeof client.parseResearchCanvasFileNodes !== 'function') return
    const valid = [{ id: '1', name: 'a.pdf', source: 'computer', x: 12, y: 24 }]

    expect(client.researchCanvasStorageKey('session-7')).toBe(
      'sherlock.research.canvas.files.v1:session-7'
    )
    expect(client.parseResearchCanvasFileNodes(JSON.stringify(valid))).toEqual(valid)
    expect(client.parseResearchCanvasFileNodes('[{"id":"1","name":"a","source":"computer","x":null,"y":2}]')).toEqual([])
    expect(client.parseResearchCanvasFileNodes('bad-json')).toEqual([])
  })

  it('round-trips nodes and keeps them usable when Research storage is unavailable', async () => {
    const client = await loadConversationClient()
    expect(client.loadResearchCanvasFiles).toBeTypeOf('function')
    expect(client.saveResearchCanvasFiles).toBeTypeOf('function')
    if (typeof client.loadResearchCanvasFiles !== 'function' ||
        typeof client.saveResearchCanvasFiles !== 'function') return
    const values = new Map<string, string>()
    const memoryStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) }
    }
    const nodes = [{
      id: '1', name: 'a.pdf', source: 'computer', x: 1, y: 2
    }]

    client.saveResearchCanvasFiles(memoryStorage, 's1', nodes)
    expect(client.loadResearchCanvasFiles(memoryStorage, 's1')).toEqual(nodes)

    const storage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('full') }
    }

    expect(client.loadResearchCanvasFiles(storage, 's1')).toEqual([])
    expect(() => client.saveResearchCanvasFiles(storage, 's1', [
      { id: '1', name: 'a.pdf', source: 'computer', x: 1, y: 2 }
    ])).not.toThrow()
  })

  it('rejects an oversized raw persisted file payload before parsing', async () => {
    const client = await loadConversationClient()
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasFileNodes !== 'function') return

    expect(client.parseResearchCanvasFileNodes(JSON.stringify([{
      id: '1', name: 'a.pdf', source: 'computer', x: 12, y: 24,
      ignored: 'x'.repeat(300_000)
    }]))).toEqual([])
  })

  it('writes the exact Sherlock file MIME payload with copy semantics', async () => {
    const client = await loadClientBundle('dsh-client-ui-tool')
    expect(client.writeSherlockFileDrag).toBeTypeOf('function')
    if (typeof client.writeSherlockFileDrag !== 'function') return
    const writes: Array<[string, string]> = []
    const transfer = {
      effectAllowed: 'none',
      setData(type: string, value: string) { writes.push([type, value]) }
    }

    client.writeSherlockFileDrag(transfer, {
      path: '/w/report.pdf',
      name: 'report.pdf'
    })

    expect(transfer.effectAllowed).toBe('copy')
    expect(writes).toEqual([[
      'application/x-sherlock-file',
      '{"path":"/w/report.pdf","name":"report.pdf"}'
    ]])
  })

  it('resolves right-details relative paths before dragging', async () => {
    const client = await loadClientBundle('dsh-client-ui-tool', {
      '@deepseek-ai/dsh-client-runtime/client': {
        resolveWorkspacePath: (cwd: string, path: string) => `${cwd}/${path}`,
        shallowEqual: Object.is
      }
    })
    expect(client.sherlockDetailsFileDescriptor).toBeTypeOf('function')
    if (typeof client.sherlockDetailsFileDescriptor !== 'function') return

    expect(client.sherlockDetailsFileDescriptor('outputs/report.pdf', '/w')).toEqual({
      path: '/w/outputs/report.pdf',
      name: 'report.pdf'
    })
  })

  it('renders a draggable file chip for a file-bearing details block', async () => {
    const client = await loadClientBundle('dsh-client-ui-tool', {
      '@deepseek-ai/dsh-client-runtime/client': {
        resolveWorkspacePath: (cwd: string, path: string) => `${cwd}/${path}`,
        shallowEqual: Object.is
      }
    })
    expect(client.ToolDetails).toBeTypeOf('function')
    if (typeof client.ToolDetails !== 'function') return
    const react = requireModule('react') as typeof import('react')
    const { renderToStaticMarkup } = requireModule('react-dom/server') as {
      renderToStaticMarkup(node: unknown): string
    }

    const html = renderToStaticMarkup(react.createElement(client.ToolDetails, {
      block: {
        callId: 'call-read',
        name: 'read',
        argsRaw: '{"path":"outputs/report.pdf"}'
      },
      cwd: '/w',
      t: (key: string) => key
    }))

    expect(html).toContain('draggable="true"')
    expect(html).toContain('data-sherlock-file-drag-source="/w/outputs/report.pdf"')
    expect(html).toContain('>report.pdf</span>')
  })
})
