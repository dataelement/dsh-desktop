import { randomBytes } from 'node:crypto'
import {
  chmodSync,
  createReadStream,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { open, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import {
  registerTrustedMainWindowHandler,
  type TrustedWindow
} from '../ipc-trust'
import { isTrustedAppUrl } from '../security-policy'

export const RESEARCH_PREVIEW_SCHEME = 'sherlock-preview'
export const RESEARCH_PREVIEW_CSP = [
  "default-src 'none'",
  "img-src sherlock-preview: data:",
  "style-src sherlock-preview: 'unsafe-inline'",
  "script-src 'none'",
  "font-src sherlock-preview:",
  "media-src sherlock-preview:",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

const AUTHORIZATION_DIRECTORY = 'research-file-preview'
const AUTHORIZATION_FILE = 'authorizations.v1.json'
const AUTHORIZATION_VERSION = 1
const MAX_AUTHORIZATION_BYTES = 1024 * 1024
const MAX_AUTHORIZATIONS = 1024
const DEFAULT_CAPABILITY_TTL_MS = 15 * 60 * 1000
const MAX_PATH_LENGTH = 8 * 1024
const MAX_ID_LENGTH = 512
const MAGIC_PREFIX_BYTES = 512
const MAX_JSON_VALIDATION_BYTES = 4 * 1024 * 1024
const MAX_NATIVE_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024
const MAX_OFFICE_PREVIEW_BYTES = 64 * 1024 * 1024
const MAX_OFFICE_ZIP_ENTRIES = 4096
const MAX_OFFICE_CENTRAL_DIRECTORY_BYTES = 8 * 1024 * 1024
const MAX_OFFICE_ENTRY_BYTES = 64 * 1024 * 1024
const MAX_OFFICE_EXPANDED_BYTES = 256 * 1024 * 1024
const MAX_OFFICE_EXPANSION_RATIO = 200
const CORS_EXPOSE_HEADERS = 'Accept-Ranges, Content-Length, Content-Range, Content-Type'

export type ResearchPreviewSource = 'finder' | 'sidebar'

export interface ResearchFilePreviewDescriptor {
  authorizationId: string
  capabilityToken: string
  url: string
  contentType: string
  name: string
}

export interface ResearchPreviewAuthorizationRecord {
  authorizationId: string
  source: ResearchPreviewSource
  path: string
  root: string
  sessionId: string
  nodeId: string
  contentType: string
  name: string
  allowSubresources: boolean
  createdAt: number
}

export interface ResearchPreviewAuthorizationStorage {
  load(): ResearchPreviewAuthorizationRecord[]
  save(records: readonly ResearchPreviewAuthorizationRecord[]): boolean
}

export interface ResearchPreviewWorkspaceResolver {
  resolveRoot(sessionId: string): Promise<string | null>
}

interface PreviewStat {
  size: number
  isFile(): boolean
}

export interface ResearchPreviewFileSystem {
  realpath(targetPath: string): Promise<string>
  stat(targetPath: string): Promise<PreviewStat>
  readSlice(targetPath: string, start: number, endInclusive: number): Promise<Uint8Array>
  stream(targetPath: string, start: number, endInclusive: number): ReadableStream<Uint8Array>
}

export interface ResearchFilePreviewRegistryOptions {
  storage: ResearchPreviewAuthorizationStorage
  workspaceResolver?: ResearchPreviewWorkspaceResolver
  fileSystem?: ResearchPreviewFileSystem
  randomId?: () => string
  now?: () => number
  capabilityTtlMs?: number
}

type FinderAdmission = {
  path: string
  sessionId: string
  nodeId: string
}

type SidebarAdmission = {
  relativePath: string
  sessionId: string
  nodeId: string
}

type RestoreRequest = {
  authorizationId: string
  sessionId: string
  nodeId: string
}

type ReleaseCapabilityRequest = RestoreRequest & {
  capabilityToken: string
}

type Capability = {
  authorizationId: string
  expiresAt: number
}

type PreviewKind = {
  contentType: string
  rootPreview: boolean
  validateMagic(prefix: Uint8Array): boolean
  validateComplete?(value: Uint8Array): boolean
  rootMaxBytes?: number
  validateRootComplete?(value: Uint8Array): boolean
  officeFamily?: OfficeFamily
}

type OfficeFamily = 'docx' | 'xlsx' | 'pptx'

const officeFamilyMarker: Record<OfficeFamily, string> = {
  docx: 'word/document.xml',
  xlsx: 'xl/workbook.xml',
  pptx: 'ppt/presentation.xml'
}

function officeKind(family: OfficeFamily, contentType: string): PreviewKind {
  return {
    contentType,
    rootPreview: true,
    rootMaxBytes: MAX_OFFICE_PREVIEW_BYTES,
    officeFamily: family,
    validateMagic: (value) => startsWith(value, [0x50, 0x4b, 0x03, 0x04])
  }
}

function nativeTextKind(contentType = 'text/plain; charset=utf-8'): PreviewKind {
  return {
    contentType,
    rootPreview: true,
    validateMagic: textMagic,
    rootMaxBytes: MAX_NATIVE_TEXT_PREVIEW_BYTES,
    validateRootComplete: utf8TextMagic
  }
}

const unknownTextRootKind = nativeTextKind()

const previewKinds = new Map<string, PreviewKind>([
  ['.png', { contentType: 'image/png', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  ['.jpg', { contentType: 'image/jpeg', rootPreview: true, validateMagic: jpegMagic }],
  ['.jpeg', { contentType: 'image/jpeg', rootPreview: true, validateMagic: jpegMagic }],
  ['.gif', { contentType: 'image/gif', rootPreview: true, validateMagic: gifMagic }],
  ['.webp', { contentType: 'image/webp', rootPreview: true, validateMagic: webpMagic }],
  ['.bmp', { contentType: 'image/bmp', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x42, 0x4d]) }],
  ['.ico', { contentType: 'image/x-icon', rootPreview: true, validateMagic: icoMagic }],
  ['.avif', { contentType: 'image/avif', rootPreview: true, validateMagic: avifMagic }],
  ['.svg', { contentType: 'image/svg+xml', rootPreview: true, validateMagic: svgMagic }],
  ['.pdf', { contentType: 'application/pdf', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x25, 0x50, 0x44, 0x46, 0x2d]) }],
  ['.docx', officeKind('docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document')],
  ['.xlsx', officeKind('xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')],
  ['.pptx', officeKind('pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation')],
  ['.html', { contentType: 'text/html; charset=utf-8', rootPreview: true, validateMagic: htmlMagic }],
  ['.htm', { contentType: 'text/html; charset=utf-8', rootPreview: true, validateMagic: htmlMagic }],
  ['.md', nativeTextKind('text/markdown; charset=utf-8')],
  ['.markdown', nativeTextKind('text/markdown; charset=utf-8')],
  ['.txt', nativeTextKind()],
  ['.log', nativeTextKind()],
  ['.ts', nativeTextKind()],
  ['.tsx', nativeTextKind()],
  ['.jsx', nativeTextKind()],
  ['.py', nativeTextKind()],
  ['.rb', nativeTextKind()],
  ['.go', nativeTextKind()],
  ['.rs', nativeTextKind()],
  ['.java', nativeTextKind()],
  ['.c', nativeTextKind()],
  ['.h', nativeTextKind()],
  ['.cpp', nativeTextKind()],
  ['.hpp', nativeTextKind()],
  ['.swift', nativeTextKind()],
  ['.kt', nativeTextKind()],
  ['.kts', nativeTextKind()],
  ['.sh', nativeTextKind()],
  ['.bash', nativeTextKind()],
  ['.zsh', nativeTextKind()],
  ['.fish', nativeTextKind()],
  ['.sql', nativeTextKind()],
  ['.yaml', nativeTextKind()],
  ['.yml', nativeTextKind()],
  ['.toml', nativeTextKind()],
  ['.ini', nativeTextKind()],
  ['.conf', nativeTextKind()],
  ['.xml', nativeTextKind()],
  ['.csv', nativeTextKind()],
  ['.css', nativeTextKind('text/css; charset=utf-8')],
  ['.js', nativeTextKind('text/javascript; charset=utf-8')],
  ['.mjs', nativeTextKind('text/javascript; charset=utf-8')],
  ['.json', {
    ...nativeTextKind('application/json; charset=utf-8'), validateComplete: jsonMagic
  }],
  ['.map', {
    ...nativeTextKind('application/json; charset=utf-8'), validateComplete: jsonMagic
  }],
  ['.woff', { contentType: 'font/woff', rootPreview: false, validateMagic: (value) =>
    startsWith(value, [0x77, 0x4f, 0x46, 0x46]) }],
  ['.woff2', { contentType: 'font/woff2', rootPreview: false, validateMagic: (value) =>
    startsWith(value, [0x77, 0x4f, 0x46, 0x32]) }],
  ['.ttf', { contentType: 'font/ttf', rootPreview: false, validateMagic: trueTypeMagic }],
  ['.otf', { contentType: 'font/otf', rootPreview: false, validateMagic: (value) =>
    Buffer.from(value.subarray(0, 4)).toString('ascii') === 'OTTO' }],
  ['.wasm', { contentType: 'application/wasm', rootPreview: false, validateMagic: (value) =>
    startsWith(value, [0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]) }],
  ['.mp3', { contentType: 'audio/mpeg', rootPreview: false, validateMagic: mp3Magic }],
  ['.wav', { contentType: 'audio/wav', rootPreview: false, validateMagic: waveMagic }],
  ['.ogg', { contentType: 'audio/ogg', rootPreview: false, validateMagic: (value) =>
    Buffer.from(value.subarray(0, 4)).toString('ascii') === 'OggS' }],
  ['.mp4', { contentType: 'video/mp4', rootPreview: false, validateMagic: mp4Magic }],
  ['.webm', { contentType: 'video/webm', rootPreview: false, validateMagic: (value) =>
    startsWith(value, [0x1a, 0x45, 0xdf, 0xa3]) }]
])

function startsWith(value: Uint8Array, prefix: readonly number[]): boolean {
  return value.length >= prefix.length && prefix.every((byte, index) => value[index] === byte)
}

function jpegMagic(value: Uint8Array): boolean {
  return startsWith(value, [0xff, 0xd8, 0xff])
}

function gifMagic(value: Uint8Array): boolean {
  const text = Buffer.from(value.subarray(0, 6)).toString('ascii')
  return text === 'GIF87a' || text === 'GIF89a'
}

function webpMagic(value: Uint8Array): boolean {
  return Buffer.from(value.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(value.subarray(8, 12)).toString('ascii') === 'WEBP'
}

function avifMagic(value: Uint8Array): boolean {
  if (value.length < 16 || Buffer.from(value.subarray(4, 8)).toString('ascii') !== 'ftyp') {
    return false
  }
  const declaredSize = Buffer.from(value.subarray(0, 4)).readUInt32BE(0)
  if (declaredSize < 16 || declaredSize > value.length || (declaredSize - 16) % 4 !== 0) {
    return false
  }
  const majorBrand = Buffer.from(value.subarray(8, 12)).toString('ascii')
  if (majorBrand === 'avif' || majorBrand === 'avis') return true
  for (let offset = 16; offset + 4 <= declaredSize; offset += 4) {
    const brand = Buffer.from(value.subarray(offset, offset + 4)).toString('ascii')
    if (brand === 'avif' || brand === 'avis') return true
  }
  return false
}

function icoMagic(value: Uint8Array): boolean {
  if (value.length < 6 || !startsWith(value, [0x00, 0x00, 0x01, 0x00])) return false
  const count = Buffer.from(value.subarray(4, 6)).readUInt16LE(0)
  if (count === 0) return false
  const directoryLength = 6 + count * 16
  return directoryLength <= MAGIC_PREFIX_BYTES && value.length >= directoryLength
}

function textPrefix(value: Uint8Array): string | null {
  if (value.includes(0)) return null
  return Buffer.from(value).toString('utf8').replace(/^\uFEFF/, '')
}

function svgMagic(value: Uint8Array): boolean {
  const text = textPrefix(value)
  return text !== null && /(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)*<svg(?:\s|>)/i.test(text)
}

function htmlMagic(value: Uint8Array): boolean {
  const text = textPrefix(value)
  return text !== null && /^\s*(?:<!--[^]*?-->\s*)*(?:<!doctype\s+html(?:\s|>)|<[a-z][a-z0-9:-]*(?:\s|\/?>))/i.test(text)
}

function textMagic(value: Uint8Array): boolean {
  return textPrefix(value) !== null
}

function utf8TextMagic(value: Uint8Array): boolean {
  if (value.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(value)
    return true
  } catch {
    return false
  }
}

function jsonMagic(value: Uint8Array): boolean {
  try {
    if (value.includes(0)) return false
    const text = new TextDecoder('utf-8', { fatal: true })
      .decode(value)
      .replace(/^\uFEFF/, '')
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function trueTypeMagic(value: Uint8Array): boolean {
  return startsWith(value, [0, 1, 0, 0]) ||
    Buffer.from(value.subarray(0, 4)).toString('ascii') === 'true'
}

function mp3Magic(value: Uint8Array): boolean {
  const secondByte = value.at(1)
  return Buffer.from(value.subarray(0, 3)).toString('ascii') === 'ID3' ||
    (value[0] === 0xff && secondByte !== undefined && (secondByte & 0xe0) === 0xe0)
}

function waveMagic(value: Uint8Array): boolean {
  return Buffer.from(value.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(value.subarray(8, 12)).toString('ascii') === 'WAVE'
}

function mp4Magic(value: Uint8Array): boolean {
  return Buffer.from(value.subarray(4, 8)).toString('ascii') === 'ftyp'
}

function defaultRandomId(): string {
  return randomBytes(24).toString('hex')
}

function boundedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH &&
    !value.includes('\0')
}

function opaqueId(value: unknown): value is string {
  return boundedId(value) && /^[A-Za-z0-9_-]+$/.test(value)
}

function boundedAbsolutePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PATH_LENGTH &&
    !value.includes('\0') && path.isAbsolute(value)
}

function isContained(root: string, target: string): boolean {
  const child = path.relative(root, target)
  return child === '' || (!path.isAbsolute(child) && child !== '..' && !child.startsWith(`..${path.sep}`))
}

function validRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PATH_LENGTH ||
      value.includes('\0') || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    return false
  }
  const segments = value.split(/[\\/]/)
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
}

function validRecord(value: unknown): value is ResearchPreviewAuthorizationRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Partial<ResearchPreviewAuthorizationRecord>
  return opaqueId(record.authorizationId) &&
    (record.source === 'finder' || record.source === 'sidebar') &&
    boundedAbsolutePath(record.path) && boundedAbsolutePath(record.root) &&
    boundedId(record.sessionId) && boundedId(record.nodeId) &&
    typeof record.contentType === 'string' && record.contentType.length <= 128 &&
    typeof record.name === 'string' && record.name.length > 0 && record.name.length <= MAX_ID_LENGTH &&
    typeof record.allowSubresources === 'boolean' &&
    typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
}

