import { load } from 'cheerio'
import sanitizeHtml from 'sanitize-html'
import { normalizeResearchLinkUrl } from './research-link-frame'

const MAX_RESPONSE_BYTES = 6 * 1024 * 1024
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_REDIRECTS = 3
const READER_TIMEOUT_MS = 12_000
const MAX_TITLE_LENGTH = 160
const MAX_DESCRIPTION_LENGTH = 500
const MAX_AUTHOR_LENGTH = 120
const MAX_PUBLISH_TIME_LENGTH = 80

export type ResearchWebReaderResult =
  | {
      status: 'ready'
      url: string
      title: string
      description?: string
      author?: string
      publishTime?: string
      bodyHtml: string
    }
  | {
      status: 'unavailable'
      reason: 'unsupported' | 'network' | 'response' | 'content' | 'too-large' | 'timeout'
    }

export type ResearchWebReaderDependencies = {
  fetch(input: string, init: RequestInit): Promise<Response>
  createTimeoutSignal(milliseconds: number): AbortSignal
}

type ResearchWebReaderInput = {
  url: string
}

const defaultDependencies: ResearchWebReaderDependencies = {
  fetch: (input, init) => globalThis.fetch(input, init),
  createTimeoutSignal: (milliseconds) => AbortSignal.timeout(milliseconds)
}

function boundedText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized.length === 0 ? undefined : normalized.slice(0, limit)
}

export function isResearchWechatArticleUrl(rawUrl: string): boolean {
  const normalized = normalizeResearchLinkUrl(rawUrl)
  if (normalized === null) return false
  const url = new URL(normalized)
  return url.protocol === 'https:' && url.hostname === 'mp.weixin.qq.com' &&
    (url.pathname === '/s' || url.pathname.startsWith('/s/'))
}

function contentLengthTooLarge(response: Response): boolean {
  const raw = response.headers.get('content-length')
  if (raw === null) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > MAX_RESPONSE_BYTES
}

async function boundedResponseText(response: Response): Promise<string | null> {
  if (contentLengthTooLarge(response)) return null
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(body)
}

function sanitizedArticleBody(html: string): {
  title?: string
  description?: string
  author?: string
  publishTime?: string
  bodyHtml?: string
  tooLarge: boolean
} {
  const $ = load(html)
  const article = $('#js_content').first()
  if (article.length === 0) return { tooLarge: false }

  article.find('img').each((_index, element) => {
    const image = $(element)
    const deferredSource = image.attr('data-src')
    if (deferredSource !== undefined) image.attr('src', deferredSource)
    image.removeAttr('data-src')
  })
  article.find('script,style,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,template,noscript').remove()

  const fragment = article.html() ?? ''
  const bodyHtml = sanitizeHtml(fragment, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr',
      'th', 'td', 'a', 'img', 'hr', 'div', 'span'
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height']
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard'
  }).trim()

  const bodyBytes = new TextEncoder().encode(bodyHtml).byteLength
  return {
    title: boundedText($('meta[property="og:title"]').attr('content'), MAX_TITLE_LENGTH),
    description: boundedText(
      $('meta[property="og:description"]').attr('content') ??
        $('meta[name="description"]').attr('content'),
      MAX_DESCRIPTION_LENGTH
    ),
    author: boundedText($('#js_name').first().text(), MAX_AUTHOR_LENGTH),
    publishTime: boundedText($('#publish_time').first().text(), MAX_PUBLISH_TIME_LENGTH),
    bodyHtml,
    tooLarge: bodyBytes > MAX_BODY_BYTES
  }
}

export async function readResearchWechatArticle(
  input: ResearchWebReaderInput,
  dependencies: ResearchWebReaderDependencies = defaultDependencies
): Promise<ResearchWebReaderResult> {
  const normalized = normalizeResearchLinkUrl(input?.url)
  if (normalized === null || !isResearchWechatArticleUrl(normalized)) {
    return { status: 'unavailable', reason: 'unsupported' }
  }

  const signal = dependencies.createTimeoutSignal(READER_TIMEOUT_MS)
  let currentUrl = normalized
  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await dependencies.fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
        }
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (location === null || redirect === MAX_REDIRECTS) {
          return { status: 'unavailable', reason: 'response' }
        }
        const redirected = normalizeResearchLinkUrl(new URL(location, currentUrl).href)
        if (redirected === null || !isResearchWechatArticleUrl(redirected)) {
          return { status: 'unavailable', reason: 'response' }
        }
        currentUrl = redirected
        continue
      }

      if (!response.ok || !/^text\/html(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
        return { status: 'unavailable', reason: 'response' }
      }
      if (contentLengthTooLarge(response)) {
        return { status: 'unavailable', reason: 'too-large' }
      }
      const html = await boundedResponseText(response)
      if (html === null) return { status: 'unavailable', reason: 'too-large' }
      const article = sanitizedArticleBody(html)
      if (article.tooLarge) return { status: 'unavailable', reason: 'too-large' }
      if (article.title === undefined || article.bodyHtml === undefined || article.bodyHtml === '') {
        return { status: 'unavailable', reason: 'content' }
      }
      return {
        status: 'ready',
        url: currentUrl,
        title: article.title,
        ...(article.description === undefined ? {} : { description: article.description }),
        ...(article.author === undefined ? {} : { author: article.author }),
        ...(article.publishTime === undefined ? {} : { publishTime: article.publishTime }),
        bodyHtml: article.bodyHtml
      }
    }
  } catch {
    return {
      status: 'unavailable',
      reason: signal.aborted ? 'timeout' : 'network'
    }
  }
  return { status: 'unavailable', reason: 'response' }
}
