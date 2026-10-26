export const HARNESS_SHELL_URL = 'dsh-desktop://harness/'
export const HARNESS_BOOT_CHANNEL = 'harness:boot'
export const HARNESS_BOOT_FAILED_CHANNEL = 'harness:boot-failed'

export interface HarnessBootPayload {
  injections: unknown[]
  streamBaseUrl: string
}

export function isHarnessShellUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'dsh-desktop:' && url.host === 'harness' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

/** Host startup UI targets the packaged shell and legacy loopback Harness pages. */
export function isHarnessBootPage(rawUrl: string): boolean {
  if (isHarnessShellUrl(rawUrl)) return true
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password
  } catch {
    return false
  }
}