export function researchPreviewAuthorizationStoragePath(userDataPath: string): string {
  return path.join(userDataPath, AUTHORIZATION_DIRECTORY, AUTHORIZATION_FILE)
}

export class FileResearchPreviewAuthorizationStorage implements ResearchPreviewAuthorizationStorage {
  private readonly storagePath: string

  constructor(userDataPath: string) {
    this.storagePath = researchPreviewAuthorizationStoragePath(userDataPath)
    try {
      chmodSync(this.storagePath, 0o600)
    } catch {}
  }

  load(): ResearchPreviewAuthorizationRecord[] {
    try {
      const file = statSync(this.storagePath)
      if (!file.isFile() || file.size > MAX_AUTHORIZATION_BYTES) return []
      chmodSync(this.storagePath, 0o600)
      const parsed = JSON.parse(readFileSync(this.storagePath, 'utf8')) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return []
      const value = parsed as { version?: unknown; authorizations?: unknown }
      if (value.version !== AUTHORIZATION_VERSION || !Array.isArray(value.authorizations) ||
          value.authorizations.length > MAX_AUTHORIZATIONS) return []
      return value.authorizations.filter(validRecord)
    } catch {
      return []
    }
  }

  save(records: readonly ResearchPreviewAuthorizationRecord[]): boolean {
    if (records.length > MAX_AUTHORIZATIONS || records.some((record) => !validRecord(record))) {
      return false
    }
    const serialized = `${JSON.stringify({
      version: AUTHORIZATION_VERSION,
      authorizations: records
    })}\n`
    if (Buffer.byteLength(serialized, 'utf8') > MAX_AUTHORIZATION_BYTES) return false

    const temporaryPath = `${this.storagePath}.${process.pid}.tmp`
    try {
      mkdirSync(path.dirname(this.storagePath), { recursive: true, mode: 0o700 })
      writeFileSync(temporaryPath, serialized, { encoding: 'utf8', mode: 0o600 })
      renameSync(temporaryPath, this.storagePath)
      chmodSync(this.storagePath, 0o600)
      return true
    } catch {
      try {
        rmSync(temporaryPath, { force: true })
      } catch {}
      return false
    }
  }
}

