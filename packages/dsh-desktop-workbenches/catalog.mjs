const DEFAULT_CATALOG_URL = 'https://market.dshdesktop.com/index.json'
const MAX_CATALOG_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10_000
const CACHE_MAX_AGE_MS = 15 * 60 * 1000

export class CatalogError extends Error {
  constructor(message, status = 502) { super(message); this.status = status }
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim() !== ''
const workbenchId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value)
const httpsUrl = value => {
  if (!text(value)) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function fail(message) { throw new CatalogError(message) }

export function validatePublishedCatalog(value) {
  if (!object(value) || value.schemaVersion !== 2 || value.kind !== 'catalog') fail('Unsupported workbench catalog.')
  if (!Array.isArray(value.categories) || !Array.isArray(value.workbenches)) fail('Invalid workbench catalog.')

  const categories = new Map()
  for (const category of value.categories) {
    if (!object(category) || !text(category.id) || !object(category.name) || !text(category.name.zh) || categories.has(category.id)) {
      fail('Invalid workbench catalog category.')
    }
    categories.set(category.id, category.name.zh)
  }

  const ids = new Set()
  const workbenchIds = new Set()
  for (const entry of value.workbenches) {
    if (!object(entry) || !text(entry.id) || ids.has(entry.id) || !workbenchId(entry.workbenchId) || workbenchIds.has(entry.workbenchId) || !text(entry.owner) || !text(entry.repository)
      || !httpsUrl(entry.url) || !text(entry.name) || !categories.has(entry.category)
      || !object(entry.description) || !text(entry.description.zh) || !text(entry.description.en)
      || !text(entry.version) || !text(entry.license) || !object(entry.distribution)
      || !['npm', 'github-release', 'github-source'].includes(entry.distribution.type)
      || !text(entry.distribution.version) || entry.distribution.version !== entry.version
      || !Array.isArray(entry.screenshots) || entry.screenshots.length < 1) {
      fail('Invalid workbench catalog entry.')
    }
    const repositoryId = `${entry.owner}/${entry.repository}`.toLowerCase()
    if (entry.id !== repositoryId || entry.url.toLowerCase() !== `https://github.com/${repositoryId}`) fail('Invalid workbench catalog identity.')
    if (!entry.screenshots.every(image => object(image) && httpsUrl(image.url) && text(image.alt) && /^[a-f0-9]{64}$/.test(image.sha256)
      && Number.isSafeInteger(image.width) && image.width > 0 && Number.isSafeInteger(image.height) && image.height > 0
      && Number.isSafeInteger(image.bytes) && image.bytes > 0)) {
      fail('Invalid workbench catalog screenshot.')
    }
    ids.add(entry.id)
    workbenchIds.add(entry.workbenchId)
  }
  return structuredClone(value)
}

export function createCatalogReader({ fetch: fetchCatalog = globalThis.fetch, url = DEFAULT_CATALOG_URL, now = Date.now } = {}) {
  let cached
  let fetchedAt = 0
  let pending

  const fetchFresh = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Workbench catalog request timed out.')), FETCH_TIMEOUT_MS)
    try {
      const response = await fetchCatalog(url, { headers: { accept: 'application/json' }, signal: controller.signal })
      if (!response.ok) throw new CatalogError(`Workbench catalog returned HTTP ${response.status}.`)
      const length = Number(response.headers.get('content-length'))
      if (Number.isFinite(length) && length > MAX_CATALOG_BYTES) throw new CatalogError('Workbench catalog is too large.')
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength > MAX_CATALOG_BYTES) throw new CatalogError('Workbench catalog is too large.')
      let value
      try { value = JSON.parse(new TextDecoder().decode(bytes)) } catch { fail('Workbench catalog returned invalid JSON.') }
      cached = validatePublishedCatalog(value)
      fetchedAt = now()
      return { catalog: structuredClone(cached), stale: false }
    } finally { clearTimeout(timeout) }
  }

  return async function readCatalog() {
    if (cached && now() - fetchedAt < CACHE_MAX_AGE_MS) return { catalog: structuredClone(cached), stale: false }
    if (!pending) pending = fetchFresh().finally(() => { pending = undefined })
    try { return await pending } catch (error) {
      if (cached) return { catalog: structuredClone(cached), stale: true }
      throw error
    }
  }
}

export { DEFAULT_CATALOG_URL }
