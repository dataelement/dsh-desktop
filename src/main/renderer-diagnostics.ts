import { redact } from './desktop-service/service'

/** Diagnostic copies only: navigation and ownership checks retain the original URL. */
export function rendererDiagnosticUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return redact(url.origin + url.pathname)
    if (url.protocol === 'file:') return 'file:///[local]/' + (url.pathname.split('/').at(-1) ?? '')
    return '[unsupported URL]'
  } catch {
    return '[invalid URL]'
  }
}

/** Electron load errors embed URLs in their message/stack, not just event fields. */
export function rendererDiagnosticText(value: string): string {
  return redact(value.replace(/(?:https?|file):\/\/[^\s"'<>]+/gi, rendererDiagnosticUrl)).slice(0, 8_000)
}