export class HarnessWorkspaceFileResolver implements ResearchPreviewWorkspaceResolver {
  constructor(private readonly dshHome: string) {}

  async resolveRoot(sessionId: string): Promise<string | null> {
    if (!boundedId(sessionId)) return null
    const storagePath = path.join(this.dshHome, 'storages', 'workspace.json')
    try {
      const file = await stat(storagePath)
      if (!file.isFile() || file.size > MAX_AUTHORIZATION_BYTES) return null
      const parsed = JSON.parse(await readFile(storagePath, 'utf8')) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
      const tables = (parsed as { tables?: unknown }).tables
      if (typeof tables !== 'object' || tables === null || Array.isArray(tables)) return null
      const workspaces = (tables as { workspaces?: unknown }).workspaces
      if (typeof workspaces !== 'object' || workspaces === null || Array.isArray(workspaces)) return null
      const entries = Object.values(workspaces)
      if (entries.length > MAX_AUTHORIZATIONS) return null
      for (const entry of entries) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
        const workspace = entry as { path?: unknown; sessionIds?: unknown }
        if (!boundedAbsolutePath(workspace.path) || !Array.isArray(workspace.sessionIds) ||
            workspace.sessionIds.length > MAX_AUTHORIZATIONS) continue
        if (workspace.sessionIds.includes(sessionId)) return workspace.path
      }
      return null
    } catch {
      return null
    }
  }
}

const defaultFileSystem: ResearchPreviewFileSystem = {
  realpath,
  stat,
  async readSlice(targetPath, start, endInclusive) {
    if (endInclusive < start) return new Uint8Array()
    const handle = await open(targetPath, 'r')
    try {
      const buffer = Buffer.allocUnsafe(endInclusive - start + 1)
      const result = await handle.read(buffer, 0, buffer.length, start)
      return new Uint8Array(buffer.subarray(0, result.bytesRead))
    } finally {
      await handle.close()
    }
  },
  stream(targetPath, start, endInclusive) {
    return Readable.toWeb(createReadStream(targetPath, {
      start,
      end: endInclusive
    })) as ReadableStream<Uint8Array>
  }
}

