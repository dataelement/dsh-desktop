import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { Window, type HTMLElement as HappyDOMHTMLElement } from 'happy-dom'
import { describe, expect, it, vi } from 'vitest'

import { patchSherlockOfficePreviewClient } from '../scripts/lib/patch-sherlock-office-preview.mjs'

type ClientBundle = Record<string, any>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)
const { act, createElement } = requireModule('react') as {
  act(callback: () => void | Promise<void>): Promise<void>
  createElement(type: unknown, props?: unknown): unknown
}
const { createRoot } = requireModule('react-dom/client') as {
  createRoot(container: unknown): { render(node: unknown): void; unmount(): void }
}
const officeClientPath = new URL(
  '../build/sherlock-plugin-profile/vendor/@huanlin/dsh-plugin-better-sidebar-plugin-office/lib/client.js',
  import.meta.url
)

async function officeClientSource(): Promise<string> {
  return readFile(officeClientPath, 'utf8')
}

async function loadPatchedOfficeClient(options: {
  document?: unknown
  window?: Window | Record<string, unknown>
  fetch?: typeof fetch
  sourceTransform?(source: string): string
  testEngine?: Record<string, unknown>
} = {}): Promise<ClientBundle> {
  const patched = patchSherlockOfficePreviewClient(await officeClientSource())
  const source = options.sourceTransform?.(patched) ?? patched
  let descriptor: BundleDescriptor | undefined
  const bundleWindow = options.window ?? {}
  Object.assign(bundleWindow, {
    __ModuleLoader__: {
      load(value: BundleDescriptor) { descriptor = value }
    }
  })
  runInNewContext(source, {
    AbortController: globalThis.AbortController,
    Array,
    Blob,
    Map,
    Set,
    String,
    TextDecoder: globalThis.TextDecoder,
    URL: globalThis.URL,
    URLSearchParams: globalThis.URLSearchParams,
    clearTimeout,
    document: options.document,
    fetch: options.fetch,
    global: { Array, String },
    navigator: options.window instanceof Window ? options.window.navigator : { language: 'zh-CN' },
    setTimeout,
    __sherlockOfficeTest: options.testEngine,
    window: bundleWindow
  })
  if (descriptor === undefined) throw new Error('Office bundle did not register')
  return descriptor.factory((id) => {
    if (id === 'util') return requireModule('util')
    return requireModule(id)
  })
}

