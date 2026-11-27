export interface DesktopUpdateConfig {
  updatesBaseUrl: string
  strategy: 'policy' | 'feed'
  policyUrl: string
}

export const DEFAULT_UPDATE_CONFIG: Readonly<DesktopUpdateConfig> = Object.freeze({
  updatesBaseUrl: 'https://dshdesktop.com/updates/',
  strategy: 'policy',
  policyUrl: 'https://dshdesktop.com/crash/v1/updates/check'
})

function httpsUrl(value: unknown, field: string): URL {
  if (typeof value !== 'string' || value !== value.trim()) throw new Error(`Invalid dshDesktopUpdates.${field}`)
  let url: URL
  try { url = new URL(value) } catch { throw new Error(`Invalid dshDesktopUpdates.${field}`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`Invalid dshDesktopUpdates.${field}: expected an HTTPS URL without credentials, query or fragment`)
  }
  return url
}

/** Only absence opts into upstream defaults. A present but invalid product config fails closed. */
export function parseDesktopUpdateConfig(value: unknown): Readonly<DesktopUpdateConfig> {
  if (value === undefined) return DEFAULT_UPDATE_CONFIG
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid dshDesktopUpdates')
  const config = value as Record<string, unknown>
  const base = httpsUrl(config.updatesBaseUrl, 'updatesBaseUrl')
  if (!base.pathname.endsWith('/')) base.pathname += '/'
  const strategy = config.strategy === undefined ? 'policy' : config.strategy
  if (strategy !== 'policy' && strategy !== 'feed') throw new Error('Invalid dshDesktopUpdates.strategy')
  if (strategy === 'feed' && config.policyUrl !== undefined) throw new Error('dshDesktopUpdates.policyUrl requires policy strategy')
  return Object.freeze({
    updatesBaseUrl: base.href,
    strategy,
    policyUrl: config.policyUrl === undefined ? DEFAULT_UPDATE_CONFIG.policyUrl : httpsUrl(config.policyUrl, 'policyUrl').href
  })
}

export function stableFeedUrl(config: Readonly<DesktopUpdateConfig> = DEFAULT_UPDATE_CONFIG): string {
  return new URL('latest/', config.updatesBaseUrl).href
}

export function versionIndexUrl(config: Readonly<DesktopUpdateConfig> = DEFAULT_UPDATE_CONFIG): string {
  return new URL('versions.json', config.updatesBaseUrl).href
}