function kindForPath(targetPath: string): PreviewKind | undefined {
  return previewKinds.get(path.extname(targetPath).toLowerCase())
}

function rootKindForPath(targetPath: string): PreviewKind | undefined {
  const known = kindForPath(targetPath)
  if (known !== undefined) return isRootPreviewKind(known) ? known : undefined
  return unknownTextRootKind
}

type OfficeZipEntry = {
  crc32: number
  dataEnd: number
  flags: number
  localOffset: number
  compressedSize: number
  uncompressedSize: number
}

function zipExtraContainsZip64(value: Buffer): boolean {
  let offset = 0
  while (offset < value.length) {
    if (offset + 4 > value.length) return true
    const id = value.readUInt16LE(offset)
    const length = value.readUInt16LE(offset + 2)
    offset += 4
    if (offset + length > value.length || id === 0x0001) return true
    offset += length
  }
  return false
}

function validOfficeZipFlags(method: number, flags: number): boolean {
  const allowed = method === 8
    ? 0x080e // deflate: compression option bits 1/2, descriptor bit 3, UTF-8 bit 11
    : method === 0
      ? 0x0808 // stored: descriptor bit 3, UTF-8 bit 11
      : -1
  return allowed >= 0 && (flags & ~allowed) === 0
}

function safeOfficeZipName(raw: Buffer): string | null {
  let name: string
  try {
    name = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    return null
  }
  if (name.length === 0 || name.includes('\0') || name.includes('\\') ||
      name.startsWith('/') || /^[A-Za-z]:/.test(name)) return null
  const body = name.endsWith('/') ? name.slice(0, -1) : name
  if (body.length === 0) return null
  const segments = body.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    return null
  }
  return name
}

function findOfficeZipEocd(value: Buffer): number {
  const minimum = Math.max(0, value.length - (22 + 0xffff))
  for (let offset = value.length - 22; offset >= minimum; offset -= 1) {
    if (value.readUInt32LE(offset) !== 0x06054b50) continue
    const commentLength = value.readUInt16LE(offset + 20)
    if (offset + 22 + commentLength === value.length) return offset
  }
  return -1
}

function validOfficePackage(value: Uint8Array, family: OfficeFamily): boolean {
  if (value.byteLength < 22 || value.byteLength > MAX_OFFICE_PREVIEW_BYTES) return false
  const archive = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  const eocd = findOfficeZipEocd(archive)
  if (eocd < 0) return false
  if (eocd >= 20 && archive.readUInt32LE(eocd - 20) === 0x07064b50) return false
  const diskNumber = archive.readUInt16LE(eocd + 4)
  const centralDisk = archive.readUInt16LE(eocd + 6)
  const diskEntries = archive.readUInt16LE(eocd + 8)
  const totalEntries = archive.readUInt16LE(eocd + 10)
  const centralSize = archive.readUInt32LE(eocd + 12)
  const centralOffset = archive.readUInt32LE(eocd + 16)
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries ||
      totalEntries === 0 || totalEntries === 0xffff || totalEntries > MAX_OFFICE_ZIP_ENTRIES ||
      centralSize === 0xffffffff || centralOffset === 0xffffffff ||
      centralSize > MAX_OFFICE_CENTRAL_DIRECTORY_BYTES ||
      centralOffset + centralSize !== eocd) return false

  const names = new Set<string>()
  const criticalNames = new Set<string>()
  const entries: OfficeZipEntry[] = []
  let expandedBytes = 0
  let centralCursor = centralOffset
  for (let index = 0; index < totalEntries; index += 1) {
    if (centralCursor + 46 > eocd || archive.readUInt32LE(centralCursor) !== 0x02014b50) {
      return false
    }
    const flags = archive.readUInt16LE(centralCursor + 8)
    const method = archive.readUInt16LE(centralCursor + 10)
    const crc32 = archive.readUInt32LE(centralCursor + 16)
    const compressedSize = archive.readUInt32LE(centralCursor + 20)
    const uncompressedSize = archive.readUInt32LE(centralCursor + 24)
    const nameLength = archive.readUInt16LE(centralCursor + 28)
    const extraLength = archive.readUInt16LE(centralCursor + 30)
    const commentLength = archive.readUInt16LE(centralCursor + 32)
    const startDisk = archive.readUInt16LE(centralCursor + 34)
    const localOffset = archive.readUInt32LE(centralCursor + 42)
    const centralEnd = centralCursor + 46 + nameLength + extraLength + commentLength
    if (centralEnd > eocd || !validOfficeZipFlags(method, flags) ||
        startDisk !== 0 || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff || uncompressedSize > MAX_OFFICE_ENTRY_BYTES) return false
    const centralName = archive.subarray(centralCursor + 46, centralCursor + 46 + nameLength)
    const centralExtra = archive.subarray(
      centralCursor + 46 + nameLength,
      centralCursor + 46 + nameLength + extraLength
    )
    const name = safeOfficeZipName(centralName)
    if (name === null || names.has(name) || zipExtraContainsZip64(centralExtra)) return false
    if (method === 0 && compressedSize !== uncompressedSize) return false
    if (uncompressedSize > 0 && (compressedSize === 0 ||
        uncompressedSize > compressedSize * MAX_OFFICE_EXPANSION_RATIO)) return false
    expandedBytes += uncompressedSize
    if (!Number.isSafeInteger(expandedBytes) || expandedBytes > MAX_OFFICE_EXPANDED_BYTES) {
      return false
    }
    names.add(name)
    const lowerName = name.toLowerCase()
    if (lowerName === '[content_types].xml' || lowerName === '_rels/.rels' ||
        Object.values(officeFamilyMarker).includes(lowerName)) {
      if (criticalNames.has(lowerName)) return false
      criticalNames.add(lowerName)
      if (name !== lowerName && name !== '[Content_Types].xml') return false
    }

    if (localOffset + 30 > centralOffset || archive.readUInt32LE(localOffset) !== 0x04034b50) {
      return false
    }
    const localFlags = archive.readUInt16LE(localOffset + 6)
    const localMethod = archive.readUInt16LE(localOffset + 8)
    const localCrc32 = archive.readUInt32LE(localOffset + 14)
    const localCompressedSize = archive.readUInt32LE(localOffset + 18)
    const localUncompressedSize = archive.readUInt32LE(localOffset + 22)
    const localNameLength = archive.readUInt16LE(localOffset + 26)
    const localExtraLength = archive.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    if (dataEnd > centralOffset || !validOfficeZipFlags(localMethod, localFlags) ||
        localFlags !== flags || localMethod !== method ||
        localNameLength !== nameLength ||
        !archive.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(centralName) ||
        zipExtraContainsZip64(archive.subarray(
          localOffset + 30 + localNameLength,
          localOffset + 30 + localNameLength + localExtraLength
        ))) return false
    if ((flags & 0x0008) === 0) {
      if (localCrc32 !== crc32 || localCompressedSize !== compressedSize ||
          localUncompressedSize !== uncompressedSize) return false
    } else if ((localCrc32 !== 0 && localCrc32 !== crc32) ||
        (localCompressedSize !== 0 && localCompressedSize !== compressedSize) ||
        (localUncompressedSize !== 0 && localUncompressedSize !== uncompressedSize)) {
      return false
    }
    entries.push({ crc32, dataEnd, flags, localOffset, compressedSize, uncompressedSize })
    centralCursor = centralEnd
  }
  if (centralCursor !== eocd) {
    if (centralCursor + 6 > eocd || archive.readUInt32LE(centralCursor) !== 0x05054b50 ||
        centralCursor + 6 + archive.readUInt16LE(centralCursor + 4) !== eocd) return false
  }
  const ordered = entries.slice().sort((left, right) => left.localOffset - right.localOffset)
  for (let index = 0; index < ordered.length; index += 1) {
    const entry = ordered[index]!
    const previous = ordered[index - 1]
    const nextOffset = ordered[index + 1]?.localOffset ?? centralOffset
    if (entry.dataEnd > nextOffset || (previous !== undefined &&
        entry.localOffset === previous.localOffset)) {
      return false
    }
    if ((entry.flags & 0x0008) !== 0) {
      const matchesDescriptorAt = (cursor: number): boolean =>
        cursor + 12 <= nextOffset && archive.readUInt32LE(cursor) === entry.crc32 &&
        archive.readUInt32LE(cursor + 4) === entry.compressedSize &&
        archive.readUInt32LE(cursor + 8) === entry.uncompressedSize
      const unsignedDescriptorMatches = matchesDescriptorAt(entry.dataEnd)
      const signedDescriptorMatches = entry.dataEnd + 16 <= nextOffset &&
        archive.readUInt32LE(entry.dataEnd) === 0x08074b50 &&
        matchesDescriptorAt(entry.dataEnd + 4)
      if (!unsignedDescriptorMatches && !signedDescriptorMatches) return false
    }
  }
  if (!names.has('[Content_Types].xml') || !names.has('_rels/.rels')) return false
  const presentFamilies = (Object.entries(officeFamilyMarker) as Array<[OfficeFamily, string]>)
    .filter(([, marker]) => names.has(marker))
    .map(([entryFamily]) => entryFamily)
  return presentFamilies.length === 1 && presentFamilies[0] === family &&
    names.has(officeFamilyMarker[family])
}

