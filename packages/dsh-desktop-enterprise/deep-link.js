export const ENTERPRISE_LOGIN_PROTOCOL = 'dsh-desktop'
export const ENTERPRISE_LOGIN_DEV_PROTOCOL = 'dsh-desktop-dev'

function isEnterpriseLoginProtocol(protocol) {
  return protocol === `${ENTERPRISE_LOGIN_PROTOCOL}:` || protocol === `${ENTERPRISE_LOGIN_DEV_PROTOCOL}:`
}

function isLoopbackHost(hostname) {
  return hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function parseIpv4(hostname) {
  const parts = hostname.split('.')
  if (parts.length !== 4) return undefined
  const octets = []
  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) return undefined
    const value = Number(part)
    if (!Number.isInteger(value) || value < 0 || value > 255) return undefined
    octets.push(value)
  }
  return octets
}

function isPrivateIpv4(octets) {
  const [first, second] = octets
  return first === 10
    || (first === 192 && second === 168)
    || (first === 172 && second >= 16 && second <= 31)
}

function ipv6Hostname(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
}

function isPrivateNetworkHost(hostname) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/iu.exec(ipv6Hostname(hostname))
  const ipv4 = parseIpv4(mapped?.[1] ?? hostname)
  if (ipv4) return isPrivateIpv4(ipv4)
  return /^f[cd][0-9a-f]{2}:/iu.test(ipv6Hostname(hostname))
}

export function isInsecurePrivateHttpOrigin(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && isPrivateNetworkHost(url.hostname)
  } catch {
    return false
  }
}

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
  if (url.protocol === 'https:') {
    return url.origin
  }
  if (url.protocol === 'http:') {
    if (options.allowInsecureLoopback === true && isLoopbackHost(url.hostname)) {
      return url.origin
    }
    if (options.allowInsecurePrivateHttp === true && isPrivateNetworkHost(url.hostname)) {
      return url.origin
    }
    if (isPrivateNetworkHost(url.hostname)) {
      throw new Error('HTTP intranet addresses require explicit confirmation.')
    }
    throw new Error(
      options.allowInsecureLoopback === true
        ? 'HTTP BiSheng addresses are limited to 127.0.0.1 or [::1].'
        : 'The BiSheng platform address must use HTTPS.'
    )
  }
  throw new Error('The BiSheng platform address must use HTTP or HTTPS.')
}

export function parseEnterpriseLoginDeepLink(value, options = {}) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('The enterprise login link is not a valid URL.')
  }
  if (
    !isEnterpriseLoginProtocol(url.protocol) ||
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
  const serverUrl = normalizeEnterpriseServerUrl(entries[0][1], options)
  const canonical = new URL(`${url.protocol}//login`)
  canonical.searchParams.set('server', serverUrl)
  return { url: canonical.toString(), serverUrl }
}

export function enterpriseLoginDeepLinkFromArgv(argv, options = {}) {
  for (const argument of argv) {
    const lower = argument.toLowerCase()
    if (
      !lower.startsWith(`${ENTERPRISE_LOGIN_PROTOCOL}://`) &&
      !lower.startsWith(`${ENTERPRISE_LOGIN_DEV_PROTOCOL}://`)
    ) continue
    try {
      return parseEnterpriseLoginDeepLink(argument, options)
    } catch {
      continue
    }
  }
  return undefined
}
