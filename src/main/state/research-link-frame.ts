import { registerTrustedMainWindowHandler, type TrustedWindow } from '../ipc-trust'

const MAX_ID_LENGTH = 256
const MAX_URL_LENGTH = 8_192

type ResearchLinkIdentity = {
  sessionId: string
  nodeId: string
}

type ResearchLinkAuthorization = ResearchLinkIdentity & {
  url: string
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

function researchLinkAuthorization(value: unknown): ResearchLinkAuthorization {
  const record = exactRecord(value, ['sessionId', 'nodeId', 'url'])
  const sessionId = boundedId(record?.sessionId)
  const nodeId = boundedId(record?.nodeId)
  const url = normalizeResearchLinkUrl(record?.url)
  if (sessionId === null || nodeId === null) {
    throw new TypeError('Research link frame identity is invalid.')
  }
  if (url === null) throw new TypeError('Research link URL is invalid.')
  return { sessionId, nodeId, url }
}

export function normalizeResearchLinkUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const source = value.trim()
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

  private key(value: ResearchLinkIdentity): string {
    return `${value.sessionId}\u0000${value.nodeId}`
  }

  authorize(value: unknown): { url: string } {
    const authorization = researchLinkAuthorization(value)
    this.nodes.set(this.key(authorization), authorization)
    return { url: authorization.url }
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
