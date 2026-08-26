import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
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
  modules: Record<string, unknown> = {},
  dshDesktop?: {
    researchFilesAvailable?(paths: string[]): Promise<boolean[]>
  }
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
      dshDesktop,
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    },
    btoa: globalThis.btoa,
    document: undefined,
    URL: globalThis.URL
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

function memoryStorage(values: Record<string, string>) {
  const data = new Map(Object.entries(values))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) }
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
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

describe('Research canvas file drops', () => {
  it('serializes only the exact bounded Research-owned prompt prefix at offset zero', async () => {
    const client = await loadConversationClient()
    expect(client.serializeResearchPrompt).toBeTypeOf('function')
    expect(client.parseResearchPrompt).toBeTypeOf('function')
    if (typeof client.serializeResearchPrompt !== 'function' ||
        typeof client.parseResearchPrompt !== 'function') return

    const files = [{ id: 'f1', name: 'report.pdf', path: '/w/report.pdf' }]
    const prefix = '␞SHERLOCK_RESEARCH_FILES_V1 {"files":[{"id":"f1","name":"report.pdf","path":"/w/report.pdf"}]}␟'
    const prompt = client.serializeResearchPrompt(files, 'compare these')

    expect(prompt).toBe(`${prefix}compare these`)
    expect(client.parseResearchPrompt(prompt)).toEqual({
      text: 'compare these',
      files
    })
    expect(client.parseResearchPrompt(`before ${prefix}compare these`)).toEqual({
      text: `before ${prefix}compare these`,
      files: []
    })
    expect(client.parseResearchPrompt(
      'SHERLOCK_RESEARCH_FILES_V1 {"files":[{"path":"/w/report.pdf"}]}\nordinary prose'
    )).toEqual({
      text: 'SHERLOCK_RESEARCH_FILES_V1 {"files":[{"path":"/w/report.pdf"}]}\nordinary prose',
      files: []
    })

    const invalidPrefixes = [
      `␞SHERLOCK_RESEARCH_FILES_V1 {"files":[]}␟text`,
      `␞SHERLOCK_RESEARCH_FILES_V1 {"files":[{"id":"","name":"report.pdf","path":"/w/report.pdf"}]}␟text`,
      `␞SHERLOCK_RESEARCH_FILES_V1 {"files":[{"id":"f1","name":"report.pdf","path":"${'x'.repeat(513)}"}]}␟text`,
      `␞SHERLOCK_RESEARCH_FILES_V1 ${JSON.stringify({
        files: Array.from({ length: 65 }, (_, index) => ({
          id: `f${index}`, name: `${index}.pdf`, path: `/w/${index}.pdf`
        }))
      })}␟text`,
      '␞SHERLOCK_RESEARCH_FILES_V1 {bad-json}␟text'
    ]
    for (const value of invalidPrefixes) {
      expect(client.parseResearchPrompt(value)).toEqual({ text: value, files: [] })
    }
  })

  it('wires a bounded boolean-only Research file availability bridge to the trusted window', async () => {
    const [preload, main] = await Promise.all([
      readFile('src/preload/index.ts', 'utf8'),
      readFile('src/main/index.ts', 'utf8')
    ])

    expect(preload).toContain(
      'researchFilesAvailable: (paths: string[]): Promise<boolean[]> =>'
    )
    expect(preload).toContain(
      "ipcRenderer.invoke('research:files-available', paths)"
    )
    expect(main).toContain("ipcMain.handle('research:files-available', async (event, paths: unknown) =>")
    expect(main).toContain('assertTrustedMainWindowEvent(event)')
    expect(main).toContain('const values = Array.isArray(paths) ? Array.from(paths) : []')
    expect(main).toContain('values.length > 64')
    expect(main).toContain('path.length > 512')
    expect(main).toContain('Promise.all(values.map((path) =>')
    expect(main).toContain('value.isFile()')
    expect(main).not.toContain('readdir(')
    expect(main).not.toContain('readFile(path')
  })

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

  it('bounds Finder descriptors before resolution and keeps unusable metadata name-only', async () => {
    const client = await loadConversationClient()
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_DROP).toBe(64)
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION).toBe(256)
    if (typeof client.researchCanvasDropFiles !== 'function') return

    const files = Array.from(
      { length: client.RESEARCH_CANVAS_MAX_FILES_PER_DROP + 1 },
      (_, index) => ({ name: `file-${index}.txt`, type: 'text/plain' })
    )
    const resolved: string[] = []
    const dropped = client.researchCanvasDropFiles({ files, getData: () => '' }, (file: File) => {
      resolved.push(file.name)
      return `/tmp/${file.name}`
    })

    expect(dropped).toHaveLength(client.RESEARCH_CANVAS_MAX_FILES_PER_DROP)
    expect(resolved).toHaveLength(client.RESEARCH_CANVAS_MAX_FILES_PER_DROP)
    expect(dropped.at(-1)).toMatchObject({ name: 'file-63.txt', source: 'computer' })
    expect(client.researchCanvasDropFiles({
      files: [{ name: 'fallback.txt', type: 'x'.repeat(513) }],
      getData: () => ''
    }, () => '/'.repeat(513))).toEqual([
      { name: 'fallback.txt', source: 'computer' }
    ])
    expect(client.researchCanvasDropFiles({
      files: [
        { name: 'overlong-path.txt', type: 'text/plain' },
        { name: 'overlong-media.txt', type: 'x'.repeat(513) }
      ],
      getData: () => ''
    }, (file: File) => file.name === 'overlong-path.txt'
      ? '/'.repeat(513)
      : '/tmp/overlong-media.txt')).toEqual([
      { name: 'overlong-path.txt', source: 'computer' },
      { name: 'overlong-media.txt', source: 'computer' }
    ])
  })

  it('never enumerates a Finder FileList beyond the per-drop cap', async () => {
    const client = await loadConversationClient()
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_DROP).toBe(64)
    if (typeof client.researchCanvasDropFiles !== 'function') return
    const limit = client.RESEARCH_CANVAS_MAX_FILES_PER_DROP
    const sourceAccesses: number[] = []
    const makeFile = (index: number) => ({ name: `lazy-${index}.txt`, type: 'text/plain' })
    const files = new Proxy({ length: limit + 1 }, {
      get(_target, property) {
        if (property === 'length') return limit + 1
        if (property === 'item') return (index: number) => {
          if (index >= limit) throw new Error('accessed FileList item past cap')
          sourceAccesses.push(index)
          return makeFile(index)
        }
        if (property === Symbol.iterator) return function * () {
          for (let index = 0; ; index += 1) {
            if (index >= limit) throw new Error('iterated FileList past cap')
            sourceAccesses.push(index)
            yield makeFile(index)
          }
        }
        if (typeof property === 'string' && /^\d+$/.test(property)) {
          const index = Number(property)
          if (index >= limit) throw new Error('accessed FileList index past cap')
          sourceAccesses.push(index)
          return makeFile(index)
        }
      }
    })
    const resolverCalls: string[] = []

    const dropped = client.researchCanvasDropFiles({ files, getData: () => '' }, (file: File) => {
      resolverCalls.push(file.name)
      return `/tmp/${file.name}`
    })

    expect(dropped).toHaveLength(limit)
    expect(sourceAccesses).toEqual(Array.from({ length: limit }, (_, index) => index))
    expect(resolverCalls).toEqual(Array.from({ length: limit }, (_, index) => `lazy-${index}.txt`))
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

  it('bounds session placement while preserving stable repeated-path placement', async () => {
    const client = await loadConversationClient()
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_DROP).toBe(64)
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION).toBe(256)
    if (typeof client.placeResearchCanvasFiles !== 'function') return
    const sessionLimit = client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION
    const dropLimit = client.RESEARCH_CANVAS_MAX_FILES_PER_DROP
    const existing = Array.from({ length: sessionLimit }, (_, index) => ({
      id: `old-${index}`, path: `/w/${index}.txt`, name: `old-${index}.txt`,
      source: 'computer', x: index, y: index
    }))
    const files = [
      ...Array.from({ length: dropLimit - 1 }, (_, index) => ({
        path: `/w/new-${index}.txt`, name: `new-${index}.txt`, source: 'computer'
      })),
      { path: '/w/255.txt', name: 'moved.txt', source: 'computer' },
      { path: '/w/254.txt', name: 'ignored-after-limit.txt', source: 'computer' }
    ]
    const created: string[] = []
    const placed = client.placeResearchCanvasFiles(existing, files, { x: 100, y: 200 }, () => {
      const id = `new-${created.length}`
      created.push(id)
      return id
    })

    expect(placed).toHaveLength(sessionLimit)
    expect(created).toEqual([])
    expect(placed[255]).toMatchObject({
      id: 'old-255', name: 'moved.txt', x: 100 + (dropLimit - 1) * 18,
      y: 200 + (dropLimit - 1) * 18
    })
    expect(placed[254]).toMatchObject({
      id: 'old-254', name: 'old-254.txt', x: 254, y: 254
    })
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

  it('canonicalizes persisted nodes and retains only first unique ids and paths', async () => {
    const client = await loadConversationClient()
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasFileNodes !== 'function') return

    expect(client.parseResearchCanvasFileNodes(JSON.stringify([
      {
        id: 'first', path: '/w/first.txt', name: 'first.txt', mediaType: 'text/plain',
        source: 'computer', x: 1, y: 2, ignored: 'discard me'
      },
      { id: 'first', name: 'duplicate-id.txt', source: 'computer', x: 3, y: 4 },
      { id: 'second', path: '/w/first.txt', name: 'duplicate-path.txt', source: 'computer', x: 5, y: 6 },
      { id: 'invalid', name: 'invalid.txt', source: 'computer', x: null, y: 8 },
      { id: 'name-only', name: 'name-only.txt', source: 'sherlock', x: 9, y: 10, ignored: true }
    ]))).toEqual([
      {
        id: 'first', path: '/w/first.txt', name: 'first.txt', mediaType: 'text/plain',
        source: 'computer', x: 1, y: 2
      },
      { id: 'name-only', name: 'name-only.txt', source: 'sherlock', x: 9, y: 10 }
    ])
  })

  it('restores no more than the bounded session node count', async () => {
    const client = await loadConversationClient()
    expect(client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION).toBe(256)
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasFileNodes !== 'function') return
    const nodes = Array.from(
      { length: client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION + 1 },
      (_, index) => ({
        id: `node-${index}`, path: `/w/node-${index}.txt`, name: `node-${index}.txt`,
        source: 'computer', x: index, y: index
      })
    )

    const restored = client.parseResearchCanvasFileNodes(JSON.stringify(nodes))
    expect(restored).toHaveLength(client.RESEARCH_CANVAS_MAX_FILES_PER_SESSION)
    expect(restored.at(-1)).toMatchObject({ id: 'node-255', path: '/w/node-255.txt' })
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

  it('normalizes marquee geometry and intersects cards in viewport coordinates', async () => {
    const client = await loadConversationClient()
    expect(client.normalizeResearchRect).toBeTypeOf('function')
    expect(client.researchNodesInMarquee).toBeTypeOf('function')
    if (typeof client.normalizeResearchRect !== 'function' ||
        typeof client.researchNodesInMarquee !== 'function') return

    expect(client.normalizeResearchRect({ x: 180, y: 160 }, { x: 80, y: 60 }))
      .toEqual({ left: 80, top: 60, right: 180, bottom: 160, width: 100, height: 100 })
    const nodes = [
      { id: 'a', name: 'a.pdf', source: 'computer', x: 50, y: 50 },
      { id: 'b', name: 'b.pdf', source: 'computer', x: 220, y: 220 }
    ]
    expect(client.researchNodesInMarquee(
      nodes,
      { scale: 2, x: 10, y: 20 },
      { left: 0, top: 0, right: 130, bottom: 140, width: 130, height: 140 }
    )).toEqual(['a'])
  })

  it('scales marquee card bounds with the canvas viewport', async () => {
    const client = await loadConversationClient()
    expect(client.researchNodeViewportRect).toBeTypeOf('function')
    if (typeof client.researchNodeViewportRect !== 'function') return

    expect(client.researchNodeViewportRect(
      { id: 'a', name: 'a.pdf', source: 'computer', x: 50, y: 50 },
      { scale: 2, x: 10, y: 20 }
    )).toEqual({ left: -110, top: 56, right: 330, bottom: 184, width: 440, height: 128 })
  })

  it('keeps stable selection order and derives ordered files only', async () => {
    const client = await loadConversationClient()
    expect(client.updateResearchSelection).toBeTypeOf('function')
    if (typeof client.updateResearchSelection !== 'function') return
    const files = [
      { id: 'f1', name: 'one.pdf', path: '/w/one.pdf', source: 'computer', x: 80, y: 20 },
      { id: 'f2', name: 'two.pdf', path: '/w/two.pdf', source: 'computer', x: 20, y: 20 }
    ]
    const first = client.updateResearchSelection(
      { selectedNodeIds: [], orderedFileIds: [] },
      ['f2', 'f1'],
      'replace',
      files
    )
    expect(first).toEqual({ selectedNodeIds: ['f2', 'f1'], orderedFileIds: ['f2', 'f1'] })
    expect(client.updateResearchSelection(first, ['f2'], 'toggle', files))
      .toEqual({ selectedNodeIds: ['f1'], orderedFileIds: ['f1'] })
  })

  it('moves selected files and artifacts by screen delta divided by zoom', async () => {
    const client = await loadConversationClient()
    expect(client.moveResearchCanvasNodes).toBeTypeOf('function')
    if (typeof client.moveResearchCanvasNodes !== 'function') return
    const moved = client.moveResearchCanvasNodes(
      [{ id: 'f1', name: 'a', source: 'computer', x: 10, y: 20 }],
      [{ id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 30, y: 40 }],
      ['f1', 'a1'],
      { x: 20, y: -10 },
      2
    )
    expect(moved.files[0]).toMatchObject({ x: 20, y: 15 })
    expect(moved.artifacts[0]).toMatchObject({ x: 40, y: 35 })
  })

  it('uses exact per-session keys and canonicalizes bounded persisted artifacts and selection', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasSelectionStorageKey).toBeTypeOf('function')
    expect(client.researchCanvasArtifactsStorageKey).toBeTypeOf('function')
    expect(client.parseResearchCanvasArtifactNodes).toBeTypeOf('function')
    expect(client.parseResearchCanvasSelection).toBeTypeOf('function')
    if (typeof client.researchCanvasSelectionStorageKey !== 'function' ||
        typeof client.researchCanvasArtifactsStorageKey !== 'function' ||
        typeof client.parseResearchCanvasArtifactNodes !== 'function' ||
        typeof client.parseResearchCanvasSelection !== 'function') return

    expect(client.researchCanvasSelectionStorageKey('session-7')).toBe(
      'sherlock.research.canvas.selection.v1:session-7'
    )
    expect(client.researchCanvasArtifactsStorageKey('session-7')).toBe(
      'sherlock.research.canvas.artifacts.v1:session-7'
    )
    const artifacts = client.parseResearchCanvasArtifactNodes(JSON.stringify([
      { id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 1, y: 2 },
      { id: 'a1', kind: 'assistant-result', messageId: 'm2', title: 'Duplicate id', excerpt: 'Text', x: 3, y: 4 },
      { id: 'a2', kind: 'assistant-result', messageId: 'm1', title: 'Duplicate source', excerpt: 'Text', x: 5, y: 6 }
    ]))
    expect(artifacts).toEqual([
      { id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 1, y: 2 }
    ])
    expect(client.parseResearchCanvasArtifactNodes('bad-json')).toEqual([])
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify(Array.from({ length: 257 }, (_, index) => ({
      id: `a-${index}`, kind: 'assistant-result', messageId: `m-${index}`,
      title: 'Answer', excerpt: 'Text', x: index, y: index
    }))))).toHaveLength(256)
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify([{
      id: 'long-title', kind: 'assistant-result', messageId: 'm-title',
      title: 'x'.repeat(257), excerpt: 'Text', x: 1, y: 2
    }]))).toEqual([])
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify([{
      id: 'long-excerpt', kind: 'assistant-result', messageId: 'm-excerpt',
      title: 'Answer', excerpt: 'x'.repeat(16_385), x: 1, y: 2
    }]))).toEqual([])
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify([{
      id: 'oversized', kind: 'assistant-result', messageId: 'm-oversized',
      title: 'Answer', excerpt: 'x'.repeat(300_000), x: 1, y: 2
    }]))).toEqual([])

    const files = [{ id: 'f1', name: 'one.pdf', source: 'computer', x: 1, y: 2 }]
    expect(client.parseResearchCanvasSelection(JSON.stringify({
      selectedNodeIds: ['a1', 'f1', 'missing', 'a1'], orderedFileIds: ['f1', 'missing']
    }), files, artifacts)).toEqual({ selectedNodeIds: ['a1', 'f1'], orderedFileIds: ['f1'] })
    expect(client.parseResearchCanvasSelection('bad-json', files, artifacts))
      .toEqual({ selectedNodeIds: [], orderedFileIds: [] })
  })

  it('accepts only the exact bounded Sherlock Research artifact drag shape', async () => {
    const client = await loadConversationClient()
    expect(client.parseResearchArtifactDrag).toBeTypeOf('function')
    if (typeof client.parseResearchArtifactDrag !== 'function') return

    const payload = {
      sessionId: 's1', messageId: 'm1', kind: 'assistant-result', title: 'Answer', excerpt: 'Text'
    }
    expect(client.parseResearchArtifactDrag(JSON.stringify(payload))).toEqual(payload)
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, id: 'untrusted' }))).toEqual(payload)
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, title: 'x'.repeat(257) }))).toBeNull()
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, excerpt: 'x'.repeat(16_385) }))).toBeNull()
    expect(client.parseResearchArtifactDrag('not-json')).toBeNull()
  })

  it('places and repositions a research artifact by its durable source identity', async () => {
    const client = await loadConversationClient()
    expect(client.placeResearchCanvasArtifact).toBeTypeOf('function')
    if (typeof client.placeResearchCanvasArtifact !== 'function') return
    const payload = {
      sessionId: 's1', messageId: 'm1', kind: 'assistant-result',
      title: 'Answer', excerpt: 'Evidence'
    }
    const placed = client.placeResearchCanvasArtifact(
      [], payload, { x: 120, y: 80 }, () => 'artifact-1'
    )
    expect(placed).toEqual([{
      id: 'artifact-1', messageId: 'm1', kind: 'assistant-result',
      title: 'Answer', excerpt: 'Evidence', x: 120, y: 80
    }])
    expect(client.placeResearchCanvasArtifact(
      placed, { ...payload, title: 'Revised' }, { x: 240, y: 160 }, () => 'unused'
    )).toEqual([{
      id: 'artifact-1', messageId: 'm1', kind: 'assistant-result',
      title: 'Revised', excerpt: 'Evidence', x: 240, y: 160
    }])
  })

  it('publishes deeply immutable file and artifact nodes from a workspace snapshot', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const storage = {
      getItem(key: string) {
        if (key === 'sherlock.research.canvas.files.v1:s1') return JSON.stringify([
          { id: 'f1', name: 'one.pdf', source: 'computer', x: 1, y: 2 }
        ])
        if (key === 'sherlock.research.canvas.artifacts.v1:s1') return JSON.stringify([
          { id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 3, y: 4 }
        ])
        return null
      },
      setItem() {}
    }
    const snapshot = new client.ResearchWorkspaceRegistry(storage).for('s1').getSnapshot()

    expect(Object.isFrozen(snapshot.files[0])).toBe(true)
    expect(Object.isFrozen(snapshot.artifacts[0])).toBe(true)
    expect(() => { snapshot.files[0].name = 'mutated.pdf' }).toThrow(TypeError)
    expect(() => { snapshot.artifacts[0].title = 'Mutated' }).toThrow(TypeError)
    expect(snapshot.files[0].name).toBe('one.pdf')
    expect(snapshot.artifacts[0].title).toBe('Answer')
  })

  it('submits ordered Research files with images and restores one rejected attempt atomically', async () => {
    const available = vi.fn(async (paths: string[]) => paths.map(() => true))
    const client = await loadClientBundle(
      'dsh-client-ui-conversation',
      {},
      { researchFilesAvailable: available }
    )
    expect(client.InputHub).toBeTypeOf('function')
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.InputHub !== 'function' ||
        typeof client.ResearchWorkspaceRegistry !== 'function') return

    const storage = memoryStorage({
      'sherlock.research.canvas.files.v1:s1': JSON.stringify([
        { id: 'f1', path: '/w/one.pdf', name: 'one.pdf', source: 'computer', x: 10, y: 20 },
        { id: 'f2', path: '/w/two.pdf', name: 'two.pdf', source: 'computer', x: 30, y: 40 }
      ]),
      'sherlock.research.canvas.selection.v1:s1': JSON.stringify({
        selectedNodeIds: ['f1', 'f2'], orderedFileIds: ['f2', 'f1']
      })
    })
    const registry = new client.ResearchWorkspaceRegistry(storage)
    const sendGate = deferred<void>()
    const sendSession = vi.fn(() => sendGate.promise)
    const released: string[] = []
    const conversation = {
      sendSession,
      releaseDraftImage: (id: string) => { released.push(id) }
    }
    const rootCtx = {
      get: (name: string) => name === 'conversation' ? conversation : undefined
    }
    const hub = new client.InputHub(rootCtx, (key: string) => key, registry)
    expect(hub.setResearchActive).toBeTypeOf('function')
    hub.setResearchActive('s1', true)

    let draft = 'compare these'
    let imageIds = ['i1']
    const notices: string[] = []
    const shell = {
      get snapshot() { return { draft, imageIds: [...imageIds] } },
      commitSend(admitted: string[]) {
        const sent = new Set(admitted)
        imageIds = imageIds.filter((id) => !sent.has(id))
        draft = ''
      },
      restoreImages(admitted: string[]) {
        const sent = new Set(admitted)
        imageIds = [...admitted, ...imageIds.filter((id) => !sent.has(id))]
      },
      setDraft(text: string) { draft = text },
      notify(_level: string, text: string) { notices.push(text) }
    }
    hub.shells.set('s1', shell)
    const session = { sessionId: 's1' }

    const operation = hub.sink(session, draft, [...imageIds], 'queue')
    await vi.waitFor(() => { expect(sendSession).toHaveBeenCalledTimes(1) })

    expect(available).toHaveBeenCalledWith(['/w/two.pdf', '/w/one.pdf'])
    const [, prompt, admittedImages, mode] = sendSession.mock.calls[0] as unknown as [
      unknown, string, string[], string
    ]
    expect(client.parseResearchPrompt(prompt).files.map((file: { id: string }) => file.id))
      .toEqual(['f2', 'f1'])
    expect(client.parseResearchPrompt(prompt).text).toBe('compare these')
    expect(admittedImages).toEqual(['i1'])
    expect(mode).toBe('queue')
    expect((sendSession.mock.calls as unknown[][])[0]?.[0]).toBe(session)
    expect(draft).toBe('')
    expect(imageIds).toEqual([])
    expect(registry.for('s1').selectionSnapshot()).toEqual({
      selectedNodeIds: [], orderedFileIds: []
    })

    imageIds = ['i2', 'i1']
    sendGate.reject(new Error('send failed'))
    await operation

    expect(draft).toBe('compare these')
    expect(imageIds).toEqual(['i1', 'i2'])
    expect(registry.for('s1').selectionSnapshot()).toEqual({
      selectedNodeIds: ['f1', 'f2'], orderedFileIds: ['f2', 'f1']
    })
    expect(registry.for('s1').getSnapshot().files).toMatchObject([
      { id: 'f1', x: 10, y: 20 },
      { id: 'f2', x: 30, y: 40 }
    ])
    expect(released).toEqual([])
    expect(notices).toEqual([])
  })

  it('admits file-only Research sends and blocks pathless or unavailable files without clearing', async () => {
    const availability = vi.fn(async (paths: string[]) => paths.map((path) => !path.includes('missing')))
    const client = await loadClientBundle(
      'dsh-client-ui-conversation',
      {},
      { researchFilesAvailable: availability }
    )
    expect(client.InputHub).toBeTypeOf('function')
    if (typeof client.InputHub !== 'function') return

    const cases = [
      { id: 'valid', path: '/w/report.pdf', sends: 1, cleared: true, draft: '', images: [] },
      { id: 'pathless', path: undefined, sends: 0, cleared: false, draft: 'keep me', images: ['i1'] },
      { id: 'missing', path: '/w/missing.pdf', sends: 0, cleared: false, draft: 'keep me', images: ['i1'] }
    ] as const
    for (const fixture of cases) {
      const sessionId = `session-${fixture.id}`
      const storage = memoryStorage({
        [`sherlock.research.canvas.files.v1:${sessionId}`]: JSON.stringify([{
          id: 'f1', name: 'report.pdf', source: 'computer', x: 1, y: 2,
          ...(fixture.path === undefined ? {} : { path: fixture.path })
        }]),
        [`sherlock.research.canvas.selection.v1:${sessionId}`]: JSON.stringify({
          selectedNodeIds: ['f1'], orderedFileIds: ['f1']
        })
      })
      const registry = new client.ResearchWorkspaceRegistry(storage)
      const sendSession = vi.fn(async () => undefined)
      const hub = new client.InputHub({
        get: (name: string) => name === 'conversation'
          ? { sendSession, releaseDraftImage: () => undefined }
          : undefined
      }, (key: string) => key, registry)
      hub.setResearchActive(sessionId, true)
      let draft: string = fixture.draft
      let imageIds: string[] = [...fixture.images]
      const notices: string[] = []
      const shell = {
        get snapshot() { return { draft, imageIds } },
        commitSend() { draft = ''; imageIds = [] },
        restoreImages() {},
        setDraft(text: string) { draft = text },
        notify(_level: string, text: string) { notices.push(text) }
      }
      hub.shells.set(sessionId, shell)

      await hub.sink({ sessionId }, draft, [...imageIds], 'queue')

      expect(sendSession).toHaveBeenCalledTimes(fixture.sends)
      expect(registry.for(sessionId).selectionSnapshot().orderedFileIds)
        .toEqual(fixture.cleared ? [] : ['f1'])
      expect(draft).toBe(fixture.cleared ? '' : fixture.draft)
      expect(imageIds).toEqual(fixture.cleared ? [] : fixture.images)
      expect(notices.length > 0).toBe(!fixture.cleared)
    }
  })

  it('does not overwrite a draft edited after an optimistic Research clear', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    const registry = new client.ResearchWorkspaceRegistry(memoryStorage({}))
    const gate = deferred<void>()
    const hub = new client.InputHub({
      get: (name: string) => name === 'conversation'
        ? { sendSession: () => gate.promise, releaseDraftImage: () => undefined }
        : undefined
    }, (key: string) => key, registry)
    const session = { sessionId: 's-edited' }
    let draft = 'first draft'
    const shell = {
      get snapshot() { return { draft, imageIds: [] } },
      commitSend() { draft = '' },
      restoreImages() {},
      setDraft(text: string) { draft = text },
      notify() {}
    }
    hub.shells.set(session.sessionId, shell)

    const operation = hub.sink(session, draft, [], 'queue')
    await vi.waitFor(() => { expect(draft).toBe('') })
    draft = 'new untouched work'
    gate.reject(new Error('send failed'))
    await operation

    expect(draft).toBe('new untouched work')
  })

  it('lets the input shell submit selected Research files without text or images', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function') return
    const sends: Array<{ text: string, images: string[], mode: string }> = []
    const shell = new client.SessionInputShell({
      actx: {},
      hasExternalAttachments: () => true,
      defaultSink: (text: string, images: string[], mode: string) => {
        sends.push({ text, images, mode })
      }
    })

    shell.submit('queue')

    expect(sends).toEqual([{ text: '', images: [], mode: 'queue' }])
    expect(shell.snapshot.draft).toBe('')
    expect(shell.snapshot.imageIds).toEqual([])
  })

  it('restores admitted image order before concurrent images without duplicates', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    const shell = new client.SessionInputShell({ actx: {}, defaultSink: () => undefined })
    shell.addImages(['i1'])
    shell.commitSend(['i1'])
    shell.addImages(['i2', 'i1'])
    shell.restoreImages(['i1'])

    expect(shell.snapshot.imageIds).toEqual(['i1', 'i2'])
  })

  it('keeps image blocks before one serialized Research text block and releases only admitted images', async () => {
    class Service {
      ctx: unknown
      constructor(ctx: unknown) { this.ctx = ctx }
    }
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/cordis': { Service }
    })
    expect(client.ConversationController).toBeTypeOf('function')
    if (typeof client.ConversationController !== 'function') return
    const ctx = { effect: () => undefined }
    const controller = new client.ConversationController(ctx, { input: {}, blocks: {} })
    controller.draftAttachments.set('i1', {
      id: 'i1', previewUrl: 'blob:i1', kind: 'image',
      file: {
        name: 'chart.png', type: 'image/png',
        arrayBuffer: async () => Uint8Array.of(1, 2).buffer
      }
    })
    controller.draftAttachments.set('i2', {
      id: 'i2', previewUrl: 'blob:i2', kind: 'image',
      file: {
        name: 'later.png', type: 'image/png',
        arrayBuffer: async () => Uint8Array.of(3).buffer
      }
    })
    const prompt = client.serializeResearchPrompt([
      { id: 'f2', name: 'two.pdf', path: '/w/two.pdf' },
      { id: 'f1', name: 'one.pdf', path: '/w/one.pdf' }
    ], 'compare these')
    const calls: Array<{ content: Array<Record<string, unknown>>, mode: string }> = []
    const session = {
      prompt: async (content: Array<Record<string, unknown>>, mode: string) => {
        calls.push({ content, mode })
        return { ok: true }
      }
    }

    await controller.sendSession(session, prompt, ['i1'], 'queue')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.content.map((block) => block.type)).toEqual(['image', 'text'])
    const text = calls[0]?.content[1]?.text as string
    expect(client.parseResearchPrompt(text).files.map((file: { id: string }) => file.id))
      .toEqual(['f2', 'f1'])
    expect(controller.draftImages(['i1'])).toEqual([])
    expect(controller.draftImages(['i2']).map((attachment: { id: string }) => attachment.id))
      .toEqual(['i2'])
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
    const react = requireModule('react') as {
      createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
    }
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
