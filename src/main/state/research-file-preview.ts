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
  "base-uri 'none'",
  "form-action 'none'"
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
const CORS_EXPOSE_HEADERS = 'Accept-Ranges, Content-Length, Content-Range, Content-Type'

export type ResearchPreviewSource = 'finder' | 'sidebar'

export interface ResearchFilePreviewDescriptor {
  authorizationId: string
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

type Capability = {
  authorizationId: string
  expiresAt: number
}

type PreviewKind = {
  contentType: string
  rootPreview: boolean
  validateMagic(prefix: Uint8Array): boolean
}

const previewKinds = new Map<string, PreviewKind>([
  ['.png', { contentType: 'image/png', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  ['.jpg', { contentType: 'image/jpeg', rootPreview: true, validateMagic: jpegMagic }],
  ['.jpeg', { contentType: 'image/jpeg', rootPreview: true, validateMagic: jpegMagic }],
  ['.gif', { contentType: 'image/gif', rootPreview: true, validateMagic: gifMagic }],
  ['.webp', { contentType: 'image/webp', rootPreview: true, validateMagic: webpMagic }],
  ['.bmp', { contentType: 'image/bmp', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x42, 0x4d]) }],
  ['.svg', { contentType: 'image/svg+xml', rootPreview: true, validateMagic: svgMagic }],
  ['.pdf', { contentType: 'application/pdf', rootPreview: true, validateMagic: (value) =>
    startsWith(value, [0x25, 0x50, 0x44, 0x46, 0x2d]) }],
  ['.html', { contentType: 'text/html; charset=utf-8', rootPreview: true, validateMagic: htmlMagic }],
  ['.htm', { contentType: 'text/html; charset=utf-8', rootPreview: true, validateMagic: htmlMagic }],
  ['.css', { contentType: 'text/css; charset=utf-8', rootPreview: false, validateMagic: textMagic }],
  ['.js', { contentType: 'text/javascript; charset=utf-8', rootPreview: false, validateMagic: textMagic }],
  ['.mjs', { contentType: 'text/javascript; charset=utf-8', rootPreview: false, validateMagic: textMagic }]
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
  return text !== null && /<!doctype\s+html(?:\s|>)|<html(?:\s|>)/i.test(text)
}

function textMagic(value: Uint8Array): boolean {
  return textPrefix(value) !== null
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

function isRootPreviewKind(kind: PreviewKind | undefined): kind is PreviewKind {
  return kind?.rootPreview === true
}

function securityHeaders(contentType?: string, corsOrigin?: string): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Security-Policy': RESEARCH_PREVIEW_CSP,
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
    return this.admit({
      source: 'finder',
      targetPath: value.path,
      authorizedRoot: path.dirname(value.path),
      sessionId: value.sessionId,
      nodeId: value.nodeId
    })
  }

  async admitSidebar(value: unknown): Promise<ResearchFilePreviewDescriptor | null> {
    if (!this.validSidebarAdmission(value) || !this.options.workspaceResolver) return null
    const workspacePath = await this.options.workspaceResolver.resolveRoot(value.sessionId)
    if (!boundedAbsolutePath(workspacePath)) return null
    const nativeRelativePath = value.relativePath.replace(/[\\/]/g, path.sep)
    return this.admit({
      source: 'sidebar',
      targetPath: path.resolve(workspacePath, nativeRelativePath),
      authorizedRoot: workspacePath,
      sessionId: value.sessionId,
      nodeId: value.nodeId
    })
  }

  async restore(value: unknown): Promise<ResearchFilePreviewDescriptor | null> {
    if (!this.validRestoreRequest(value)) return null
    const record = this.authorizations.get(value.authorizationId)
    if (!record || record.sessionId !== value.sessionId || record.nodeId !== value.nodeId) return null
    const verified = await this.verifyRecord(record)
    return verified ? this.issue(record) : null
  }

  revokeAuthorization(authorizationId: unknown): boolean {
    if (!opaqueId(authorizationId) || !this.authorizations.has(authorizationId)) return false
    return this.commitRevocations(new Set([authorizationId]))
  }

  revokeNode(sessionId: unknown, nodeId: unknown): boolean {
    if (!boundedId(sessionId) || !boundedId(nodeId)) return false
    return this.revokeWhere((record) => record.sessionId === sessionId && record.nodeId === nodeId)
  }

  revokeSession(sessionId: unknown): boolean {
    if (!boundedId(sessionId)) return false
    return this.revokeWhere((record) => record.sessionId === sessionId)
  }

  async handle(request: Request, allowedOrigin: string | null = null): Promise<Response> {
    const requestOrigin = request.headers.get('Origin')
    if (requestOrigin !== null && requestOrigin !== allowedOrigin) {
      return errorResponse(403, 'Preview origin denied.')
    }
    const corsOrigin = requestOrigin ?? undefined
    const fail = (status: number, message: string, extra?: Record<string, string>) =>
      errorResponse(status, message, extra, corsOrigin)

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      return fail(405, 'Method not allowed.', { Allow: 'GET, HEAD, OPTIONS' })
    }
    const resource = requestResource(request.url)
    if (!resource) return fail(403, 'Preview capability denied.')
    const capability = this.capabilities.get(resource.token)
    if (!capability || capability.expiresAt <= this.now()) {
      this.capabilities.delete(resource.token)
      return fail(403, 'Preview capability denied.')
    }
    const authorization = this.authorizations.get(capability.authorizationId)
    if (!authorization) {
      this.capabilities.delete(resource.token)
      return fail(403, 'Preview capability denied.')
    }

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
      const kind = kindForPath(candidate)
      if (!kind || (!authorization.allowSubresources && kind.contentType !== authorization.contentType)) {
        return fail(415, 'Unsupported preview type.')
      }
      const prefix = await this.fileSystem.readSlice(
        candidate,
        0,
        Math.min(Math.max(0, file.size - 1), MAGIC_PREFIX_BYTES - 1)
      )
      if (!kind.validateMagic(prefix)) return fail(415, 'Preview type mismatch.')

      const headers = securityHeaders(kind.contentType, corsOrigin)
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
        : this.fileSystem.stream(candidate, start, end) as BodyInit
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
  }): Promise<ResearchFilePreviewDescriptor | null> {
    if (this.authorizations.size >= MAX_AUTHORIZATIONS) return null
    try {
      const root = await this.fileSystem.realpath(input.authorizedRoot)
      const target = await this.fileSystem.realpath(input.targetPath)
      if (!isContained(root, target)) return null
      const file = await this.fileSystem.stat(target)
      if (!file.isFile()) return null
      const kind = kindForPath(target)
      if (!isRootPreviewKind(kind)) return null
      const prefix = await this.fileSystem.readSlice(
        target,
        0,
        Math.min(Math.max(0, file.size - 1), MAGIC_PREFIX_BYTES - 1)
      )
      if (!kind.validateMagic(prefix)) return null
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
      this.authorizations.set(authorizationId, record)
      if (!this.persist()) {
        this.authorizations.delete(authorizationId)
        return null
      }
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
      const kind = kindForPath(target)
      if (!isRootPreviewKind(kind) || kind.contentType !== record.contentType) return false
      const prefix = await this.fileSystem.readSlice(
        target,
        0,
        Math.min(Math.max(0, file.size - 1), MAGIC_PREFIX_BYTES - 1)
      )
      return kind.validateMagic(prefix)
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
    if (removed.size === 0) return false
    return this.commitRevocations(removed)
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
