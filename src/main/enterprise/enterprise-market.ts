/** Only enterprise catalog operations cross the credential boundary. */
export function parseMarketRequest(input: unknown): { path: string, connectionKey: string, body?: unknown, binary: boolean } {
  const invalid = () => Object.assign(new Error('Unsupported enterprise market request.'), { status: 400 })
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid()
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['path', 'body', 'connectionKey'].includes(key)) ||
      typeof value.path !== 'string' || typeof value.connectionKey !== 'string' || !value.connectionKey) throw invalid()
  const path = value.path
  const url = new URL(path, 'https://market.invalid')
  if (url.origin !== 'https://market.invalid' || url.hash || path !== url.pathname + url.search) throw invalid()
  const prefix = '/api/v1/dsh/market/'
  const endpoint = url.pathname.slice(prefix.length)
  if (!url.pathname.startsWith(prefix)) throw invalid()
  const binary = /^plugins\/[a-f0-9]{32}\/versions\/[a-f0-9]{32}\/artifact$/u.test(endpoint)
  if (!binary && !['capabilities', 'catalog', 'sync'].includes(endpoint)) throw invalid()
  if (endpoint === 'catalog') {
    if ([...url.searchParams.keys()].some(key => !['q', 'page', 'size'].includes(key))) throw invalid()
  } else if (url.search) throw invalid()
  if ((endpoint === 'sync') !== (value.body !== undefined)) throw invalid()
  return { path, connectionKey: value.connectionKey, ...(value.body === undefined ? {} : { body: value.body }), binary }
}
