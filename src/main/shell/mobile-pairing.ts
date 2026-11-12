/** Renderer argument that marks a Safe Mode window. The bridge stays off there. */
export const SAFE_MODE_RENDERER_FLAG = '--dsh-desktop-safe-mode'

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']

export function isSafeModeRenderer(argv: readonly string[]): boolean {
  return argv.includes(SAFE_MODE_RENDERER_FLAG)
}

/** Host origin the phone bridge may call. A token in the launch URL is dropped. */
export function loopbackHarnessOrigin(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.length === 0) return undefined
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return undefined
  }
  if (url.username !== '' || url.password !== '') return undefined
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  if (!LOOPBACK_HOSTS.includes(url.hostname)) return undefined
  return url.origin
}

/** Cookie already held by the shell. Header injection and empty values are dropped. */
export function hostSessionCookie(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0 || value.length > 4096) return undefined
  if (/[\r\n]/u.test(value)) return undefined
  return value
}

/**
 * Packaged builds use the production bridge port. Unpackaged builds use the
 * development port unless `DSH_DEV_MOBILE_PORT` selects another one.
 */
export function desktopMobilePort(packaged: boolean, env: NodeJS.ProcessEnv = process.env): number {
  if (packaged) return 43127
  const value = env.DSH_DEV_MOBILE_PORT
  if (value === undefined || value === '') return 43128
  if (!/^\d+$/u.test(value)) throw new Error('DSH_DEV_MOBILE_PORT must be an integer from 1024 to 65535.')
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new Error('DSH_DEV_MOBILE_PORT must be an integer from 1024 to 65535.')
  }
  return parsed
}

/** Prefer internet pairing even on WiFi; never switch an already connected phone. */
export function shouldOpenInternetTunnel(snapshot: {
  pairingUrl?: string
  tunnelActive?: boolean
  connected?: boolean
}): boolean {
  return snapshot.tunnelActive !== true && snapshot.connected !== true
}
