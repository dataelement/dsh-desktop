import { pathToFileURL } from 'node:url'

/** Accept only the packaged whale splash, including a query string. */
export function isSplashPageUrl(url: string, pagePath: string): boolean {
  try {
    const destination = new URL(url)
    if (destination.protocol !== 'file:') return false
    return destination.pathname === pathToFileURL(pagePath).pathname
  } catch {
    return false
  }
}