async function readValidOfficePackage(
  fileSystem: ResearchPreviewFileSystem,
  targetPath: string,
  fileSize: number,
  family: OfficeFamily
): Promise<Uint8Array | null> {
  if (!Number.isSafeInteger(fileSize) || fileSize < 22 || fileSize > MAX_OFFICE_PREVIEW_BYTES) {
    return null
  }
  const complete = await fileSystem.readSlice(targetPath, 0, fileSize - 1)
  return complete.byteLength === fileSize && validOfficePackage(complete, family) ? complete : null
}

async function validatesPreviewKind(
  fileSystem: ResearchPreviewFileSystem,
  targetPath: string,
  fileSize: number,
  kind: PreviewKind,
  rootPreview: boolean
): Promise<boolean> {
  if (rootPreview && kind.rootMaxBytes !== undefined && fileSize > kind.rootMaxBytes) return false
  if (rootPreview && kind.officeFamily !== undefined) {
    return await readValidOfficePackage(fileSystem, targetPath, fileSize, kind.officeFamily) !== null
  }
  if (kind.validateComplete !== undefined && fileSize > MAX_JSON_VALIDATION_BYTES) return false
  const prefix = await fileSystem.readSlice(
    targetPath,
    0,
    Math.min(Math.max(0, fileSize - 1), MAGIC_PREFIX_BYTES - 1)
  )
  if (!kind.validateMagic(prefix)) return false
  const validateRoot = rootPreview ? kind.validateRootComplete : undefined
  if (validateRoot === undefined && kind.validateComplete === undefined) return true
  const complete = await fileSystem.readSlice(targetPath, 0, Math.max(0, fileSize - 1))
  return (validateRoot?.(complete) ?? true) && (kind.validateComplete?.(complete) ?? true)
}

function isRootPreviewKind(kind: PreviewKind | undefined): kind is PreviewKind {
  return kind?.rootPreview === true
}

export function researchPreviewHtmlCsp(capabilityToken: string, frameAncestor: string): string {
  const source = `${RESEARCH_PREVIEW_SCHEME}://${capabilityToken}`
  return [
    "default-src 'none'",
    `img-src ${source} data: blob: http: https:`,
    `style-src ${source} 'unsafe-inline' http: https:`,
    `script-src ${source} http: https:`,
    `font-src ${source} data: http: https:`,
    `media-src ${source} blob: http: https:`,
    `connect-src ${source} http: https: ws: wss:`,
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "manifest-src 'none'",
    "base-uri 'none'",
    'form-action http: https:',
    `frame-ancestors ${frameAncestor}`
  ].join('; ')
}

function securityHeaders(
  contentType?: string,
  corsOrigin?: string,
  htmlCapability?: { token: string; frameAncestor: string }
): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Security-Policy': htmlCapability
      ? researchPreviewHtmlCsp(htmlCapability.token, htmlCapability.frameAncestor)
      : RESEARCH_PREVIEW_CSP,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  })
  if (contentType) headers.set('Content-Type', contentType)
  if (corsOrigin) {
    headers.set('Access-Control-Allow-Origin', corsOrigin)
    headers.set('Access-Control-Expose-Headers', CORS_EXPOSE_HEADERS)
    headers.set('Vary', 'Origin')
  }
  return headers
}

function errorResponse(
  status: number,
  message: string,
  extra?: Record<string, string>,
  corsOrigin?: string
): Response {
  const headers = securityHeaders('text/plain; charset=utf-8', corsOrigin)
  for (const [key, value] of Object.entries(extra ?? {})) headers.set(key, value)
  return new Response(message, { status, headers })
}

