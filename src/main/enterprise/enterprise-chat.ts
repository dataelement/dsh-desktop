export const ALLOWED_ATTRIBUTION_HEADERS = Object.freeze(['user-agent'])
export const REJECTED_CHAT_HEADERS = Object.freeze([
  'host',
  'cookie',
  'forwarded',
  'connection',
  'transfer-encoding',
  'authorization',
  'x-request-id'
])
export const CHAT_REQUEST_KEYS = Object.freeze([
  'model',
  'messages',
  'stream',
  'stream_options',
  'tools',
  'tool_choice',
  'temperature',
  'max_completion_tokens',
  'stop',
  'n'
])
export const MAX_CHAT_IMAGES = 10
export const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_CHAT_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024
export const CHAT_HEADER_TIMEOUT_MS = 30_000
export const CHAT_IDLE_TIMEOUT_MS = 60_000
export const CHAT_TOTAL_TIMEOUT_MS = 30 * 60 * 1000
export const CHAT_MAX_CONCURRENT = 8

export interface ParsedEnterpriseChat {
  request: Record<string, unknown>
  attribution: Record<string, string>
  model: string
}

export function pickAttributionHeaders(value: unknown): Record<string, string> {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    throw Object.assign(new Error('Chat attribution must be a JSON object.'), { status: 400 })
  }
  const picked: Record<string, string> = {}
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.toLowerCase()
    if (REJECTED_CHAT_HEADERS.includes(key) || !ALLOWED_ATTRIBUTION_HEADERS.includes(key)) {
      throw Object.assign(new Error('Chat request includes a forbidden header.'), { status: 400 })
    }
    if (typeof rawValue !== 'string' || rawValue.length === 0 || rawValue.length > 512) {
      throw Object.assign(new Error('Chat attribution is invalid.'), { status: 400 })
    }
    picked[key] = rawValue
  }
  return picked
}

export function parseEnterpriseChatPayload(value: unknown): ParsedEnterpriseChat {
  if (!isPlainObject(value) || !isPlainObject(value.request)) {
    throw Object.assign(new Error('Chat request is required.'), { status: 400 })
  }
  const extra = Object.keys(value).filter((key) => key !== 'request' && key !== 'attribution')
  if (extra.length > 0) {
    throw Object.assign(new Error('Chat request includes unsupported fields.'), { status: 400 })
  }
  const request = value.request
  const keys = Object.keys(request)
  if (keys.some((key) => !CHAT_REQUEST_KEYS.includes(key))) {
    throw Object.assign(new Error('Chat request includes unsupported fields.'), { status: 400 })
  }
  if (typeof request.model !== 'string' || request.model.length === 0 || request.model.length > 512) {
    throw Object.assign(new Error('A chat model is required.'), { status: 400 })
  }
  if (!Array.isArray(request.messages)) {
    throw Object.assign(new Error('Chat messages are required.'), { status: 400 })
  }
  if (request.stream !== true) {
    throw Object.assign(new Error('Enterprise chat requires streaming.'), { status: 400 })
  }
  if (
    !isPlainObject(request.stream_options) ||
    request.stream_options.include_usage !== true ||
    Object.keys(request.stream_options).some((key) => key !== 'include_usage')
  ) {
    throw Object.assign(new Error('Enterprise chat requires stream usage.'), { status: 400 })
  }
  if (request.n !== undefined && request.n !== 1) {
    throw Object.assign(new Error('Enterprise chat only supports n=1.'), { status: 400 })
  }
  validateChatImages(request.messages)
  return {
    request,
    attribution: pickAttributionHeaders(value.attribution),
    model: request.model
  }
}

export function validateChatImages(messages: unknown): void {
  if (!Array.isArray(messages)) return
  let count = 0
  let totalBytes = 0
  for (const message of messages) {
    if (!isPlainObject(message) || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      if (!isPlainObject(part) || part.type !== 'image_url') continue
      const image = isPlainObject(part.image_url) ? part.image_url.url : undefined
      if (typeof image !== 'string' || !image.startsWith('data:')) {
        throw Object.assign(new Error('Enterprise chat only accepts inline images.'), { status: 400 })
      }
      count += 1
      if (count > MAX_CHAT_IMAGES) {
        throw Object.assign(new Error('Use at most ten images per request.'), { status: 400 })
      }
      const size = estimateDataUrlBytes(image)
      if (size > MAX_CHAT_IMAGE_BYTES || (totalBytes += size) > MAX_CHAT_IMAGE_TOTAL_BYTES) {
        throw Object.assign(new Error('Image request exceeds the size limit.'), { status: 400 })
      }
    }
  }
}

export function estimateDataUrlBytes(url: string): number {
  const comma = url.indexOf(',')
  if (comma < 0) {
    throw Object.assign(new Error('Image request exceeds the size limit.'), { status: 400 })
  }
  const metadata = url.slice(5, comma)
  const data = url.slice(comma + 1)
  if (metadata.includes('base64')) return Math.floor(data.length * 3 / 4)
  try {
    return Buffer.byteLength(decodeURIComponent(data))
  } catch {
    throw Object.assign(new Error('Image request exceeds the size limit.'), { status: 400 })
  }
}

export function isSseContentType(value?: string | null): boolean {
  return (value ?? '').toLowerCase().startsWith('text/event-stream')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