function installBrowserGlobals(browserWindow: Window): () => void {
  const keys = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'] as const
  const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
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

function instrumentDelayedOfficeEngine(source: string, kind: 'docx' | 'pptx'): string {
  if (kind === 'docx') {
    const match = /await renderAsync\(buf, (wrap|mount), void 0, \{/u.exec(source)
    if (match === null) throw new Error('DOCX render anchor missing')
    return source.replace(
      match[0],
      `await __sherlockOfficeTest.renderDocx(buf, ${match[1]}, void 0, {`
    )
  }
  const engineImport = 'const { PptxViewer, RECOMMENDED_ZIP_LIMITS } = await Promise.resolve().then(() => (init_aiden0z_pptx_renderer_es(), aiden0z_pptx_renderer_es_exports));'
  if (source.split(engineImport).length - 1 !== 1) throw new Error('PPTX engine import anchor missing')
  return source.replace(
    engineImport,
    'const PptxViewer = { open: __sherlockOfficeTest.openPptx }; const RECOMMENDED_ZIP_LIMITS = {};'
  )
}

async function waitForCalls(calls: unknown[], count: number): Promise<void> {
  for (let attempt = 0; attempt < 30 && calls.length < count; attempt += 1) {
    await act(async () => { await Promise.resolve() })
  }
  expect(calls).toHaveLength(count)
}

describe('Sherlock bundled Office preview adapter', () => {
  it('patches the pinned Office package exactly once and keeps the sidebar route intact', async () => {
    const source = await officeClientSource()
    const patched = patchSherlockOfficePreviewClient(source)

    expect(patchSherlockOfficePreviewClient(patched)).toBe(patched)
    const previousResearchAdapter = patched.replace(
      '...(kind === "pptx" ? { toolbar: "host" } : {})',
      '...(kind === "pptx" ? { toolbar: "inline" } : {})'
    )
    expect(patchSherlockOfficePreviewClient(previousResearchAdapter)).toBe(patched)
    expect(patched).toContain('/* sherlock:office-preview-service:v1 */')
    expect(patched).toContain('ctx.provide("officePreview", officePreviewService)')
    expect(patched).toContain('ctx.inject(["betterSidebar"]')
    expect(patched).not.toContain('const inject = ["betterSidebar"]')
    expect(patched).toContain('betterSidebar.registerFileViewer(viewer)')
    expect(patched).toContain('return `/sidebar/file?${params.toString()}`;')
    expect(patched).not.toContain('globalThis.officePreview')
  })

  it('routes only opaque capability URLs to all three existing Office engines', async () => {
    const client = await loadPatchedOfficeClient()
    const service = client.officePreviewService

    expect(service.supports('docx')).toBe(true)
    expect(service.supports('.xlsx')).toBe(true)
    expect(service.supports('PPTX')).toBe(true)
    expect(service.supports('doc')).toBe(false)
    expect(service.Component({
      sourceUrl: 'sherlock-preview://Capability-ABC_123/',
      kind: 'docx',
      title: 'mixed-token.docx'
    }).type.name).toBe('DocxView')

    for (const [kind, engine] of [
      ['docx', 'DocxView'],
      ['xlsx', 'XlsxView'],
      ['pptx', 'PptxView']
    ]) {
      const element = service.Component({
        sourceUrl: `sherlock-preview://capability_${kind}/`,
        kind,
        title: `report.${kind}`
      })
      expect(element.type.name).toBe(engine)
      expect(element.props.path).toBe(`sherlock-preview://capability_${kind}/`)
      expect(JSON.stringify(element.props)).not.toContain('/sidebar/file')
    }

    for (const sourceUrl of [
      '/Users/private/report.docx',
      'file:///Users/private/report.docx',
      'https://attacker.example/report.docx',
      'sherlock-preview://capability_docx/extra',
      'sherlock-preview://user@capability_docx/'
    ]) {
      const fallback = service.Component({ sourceUrl, kind: 'docx', title: 'report.docx' })
      expect(fallback.props['data-sherlock-office-preview-unavailable']).toBe('')
    }
  })

  it('suppresses the built-in PPT download toolbar in the Research adapter', async () => {
    const client = await loadPatchedOfficeClient()
    const element = client.officePreviewService.Component({
      sourceUrl: 'sherlock-preview://capability_pptx/',
      kind: 'pptx',
      title: 'research.pptx'
    })

    expect(element.type.name).toBe('PptxView')
    expect(element.props.toolbar).toBe('host')
  })

  it('provides the adapter without Better Sidebar and registers the legacy viewers when it appears', async () => {
    const client = await loadPatchedOfficeClient()
    const provided = vi.fn()
    let child: ((ctx: Record<string, any>) => void) | undefined
    const root = {
      provide: provided,
      inject(services: string[], callback: (ctx: Record<string, any>) => void) {
        expect(services).toEqual(['betterSidebar'])
        child = callback
      }
    }

    client.apply(root)
    expect(provided).toHaveBeenCalledWith('officePreview', client.officePreviewService)
    expect(child).toBeTypeOf('function')

    const registerFileViewer = vi.fn(() => vi.fn())
    const effect = vi.fn((callback: () => unknown) => callback())
    child?.({ betterSidebar: { registerFileViewer }, effect })
    expect(registerFileViewer).toHaveBeenCalledTimes(3)
    expect(effect).toHaveBeenCalledTimes(3)
  })

  it('aborts once, disposes either engine shape once, and rejects late attachment after teardown', async () => {
    const client = await loadPatchedOfficeClient()
    const dispose = vi.fn()
    const first = client.createOfficePreviewLifecycle()

    expect(first.signal.aborted).toBe(false)
    expect(first.attach({ dispose })).toBe(true)
    first.dispose()
    first.dispose()
    expect(first.signal.aborted).toBe(true)
    expect(dispose).toHaveBeenCalledTimes(1)

    const destroy = vi.fn()
    const late = client.createOfficePreviewLifecycle()
    late.dispose()
    expect(late.attach({ destroy })).toBe(false)
    expect(destroy).toHaveBeenCalledTimes(1)
    late.dispose()
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('renders PPTX into an isolated mount while keeping the outer host as its scroll container', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const calls: Array<{
      mount: HappyDOMHTMLElement
      options: { scrollContainer?: HappyDOMHTMLElement }
    }> = []
    const client = await loadPatchedOfficeClient({
      document: browserWindow.document,
      window: browserWindow,
      fetch: async () => new Response(new Uint8Array([1, 2, 3])),
      sourceTransform: (source) => instrumentDelayedOfficeEngine(source, 'pptx'),
      testEngine: {
        async openPptx(
          _bytes: ArrayBuffer,
          mount: HappyDOMHTMLElement,
          options: { scrollContainer?: HappyDOMHTMLElement }
        ) {
          calls.push({ mount, options })
          return { destroy() {} }
        }
      }
    })
    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(client.officePreviewService.Component({
          sourceUrl: 'sherlock-preview://capability-scroll/',
          kind: 'pptx',
          title: 'scroll.pptx'
        }))
        await Promise.resolve()
      })
      await waitForCalls(calls, 1)

      expect(calls[0]!.mount.parentElement).not.toBeNull()
      expect(calls[0]!.options.scrollContainer).toBe(calls[0]!.mount.parentElement)
      expect(calls[0]!.options.scrollContainer).not.toBe(calls[0]!.mount)
    } finally {
      await act(async () => { root.unmount() })
      restoreGlobals()
    }
  })

  it.each(['docx', 'pptx'] as const)(
    'keeps a completed %s B render intact when the superseded A engine resolves late',
    async (kind) => {
      const browserWindow = new Window({ url: 'https://sherlock.local/' })
      const restoreGlobals = installBrowserGlobals(browserWindow)
      const calls: Array<{
        mount: HappyDOMHTMLElement
        finish(label: string): void
      }> = []
      const testEngine = kind === 'docx'
        ? {
            renderDocx(_bytes: ArrayBuffer, mount: HappyDOMHTMLElement) {
              return new Promise<void>((resolve) => {
                calls.push({
                  mount,
                  finish(label) {
                    mount.textContent = label
                    resolve()
                  }
                })
              })
            }
          }
        : {
            openPptx(_bytes: ArrayBuffer, mount: HappyDOMHTMLElement) {
              return new Promise<unknown>((resolve) => {
                calls.push({
                  mount,
                  finish(label) {
                    const content = browserWindow.document.createElement('div')
                    content.textContent = label
                    mount.appendChild(content)
                    resolve({ destroy() { mount.replaceChildren() } })
                  }
                })
              })
            }
          }
      const client = await loadPatchedOfficeClient({
        document: browserWindow.document,
        window: browserWindow,
        fetch: async () => new Response(new Uint8Array([1, 2, 3])),
        sourceTransform: (source) => instrumentDelayedOfficeEngine(source, kind),
        testEngine
      })
      const service = client.officePreviewService
      const host = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(host)
      const root = createRoot(host)
      const render = async (label: 'a' | 'b') => {
        await act(async () => {
          root.render(service.Component({
            sourceUrl: `sherlock-preview://capability-${label}/`,
            kind,
            title: `${label}.${kind}`
          }))
          await Promise.resolve()
        })
      }
      try {
        await render('a')
        await waitForCalls(calls, 1)
        await render('b')
        await waitForCalls(calls, 2)

        await act(async () => {
          calls[1]!.finish('B complete')
          await Promise.resolve()
        })
        expect(host.textContent).toContain('B complete')

        await act(async () => {
          calls[0]!.finish('A late')
          await Promise.resolve()
        })
        expect(host.textContent).toContain('B complete')
        expect(host.textContent).not.toContain('A late')
      } finally {
        await act(async () => { root.unmount() })
        restoreGlobals()
      }
    }
  )
})