function parseRange(value: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)
  if (!match || (match[1] === '' && match[2] === '')) return null
  if (match[1] === '') {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size <= 0) return null
    return { start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(match[1])
  if (!Number.isSafeInteger(start) || start < 0 || start >= size) return null
  const requestedEnd = match[2] === '' ? size - 1 : Number(match[2])
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) return null
  return { start, end: Math.min(requestedEnd, size - 1) }
}

function encodedPathAttack(rawUrl: string): boolean {
  const authorityEnd = rawUrl.indexOf('/', `${RESEARCH_PREVIEW_SCHEME}://`.length)
  const rawPath = authorityEnd === -1 ? '' : rawUrl.slice(authorityEnd)
  return /%(?:00|2e|2f|5c)/i.test(rawPath) || rawPath.includes('\\') || rawPath.includes('\0')
}

function requestResource(requestUrl: string): { token: string; relativePath: string } | null {
  if (encodedPathAttack(requestUrl)) return null
  try {
    const parsed = new URL(requestUrl)
    if (parsed.protocol !== `${RESEARCH_PREVIEW_SCHEME}:` || parsed.username || parsed.password ||
        parsed.port || parsed.search || parsed.hash || !opaqueId(parsed.hostname)) return null
    const decoded = decodeURIComponent(parsed.pathname)
    if (decoded.includes('\0') || decoded.includes('\\')) return null
    const segments = decoded.split('/').filter(Boolean)
    if (segments.some((segment) => segment === '.' || segment === '..')) return null
    return { token: parsed.hostname, relativePath: segments.join(path.sep) }
  } catch {
    return null
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

export class ResearchFilePreviewRegistry {
  private readonly authorizations = new Map<string, ResearchPreviewAuthorizationRecord>()
  private readonly capabilities = new Map<string, Capability>()
  private readonly fileSystem: ResearchPreviewFileSystem
  private readonly randomId: () => string
  private readonly now: () => number
  private readonly capabilityTtlMs: number
  private admissionQueue: Promise<void> = Promise.resolve()
  private readonly inFlightAdmissionRevocations = new Set<{
    sessionId: string
    nodeId: string
    revoked: boolean
  }>()

  constructor(private readonly options: ResearchFilePreviewRegistryOptions) {
    this.fileSystem = options.fileSystem ?? defaultFileSystem
    this.randomId = options.randomId ?? defaultRandomId
    this.now = options.now ?? Date.now
    this.capabilityTtlMs = options.capabilityTtlMs ?? DEFAULT_CAPABILITY_TTL_MS
    for (const record of options.storage.load().slice(0, MAX_AUTHORIZATIONS)) {
      if (validRecord(record)) this.authorizations.set(record.authorizationId, record)
    }
  }

  async admitFinder(value: unknown): Promise<ResearchFilePreviewDescriptor | null> {
    if (!this.validFinderAdmission(value)) return null
    const revocation = this.beginAdmissionRevocation(value.sessionId, value.nodeId)
    try {
      return await this.admit({
        source: 'finder',
        targetPath: value.path,
        authorizedRoot: path.dirname(value.path),
        sessionId: value.sessionId,
        nodeId: value.nodeId
      }, revocation)
    } finally {
      this.inFlightAdmissionRevocations.delete(revocation)
    }
  }

  async admitSidebar(value: unknown): Promise<ResearchFilePreviewDescriptor | null> {
    if (!this.validSidebarAdmission(value) || !this.options.workspaceResolver) return null
    const revocation = this.beginAdmissionRevocation(value.sessionId, value.nodeId)
    try {
      const workspacePath = await this.options.workspaceResolver.resolveRoot(value.sessionId)
      if (!boundedAbsolutePath(workspacePath)) return null
      const nativeRelativePath = value.relativePath.replace(/[\\/]/g, path.sep)
      return await this.admit({
        source: 'sidebar',
        targetPath: path.resolve(workspacePath, nativeRelativePath),
        authorizedRoot: workspacePath,
        sessionId: value.sessionId,
        nodeId: value.nodeId
      }, revocation)
    } finally {
      this.inFlightAdmissionRevocations.delete(revocation)
    }
  }

  async restore(value: unknown): Promise<ResearchFilePreviewDescriptor | null> {
    if (!this.validRestoreRequest(value)) return null
    const record = this.authorizations.get(value.authorizationId)
    if (!record || record.sessionId !== value.sessionId || record.nodeId !== value.nodeId) return null
    const verified = await this.verifyRecord(record)
    return verified ? this.issue(record) : null
  }

  releaseCapability(value: unknown): boolean {
    if (!this.validReleaseRequest(value)) return false
    const capability = this.capabilities.get(value.capabilityToken)
    const authorization = this.authorizations.get(value.authorizationId)
    if (!capability || !authorization ||
        capability.authorizationId !== value.authorizationId ||
        authorization.sessionId !== value.sessionId || authorization.nodeId !== value.nodeId) {
      return false
    }
    this.capabilities.delete(value.capabilityToken)
    return true
  }

  revokeAuthorization(authorizationId: unknown): boolean {
    if (!opaqueId(authorizationId) || !this.authorizations.has(authorizationId)) return false
    return this.commitRevocations(new Set([authorizationId]))
  }

  revokeNode(sessionId: unknown, nodeId: unknown): boolean {
    if (!boundedId(sessionId) || !boundedId(nodeId)) return false
    for (const admission of this.inFlightAdmissionRevocations) {
      if (admission.sessionId === sessionId && admission.nodeId === nodeId) {
        admission.revoked = true
      }
    }
    return this.revokeWhere((record) => record.sessionId === sessionId && record.nodeId === nodeId)
  }

  revokeSession(sessionId: unknown): boolean {
    if (!boundedId(sessionId)) return false
    for (const admission of this.inFlightAdmissionRevocations) {
      if (admission.sessionId === sessionId) admission.revoked = true
    }
    return this.revokeWhere((record) => record.sessionId === sessionId)
  }

  async handle(request: Request, allowedOrigin: string | null = null): Promise<Response> {
    const requestOrigin = request.headers.get('Origin')

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      return errorResponse(405, 'Method not allowed.', { Allow: 'GET, HEAD, OPTIONS' })
    }
    const resource = requestResource(request.url)
    if (!resource) return errorResponse(403, 'Preview capability denied.')
    const capability = this.capabilities.get(resource.token)
    if (!capability || capability.expiresAt <= this.now()) {
      this.capabilities.delete(resource.token)
      return errorResponse(403, 'Preview capability denied.')
    }
    const authorization = this.authorizations.get(capability.authorizationId)
    if (!authorization) {
      this.capabilities.delete(resource.token)
      return errorResponse(403, 'Preview capability denied.')
    }
    const capabilityOrigin = `${RESEARCH_PREVIEW_SCHEME}://${resource.token}`
    if (
      requestOrigin !== null && requestOrigin !== allowedOrigin &&
      (!authorization.allowSubresources || requestOrigin !== capabilityOrigin)
    ) {
      return errorResponse(403, 'Preview origin denied.')
    }
    const corsOrigin = requestOrigin ?? undefined
    const fail = (status: number, message: string, extra?: Record<string, string>) =>
      errorResponse(status, message, extra, corsOrigin)

    if (request.method === 'OPTIONS') {
      if (!corsOrigin || request.headers.get('Access-Control-Request-Method') === null) {
        return fail(403, 'Preview preflight denied.')
      }
      const requestedMethod = request.headers.get('Access-Control-Request-Method')?.toUpperCase()
      if (requestedMethod !== 'GET' && requestedMethod !== 'HEAD') {
        return fail(403, 'Preview preflight denied.')
      }
      const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
      if (requestedHeaders.some((header) => header !== 'range')) {
        return fail(403, 'Preview preflight denied.')
      }
      const headers = securityHeaders(undefined, corsOrigin)
      headers.set('Access-Control-Allow-Headers', 'Range')
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      return new Response(null, { status: 204, headers })
    }

    try {
      const root = await this.fileSystem.realpath(authorization.root)
      const authorizedTarget = await this.fileSystem.realpath(authorization.path)
      if (!isContained(root, authorizedTarget)) return fail(403, 'Preview path denied.')
      const resourceRoot = authorization.allowSubresources
        ? await this.fileSystem.realpath(path.dirname(authorization.path))
        : path.dirname(authorizedTarget)
      if (!isContained(root, resourceRoot)) return fail(403, 'Preview path denied.')

      let candidate = authorizedTarget
      if (resource.relativePath !== '') {
        if (!authorization.allowSubresources) return fail(403, 'Preview path denied.')
        candidate = await this.fileSystem.realpath(path.resolve(resourceRoot, resource.relativePath))
        if (!isContained(root, candidate) || !isContained(resourceRoot, candidate)) {
          return fail(403, 'Preview path denied.')
        }
      }
      const file = await this.fileSystem.stat(candidate)
      if (!file.isFile()) return fail(404, 'Preview file not found.')
      const rootPreview = resource.relativePath === '' && !authorization.allowSubresources
      const kind = rootPreview ? rootKindForPath(candidate) : kindForPath(candidate)
      if (!kind || (!authorization.allowSubresources && kind.contentType !== authorization.contentType)) {
        return fail(415, 'Unsupported preview type.')
      }
      const officeBytes = rootPreview && kind.officeFamily !== undefined
        ? await readValidOfficePackage(this.fileSystem, candidate, file.size, kind.officeFamily)
        : undefined
      if (officeBytes === null || (officeBytes === undefined &&
          !await validatesPreviewKind(this.fileSystem, candidate, file.size, kind, rootPreview))) {
        return fail(415, 'Preview type mismatch.')
      }

      const htmlCapability = authorization.allowSubresources &&
        kind.contentType === 'text/html; charset=utf-8' && allowedOrigin
        ? { token: resource.token, frameAncestor: allowedOrigin }
        : undefined
      const headers = securityHeaders(kind.contentType, corsOrigin, htmlCapability)
      headers.set('Accept-Ranges', 'bytes')
      const rangeHeader = request.headers.get('range')
      const range = rangeHeader === null ? null : parseRange(rangeHeader, file.size)
      if (rangeHeader !== null && range === null) {
        headers.set('Content-Range', `bytes */${file.size}`)
        headers.set('Content-Length', '0')
        return new Response(null, { status: 416, headers })
      }
      const start = range?.start ?? 0
      const end = range?.end ?? Math.max(0, file.size - 1)
      const length = file.size === 0 ? 0 : end - start + 1
      headers.set('Content-Length', String(length))
      if (range) headers.set('Content-Range', `bytes ${start}-${end}/${file.size}`)
      const responseBody = request.method === 'HEAD' || length === 0
        ? null
        : officeBytes === undefined
          ? this.fileSystem.stream(candidate, start, end) as BodyInit
          : Buffer.from(officeBytes.subarray(start, end + 1))
      return new Response(responseBody, { status: range ? 206 : 200, headers })
    } catch (error) {
      return isMissingFileError(error)
        ? fail(404, 'Preview file not found.')
        : fail(403, 'Preview path denied.')
    }
  }

  private async admit(input: {
    source: ResearchPreviewSource
    targetPath: string
    authorizedRoot: string
    sessionId: string
    nodeId: string
  }, revocation: { revoked: boolean }): Promise<ResearchFilePreviewDescriptor | null> {
    const result = this.admissionQueue.then(() => this.performAdmission(input, revocation))
    this.admissionQueue = result.then(() => undefined, () => undefined)
    return result
  }

  private async performAdmission(input: {
    source: ResearchPreviewSource
    targetPath: string
    authorizedRoot: string
    sessionId: string
    nodeId: string
  }, revocation: { revoked: boolean }): Promise<ResearchFilePreviewDescriptor | null> {
    try {
      const root = await this.fileSystem.realpath(input.authorizedRoot)
      const target = await this.fileSystem.realpath(input.targetPath)
      if (!isContained(root, target)) return null
      const file = await this.fileSystem.stat(target)
      if (!file.isFile()) return null
      const kind = rootKindForPath(target)
      if (!isRootPreviewKind(kind)) return null
      if (!await validatesPreviewKind(this.fileSystem, target, file.size, kind, true)) return null
      const replaced = new Set<string>()
      for (const [authorizationId, existing] of this.authorizations) {
        if (existing.sessionId === input.sessionId && existing.nodeId === input.nodeId) {
          replaced.add(authorizationId)
        }
      }
      if (this.authorizations.size - replaced.size >= MAX_AUTHORIZATIONS) return null
      const authorizationId = this.nextOpaqueId()
      const record: ResearchPreviewAuthorizationRecord = {
        authorizationId,
        source: input.source,
        path: target,
        root,
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        contentType: kind.contentType,
        name: path.basename(target),
        allowSubresources: kind.contentType === 'text/html; charset=utf-8',
        createdAt: this.now()
      }
      const retained = [...this.authorizations.values()].filter(
        (value) => !replaced.has(value.authorizationId)
      )
      if (revocation.revoked) return null
      if (!this.options.storage.save([...retained, record])) return null
      for (const previous of replaced) this.authorizations.delete(previous)
      this.authorizations.set(authorizationId, record)
      this.revokeCapabilities((capability) => replaced.has(capability.authorizationId))
      return this.issue(record)
    } catch {
      return null
    }
  }

  private async verifyRecord(record: ResearchPreviewAuthorizationRecord): Promise<boolean> {
    try {
      const root = await this.fileSystem.realpath(record.root)
      const target = await this.fileSystem.realpath(record.path)
      if (!isContained(root, target)) return false
      const file = await this.fileSystem.stat(target)
      if (!file.isFile()) return false
      const kind = rootKindForPath(target)
      if (!isRootPreviewKind(kind) || kind.contentType !== record.contentType) return false
      return validatesPreviewKind(this.fileSystem, target, file.size, kind, true)
    } catch {
      return false
    }
  }

  private issue(record: ResearchPreviewAuthorizationRecord): ResearchFilePreviewDescriptor {
    const token = this.nextOpaqueId()
    this.capabilities.set(token, {
      authorizationId: record.authorizationId,
      expiresAt: this.now() + this.capabilityTtlMs
    })
    return {
      authorizationId: record.authorizationId,
      capabilityToken: token,
      url: `${RESEARCH_PREVIEW_SCHEME}://${token}/`,
      contentType: record.contentType,
      name: record.name
    }
  }

  private nextOpaqueId(): string {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const value = this.randomId()
      if (opaqueId(value) && !this.authorizations.has(value) && !this.capabilities.has(value)) {
        return value
      }
    }
    throw new Error('Unable to issue a unique Research preview identity.')
  }

  private persist(): boolean {
    return this.options.storage.save([...this.authorizations.values()])
  }

  private revokeWhere(predicate: (record: ResearchPreviewAuthorizationRecord) => boolean): boolean {
    const removed = new Set<string>()
    for (const [authorizationId, record] of this.authorizations) {
      if (!predicate(record)) continue
      removed.add(authorizationId)
    }
    if (removed.size === 0) return true
    return this.commitRevocations(removed)
  }

  private beginAdmissionRevocation(sessionId: string, nodeId: string): {
    sessionId: string
    nodeId: string
    revoked: boolean
  } {
    const revocation = { sessionId, nodeId, revoked: false }
    this.inFlightAdmissionRevocations.add(revocation)
    return revocation
  }

  private commitRevocations(removed: ReadonlySet<string>): boolean {
    const retained = [...this.authorizations.values()].filter(
      (record) => !removed.has(record.authorizationId)
    )
    if (!this.options.storage.save(retained)) return false
    for (const authorizationId of removed) this.authorizations.delete(authorizationId)
    this.revokeCapabilities((capability) => removed.has(capability.authorizationId))
    return true
  }

  private revokeCapabilities(predicate: (capability: Capability) => boolean): void {
    for (const [token, capability] of this.capabilities) {
      if (predicate(capability)) this.capabilities.delete(token)
    }
  }

  private validFinderAdmission(value: unknown): value is FinderAdmission {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const input = value as Partial<FinderAdmission>
    return boundedAbsolutePath(input.path) && boundedId(input.sessionId) && boundedId(input.nodeId)
  }

  private validReleaseRequest(value: unknown): value is ReleaseCapabilityRequest {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const input = value as Partial<ReleaseCapabilityRequest>
    return opaqueId(input.authorizationId) && opaqueId(input.capabilityToken) &&
      boundedId(input.sessionId) && boundedId(input.nodeId)
  }

  private validSidebarAdmission(value: unknown): value is SidebarAdmission {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const input = value as Partial<SidebarAdmission>
    return validRelativePath(input.relativePath) && boundedId(input.sessionId) && boundedId(input.nodeId)
  }

  private validRestoreRequest(value: unknown): value is RestoreRequest {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const input = value as Partial<RestoreRequest>
    return opaqueId(input.authorizationId) && boundedId(input.sessionId) && boundedId(input.nodeId)
  }
}

