import { copyFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { registerTrustedMainWindowHandler, type TrustedWindow } from '../ipc-trust'
import { normalizeResearchLinkUrl } from './research-link-frame'

const MAX_ID_LENGTH = 512
const MAX_NAME_LENGTH = 160
const MAX_TEXT_BYTES = 8 * 1024 * 1024
const MAX_BINARY_BYTES = 16 * 1024 * 1024

type TextFormat = 'md' | 'csv' | 'txt' | 'svg'
type BinaryFormat = 'png' | 'jpg'

export type ResearchCanvasExportRequest =
  | {
      kind: 'original'
      sessionId: string
      nodeId: string
      authorizationId: string
      suggestedName: string
    }
  | { kind: 'text'; format: TextFormat; suggestedName: string; content: string }
  | { kind: 'binary'; format: BinaryFormat; suggestedName: string; base64: string }
  | { kind: 'webloc'; suggestedName: string; url: string }

export type ResearchCanvasExportResult =
  | { status: 'saved' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

export type ResearchCanvasExportDependencies = {
  showSaveDialog(options: Record<string, unknown>): Promise<{
    canceled: boolean
    filePath?: string
  }>
  writeFile(targetPath: string, data: string | Uint8Array, options: { mode: number }): Promise<void>
  copyFile(sourcePath: string, targetPath: string): Promise<void>
  resolveExportSource(value: unknown): Promise<{ path: string; name: string } | null>
}

const defaultFileOperations = { writeFile, copyFile }

const formatMetadata: Record<TextFormat | BinaryFormat | 'webloc', {
  extension: string
  label: string
}> = {
  md: { extension: 'md', label: 'Markdown' },
  csv: { extension: 'csv', label: 'CSV' },
  txt: { extension: 'txt', label: '文本' },
  svg: { extension: 'svg', label: 'SVG' },
  png: { extension: 'png', label: 'PNG' },
  jpg: { extension: 'jpg', label: 'JPEG' },
  webloc: { extension: 'webloc', label: '网页位置' }
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const actual = Object.keys(record)
  return actual.length === keys.length && actual.every((key) => keys.includes(key))
    ? record
    : null
}

function boundedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH &&
    !value.includes('\0')
}

function cleanName(value: unknown): string {
  if (typeof value !== 'string') return '组件'
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {}
  const cleaned = decoded
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[ .]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
  return cleaned === '' ? '组件' : cleaned
}

function withExtension(value: unknown, extension: string): string {
  const cleaned = cleanName(value)
  const suffix = `.${extension}`
  const currentExtension = path.extname(cleaned)
  const stem = (currentExtension === '' ? cleaned : cleaned.slice(0, -currentExtension.length))
    .replace(/[ .]+$/g, '')
    .slice(0, 120) || '组件'
  return `${stem}${suffix}`
}

function outputPath(selectedPath: string, extension: string): string {
  const currentExtension = path.extname(selectedPath)
  return currentExtension.toLowerCase() === `.${extension}`
    ? selectedPath
    : `${currentExtension === '' ? selectedPath : selectedPath.slice(0, -currentExtension.length)}.${extension}`
}

function validSvg(value: string): boolean {
  return /^(?:\s*<\?xml[^>]*>\s*)?<svg(?:\s|\/?>)/i.test(value) &&
    !/<(?:script|foreignObject)\b|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|data:)/i.test(value)
}

function validRequest(value: unknown): ResearchCanvasExportRequest | null {
  const input = value as Record<string, unknown> | null
  if (input?.kind === 'original') {
    const record = exactRecord(value, [
      'kind', 'sessionId', 'nodeId', 'authorizationId', 'suggestedName'
    ])
    return record !== null && boundedId(record.sessionId) && boundedId(record.nodeId) &&
      boundedId(record.authorizationId) && typeof record.suggestedName === 'string' &&
      record.suggestedName.length <= MAX_NAME_LENGTH
      ? record as ResearchCanvasExportRequest
      : null
  }
  if (input?.kind === 'text') {
    const record = exactRecord(value, ['kind', 'format', 'suggestedName', 'content'])
    if (record === null || !['md', 'csv', 'txt', 'svg'].includes(String(record.format)) ||
        typeof record.suggestedName !== 'string' || record.suggestedName.length > MAX_NAME_LENGTH ||
        typeof record.content !== 'string' || Buffer.byteLength(record.content, 'utf8') > MAX_TEXT_BYTES) {
      return null
    }
    if (record.format === 'svg' && !validSvg(record.content)) return null
    return record as ResearchCanvasExportRequest
  }
  if (input?.kind === 'binary') {
    const record = exactRecord(value, ['kind', 'format', 'suggestedName', 'base64'])
    return record !== null && (record.format === 'png' || record.format === 'jpg') &&
      typeof record.suggestedName === 'string' && record.suggestedName.length <= MAX_NAME_LENGTH &&
      typeof record.base64 === 'string' && record.base64.length > 0 &&
      record.base64.length <= Math.ceil(MAX_BINARY_BYTES / 3) * 4 + 4
      ? record as ResearchCanvasExportRequest
      : null
  }
  if (input?.kind === 'webloc') {
    const record = exactRecord(value, ['kind', 'suggestedName', 'url'])
    return record !== null && typeof record.suggestedName === 'string' &&
      record.suggestedName.length <= MAX_NAME_LENGTH && normalizeResearchLinkUrl(record.url) !== null
      ? record as ResearchCanvasExportRequest
      : null
  }
  return null
}

