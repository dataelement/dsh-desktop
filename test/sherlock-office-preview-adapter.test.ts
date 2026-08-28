import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

import { patchSherlockOfficePreviewClient } from '../scripts/lib/patch-sherlock-office-preview.mjs'

type ClientBundle = Record<string, any>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)
const officeClientPath = new URL(
  '../build/sherlock-plugin-profile/vendor/@huanlin/dsh-plugin-better-sidebar-plugin-office/lib/client.js',
  import.meta.url
)

async function officeClientSource(): Promise<string> {
  return readFile(officeClientPath, 'utf8')
}

async function loadPatchedOfficeClient(): Promise<ClientBundle> {
  const source = patchSherlockOfficePreviewClient(await officeClientSource())
  let descriptor: BundleDescriptor | undefined
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
    document: undefined,
    global: { Array, String },
    navigator: { language: 'zh-CN' },
    setTimeout,
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) { descriptor = value }
      }
    }
  })
  if (descriptor === undefined) throw new Error('Office bundle did not register')
  return descriptor.factory((id) => {
    if (id === 'util') return requireModule('util')
    return requireModule(id)
  })
}

describe('Sherlock bundled Office preview adapter', () => {
  it('patches the pinned Office package exactly once and keeps the sidebar route intact', async () => {
    const source = await officeClientSource()
    const patched = patchSherlockOfficePreviewClient(source)

    expect(patchSherlockOfficePreviewClient(patched)).toBe(patched)
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
})
