import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import {
  createResearchPreviewBridge,
  researchFinderAdmissionRequest,
  safePathForFile
} from '../src/preload/research-file-path'

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
    researchCanvasStorage?: {
      getItem(key: string): string | null
      setItem(key: string, value: string): boolean
    }
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
    AbortController: globalThis.AbortController,
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

async function serializedResearchReferences(
  client: ClientBundle,
  files: Array<{ id: string; name: string; path?: string }>,
  text = ''
) {
  const signal = new AbortController().signal
  const markers = await Promise.all(files.map((file) => {
    const reference = client.researchFileReference(file)
    return client.researchFileReferenceCodec.serialize(reference.ref, signal)
  }))
  return `${markers.join('')}${text}`
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
  it('preserves bounded assistant-result Markdown while excerpts keep normalized semantics', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const storage = memoryStorage({})
    const markdown = '\n# Finding\n\n- first\n- second\n\n```ts\nconst value = 1\n```\n'
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('markdown-session')

    workspace.addAssistantResult({ messageId: 'message-1', text: markdown, at: { x: 10, y: 20 } })
    workspace.addExcerpt('message-2', '  margin\n\n   expanded  ', { x: 30, y: 40 })

    expect(workspace.getSnapshot().artifacts).toMatchObject([
      {
        kind: 'assistant-result', messageId: 'message-1', excerpt: markdown,
        width: 520, sizeMode: 'auto'
      },
      {
        kind: 'assistant-excerpt', messageId: 'message-2', excerpt: 'margin expanded'
      }
    ])
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('markdown-session').getSnapshot().artifacts[0]?.excerpt).toBe(markdown)

    const bounded = 'x'.repeat(16_384)
    workspace.addAssistantResult({ messageId: 'message-max', text: bounded, at: { x: 0, y: 0 } })
    workspace.addAssistantResult({ messageId: 'message-too-long', text: `${bounded}x`, at: { x: 0, y: 0 } })
    workspace.addAssistantResult({ messageId: 'message-whitespace', text: ' \n\t ', at: { x: 0, y: 0 } })
    expect(workspace.getSnapshot().artifacts.some(
      (node: { messageId: string }) => node.messageId === 'message-max'
    )).toBe(true)
    expect(workspace.getSnapshot().artifacts.some(
      (node: { messageId: string }) => node.messageId === 'message-too-long'
    )).toBe(false)
    expect(workspace.getSnapshot().artifacts.some(
      (node: { messageId: string }) => node.messageId === 'message-whitespace'
    )).toBe(false)
  })

  it('publishes and persists canonical auto geometry through the workspace action', async () => {
    const client = await loadConversationClient()
    const storage = memoryStorage({
      'sherlock.research.canvas.files.v1:geometry-session': JSON.stringify([{
        id: 'image-1', name: 'chart.png', source: 'computer',
        authorizationId: 'authorization-1', contentType: 'image/png',
        x: 100, y: 100, width: 320, height: 272, sizeMode: 'auto', aspectRatio: 4 / 3
      }])
    })
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('geometry-session')
    expect(workspace.updateNodeGeometry).toBeTypeOf('function')

    workspace.updateNodeGeometry('image-1', {
      width: 320, height: 212, sizeMode: 'auto', aspectRatio: 16 / 9
    })

    expect(workspace.getSnapshot().files[0]).toMatchObject({
      width: 320, height: 212, sizeMode: 'auto', aspectRatio: 16 / 9
    })
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('geometry-session').getSnapshot().files[0]).toMatchObject({
        width: 320, height: 212, sizeMode: 'auto', aspectRatio: 16 / 9
      })
  })

  it('strictly validates optional sidebar preview identity without trusting its absolute path', async () => {
    const client = await loadConversationClient()
    expect(client.parseSherlockFileDrag).toBeTypeOf('function')
    if (typeof client.parseSherlockFileDrag !== 'function') return
    const payload = {
      path: '/workspace/charts/revenue.png', name: 'revenue.png',
      sessionId: 'session-1', relativePath: 'charts/revenue.png'
    }

    expect(client.parseSherlockFileDrag(JSON.stringify(payload))).toEqual({
      ...payload, source: 'sherlock'
    })
    expect(client.parseSherlockFileDrag(JSON.stringify({
      ...payload, relativePath: '../secret.png'
    }))).toBeNull()
    expect(client.parseSherlockFileDrag(JSON.stringify({
      ...payload, relativePath: '/absolute.png'
    }))).toBeNull()
    expect(client.parseSherlockFileDrag(JSON.stringify({
      ...payload, sessionId: 'x'.repeat(513)
    }))).toBeNull()
    expect(client.parseSherlockFileDrag(JSON.stringify({
      path: payload.path, name: payload.name
    }))).toEqual({ path: payload.path, name: payload.name, source: 'sherlock' })
  })

  it('computes rich-node viewport proximity at 0.5x, 1x, and 2x without changing node geometry', async () => {
    const client = await loadConversationClient()
    expect(client.researchNodeNearViewport).toBeTypeOf('function')
    if (typeof client.researchNodeNearViewport !== 'function') return
    const node = {
      id: 'image-1', name: 'chart.png', contentType: 'image/png',
      authorizationId: 'authorization-1', source: 'computer',
      x: 1_100, y: 300, width: 320, height: 272, aspectRatio: 4 / 3
    }
    const canvas = { width: 800, height: 600 }

    expect(client.researchNodeNearViewport(node, { scale: 0.5, x: 0, y: 0 }, canvas, 80)).toBe(true)
    expect(client.researchNodeNearViewport(node, { scale: 1, x: 0, y: 0 }, canvas, 80)).toBe(false)
    expect(client.researchNodeNearViewport(node, { scale: 2, x: -1_800, y: 0 }, canvas, 80)).toBe(true)
    expect(node).toMatchObject({ x: 1_100, y: 300, width: 320, height: 272 })
  })

  it('keeps pointer-anchored Research zoom available down to 20 percent', async () => {
    const client = await loadConversationClient()
    expect(client.nextResearchCanvasViewport).toBeTypeOf('function')
    if (typeof client.nextResearchCanvasViewport !== 'function') return

    const zoomed = client.nextResearchCanvasViewport(
      { scale: 1, x: 40, y: -20 },
      { metaKey: true, deltaY: 10_000, pointerX: 300, pointerY: 200 }
    )

    expect(zoomed.scale).toBe(0.2)
    expect((300 - zoomed.x) / zoomed.scale).toBeCloseTo(260, 8)
    expect((200 - zoomed.y) / zoomed.scale).toBeCloseTo(220, 8)
  })

  it('reports an empty Research viewport only when every component is outside it', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasHasVisibleNodes).toBeTypeOf('function')
    if (typeof client.researchCanvasHasVisibleNodes !== 'function') return
    const nodes = [
      { id: 'near', name: 'near.pdf', source: 'computer', x: 100, y: 100 },
      { id: 'far', name: 'far.pdf', source: 'computer', x: 2_000, y: 2_000 }
    ]
    const canvasSize = { width: 800, height: 600 }

    expect(client.researchCanvasHasVisibleNodes(
      nodes, { scale: 1, x: 0, y: 0 }, canvasSize
    )).toBe(true)
    expect(client.researchCanvasHasVisibleNodes(
      nodes, { scale: 1, x: -4_000, y: -4_000 }, canvasSize
    )).toBe(false)
    expect(client.researchCanvasHasVisibleNodes(
      [], { scale: 1, x: -4_000, y: -4_000 }, canvasSize
    )).toBe(false)
  })

  it('returns to the nearest Research component with a moderate zoom instead of fitting all', async () => {
    const client = await loadConversationClient()
    expect(client.researchCanvasReturnViewport).toBeTypeOf('function')
    if (typeof client.researchCanvasReturnViewport !== 'function') return
    const nodes = [
      {
        id: 'nearest', name: 'nearest.pptx', source: 'computer', x: 3_000, y: 2_000,
        width: 480, height: 360, sizeMode: 'manual'
      },
      {
        id: 'distant', name: 'distant.pptx', source: 'computer', x: -5_000, y: -5_000,
        width: 480, height: 360, sizeMode: 'manual'
      }
    ]
    const canvasSize = { width: 800, height: 600 }

    expect(client.researchCanvasReturnViewport(
      nodes, { scale: 1, x: -2_500, y: -1_700 }, canvasSize
    )).toEqual({ scale: 0.8, x: -2_000, y: -1_300 })
    expect(client.researchCanvasReturnViewport(
      nodes, { scale: 0.5, x: -2_500, y: -1_700 }, canvasSize
    )).toEqual({ scale: 0.5, x: -1_100, y: -700 })
  })

  it('normalizes natural image ratio against the existing 32px titled-frame geometry', async () => {
    const client = await loadConversationClient()
    expect(client.researchImageGeometryForNaturalSize).toBeTypeOf('function')
    if (typeof client.researchImageGeometryForNaturalSize !== 'function') return

    expect(client.researchImageGeometryForNaturalSize({
      id: 'image-1', name: 'chart.png', contentType: 'image/png',
      authorizationId: 'authorization-1', source: 'computer', x: 0, y: 0,
      width: 320, height: 272, sizeMode: 'auto'
    }, 1600, 900)).toMatchObject({
      width: 320, height: 212, sizeMode: 'auto', aspectRatio: 16 / 9
    })
    expect(client.researchImageGeometryForNaturalSize({}, 0, 900)).toBeNull()
  })
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

  it('round-trips the Research prompt sentinel inside file descriptor values', async () => {
    const client = await loadConversationClient()
    expect(client.serializeResearchPrompt).toBeTypeOf('function')
    expect(client.parseResearchPrompt).toBeTypeOf('function')
    if (typeof client.serializeResearchPrompt !== 'function' ||
        typeof client.parseResearchPrompt !== 'function') return

    const files = [{
      id: 'f-sentinel',
      name: 'private␟report.pdf',
      path: '/w/private␟report.pdf'
    }]
    const prompt = client.serializeResearchPrompt(files, 'inspect this') as string

    expect(prompt).toContain('\\u241f')
    expect(client.parseResearchPrompt(prompt)).toEqual({
      text: 'inspect this',
      files
    })
  })

  it('round-trips inline Research file positions without exposing internal markers', async () => {
    const client = await loadConversationClient()
    expect(client.serializeResearchPrompt).toBeTypeOf('function')
    expect(client.parseResearchPrompt).toBeTypeOf('function')
    if (typeof client.serializeResearchPrompt !== 'function' ||
        typeof client.parseResearchPrompt !== 'function') return

    const files = [
      { id: 'f1', name: 'logo.svg', path: '/w/logo.svg' },
      { id: 'f2', name: 'brief.pdf', path: '/w/brief.pdf' }
    ]
    const occurrences = [
      { fileId: 'f1', offset: 2 },
      { fileId: 'f2', offset: 5 }
    ]
    const prompt = client.serializeResearchPrompt(files, '请参考和设计', occurrences) as string

    expect(client.parseResearchPrompt(prompt)).toEqual({
      text: '请参考和设计',
      files,
      occurrences
    })
    expect(prompt).not.toContain('SHERLOCK_RESEARCH_FILE_REFERENCE_V1')
  })

  it('inserts selected Research files into the native text flow and keeps deletion user-owned', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    expect(client.syncResearchFileReferences).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.syncResearchFileReferences !== 'function') return

    const shell = new client.SessionInputShell({
      actx: {},
      defaultSink: () => undefined
    })
    shell.setDraft('我有一个需求')
    const seen = new Set<string>()
    const files = [
      { id: 'f1', name: '/w/logo.svg', path: '/w/logo.svg', source: 'computer' },
      { id: 'f2', name: 'brief.pdf', path: '/w/brief.pdf', source: 'computer' }
    ]

    const first = client.syncResearchFileReferences(
      shell, files, seen, { start: 2, end: 2 }, true
    )
    expect(first.inserted).toEqual(['f1', 'f2'])
    expect(shell.snapshot.occurrences.map((item: { source: string; ref: string }) => ({
      source: item.source,
      file: JSON.parse(item.ref).id
    }))).toEqual([
      { source: 'research-file', file: 'f1' },
      { source: 'research-file', file: 'f2' }
    ])
    expect(shell.snapshot.draft.startsWith('我有')).toBe(true)
    expect(shell.snapshot.draft).toContain('\uFFFC')
    expect(shell.snapshot.draft.endsWith('一个需求')).toBe(true)

    const removed = shell.snapshot.occurrences[0]
    shell.setDraft(
      shell.snapshot.draft.slice(0, removed.offset) + shell.snapshot.draft.slice(removed.offset + 1),
      { start: removed.offset, end: removed.offset + 1, insertedLength: 0 }
    )
    client.syncResearchFileReferences(
      shell, files, seen,
      { start: shell.snapshot.draft.length, end: shell.snapshot.draft.length }, true
    )
    expect(shell.snapshot.occurrences.map((item: { ref: string }) => JSON.parse(item.ref).id))
      .toEqual(['f2'])

    client.syncResearchFileReferences(
      shell, [], seen,
      { start: shell.snapshot.draft.length, end: shell.snapshot.draft.length }, false
    )
    expect(shell.snapshot.occurrences).toEqual([])
    expect(shell.snapshot.draft).not.toContain('\uFFFC')

    const second = client.syncResearchFileReferences(
      shell, [files[0]], seen,
      { start: shell.snapshot.draft.length, end: shell.snapshot.draft.length }, true
    )
    expect(second.inserted).toEqual(['f1'])
  })

  it('reconciles renamed Research references in place without changing draft history identity', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    expect(client.syncResearchFileReferences).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.syncResearchFileReferences !== 'function' ||
        typeof client.researchFileReference !== 'function') return

    const shell = new client.SessionInputShell({
      actx: {},
      defaultSink: () => undefined
    })
    const sourceFile = {
      id: 'f1', name: 'report.pdf', path: '/w/report.pdf', source: 'computer'
    }
    shell.setDraft('前后')
    shell.insertReference(client.researchFileReference(sourceFile), {
      start: 1, end: 1, draftRev: shell.snapshot.draftRev
    })
    shell.insertReference(client.researchFileReference(sourceFile), {
      start: shell.snapshot.draft.length,
      end: shell.snapshot.draft.length,
      draftRev: shell.snapshot.draftRev
    })
    const before = shell.snapshot
    const identity = before.occurrences.map((occurrence: {
      occurrenceId: number; source: string; offset: number
    }) => ({
      occurrenceId: occurrence.occurrenceId,
      source: occurrence.source,
      offset: occurrence.offset
    }))
    const seen = new Set(['f1'])

    const result = client.syncResearchFileReferences(shell, [{
      ...sourceFile,
      displayName: '季度结论.pdf'
    }], seen, { start: 1, end: 2 }, true)

    expect(result.inserted).toEqual([])
    expect(shell.snapshot.draft).toBe(before.draft)
    expect(shell.snapshot.draftRev).toBe(before.draftRev)
    expect(shell.snapshot.occurrences.map((occurrence: {
      occurrenceId: number; source: string; offset: number
    }) => ({
      occurrenceId: occurrence.occurrenceId,
      source: occurrence.source,
      offset: occurrence.offset
    }))).toEqual(identity)
    expect(shell.snapshot.occurrences).toHaveLength(2)
    expect(shell.snapshot.occurrences.every((occurrence: {
      label: string; clipboardText: string; ref: string
    }) => occurrence.label === '季度结论.pdf' &&
      occurrence.clipboardText === '季度结论.pdf' &&
      JSON.parse(occurrence.ref).name === '季度结论.pdf' &&
      JSON.parse(occurrence.ref).path === '/w/report.pdf')).toBe(true)

    shell.undo()
    expect(shell.snapshot.occurrences).toHaveLength(1)
    expect(shell.snapshot.occurrences[0]).toMatchObject({
      occurrenceId: identity[0]?.occurrenceId,
      label: '季度结论.pdf',
      clipboardText: '季度结论.pdf'
    })
    shell.redo()
    expect(shell.snapshot.occurrences).toHaveLength(2)
    expect(shell.snapshot.occurrences.map((occurrence: { label: string }) => occurrence.label))
      .toEqual(['季度结论.pdf', '季度结论.pdf'])

    const removed = shell.snapshot.occurrences[0]
    shell.setDraft(
      shell.snapshot.draft.slice(0, removed.offset) + shell.snapshot.draft.slice(removed.offset + 1),
      { start: removed.offset, end: removed.offset + 1, insertedLength: 0 }
    )
    client.syncResearchFileReferences(shell, [{
      ...sourceFile,
      displayName: '再次改名.pdf'
    }], seen, { start: 0, end: 0 }, true)
    expect(shell.snapshot.occurrences).toHaveLength(1)
    expect(shell.snapshot.occurrences[0]).toMatchObject({ label: '再次改名.pdf' })

    shell.restoreDraftState({
      draft: shell.snapshot.draft,
      occurrences: shell.snapshot.occurrences.map((occurrence: Record<string, unknown>) => ({
        ...occurrence,
        invalid: true
      }))
    })
    const invalidBefore = shell.snapshot
    client.syncResearchFileReferences(shell, [{
      ...sourceFile,
      displayName: '保留无效状态.pdf'
    }], seen, { start: 0, end: 0 }, true)
    expect(shell.snapshot.draft).toBe(invalidBefore.draft)
    expect(shell.snapshot.draftRev).toBe(invalidBefore.draftRev)
    expect(shell.snapshot.occurrences[0]).toMatchObject({
      occurrenceId: invalidBefore.occurrences[0]?.occurrenceId,
      offset: invalidBefore.occurrences[0]?.offset,
      invalid: true,
      label: '保留无效状态.pdf'
    })
  })

  it.each([
    { label: 'the only occurrence', copies: 1 },
    { label: 'one of two occurrences', copies: 2 }
  ])('keeps $label deleted while rename follows its stable Research identity through undo history', async ({ copies }) => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    expect(client.syncResearchFileReferences).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function' ||
        typeof client.syncResearchFileReferences !== 'function' ||
        typeof client.researchFileReference !== 'function') return

    const shell = new client.SessionInputShell({
      actx: {},
      defaultSink: () => undefined
    })
    const sourceFile = {
      id: 'history-file', name: 'history.pdf', path: '/w/history.pdf', source: 'computer'
    }
    shell.setDraft('正文')
    for (let index = 0; index < copies; index += 1) {
      shell.insertReference(client.researchFileReference(sourceFile), {
        start: shell.snapshot.draft.length,
        end: shell.snapshot.draft.length,
        draftRev: shell.snapshot.draftRev
      })
    }
    const beforeDelete = shell.snapshot
    const deleted = beforeDelete.occurrences[0]
    const preservedIdentity = beforeDelete.occurrences.map((occurrence: {
      occurrenceId: number; source: string; offset: number; invalid?: boolean
    }) => ({
      occurrenceId: occurrence.occurrenceId,
      source: occurrence.source,
      offset: occurrence.offset,
      invalid: occurrence.invalid
    }))

    shell.setDraft(
      beforeDelete.draft.slice(0, deleted.offset) + beforeDelete.draft.slice(deleted.offset + 1),
      { start: deleted.offset, end: deleted.offset + 1, insertedLength: 0 }
    )
    const deletedSnapshot = shell.snapshot
    const seen = new Set(['history-file'])
    client.syncResearchFileReferences(shell, [{
      ...sourceFile,
      displayName: '历史同步新名字.pdf'
    }], seen, { start: deletedSnapshot.draft.length, end: deletedSnapshot.draft.length }, true)

    expect(shell.snapshot.draft).toBe(deletedSnapshot.draft)
    expect(shell.snapshot.draftRev).toBe(deletedSnapshot.draftRev)
    expect(shell.snapshot.occurrences).toHaveLength(copies - 1)
    expect(shell.snapshot.occurrences.some((occurrence: { occurrenceId: number }) =>
      occurrence.occurrenceId === deleted.occurrenceId)).toBe(false)
    expect(shell.snapshot.occurrences.every((occurrence: { label: string }) =>
      occurrence.label === '历史同步新名字.pdf')).toBe(true)

    shell.undo()
    expect(shell.snapshot.occurrences).toHaveLength(copies)
    expect(shell.snapshot.occurrences.map((occurrence: {
      occurrenceId: number; source: string; offset: number; invalid?: boolean
    }) => ({
      occurrenceId: occurrence.occurrenceId,
      source: occurrence.source,
      offset: occurrence.offset,
      invalid: occurrence.invalid
    }))).toEqual(preservedIdentity)
    expect(shell.snapshot.occurrences.every((occurrence: {
      ref: string; label: string; clipboardText: string
    }) => occurrence.label === '历史同步新名字.pdf' &&
      occurrence.clipboardText === '历史同步新名字.pdf' &&
      JSON.parse(occurrence.ref).id === 'history-file' &&
      JSON.parse(occurrence.ref).name === '历史同步新名字.pdf')).toBe(true)

    shell.redo()
    expect(shell.snapshot.draft).toBe(deletedSnapshot.draft)
    expect(shell.snapshot.occurrences).toHaveLength(copies - 1)
    expect(shell.snapshot.occurrences.some((occurrence: { occurrenceId: number }) =>
      occurrence.occurrenceId === deleted.occurrenceId)).toBe(false)
    expect(shell.snapshot.occurrences.every((occurrence: { label: string }) =>
      occurrence.label === '历史同步新名字.pdf')).toBe(true)
  })

  it('serializes and extracts bounded inline Research reference markers in occurrence order', async () => {
    const client = await loadConversationClient()
    expect(client.researchFileReference).toBeTypeOf('function')
    expect(client.researchFileReferenceCodec?.serialize).toBeTypeOf('function')
    expect(client.extractResearchFileReferences).toBeTypeOf('function')
    if (typeof client.researchFileReference !== 'function' ||
        typeof client.researchFileReferenceCodec?.serialize !== 'function' ||
        typeof client.extractResearchFileReferences !== 'function') return

    const file = { id: 'f1', name: '/w/report.pdf', path: '/w/report.pdf', source: 'computer' }
    const reference = client.researchFileReference(file)
    expect(reference).toMatchObject({
      source: 'research-file',
      label: 'report.pdf',
      clipboardText: 'report.pdf'
    })
    const marker = await client.researchFileReferenceCodec.serialize(
      reference.ref, new AbortController().signal
    )
    const extracted = client.extractResearchFileReferences(`前文${marker}后文`)

    expect(extracted).toEqual({
      text: '前文后文',
      files: [{ id: 'f1', name: 'report.pdf', path: '/w/report.pdf' }],
      occurrences: [{ fileId: 'f1', offset: 2 }]
    })
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
    expect(main).toContain('const values = Array.isArray(paths) ? Array.from(paths) : []')
    expect(main).toContain('values.length > 64')
    expect(main).toContain('path.length > 512')
    expect(main).toContain('Promise.all(values.map((path) =>')
    expect(main).toContain('value.isFile()')
    expect(main).not.toContain('readdir(')
    expect(main).not.toContain('readFile(path')
  })

  it('wires stable Research canvas storage through the trusted desktop bridge', async () => {
    const [preload, main] = await Promise.all([
      readFile('src/preload/index.ts', 'utf8'),
      readFile('src/main/index.ts', 'utf8')
    ])

    expect(preload).toContain('researchCanvasStorage: Object.freeze({')
    expect(preload).toContain("ipcRenderer.sendSync('research:canvas-storage:get', key)")
    expect(preload).toContain("ipcRenderer.sendSync('research:canvas-storage:set', key, value)")
    expect(main).toContain("new ResearchCanvasStorage(app.getPath('userData'))")
  })

  it('derives Finder preview admission inside preload without exposing a path reader', async () => {
    const calls: Array<{ channel: string; value: unknown }> = []
    const bridge = createResearchPreviewBridge(
      () => '/electron/derived.pdf',
      async (channel, value) => {
        calls.push({ channel, value })
        return {
          authorizationId: 'authorization_0000000000000001',
          url: 'sherlock-preview://capability_0000000000000001/',
          contentType: 'application/pdf',
          name: 'report.pdf'
        }
      }
    )

    const result = await bridge.admitFinderFile(
      { name: 'report.pdf', path: '/renderer/forged.pdf' } as unknown as File,
      { sessionId: 'session-1', nodeId: 'node-1' }
    )
    expect(result).toMatchObject({
      authorizationId: 'authorization_0000000000000001',
      contentType: 'application/pdf'
    })
    expect(calls).toEqual([{
      channel: 'research:preview:admit-finder',
      value: {
        path: '/electron/derived.pdf',
        sessionId: 'session-1',
        nodeId: 'node-1'
      }
    }])
    await bridge.release({
      sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: 'authorization_0000000000000001',
      capabilityToken: 'capability_0000000000000001'
    })
    expect(calls.at(-1)).toEqual({
      channel: 'research:preview:release',
      value: {
        sessionId: 'session-1', nodeId: 'node-1',
        authorizationId: 'authorization_0000000000000001',
        capabilityToken: 'capability_0000000000000001'
      }
    })
    expect('read' in bridge).toBe(false)
    expect('admitFinderPath' in bridge).toBe(false)
  })

  it('returns a resolved Electron file path and safely absorbs resolver failures', () => {
    const file = { name: 'report.pdf' } as File

    expect(safePathForFile(file, () => '/tmp/report.pdf')).toBe('/tmp/report.pdf')
    expect(safePathForFile(file, () => undefined)).toBe('')
    expect(safePathForFile(file, () => { throw new Error('unavailable') })).toBe('')
  })

  it('ignores synthetic File path properties and rejects empty Electron resolution', () => {
    const synthetic = { name: 'report.pdf', path: '/renderer/forged.pdf' } as unknown as File
    const identity = { sessionId: 'session-1', nodeId: 'node-1' }

    expect(researchFinderAdmissionRequest(synthetic, identity, () => '')).toBeNull()
    expect(researchFinderAdmissionRequest(
      synthetic,
      identity,
      () => '/electron/derived.pdf'
    )).toEqual({
      path: '/electron/derived.pdf',
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
  })

  it('does not invoke IPC when Electron cannot resolve a real Finder File', async () => {
    const invoke = vi.fn()
    const bridge = createResearchPreviewBridge(() => '', invoke)

    await expect(bridge.admitFinderFile(
      { name: 'synthetic.pdf', path: '/renderer/forged.pdf' } as unknown as File,
      { sessionId: 'session-1', nodeId: 'node-1' }
    )).resolves.toBeNull()
    expect(invoke).not.toHaveBeenCalled()
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
    expect(client.parseResearchCanvasFileNodes(JSON.stringify(valid))).toEqual([{
      ...valid[0], width: 320, height: 320 / (17 / 22) + 32,
      sizeMode: 'auto', aspectRatio: 17 / 22
    }])
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
        source: 'computer', x: 1, y: 2, width: 420, height: 320, sizeMode: 'auto'
      },
      {
        id: 'name-only', name: 'name-only.txt', source: 'sherlock', x: 9, y: 10,
        width: 220, height: 64, sizeMode: 'auto'
      }
    ])
  })

  it('normalizes persisted display names and renames nodes without mutating file identity', async () => {
    const client = await loadConversationClient()
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasFileNodes !== 'function' ||
        typeof client.ResearchWorkspaceRegistry !== 'function') return

    const base = {
      id: 'file-1', path: '/w/original.pdf', name: 'original.pdf',
      mediaType: 'application/pdf', source: 'computer',
      authorizationId: 'authorization-1', contentType: 'application/pdf',
      x: 12, y: 24
    }
    expect(client.parseResearchCanvasFileNodes(JSON.stringify([
      { ...base, displayName: '  季度报告  ' },
      { ...base, id: 'same', path: '/w/same.pdf', name: 'same.pdf', displayName: 'same.pdf' },
      { ...base, id: 'control', path: '/w/control.pdf', displayName: 'bad\u0085title' },
      { ...base, id: 'max', path: '/w/max.pdf', displayName: 'x'.repeat(256) },
      { ...base, id: 'long', path: '/w/long.pdf', displayName: 'x'.repeat(257) }
    ]))).toMatchObject([
      { id: 'file-1', name: 'original.pdf', displayName: '季度报告' },
      { id: 'same', name: 'same.pdf' },
      { id: 'control', name: 'original.pdf' },
      { id: 'max', name: 'original.pdf', displayName: 'x'.repeat(256) },
      { id: 'long', name: 'original.pdf' }
    ])

    const storage = memoryStorage({})
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('rename-session')
    workspace.setFiles([base])
    const sourceIdentity = {
      name: base.name,
      path: base.path,
      mediaType: base.mediaType,
      authorizationId: base.authorizationId,
      contentType: base.contentType
    }
    workspace.renameNode('file-1', '  审阅版本  ')
    expect(workspace.getSnapshot().files[0]).toMatchObject({
      ...sourceIdentity,
      displayName: '审阅版本'
    })
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('rename-session').getSnapshot().files[0]).toMatchObject({
        ...sourceIdentity,
        displayName: '审阅版本'
      })

    workspace.renameNode('file-1', 'bad\u0007title')
    expect(workspace.getSnapshot().files[0]?.displayName).toBe('审阅版本')
    workspace.renameNode('file-1', '章节/最终结论.pdf')
    const renamedReference = client.researchFileReference(
      workspace.getSnapshot().files[0]
    )
    expect(renamedReference).toMatchObject({
      label: '章节/最终结论.pdf',
      clipboardText: '章节/最终结论.pdf'
    })
    expect(JSON.parse(renamedReference.ref)).toEqual({
      id: 'file-1', name: '章节/最终结论.pdf', path: '/w/original.pdf'
    })
    workspace.renameNode('file-1', base.name)
    expect(workspace.getSnapshot().files[0]).not.toHaveProperty('displayName')

    workspace.setArtifacts([{
      id: 'artifact-1', kind: 'assistant-result', messageId: 'message-1',
      title: '助手回复', excerpt: '第一版内容', x: 50, y: 60
    }])
    workspace.renameNode('artifact-1', '  结论摘要  ')
    workspace.renameNode('artifact-1', 'bad\u009ftitle')
    workspace.renameNode('artifact-1', '   ')
    expect(workspace.getSnapshot().artifacts[0]).toMatchObject({
      id: 'artifact-1', title: '结论摘要'
    })
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('rename-session').getSnapshot().artifacts[0]).toMatchObject({
        id: 'artifact-1', title: '结论摘要'
      })

    expect(workspace.updateArtifactContent('artifact-1', '# 修订结论\n\n- 第一条')).toBe(true)
    expect(workspace.getSnapshot().artifacts[0]?.excerpt).toBe('# 修订结论\n\n- 第一条')
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('rename-session').getSnapshot().artifacts[0]?.excerpt)
      .toBe('# 修订结论\n\n- 第一条')
    expect(workspace.updateArtifactContent('artifact-1', '  \n\t ')).toBe(false)
    expect(workspace.getSnapshot().artifacts[0]?.excerpt).toBe('# 修订结论\n\n- 第一条')
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

  it('persists the full supported file set even when escaped paths exceed the legacy raw limit', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length <= 8 * 1024 * 1024) values.set(key, value)
      }
    }
    const component = '"'.repeat(240)
    const nodes = Array.from({ length: 256 }, (_, index) => ({
      id: `file-${index}`,
      path: `/research/${component}-${index}/${component}-${index}.png`,
      name: `${component}-${index}.png`,
      source: 'sherlock',
      x: index,
      y: index
    }))
    expect(JSON.stringify(nodes).length).toBeGreaterThan(262_144)

    const workspace = new client.ResearchWorkspaceRegistry(storage).for('escaped-files')
    workspace.setFiles(nodes)

    expect(workspace.getSnapshot().files).toHaveLength(256)
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('escaped-files').getSnapshot().files).toHaveLength(256)
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
    expect(client.loadResearchCanvasFiles(memoryStorage, 's1')).toEqual([{
      ...nodes[0], width: 320, height: 320 / (17 / 22) + 32,
      sizeMode: 'auto', aspectRatio: 17 / 22
    }])

    const storage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('full') }
    }

    expect(client.loadResearchCanvasFiles(storage, 's1')).toEqual([])
    expect(() => client.saveResearchCanvasFiles(storage, 's1', [
      { id: '1', name: 'a.pdf', source: 'computer', x: 1, y: 2 }
    ])).not.toThrow()
  })

  it('uses desktop-scoped storage for the default registry across renderer origins', async () => {
    const sessionId = 'session-stable-storage'
    const key = `sherlock.research.canvas.files.v1:${sessionId}`
    const values = new Map<string, string>([[key, JSON.stringify([{
      id: 'stable-file', path: '/w/stable.pdf', name: 'stable.pdf',
      source: 'sherlock', x: 12, y: 34
    }])]])
    const client = await loadClientBundle('dsh-client-ui-conversation', {}, {
      researchCanvasStorage: {
        getItem: (storageKey) => values.get(storageKey) ?? null,
        setItem: (storageKey, value) => { values.set(storageKey, value); return true }
      }
    })

    const workspace = new client.ResearchWorkspaceRegistry().for(sessionId)
    expect(workspace.getSnapshot().files).toEqual([{
      id: 'stable-file', path: '/w/stable.pdf', name: 'stable.pdf',
      source: 'sherlock', x: 12, y: 34, width: 320,
      height: 320 / (17 / 22) + 32, sizeMode: 'auto', aspectRatio: 17 / 22
    }])

    workspace.setFiles([{
      id: 'next-file', path: '/w/next.pdf', name: 'next.pdf',
      source: 'sherlock', x: 56, y: 78
    }])
    expect(JSON.parse(values.get(key) ?? '[]')).toEqual([{
      id: 'next-file', path: '/w/next.pdf', name: 'next.pdf',
      source: 'sherlock', x: 56, y: 78, width: 320,
      height: 320 / (17 / 22) + 32, sizeMode: 'auto', aspectRatio: 17 / 22
    }])
  })

  it('does not report a desktop-rejected orphan outbox write as durable', async () => {
    const writes: Array<{ key: string; value: string }> = []
    let acceptsWrites = false
    const client = await loadClientBundle('dsh-client-ui-conversation', {}, {
      researchCanvasStorage: {
        getItem: () => null,
        setItem: (key, value) => { writes.push({ key, value }); return acceptsWrites }
      }
    })
    const workspace = new client.ResearchWorkspaceRegistry().for('session-rejected-outbox')

    expect(workspace.queueOrphanRevocations(['orphan-node'])).toBe(false)
    expect(workspace.pendingOrphanRevocations()).toEqual(['orphan-node'])
    acceptsWrites = true
    expect(workspace.queueOrphanRevocations(['orphan-node'])).toBe(true)
    expect(writes).toEqual([{
      key: 'sherlock.research.canvas.preview-revocations.v1:session-rejected-outbox',
      value: '["orphan-node"]'
    }, {
      key: 'sherlock.research.canvas.preview-revocations.v1:session-rejected-outbox',
      value: '["orphan-node"]'
    }])
  })

  it('rejects an oversized raw persisted file payload before parsing', async () => {
    const client = await loadConversationClient()
    expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasFileNodes !== 'function') return

    expect(client.parseResearchCanvasFileNodes(JSON.stringify([{
      id: '1', name: 'a.pdf', source: 'computer', x: 12, y: 24,
      ignored: 'x'.repeat(8 * 1024 * 1024)
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
      { id: 'a', name: 'a.txt', source: 'computer', x: 50, y: 50 },
      { id: 'b', name: 'b.txt', source: 'computer', x: 220, y: 220 }
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
      { id: 'a', name: 'a.txt', source: 'computer', x: 50, y: 50 },
      { scale: 2, x: 10, y: 20 }
    )).toEqual({ left: -110, top: 56, right: 330, bottom: 184, width: 440, height: 128 })
  })

  it('normalizes legacy rich and generic node geometry from one type policy', async () => {
    const client = await loadConversationClient()
    expect(client.normalizeResearchCanvasNodeGeometry).toBeTypeOf('function')
    if (typeof client.normalizeResearchCanvasNodeGeometry !== 'function') return

    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'generic', name: 'archive.doc', previewEligible: false, source: 'computer', x: 0, y: 0
    })).toEqual({ width: 220, height: 64, sizeMode: 'auto', resizable: false })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'text', name: 'notes.txt', contentType: 'text/plain; charset=utf-8',
      source: 'computer', x: 0, y: 0
    })).toEqual({ width: 420, height: 320, sizeMode: 'auto', resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'markdown', name: 'notes.md', contentType: 'text/markdown; charset=utf-8',
      source: 'computer', x: 0, y: 0
    })).toEqual({ width: 420, height: 320, sizeMode: 'auto', resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'icon', name: 'favicon.ico', contentType: 'image/x-icon',
      source: 'computer', x: 0, y: 0
    })).toEqual({ width: 320, height: 272, sizeMode: 'auto', aspectRatio: 4 / 3, resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'assistant', kind: 'assistant-result', messageId: 'm1', title: 'Answer',
      excerpt: 'Evidence', x: 0, y: 0
    })).toEqual({ width: 520, height: 300, sizeMode: 'auto', resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'image', name: 'chart.png', mediaType: 'image/png', source: 'computer', x: 0, y: 0
    })).toEqual({ width: 320, height: 272, sizeMode: 'auto', aspectRatio: 4 / 3, resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'pdf', name: 'filing.pdf', mediaType: 'application/pdf', source: 'computer', x: 0, y: 0
    })).toEqual({ width: 320, height: 320 / (17 / 22) + 32, sizeMode: 'auto', aspectRatio: 17 / 22, resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'html', name: 'model.html', mediaType: 'text/html', source: 'computer', x: 0, y: 0
    })).toEqual({ width: 480, height: 360, sizeMode: 'auto', resizable: true })
  })

  it('repairs invalid geometry and clamps finite manual sizes to the shared ceiling', async () => {
    const client = await loadConversationClient()
    expect(client.normalizeResearchCanvasNodeGeometry).toBeTypeOf('function')
    if (typeof client.normalizeResearchCanvasNodeGeometry !== 'function') return

    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'assistant', kind: 'assistant-result', width: -1, height: Number.NaN,
      sizeMode: 'broken', x: 0, y: 0
    })).toEqual({ width: 520, height: 300, sizeMode: 'auto', resizable: true })
    expect(client.normalizeResearchCanvasNodeGeometry({
      id: 'assistant', kind: 'assistant-result', width: 9000, height: 8000,
      sizeMode: 'manual', x: 0, y: 0
    })).toEqual({ width: 2400, height: 2400, sizeMode: 'manual', resizable: true })
  })

  it('uses normalized node dimensions for viewport rectangles at 0.5x and 2x', async () => {
    const client = await loadConversationClient()
    expect(client.researchNodeViewportRect).toBeTypeOf('function')
    if (typeof client.researchNodeViewportRect !== 'function') return
    const node = {
      id: 'html', name: 'model.html', mediaType: 'text/html', source: 'computer',
      x: 100, y: 80, width: 480, height: 360, sizeMode: 'manual'
    }

    expect(client.researchNodeViewportRect(node, { scale: 0.5, x: 10, y: 20 }))
      .toEqual({ left: -60, top: -30, right: 180, bottom: 150, width: 240, height: 180 })
    expect(client.researchNodeViewportRect(node, { scale: 2, x: 10, y: 20 }))
      .toEqual({ left: -270, top: -180, right: 690, bottom: 540, width: 960, height: 720 })
  })

  it('resizes freely from all corners in world units while fixing the opposite corner', async () => {
    const client = await loadConversationClient()
    expect(client.resizeResearchCanvasNode).toBeTypeOf('function')
    if (typeof client.resizeResearchCanvasNode !== 'function') return
    const node = {
      id: 'assistant', kind: 'assistant-result', x: 0, y: 0,
      width: 360, height: 240, sizeMode: 'auto'
    }

    expect(client.resizeResearchCanvasNode(node, 'se', { x: 80, y: 40 }, 2))
      .toMatchObject({ x: 20, y: 10, width: 400, height: 260, sizeMode: 'manual' })
    expect(client.resizeResearchCanvasNode({ ...node, x: 100, y: 100 }, 'nw', { x: 40, y: 20 }, 2))
      .toMatchObject({ x: 100, y: 105, width: 360, height: 230, sizeMode: 'manual' })
    expect(client.resizeResearchCanvasNode(node, 'ne', { x: 80, y: -40 }, 2))
      .toMatchObject({ x: 20, y: -10, width: 400, height: 260, sizeMode: 'manual' })
    expect(client.resizeResearchCanvasNode(node, 'sw', { x: -80, y: 40 }, 2))
      .toMatchObject({ x: -20, y: 10, width: 400, height: 260, sizeMode: 'manual' })
  })

  it('selects a bounded continuous PDF render window around the visible page stream', async () => {
    const client = await loadConversationClient()
    expect(client.researchPdfPageLayout).toBeTypeOf('function')
    expect(client.researchPdfRenderWindow).toBeTypeOf('function')
    if (typeof client.researchPdfPageLayout !== 'function' ||
        typeof client.researchPdfRenderWindow !== 'function') return

    const layout = client.researchPdfPageLayout({
      cssWidth: 318,
      gap: 12,
      pages: [
        { width: 600, height: 800 },
        { width: 1_000, height: 500 },
        { width: 600, height: 1_200 }
      ]
    })
    expect(layout).toEqual([
      { page: 1, top: 0, height: 424, bottom: 424 },
      { page: 2, top: 436, height: 159, bottom: 595 },
      { page: 3, top: 607, height: 636, bottom: 1243 }
    ])
    expect(client.researchPdfRenderWindow({
      layout, scrollTop: 610, viewportHeight: 200, overscan: 0
    })).toEqual([3])
    expect(client.researchPdfRenderWindow({
      layout, scrollTop: 180, viewportHeight: 200, overscan: 240
    })).toEqual([1, 2, 3])
    expect(client.researchPdfRenderWindow({
      layout, scrollTop: Number.POSITIVE_INFINITY, viewportHeight: 0, overscan: -1
    })).toEqual([1])
  })

  it('caps PDF canvas backing pixels while preserving the page aspect ratio', async () => {
    const client = await loadConversationClient()
    expect(client.researchPdfBackingStore).toBeTypeOf('function')
    if (typeof client.researchPdfBackingStore !== 'function') return

    const backing = client.researchPdfBackingStore({
      pageWidth: 612,
      pageHeight: 792,
      cssWidth: 2_000,
      devicePixelRatio: 3,
      maxPixels: 4_000_000
    })
    expect(backing.cssWidth).toBe(2_000)
    expect(backing.cssHeight).toBeCloseTo(2_588.235294, 5)
    expect(backing.outputScale).toBeLessThan(1)
    expect(backing.backingWidth * backing.backingHeight).toBeLessThanOrEqual(4_000_000)
    expect(backing.backingWidth / backing.backingHeight).toBeCloseTo(612 / 792, 2)

    const tinyBudget = client.researchPdfBackingStore({
      pageWidth: 1_000,
      pageHeight: 1_000,
      cssWidth: 1_000,
      devicePixelRatio: 4,
      maxPixels: 100
    })
    expect(tinyBudget.outputScale).toBeCloseTo(0.01, 8)
    expect(tinyBudget.backingWidth * tinyBudget.backingHeight).toBeLessThanOrEqual(100)

    const invalid = client.researchPdfBackingStore({
      pageWidth: Number.POSITIVE_INFINITY,
      pageHeight: Number.NaN,
      cssWidth: Number.POSITIVE_INFINITY,
      devicePixelRatio: Number.NaN,
      maxPixels: 1
    })
    expect(invalid).toEqual({
      cssWidth: 1, cssHeight: 1, outputScale: 1, backingWidth: 1, backingHeight: 1
    })
  })

  it('persists the first PDF page ratio only for an auto node that still has the default ratio', async () => {
    const client = await loadConversationClient()
    expect(client.researchPdfGeometryForPage).toBeTypeOf('function')
    if (typeof client.researchPdfGeometryForPage !== 'function') return

    const initial = {
      id: 'pdf', name: 'filing.pdf', contentType: 'application/pdf', source: 'computer',
      x: 0, y: 0, width: 320, height: 320 / (17 / 22) + 32,
      sizeMode: 'auto', aspectRatio: 17 / 22
    }
    expect(client.researchPdfGeometryForPage(initial, 600, 800)).toEqual({
      width: 320, height: 320 / 0.75 + 32, sizeMode: 'auto', aspectRatio: 0.75
    })
    expect(client.researchPdfGeometryForPage({
      ...initial, height: 320 / 0.75 + 32, aspectRatio: 0.75
    }, 612, 792)).toBeNull()
    expect(client.researchPdfGeometryForPage({
      ...initial, width: 540, height: 540 / 1.4 + 32,
      sizeMode: 'manual', aspectRatio: 1.4
    }, 600, 800)).toBeNull()
  })

  it('clamps free and aspect-locked resize with title height outside the content ratio', async () => {
    const client = await loadConversationClient()
    expect(client.resizeResearchCanvasNode).toBeTypeOf('function')
    if (typeof client.resizeResearchCanvasNode !== 'function') return

    expect(client.resizeResearchCanvasNode({
      id: 'html', name: 'model.html', mediaType: 'text/html', source: 'computer',
      x: 0, y: 0, width: 480, height: 360, sizeMode: 'auto'
    }, 'nw', { x: 4000, y: 4000 }, 1)).toMatchObject({
      x: 80, y: 60, width: 320, height: 240, sizeMode: 'manual'
    })
    expect(client.resizeResearchCanvasNode({
      id: 'assistant', kind: 'assistant-result', x: 0, y: 0,
      width: 360, height: 240, sizeMode: 'manual'
    }, 'se', { x: 9000, y: 9000 }, 1)).toMatchObject({
      x: 1020, y: 1080, width: 2400, height: 2400
    })
    expect(client.resizeResearchCanvasNode({
      id: 'image', name: 'chart.png', mediaType: 'image/png', source: 'computer',
      x: 0, y: 0, width: 320, height: 272, sizeMode: 'auto', aspectRatio: 4 / 3
    }, 'se', { x: 80, y: 40 }, 2)).toMatchObject({
      x: 20, y: 15, width: 360, height: 302, sizeMode: 'manual', aspectRatio: 4 / 3
    })
  })

  it('enforces both type minimum dimensions for non-default locked aspect ratios', async () => {
    const client = await loadConversationClient()
    expect(client.normalizeResearchCanvasNodeGeometry).toBeTypeOf('function')
    expect(client.resizeResearchCanvasNode).toBeTypeOf('function')
    if (typeof client.normalizeResearchCanvasNodeGeometry !== 'function' ||
        typeof client.resizeResearchCanvasNode !== 'function') return
    const wideImage = {
      id: 'wide-image', name: 'wide.png', mediaType: 'image/png', source: 'computer',
      x: 0, y: 0, width: 160, height: 52, sizeMode: 'manual', aspectRatio: 8
    }

    expect(client.normalizeResearchCanvasNodeGeometry(wideImage)).toEqual({
      width: 960, height: 152, sizeMode: 'manual', aspectRatio: 8, resizable: true
    })
    expect(client.resizeResearchCanvasNode(
      wideImage, 'se', { x: -5000, y: -5000 }, 1
    )).toMatchObject({
      x: 0, y: 0, width: 960, height: 152,
      sizeMode: 'manual', aspectRatio: 8
    })
    expect(client.normalizeResearchCanvasNodeGeometry({
      ...wideImage, id: 'tall-image', width: 120, aspectRatio: 0.25
    })).toEqual({
      width: 160, height: 672, sizeMode: 'manual', aspectRatio: 0.25, resizable: true
    })
  })

  it('persists normalized manual geometry and reloads repaired legacy JSON', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const sessionId = 'geometry-round-trip'
    const storage = memoryStorage({
      [`sherlock.research.canvas.files.v1:${sessionId}`]: JSON.stringify([{
        id: 'html', name: 'model.html', mediaType: 'text/html', source: 'computer',
        x: 20, y: 30, width: -4, height: null, sizeMode: 'broken'
      }])
    })
    const workspace = new client.ResearchWorkspaceRegistry(storage).for(sessionId)
    expect(workspace.getSnapshot().files[0]).toMatchObject({
      width: 480, height: 360, sizeMode: 'auto'
    })

    workspace.resizeNode('html', 'se', { x: 40, y: 20 }, 1)
    workspace.persist()
    expect(new client.ResearchWorkspaceRegistry(storage).for(sessionId)
      .getSnapshot().files[0]).toMatchObject({
        x: 40, y: 40, width: 520, height: 380, sizeMode: 'manual'
      })
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

  it('removes the requested canvas nodes without touching unrelated files or artifacts', async () => {
    const client = await loadConversationClient()
    expect(client.removeResearchCanvasNodes).toBeTypeOf('function')
    if (typeof client.removeResearchCanvasNodes !== 'function') return

    const removed = client.removeResearchCanvasNodes(
      [
        { id: 'f1', name: 'one.pdf', path: '/w/one.pdf', source: 'computer', x: 10, y: 20 },
        { id: 'f2', name: 'two.pdf', path: '/w/two.pdf', source: 'computer', x: 30, y: 40 }
      ],
      [
        { id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'One', excerpt: 'A', x: 50, y: 60 },
        { id: 'a2', kind: 'assistant-result', messageId: 'm2', title: 'Two', excerpt: 'B', x: 70, y: 80 }
      ],
      ['f2', 'a1']
    )

    expect(removed).toEqual({
      files: [
        { id: 'f1', name: 'one.pdf', path: '/w/one.pdf', source: 'computer', x: 10, y: 20 }
      ],
      artifacts: [
        { id: 'a2', kind: 'assistant-result', messageId: 'm2', title: 'Two', excerpt: 'B', x: 70, y: 80 }
      ]
    })
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
      {
        id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer',
        excerpt: 'Text', x: 1, y: 2, width: 520, height: 300, sizeMode: 'auto'
      }
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
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, id: 'untrusted' }))).toBeNull()
    expect(client.parseResearchArtifactDrag(JSON.stringify({
      ...payload, html: '<strong>Text</strong>'
    }))).toBeNull()
    expect(client.parseResearchArtifactDrag(JSON.stringify({
      ...payload, kind: 'assistant-html'
    }))).toBeNull()
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, title: 'x'.repeat(257) }))).toBeNull()
    expect(client.parseResearchArtifactDrag(JSON.stringify({ ...payload, excerpt: 'x'.repeat(16_385) }))).toBeNull()
    const maximallyEscaped = {
      sessionId: '\u0001'.repeat(512),
      messageId: '\u0002'.repeat(512),
      kind: 'assistant-excerpt',
      title: '\u0003'.repeat(256),
      excerpt: '\u0004'.repeat(16_384)
    }
    const maximallyEscapedRaw = JSON.stringify(maximallyEscaped)
    expect(client.parseResearchArtifactDrag(maximallyEscapedRaw)).toEqual(maximallyEscaped)
    expect(client.parseResearchArtifactDrag(
      `${' '.repeat(256)}${maximallyEscapedRaw}`
    )).toBeNull()
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
      title: 'Answer', excerpt: 'Evidence', x: 120, y: 80,
      width: 520, height: 300, sizeMode: 'auto'
    }])
    expect(client.placeResearchCanvasArtifact(
      placed, { ...payload, title: 'Revised' }, { x: 240, y: 160 }, () => 'unused'
    )).toEqual([{
      id: 'artifact-1', messageId: 'm1', kind: 'assistant-result',
      title: 'Answer', excerpt: 'Evidence', x: 240, y: 160,
      width: 520, height: 300, sizeMode: 'auto'
    }])
  })

  it('keeps manual artifact geometry when dedupe repositions the same assistant result', async () => {
    const client = await loadConversationClient()
    expect(client.placeResearchCanvasArtifact).toBeTypeOf('function')
    if (typeof client.placeResearchCanvasArtifact !== 'function') return
    const manual = [{
      id: 'artifact-manual', messageId: 'm-manual', kind: 'assistant-result',
      title: 'Original', excerpt: 'Original evidence', x: 20, y: 30,
      width: 720, height: 480, sizeMode: 'manual'
    }]

    expect(client.placeResearchCanvasArtifact(
      manual,
      {
        sessionId: 's1', messageId: 'm-manual', kind: 'assistant-result',
        title: 'Updated', excerpt: 'Updated evidence'
      },
      { x: 240, y: 160 },
      () => 'unused'
    )).toEqual([{
      id: 'artifact-manual', messageId: 'm-manual', kind: 'assistant-result',
      title: 'Original', excerpt: 'Updated evidence', x: 240, y: 160,
      width: 720, height: 480, sizeMode: 'manual'
    }])
  })

  it('keeps delimiter-bearing excerpt identities distinct during placement', async () => {
    const client = await loadConversationClient()
    expect(client.placeResearchCanvasArtifact).toBeTypeOf('function')
    if (typeof client.placeResearchCanvasArtifact !== 'function') return
    const first = {
      sessionId: 's1', messageId: 'm:a', kind: 'assistant-excerpt',
      title: '助手摘录', excerpt: 'b'
    }
    const second = {
      sessionId: 's1', messageId: 'm', kind: 'assistant-excerpt',
      title: '助手摘录', excerpt: 'a:b'
    }
    const placed = client.placeResearchCanvasArtifact(
      [], first, { x: 10, y: 20 }, () => 'artifact-1'
    )
    const together = client.placeResearchCanvasArtifact(
      placed, second, { x: 30, y: 40 }, () => 'artifact-2'
    )

    expect(together).toMatchObject([
      { id: 'artifact-1', messageId: 'm:a', excerpt: 'b', x: 10, y: 20 },
      { id: 'artifact-2', messageId: 'm', excerpt: 'a:b', x: 30, y: 40 }
    ])
  })

  it('restores delimiter-bearing excerpt identities independently from persistence', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const storage = memoryStorage({
      'sherlock.research.canvas.artifacts.v1:s1': JSON.stringify([
        {
          id: 'artifact-1', kind: 'assistant-excerpt', messageId: 'm:a',
          title: '助手摘录', excerpt: 'b', x: 10, y: 20
        },
        {
          id: 'artifact-2', kind: 'assistant-excerpt', messageId: 'm',
          title: '助手摘录', excerpt: 'a:b', x: 30, y: 40
        }
      ])
    })
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('s1')

    expect(workspace.getSnapshot().artifacts).toMatchObject([
      { id: 'artifact-1', messageId: 'm:a', excerpt: 'b' },
      { id: 'artifact-2', messageId: 'm', excerpt: 'a:b' }
    ])
  })

  it('rejects unsupported artifact kinds on set and localStorage restore', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const invalid = {
      id: 'artifact-html', kind: 'assistant-html', messageId: 'm1',
      title: 'HTML', excerpt: '<strong>unsafe</strong>', x: 10, y: 20
    }
    const restoredStorage = memoryStorage({
      'sherlock.research.canvas.artifacts.v1:restored': JSON.stringify([invalid])
    })
    const restored = new client.ResearchWorkspaceRegistry(restoredStorage).for('restored')
    expect(restored.getSnapshot().artifacts).toEqual([])

    const setStorage = memoryStorage({})
    const setWorkspace = new client.ResearchWorkspaceRegistry(setStorage).for('set')
    setWorkspace.setArtifacts([invalid])
    expect(setWorkspace.getSnapshot().artifacts).toEqual([])
    expect(JSON.parse(setStorage.getItem(
      'sherlock.research.canvas.artifacts.v1:set'
    ) ?? 'null')).toEqual([])
  })

  it('keeps one assistant result while normalized excerpts dedupe independently', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) }
    }
    const Registry = client.ResearchWorkspaceRegistry as new (
      storage: {
        getItem(key: string): string | null
        setItem(key: string, value: string): void
      }
    ) => {
      for(id: string): {
        getSnapshot(): {
          artifacts: Array<Record<string, unknown>>
          viewport: { scale: number; x: number; y: number }
          canvasSize: { width: number; height: number }
        }
        addAssistantResult(input: {
          messageId: string
          text: string
          at: { x: number; y: number }
        }): void
        addExcerpt(
          messageId: string,
          excerpt: string,
          at: { x: number; y: number }
        ): void
      }
    }
    const workspace = new Registry(storage).for('s1')

    workspace.addAssistantResult({
      messageId: 'm1', text: 'Revenue improved.', at: { x: 120, y: 80 }
    })
    workspace.addAssistantResult({
      messageId: 'm1', text: 'Revenue improved.', at: { x: 240, y: 160 }
    })
    workspace.addExcerpt('m1', '  Margin   expanded. ', { x: 300, y: 200 })
    workspace.addExcerpt('m1', 'Margin expanded.', { x: 340, y: 220 })
    workspace.addExcerpt('m1', 'Cash flow improved.', { x: 380, y: 240 })

    expect(workspace.getSnapshot().artifacts).toMatchObject([
      {
        kind: 'assistant-result', messageId: 'm1', excerpt: 'Revenue improved.',
        x: 240, y: 160
      },
      {
        kind: 'assistant-excerpt', messageId: 'm1', excerpt: 'Margin expanded.',
        x: 340, y: 220
      },
      {
        kind: 'assistant-excerpt', messageId: 'm1', excerpt: 'Cash flow improved.',
        x: 380, y: 240
      }
    ])
    expect(JSON.parse(values.get(
      'sherlock.research.canvas.artifacts.v1:s1'
    ) ?? '[]')).toHaveLength(3)
  })

  it('persists the full supported set of ordinary maximum-length artifacts', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length <= 8 * 1024 * 1024) values.set(key, value)
      }
    }
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('capacity')

    workspace.setArtifacts(Array.from({ length: 256 }, (_, index) => ({
      id: `artifact-${index}`,
      kind: 'assistant-excerpt',
      messageId: `message-${index}`,
      title: '助手摘录',
      excerpt: `${index}:${'x'.repeat(16_374)}`,
      x: index,
      y: index
    })))

    expect(workspace.getSnapshot().artifacts).toHaveLength(256)
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('capacity').getSnapshot().artifacts).toHaveLength(256)
  })

  it('keeps existing artifacts when escaped content reaches the aggregate cap', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    expect(client.placeResearchCanvasArtifact).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function' ||
        typeof client.placeResearchCanvasArtifact !== 'function') return
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length <= 8 * 1024 * 1024) values.set(key, value)
      }
    }
    const workspace = new client.ResearchWorkspaceRegistry(storage).for('escaped')

    workspace.setArtifacts([
      {
        id: 'result-id', kind: 'assistant-result', messageId: 'result',
        title: '助手回复', excerpt: 'short', x: -1, y: -1
      },
      ...Array.from({ length: 255 }, (_, index) => ({
        id: `artifact-${index}`,
        kind: 'assistant-excerpt',
        messageId: `message-${index}`,
        title: '助手摘录',
        excerpt: `${index}:${'\u0001'.repeat(16_374)}`,
        x: index,
        y: index
      }))
    ])
    const before = workspace.getSnapshot().artifacts
    expect(before.length).toBeGreaterThan(0)
    expect(before.length).toBeLessThan(256)

    const next = client.placeResearchCanvasArtifact(
      before,
      {
        sessionId: 'escaped', messageId: 'dragged', kind: 'assistant-excerpt',
        title: '助手摘录', excerpt: 'short'
      },
      { x: 0, y: 0 },
      () => 'dragged'
    )
    workspace.setArtifacts(next)

    expect(workspace.getSnapshot().artifacts.length).toBeGreaterThanOrEqual(before.length)
    expect(workspace.getSnapshot().artifacts[0]).toEqual(before[0])
    expect(new client.ResearchWorkspaceRegistry(storage)
      .for('escaped').getSnapshot().artifacts[0]).toEqual(before[0])

    const beforeUpdate = workspace.getSnapshot().artifacts
    const beforeIds = new Set(beforeUpdate.map((artifact: { id: string }) => artifact.id))
    workspace.addAssistantResult({
      messageId: 'result', text: '\u0001'.repeat(16_384), at: { x: 1, y: 1 }
    })
    const afterUpdate = workspace.getSnapshot().artifacts
    expect(afterUpdate).toHaveLength(beforeUpdate.length)
    expect(afterUpdate.every((artifact: { id: string }) => beforeIds.has(artifact.id))).toBe(true)
    expect(afterUpdate.find((artifact: { messageId: string }) => artifact.messageId === 'result'))
      .toMatchObject({ excerpt: 'short', x: -1, y: -1 })
  }, 15_000)

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

  it('releases every transient source state while preserving persisted Research state', async () => {
    const client = await loadConversationClient()
    expect(client.ResearchWorkspaceRegistry).toBeTypeOf('function')
    if (typeof client.ResearchWorkspaceRegistry !== 'function') return
    const storage = memoryStorage({
      'sherlock.research.canvas.files.v1:s1': JSON.stringify([
        { id: 'f1', path: '/w/one.pdf', name: 'one.pdf', source: 'computer', x: 1, y: 2 }
      ]),
      'sherlock.research.canvas.artifacts.v1:s1': JSON.stringify([
        { id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 3, y: 4 }
      ]),
      'sherlock.research.canvas.selection.v1:s1': JSON.stringify({
        selectedNodeIds: ['f1', 'a1'], orderedFileIds: ['f1']
      })
    })
    const registry = new client.ResearchWorkspaceRegistry(storage)
    const workspace = registry.for('s1')
    workspace.setPendingMessageJump('m1')
    workspace.setSourceAvailability('m1', false)
    const before = workspace.getSnapshot()
    expect(before.unavailableSourceMessageIds).toEqual(['m1'])

    registry.release('s1')

    const after = workspace.getSnapshot()
    expect(after.pendingMessageJump).toBeNull()
    expect(after.unavailableSourceMessageIds).toEqual([])
    expect(after.files).toEqual(before.files)
    expect(after.artifacts).toEqual(before.artifacts)
    expect(after.selection).toEqual(before.selection)
    expect(JSON.parse(storage.getItem(
      'sherlock.research.canvas.selection.v1:s1'
    ) ?? 'null')).toEqual({
      selectedNodeIds: ['f1', 'a1'], orderedFileIds: ['f1']
    })
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

    const referencedFiles = [
      { id: 'f2', name: 'two.pdf', path: '/w/two.pdf' },
      { id: 'f1', name: 'one.pdf', path: '/w/one.pdf' }
    ]
    const serializedDraft = await serializedResearchReferences(
      client, referencedFiles, 'compare these'
    )
    let draft = '\uFFFC\uFFFCcompare these'
    let draftRev = 1
    let occurrences = referencedFiles.map((file, index) => ({
      occurrenceId: index + 1,
      source: 'research-file',
      ref: JSON.stringify(file),
      offset: index,
      label: file.name,
      clipboardText: file.name
    }))
    let imageIds = ['i1']
    const notices: string[] = []
    const shell = {
      get snapshot() { return { draft, draftRev, occurrences, imageIds: [...imageIds] } },
      commitSend(admitted: string[]) {
        const sent = new Set(admitted)
        imageIds = imageIds.filter((id) => !sent.has(id))
        draft = ''
        occurrences = []
        draftRev += 1
      },
      restoreImages(admitted: string[]) {
        const sent = new Set(admitted)
        imageIds = [...admitted, ...imageIds.filter((id) => !sent.has(id))]
      },
      restoreDraftState(state: { draft: string; occurrences: typeof occurrences }) {
        draft = state.draft
        occurrences = state.occurrences
        draftRev += 1
      },
      notify(_level: string, text: string) { notices.push(text) }
    }
    hub.shells.set('s1', shell)
    const session = { sessionId: 's1' }

    const operation = hub.sink(session, serializedDraft, [...imageIds], 'queue')
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

    expect(draft).toBe('\uFFFC\uFFFCcompare these')
    expect(occurrences).toHaveLength(2)
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
      const file = {
        id: 'f1', name: 'report.pdf',
        ...(fixture.path === undefined ? {} : { path: fixture.path })
      }
      const serializedDraft = await serializedResearchReferences(client, [file], fixture.draft)
      const admittedDraft = `\uFFFC${fixture.draft}`
      let draft: string = admittedDraft
      let draftRev = 1
      let occurrences = [{
        occurrenceId: 1,
        source: 'research-file',
        ref: JSON.stringify(file),
        offset: 0,
        label: file.name,
        clipboardText: file.name
      }]
      let imageIds: string[] = [...fixture.images]
      const notices: string[] = []
      const shell = {
        get snapshot() { return { draft, draftRev, occurrences, imageIds } },
        commitSend() { draft = ''; occurrences = []; imageIds = []; draftRev += 1 },
        restoreImages() {},
        restoreDraftState(state: { draft: string; occurrences: typeof occurrences }) {
          draft = state.draft
          occurrences = state.occurrences
          draftRev += 1
        },
        notify(_level: string, text: string) { notices.push(text) }
      }
      hub.shells.set(sessionId, shell)

      await hub.sink({ sessionId }, serializedDraft, [...imageIds], 'queue')

      expect(sendSession).toHaveBeenCalledTimes(fixture.sends)
      expect(registry.for(sessionId).selectionSnapshot().orderedFileIds)
        .toEqual(fixture.cleared ? [] : ['f1'])
      expect(draft).toBe(fixture.cleared ? '' : admittedDraft)
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
    let draftRev = 1
    const shell = {
      get snapshot() { return { draft, draftRev, occurrences: [], imageIds: [] } },
      commitSend() { draft = ''; draftRev += 1 },
      restoreImages() {},
      restoreDraftState(state: { draft: string }) { draft = state.draft; draftRev += 1 },
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

  it('does not resurrect a submitted draft after the user types and clears before rejection', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    const registry = new client.ResearchWorkspaceRegistry(memoryStorage({}))
    const gate = deferred<void>()
    const hub = new client.InputHub({
      get: (name: string) => name === 'conversation'
        ? { sendSession: () => gate.promise, releaseDraftImage: () => undefined }
        : undefined
    }, (key: string) => key, registry)
    const session = { sessionId: 's-edited-then-cleared' }
    let draft = 'first draft'
    let draftRev = 1
    const shell = {
      get snapshot() { return { draft, draftRev, occurrences: [], imageIds: [] } },
      commitSend() { draft = ''; draftRev += 1 },
      restoreImages() {},
      setDraft(text: string) { draft = text; draftRev += 1 },
      restoreDraftState(state: { draft: string }) { draft = state.draft; draftRev += 1 },
      notify() {}
    }
    hub.shells.set(session.sessionId, shell)

    const operation = hub.sink(session, draft, [], 'queue')
    await vi.waitFor(() => { expect(draft).toBe('') })
    shell.setDraft('new work')
    shell.setDraft('')
    gate.reject(new Error('send failed'))
    await operation

    expect(draft).toBe('')
  })

  it('lets the input shell submit a file-only native Research reference', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation', {
      '@deepseek-ai/dsh-client-runtime/client': { createSnapshotStore }
    })
    expect(client.SessionInputShell).toBeTypeOf('function')
    if (typeof client.SessionInputShell !== 'function') return
    const sends: Array<{ text: string, images: string[], mode: string }> = []
    const shell = new client.SessionInputShell({
      actx: {},
      inputTriggers: () => ({
        adjudicate: async () => undefined,
        serializeReference: (_source: string, ref: string, signal: AbortSignal) =>
          client.researchFileReferenceCodec.serialize(ref, signal),
        dismiss: () => undefined,
        track: () => undefined
      }),
      defaultSink: (text: string, images: string[], mode: string) => {
        sends.push({ text, images, mode })
      }
    })

    shell.insertReference(
      client.researchFileReference({ id: 'f1', name: 'report.pdf', path: '/w/report.pdf' }),
      { start: 0, end: 0, draftRev: shell.snapshot.draftRev }
    )

    shell.submit('queue')

    await vi.waitFor(() => { expect(sends).toHaveLength(1) })
    expect(client.extractResearchFileReferences(sends[0]?.text)).toEqual({
      text: '',
      files: [{ id: 'f1', name: 'report.pdf', path: '/w/report.pdf' }],
      occurrences: [{ fileId: 'f1', offset: 0 }]
    })
    expect(sends[0]).toMatchObject({ images: [], mode: 'queue' })
    expect(shell.snapshot.draft).toContain('\uFFFC')
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

  it('canonicalizes only safe web component URLs', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.normalizeResearchWebUrl).toBeTypeOf('function')
    if (typeof client.normalizeResearchWebUrl !== 'function') return

    expect(client.normalizeResearchWebUrl(' HTTPS://Example.com:443/dashboard '))
      .toBe('https://example.com/dashboard')
    expect(client.normalizeResearchWebUrl('http://Example.com:80/path'))
      .toBe('http://example.com/path')
    for (const value of [
      'file:///tmp/report.html',
      'javascript:alert(1)',
      'data:text/html,hello',
      'https://user:pass@example.com/',
      `https://example.com/${'x'.repeat(8_192)}`
    ]) {
      expect(client.normalizeResearchWebUrl(value), value).toBeNull()
    }
  })

  it('accepts five exact bounded native container schemas and rejects executable or malformed output', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.parseResearchContainerSpec).toBeTypeOf('function')
    if (typeof client.parseResearchContainerSpec !== 'function') return

    const fixtures = [
      {
        version: 1, type: 'web', title: '市场监控',
        url: 'https://example.com/market', description: '公开市场页面'
      },
      {
        version: 1, type: 'chart', title: '收入趋势', variant: 'bar',
        labels: ['一月', '二月'], series: [{ name: '收入', values: [10, 12] }]
      },
      {
        version: 1, type: 'table', title: '产品数据',
        columns: ['产品', '规模'], rows: [['A', 10], ['B', 12]]
      },
      {
        version: 1, type: 'kpi', title: '核心指标',
        items: [{ label: '收入', value: '12 亿', change: '+8%' }]
      },
      {
        version: 1, type: 'markdown', title: '研究结论',
        content: '## 结论\n\n增长保持稳定。'
      }
    ]
    for (const fixture of fixtures) {
      expect(client.parseResearchContainerSpec(JSON.stringify(fixture)))
        .toEqual(fixture)
    }
    expect(client.parseResearchContainerSpec('```json\n' + JSON.stringify(fixtures[1]) + '\n```'))
      .toEqual(fixtures[1])
    expect(client.parseResearchContainerSpec(JSON.stringify({
      version: 1, type: 'markdown', title: '危险内容', content: '<script>alert(1)</script>',
      script: 'alert(1)'
    }))).toBeNull()
    expect(client.parseResearchContainerSpec({
      version: 1, type: 'chart', title: '错误图表', variant: 'line',
      labels: ['一月'], series: [{ name: '收入', values: [Number.POSITIVE_INFINITY] }]
    })).toBeNull()
    expect(client.parseResearchContainerSpec('{"version":1,"type":"script"}')).toBeNull()
  })

  it('persists bounded web-link and container draft artifacts while rejecting invalid fields', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.parseResearchCanvasArtifactNodes).toBeTypeOf('function')
    if (typeof client.parseResearchCanvasArtifactNodes !== 'function') return
    const nodes = [{
      id: 'link-1', kind: 'web-link', messageId: 'link-1', title: 'example.com',
      excerpt: 'https://example.com/dashboard', url: 'https://example.com/dashboard',
      x: 200, y: 180, width: 720, height: 480, sizeMode: 'auto'
    }, {
      id: 'container-1', kind: 'generated-container', messageId: 'container-1',
      title: '智能容器', excerpt: '描述想创建的内容', generationStatus: 'draft',
      containerPrompt: '', refreshMinutes: 0,
      x: 500, y: 180, width: 520, height: 300, sizeMode: 'auto'
    }]

    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify(nodes)))
      .toMatchObject(nodes)
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify([{
      ...nodes[0], url: 'javascript:alert(1)'
    }]))).toEqual([])
    expect(client.parseResearchCanvasArtifactNodes(JSON.stringify([{
      ...nodes[1], refreshMinutes: 2
    }]))).toEqual([])
  })

  it('places new global-toolbar nodes at the visible center with a bounded cascade', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.researchCanvasViewportPlacement).toBeTypeOf('function')
    if (typeof client.researchCanvasViewportPlacement !== 'function') return
    const snapshot = {
      viewport: { scale: 0.5, x: -100, y: -50 },
      canvasSize: { width: 800, height: 600 }
    }

    expect(client.researchCanvasViewportPlacement(snapshot, 'web-link', 0))
      .toEqual({ x: 1_000, y: 700, width: 720, height: 480, sizeMode: 'auto' })
    expect(client.researchCanvasViewportPlacement(snapshot, 'generated-container', 8))
      .toEqual({ x: 1_144, y: 844, width: 520, height: 300, sizeMode: 'auto' })
    expect(client.researchCanvasViewportPlacement(snapshot, 'unknown', 0)).toBeNull()
  })

  it('allows scheduled container refresh only while the completed component is active and due', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.researchContainerRefreshDue).toBeTypeOf('function')
    if (typeof client.researchContainerRefreshDue !== 'function') return
    const node = {
      kind: 'generated-container', generationStatus: 'completed', refreshMinutes: 1,
      lastSuccessfulAt: 1_000, containerSpec: { version: 1, type: 'markdown' }
    }

    expect(client.researchContainerRefreshDue(node, {
      visible: true, documentVisible: true, inert: false, now: 61_000
    })).toBe(true)
    for (const state of [
      { visible: false, documentVisible: true, inert: false, now: 61_000 },
      { visible: true, documentVisible: false, inert: false, now: 61_000 },
      { visible: true, documentVisible: true, inert: true, now: 61_000 },
      { visible: true, documentVisible: true, inert: false, now: 60_999 }
    ]) {
      expect(client.researchContainerRefreshDue(node, state)).toBe(false)
    }
    expect(client.researchContainerRefreshDue({
      ...node, generationStatus: 'running'
    }, {
      visible: true, documentVisible: true, inert: false, now: 120_000
    })).toBe(false)
  })

  it('creates, updates, selects, and restores global-toolbar artifacts through the workspace', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    const storage = memoryStorage({})
    const registry = new client.ResearchWorkspaceRegistry(storage)
    const workspace = registry.for('global-toolbar-session')
    workspace.setCanvasSize({ width: 800, height: 600 })
    workspace.setViewport({ scale: 1, x: 0, y: 0 })

    expect(workspace.createWebLink).toBeTypeOf('function')
    expect(workspace.createContainerDraft).toBeTypeOf('function')
    expect(workspace.updateWebLink).toBeTypeOf('function')
    expect(workspace.updateContainerDraft).toBeTypeOf('function')
    expect(workspace.setContainerRefresh).toBeTypeOf('function')
    if (typeof workspace.createWebLink !== 'function') return

    const link = workspace.createWebLink('https://Example.com/dashboard')
    expect(link).toMatchObject({
      kind: 'web-link', title: 'example.com', url: 'https://example.com/dashboard',
      x: 400, y: 300, width: 720, height: 480
    })
    expect(workspace.getSnapshot().selection.selectedNodeIds).toEqual([link.id])
    expect(workspace.updateWebLink(link.id, 'javascript:alert(1)')).toBe(false)
    expect(workspace.updateWebLink(link.id, 'https://example.org/next')).toBe(true)

    const container = workspace.createContainerDraft()
    expect(container).toMatchObject({
      kind: 'generated-container', generationStatus: 'draft',
      containerPrompt: '', refreshMinutes: 0,
      x: 424, y: 324, width: 520, height: 300
    })
    expect(workspace.updateContainerDraft(container.id, '  ')).toBe(false)
    expect(workspace.updateContainerDraft(container.id, '制作月度收入柱状图')).toBe(true)
    expect(workspace.setContainerRefresh(container.id, 2)).toBe(false)
    expect(workspace.setContainerRefresh(container.id, 5)).toBe(true)

    const restored = new client.ResearchWorkspaceRegistry(storage)
      .for('global-toolbar-session').getSnapshot()
    expect(restored.artifacts).toMatchObject([{
      id: link.id, kind: 'web-link', url: 'https://example.org/next'
    }, {
      id: container.id, kind: 'generated-container',
      containerPrompt: '制作月度收入柱状图', refreshMinutes: 5
    }])
    expect(restored.selection.selectedNodeIds).toEqual([container.id])
  })
})