function decodeBinary(request: Extract<ResearchCanvasExportRequest, { kind: 'binary' }>): Buffer | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(request.base64)) {
    return null
  }
  const bytes = Buffer.from(request.base64, 'base64')
  if (bytes.length === 0 || bytes.length > MAX_BINARY_BYTES) return null
  if (request.format === 'png' && !bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return null
  }
  if (request.format === 'jpg' && !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return null
  }
  return bytes
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function webloc(url: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>URL</key><string>${xmlEscape(url)}</string></dict></plist>\n`
}

async function chooseTarget(
  dependencies: ResearchCanvasExportDependencies,
  suggestedName: string,
  extension: string,
  label: string
): Promise<string | null> {
  const result = await dependencies.showSaveDialog({
    title: '下载组件',
    defaultPath: withExtension(suggestedName, extension),
    filters: [{ name: label, extensions: [extension] }]
  })
  return result.canceled || typeof result.filePath !== 'string' || result.filePath === ''
    ? null
    : outputPath(result.filePath, extension)
}

export async function saveResearchCanvasExport(
  value: unknown,
  dependencies: ResearchCanvasExportDependencies
): Promise<ResearchCanvasExportResult> {
  const request = validRequest(value)
  if (request === null) return { status: 'error', message: '下载内容无效。' }

  try {
    if (request.kind === 'original') {
      const source = await dependencies.resolveExportSource({
        sessionId: request.sessionId,
        nodeId: request.nodeId,
        authorizationId: request.authorizationId
      })
      if (source === null) return { status: 'error', message: '原始文件不可用。' }
      const extension = path.extname(source.name).slice(1).toLowerCase() || 'bin'
      const target = await chooseTarget(
        dependencies,
        request.suggestedName || source.name,
        extension,
        '原始文件'
      )
      if (target === null) return { status: 'cancelled' }
      await dependencies.copyFile(source.path, target)
      return { status: 'saved' }
    }

    const binaryBytes = request.kind === 'binary' ? decodeBinary(request) : null
    if (request.kind === 'binary' && binaryBytes === null) {
      return { status: 'error', message: '下载内容无效。' }
    }
    const format = request.kind === 'webloc' ? 'webloc' : request.format
    const metadata = formatMetadata[format]
    const target = await chooseTarget(
      dependencies, request.suggestedName, metadata.extension, metadata.label
    )
    if (target === null) return { status: 'cancelled' }

    if (request.kind === 'text') {
      await dependencies.writeFile(target, request.content, { mode: 0o600 })
    } else if (request.kind === 'binary') {
      await dependencies.writeFile(target, binaryBytes!, { mode: 0o600 })
    } else {
      const url = normalizeResearchLinkUrl(request.url)
      if (url === null) return { status: 'error', message: '下载内容无效。' }
      await dependencies.writeFile(target, webloc(url), { mode: 0o600 })
    }
    return { status: 'saved' }
  } catch {
    return { status: 'error', message: '保存失败，请重试。' }
  }
}

type ResearchCanvasExportIpcMain = {
  removeHandler(channel: string): void
  handle(channel: string, handler: (event: any, value: unknown) => unknown): unknown
}

export function registerResearchCanvasExportHandlers(options: {
  ipcMain: ResearchCanvasExportIpcMain
  getMainWindow(): TrustedWindow | undefined
  dependencies: ResearchCanvasExportDependencies
}): void {
  const channel = 'research:canvas-export:save'
  options.ipcMain.removeHandler(channel)
  registerTrustedMainWindowHandler(
    options.ipcMain,
    channel,
    options.getMainWindow,
    (_event, value: unknown) => saveResearchCanvasExport(value, options.dependencies)
  )
}

export function researchCanvasExportFileOperations() {
  return defaultFileOperations
}