type ResearchPreviewProtocolWindow = {
  isDestroyed(): boolean
  webContents: {
    getURL(): string
  }
}

export function researchPreviewOriginForWindow(
  window: ResearchPreviewProtocolWindow | undefined
): string | null {
  if (!window || window.isDestroyed()) return null
  try {
    const currentUrl = window.webContents.getURL()
    const parsed = new URL(currentUrl)
    if (parsed.protocol !== 'http:' || parsed.username || parsed.password ||
        !isTrustedAppUrl(currentUrl)) return null
    return parsed.origin
  } catch {
    return null
  }
}

export function handleResearchFilePreviewProtocolRequest(
  registry: ResearchFilePreviewRegistry,
  getMainWindow: () => ResearchPreviewProtocolWindow | undefined,
  request: Request
): Promise<Response> {
  const allowedOrigin = researchPreviewOriginForWindow(getMainWindow())
  if (!allowedOrigin) {
    return Promise.resolve(errorResponse(403, 'Preview window denied.'))
  }
  return registry.handle(request, allowedOrigin)
}

type ResearchPreviewIpcMain = {
  removeHandler(channel: string): void
  handle(channel: string, handler: (event: any, value: unknown) => unknown): unknown
}

export function registerResearchFilePreviewHandlers(options: {
  ipcMain: ResearchPreviewIpcMain
  getMainWindow(): TrustedWindow | undefined
  registry: ResearchFilePreviewRegistry
}): void {
  const handlers: Array<[
    string,
    (value: unknown) => unknown
  ]> = [
    ['research:preview:admit-finder', (value) => options.registry.admitFinder(value)],
    ['research:preview:admit-sidebar', (value) => options.registry.admitSidebar(value)],
    ['research:preview:restore', (value) => options.registry.restore(value)],
    ['research:preview:release', (value) => ({ ok: options.registry.releaseCapability(value) })],
    ['research:preview:revoke-node', (value) => {
      const input = value as { sessionId?: unknown; nodeId?: unknown } | null
      return { ok: options.registry.revokeNode(input?.sessionId, input?.nodeId) }
    }],
    ['research:preview:revoke-session', (value) => {
      const input = value as { sessionId?: unknown } | null
      return { ok: options.registry.revokeSession(input?.sessionId) }
    }]
  ]

  for (const [channel, handler] of handlers) {
    options.ipcMain.removeHandler(channel)
    registerTrustedMainWindowHandler(
      options.ipcMain,
      channel,
      options.getMainWindow,
      (_event, value: unknown) => handler(value)
    )
  }
}
