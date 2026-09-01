import { randomBytes } from 'node:crypto'
import type { WebFrameMain } from 'electron'
import { registerTrustedMainWindowHandler, type TrustedWindow } from '../ipc-trust'

const MAX_ID_LENGTH = 256
const MAX_URL_LENGTH = 8_192

type ResearchLinkIdentity = {
  sessionId: string
  nodeId: string
}

export type ResearchLinkAuthorization = ResearchLinkIdentity & {
  url: string
  frameName: string
}

export type ResearchLinkFrameInspection = {
  url: string
  title: string
  scrollWidth: number
  clientWidth: number
}

type ResearchLinkFrameIpcMain = {
  removeHandler(channel: string): void
  handle(channel: string, handler: (event: any, value: unknown) => unknown): unknown
}

function boundedId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH
    ? value
    : null
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const actual = Object.keys(record)
  return actual.length === keys.length && actual.every((key) => keys.includes(key))
    ? record
    : null
}

function researchLinkIdentity(value: unknown): ResearchLinkIdentity {
  const record = exactRecord(value, ['sessionId', 'nodeId'])
  const sessionId = boundedId(record?.sessionId)
  const nodeId = boundedId(record?.nodeId)
  if (sessionId === null || nodeId === null) {
    throw new TypeError('Research link frame identity is invalid.')
  }
  return { sessionId, nodeId }
}

function researchLinkAuthorization(
  value: unknown,
  frameName: string
): ResearchLinkAuthorization {
  const record = exactRecord(value, ['sessionId', 'nodeId', 'url'])
  const sessionId = boundedId(record?.sessionId)
  const nodeId = boundedId(record?.nodeId)
  const url = normalizeResearchLinkUrl(record?.url)
  if (sessionId === null || nodeId === null) {
    throw new TypeError('Research link frame identity is invalid.')
  }
  if (url === null) throw new TypeError('Research link URL is invalid.')
  return { sessionId, nodeId, url, frameName }
}

const RESEARCH_LINK_INSPECTION_SCRIPT = `(() => ({
  title: document.title,
  scrollWidth: Math.max(document.documentElement?.scrollWidth ?? 0, document.body?.scrollWidth ?? 0),
  clientWidth: Math.max(document.documentElement?.clientWidth ?? 0, window.innerWidth ?? 0)
}))()`

function boundedInspectionMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000
    ? Math.round(value)
    : null
}

function inspectionTitle(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 512)
    : ''
}

export function normalizeResearchLinkUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const source = value.trim().replace(
    /^(https?:\/\/)(?:(?:%0[9a-d])|%20|[\u0009-\u000d\u0020])+/i,
    '$1'
  )
  if (source.length === 0 || source.length > MAX_URL_LENGTH) return null
  try {
    const parsed = new URL(source)
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) {
      return null
    }
    parsed.hostname = parsed.hostname.toLowerCase()
    if (
      (parsed.protocol === 'https:' && parsed.port === '443') ||
      (parsed.protocol === 'http:' && parsed.port === '80')
    ) {
      parsed.port = ''
    }
    return parsed.href
  } catch {
    return null
  }
}

export class ResearchLinkFrameRegistry {
  private readonly nodes = new Map<string, ResearchLinkAuthorization>()

  constructor(
    private readonly randomId: () => string = () => randomBytes(16).toString('hex')
  ) {}

  private key(value: ResearchLinkIdentity): string {
    return `${value.sessionId}\u0000${value.nodeId}`
  }

  authorize(value: unknown): { url: string; frameName: string } {
    const token = this.randomId()
    if (!/^[a-f0-9]{32}$/i.test(token)) throw new TypeError('Research link frame token is invalid.')
    const authorization = researchLinkAuthorization(
      value,
      `sherlock-research-link-${token.toLowerCase()}`
    )
    this.nodes.set(this.key(authorization), authorization)
    return { url: authorization.url, frameName: authorization.frameName }
  }

  resolve(value: unknown): ResearchLinkAuthorization | null {
    const identity = researchLinkIdentity(value)
    return this.nodes.get(this.key(identity)) ?? null
  }

  async inspect(
    value: unknown,
    frames: readonly WebFrameMain[]
  ): Promise<ResearchLinkFrameInspection | null> {
    const authorization = this.resolve(value)
    if (authorization === null) return null
    const authorizedOrigin = new URL(authorization.url).origin
    const frame = frames.find((candidate) => {
      if (candidate.name !== authorization.frameName || candidate.isDestroyed()) return false
      const currentUrl = normalizeResearchLinkUrl(candidate.url)
      return currentUrl !== null && new URL(currentUrl).origin === authorizedOrigin
    })
    if (frame === undefined) return null
    const url = normalizeResearchLinkUrl(frame.url)
    if (url === null) return null
    try {
      const result = await frame.executeJavaScript(RESEARCH_LINK_INSPECTION_SCRIPT)
      if (typeof result !== 'object' || result === null || Array.isArray(result)) return null
      const record = result as Record<string, unknown>
      const scrollWidth = boundedInspectionMetric(record.scrollWidth)
      const clientWidth = boundedInspectionMetric(record.clientWidth)
      if (scrollWidth === null || clientWidth === null) return null
      return {
        url,
        title: inspectionTitle(record.title),
        scrollWidth,
        clientWidth
      }
    } catch {
      return null
    }
  }

  release(value: unknown): boolean {
    const identity = researchLinkIdentity(value)
    return this.nodes.delete(this.key(identity))
  }

  releaseSession(value: unknown): number {
    const record = exactRecord(value, ['sessionId'])
    const sessionId = boundedId(record?.sessionId ?? value)
    if (sessionId === null) throw new TypeError('Research session id is invalid.')
    let removed = 0
    for (const [key, authorization] of this.nodes) {
      if (authorization.sessionId === sessionId && this.nodes.delete(key)) removed += 1
    }
    return removed
  }

  allows(value: unknown): boolean {
    const url = normalizeResearchLinkUrl(value)
    if (url === null) return false
    const origin = new URL(url).origin
    return [...this.nodes.values()].some((authorization) => (
      authorization.url === url || new URL(authorization.url).origin === origin
    ))
  }

  clear(): number {
    const removed = this.nodes.size
    this.nodes.clear()
    return removed
  }
}

export function registerResearchLinkFrameHandlers(options: {
  ipcMain: ResearchLinkFrameIpcMain
  getMainWindow(): TrustedWindow | undefined
  registry: ResearchLinkFrameRegistry
}): void {
  const handlers: Array<[string, (value: unknown) => unknown]> = [
    ['research:link-frame:authorize', (value) => options.registry.authorize(value)],
    ['research:link-frame:inspect', (value) => {
      const window = options.getMainWindow() as (TrustedWindow & {
        webContents: {
          mainFrame: TrustedWindow['webContents']['mainFrame'] & {
            framesInSubtree?: WebFrameMain[]
          }
        }
      }) | undefined
      return options.registry.inspect(value, window?.webContents.mainFrame.framesInSubtree ?? [])
    }],
    ['research:link-frame:release', (value) => ({ ok: options.registry.release(value) })],
    ['research:link-frame:release-session', (value) => ({
      ok: true,
      removed: options.registry.releaseSession(value)
    })]
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
