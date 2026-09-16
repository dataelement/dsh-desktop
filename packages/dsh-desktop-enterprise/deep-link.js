export const ENTERPRISE_LOGIN_PROTOCOL = 'dsh-desktop'

export function normalizeEnterpriseServerUrl(value, options = {}) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('The BiSheng platform address is not a valid URL.')
  }
  if (url.username || url.password) {
    throw new Error('The BiSheng platform address cannot contain credentials.')
  }
  if (url.search || url.hash) {
    throw new Error('The BiSheng platform address must not contain a query or fragment.')
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('The BiSheng platform address must be an origin without a path.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The BiSheng platform address must use HTTP or HTTPS.')
  }
  return url.origin
}

export function parseEnterpriseLoginDeepLink(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('The enterprise login link is not a valid URL.')
  }
  if (
    url.protocol !== `${ENTERPRISE_LOGIN_PROTOCOL}:` ||
    url.hostname !== 'login' ||
    url.pathname !== '' ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error('The enterprise login link has an unsupported destination.')
  }
  const entries = [...url.searchParams.entries()]
  if (entries.length !== 1 || entries[0][0] !== 'server') {
    throw new Error('The enterprise login link must contain only one server parameter.')
  }
  const serverUrl = normalizeEnterpriseServerUrl(entries[0][1])
  const canonical = new URL(`${ENTERPRISE_LOGIN_PROTOCOL}://login`)
  canonical.searchParams.set('server', serverUrl)
  return { url: canonical.toString(), serverUrl }
}

export function enterpriseLoginDeepLinkFromArgv(argv) {
  for (const argument of argv) {
    if (!argument.toLowerCase().startsWith(`${ENTERPRISE_LOGIN_PROTOCOL}://`)) continue
    try {
      return parseEnterpriseLoginDeepLink(argument)
    } catch {
      continue
    }
  }
  return undefined
}
