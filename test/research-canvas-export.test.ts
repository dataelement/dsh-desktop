import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  registerResearchCanvasExportHandlers,
  saveResearchCanvasExport,
  type ResearchCanvasExportDependencies
} from '../src/main/state/research-canvas-export'

function dependencies(options: {
  cancelled?: boolean
  filePath?: string
  source?: { path: string; name: string } | null
  writeError?: Error
} = {}) {
  const showSaveDialog = vi.fn(async () => options.cancelled
    ? { canceled: true }
    : { canceled: false, filePath: options.filePath ?? '/tmp/export-result' })
  const writeFile = vi.fn(async () => {
    if (options.writeError !== undefined) throw options.writeError
  })
  const copyFile = vi.fn(async () => {
    if (options.writeError !== undefined) throw options.writeError
  })
  const resolveExportSource = vi.fn(async () => options.source ?? null)
  const value: ResearchCanvasExportDependencies = {
    showSaveDialog,
    writeFile,
    copyFile,
    resolveExportSource
  }
  return { value, showSaveDialog, writeFile, copyFile, resolveExportSource }
}

describe('Research canvas export service', () => {
  it('validates exact text requests, cleans names, and enforces the selected extension', async () => {
    const fixture = dependencies({ filePath: '/tmp/user-choice.bad' })
    await expect(saveResearchCanvasExport({
      kind: 'text', format: 'md', suggestedName: '  %20研究/结论?.md  ',
      content: '# 结论\n\n内容'
    }, fixture.value)).resolves.toEqual({ status: 'saved' })

    expect(fixture.showSaveDialog).toHaveBeenCalledWith(expect.objectContaining({
      defaultPath: '研究结论.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    }))
    expect(fixture.writeFile).toHaveBeenCalledWith(
      path.join('/tmp', 'user-choice.md'), '# 结论\n\n内容', expect.anything()
    )

    const invalid = dependencies()
    await expect(saveResearchCanvasExport({
      kind: 'text', format: 'txt', suggestedName: 'x.txt', content: 'x', extra: true
    } as never, invalid.value)).resolves.toMatchObject({ status: 'error' })
    expect(invalid.showSaveDialog).not.toHaveBeenCalled()
  })

  it('bounds text and binary payloads and decodes valid PNG/JPG data only after validation', async () => {
    const oversized = dependencies()
    await expect(saveResearchCanvasExport({
      kind: 'text', format: 'txt', suggestedName: 'large.txt',
      content: 'x'.repeat(8 * 1024 * 1024 + 1)
    }, oversized.value)).resolves.toMatchObject({ status: 'error' })
    expect(oversized.showSaveDialog).not.toHaveBeenCalled()

    const png = dependencies({ filePath: '/tmp/image.jpeg' })
    await expect(saveResearchCanvasExport({
      kind: 'binary', format: 'png', suggestedName: '导图.png',
      base64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
    }, png.value)).resolves.toEqual({ status: 'saved' })
    expect(png.writeFile).toHaveBeenCalledWith(
      '/tmp/image.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]), expect.anything()
    )

    const invalidBase64 = dependencies()
    await expect(saveResearchCanvasExport({
      kind: 'binary', format: 'jpg', suggestedName: '导图.jpg', base64: '%%%'
    }, invalidBase64.value)).resolves.toMatchObject({ status: 'error' })
    expect(invalidBase64.showSaveDialog).not.toHaveBeenCalled()
  })

  it('normalizes safe web locations into a webloc and rejects other protocols', async () => {
    const fixture = dependencies({ filePath: '/tmp/research-link' })
    await expect(saveResearchCanvasExport({
      kind: 'webloc', suggestedName: '研究链接', url: 'https://Example.com/report'
    }, fixture.value)).resolves.toEqual({ status: 'saved' })
    expect(fixture.writeFile).toHaveBeenCalledWith(
      '/tmp/research-link.webloc',
      expect.stringContaining('<string>https://example.com/report</string>'),
      expect.anything()
    )

    const rejected = dependencies()
    await expect(saveResearchCanvasExport({
      kind: 'webloc', suggestedName: '危险链接', url: 'file:///etc/passwd'
    }, rejected.value)).resolves.toMatchObject({ status: 'error' })
    expect(rejected.showSaveDialog).not.toHaveBeenCalled()
  })

  it('copies only the original resolved by exact preview authorization', async () => {
    const fixture = dependencies({
      filePath: '/tmp/chosen-name',
      source: { path: '/private/report.pdf', name: 'report.pdf' }
    })
    await expect(saveResearchCanvasExport({
      kind: 'original', sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: 'authorization-1', suggestedName: '研究报告'
    }, fixture.value)).resolves.toEqual({ status: 'saved' })
    expect(fixture.resolveExportSource).toHaveBeenCalledWith({
      sessionId: 'session-1', nodeId: 'node-1', authorizationId: 'authorization-1'
    })
    expect(fixture.copyFile).toHaveBeenCalledWith('/private/report.pdf', '/tmp/chosen-name.pdf')

    const denied = dependencies({ source: null })
    await expect(saveResearchCanvasExport({
      kind: 'original', sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: 'wrong', suggestedName: '研究报告.pdf'
    }, denied.value)).resolves.toMatchObject({ status: 'error' })
    expect(denied.showSaveDialog).not.toHaveBeenCalled()
  })

  it('returns cancellation and bounded write errors without exposing paths', async () => {
    const cancelled = dependencies({ cancelled: true })
    await expect(saveResearchCanvasExport({
      kind: 'text', format: 'svg', suggestedName: '图表.svg', content: '<svg/>'
    }, cancelled.value)).resolves.toEqual({ status: 'cancelled' })
    expect(cancelled.writeFile).not.toHaveBeenCalled()

    const failed = dependencies({ writeError: new Error('/private/secret denied') })
    await expect(saveResearchCanvasExport({
      kind: 'text', format: 'csv', suggestedName: '表格.csv', content: 'a,b\r\n'
    }, failed.value)).resolves.toEqual({ status: 'error', message: '保存失败，请重试。' })
  })

  it('registers a trusted-main-frame-only IPC handler', async () => {
    const handlers = new Map<string, (event: unknown, value: unknown) => unknown>()
    const fixture = dependencies({ cancelled: true })
    const mainFrame = { processId: 7, routingId: 11 }
    const webContents = { mainFrame }
    registerResearchCanvasExportHandlers({
      ipcMain: {
        removeHandler: vi.fn(),
        handle(channel, handler) { handlers.set(channel, handler) }
      },
      getMainWindow: () => ({
        isDestroyed: () => false,
        webContents
      }),
      dependencies: fixture.value
    })
    const handler = handlers.get('research:canvas-export:save')
    expect(handler).toBeTypeOf('function')
    expect(() => handler?.({ sender: webContents, senderFrame: { processId: 7, routingId: 12 } }, {
      kind: 'text', format: 'txt', suggestedName: 'x.txt', content: 'x'
    })).toThrow()
    await expect(handler?.({ sender: webContents, senderFrame: mainFrame }, {
      kind: 'text', format: 'txt', suggestedName: 'x.txt', content: 'x'
    })).resolves.toEqual({ status: 'cancelled' })
  })
})
