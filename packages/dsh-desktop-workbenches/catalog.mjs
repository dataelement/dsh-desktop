import { mkdir, open, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const DEFAULT_CATALOG_URL = 'https://market.dshdesktop.com/index.json'
const MAX_CATALOG_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 30_000
const CACHE_MAX_AGE_MS = 15 * 60 * 1000

export class CatalogError extends Error {
  constructor(message, status = 502) { super(message); this.status = status }
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim() !== ''
const legacyWorkbenchId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value)
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
  const legacyIds = new Map()
  for (const entry of value.workbenches) {
    if (!object(entry) || !text(entry.id) || ids.has(entry.id) || !text(entry.owner) || !text(entry.repository)
      || !httpsUrl(entry.url) || !text(entry.name) || !categories.has(entry.category)
      || !object(entry.description) || !text(entry.description.zh) || !text(entry.description.en)
      || !text(entry.version) || !text(entry.license) || !object(entry.distribution)
      || !['npm', 'github-release', 'github-source'].includes(entry.distribution.type)
      || !text(entry.distribution.version) || entry.distribution.version !== entry.version
      || (entry.workbenchId !== undefined && !legacyWorkbenchId(entry.workbenchId))
      || (entry.legacyWorkbenchIds !== undefined && (!Array.isArray(entry.legacyWorkbenchIds)
        || !entry.legacyWorkbenchIds.every(legacyWorkbenchId) || new Set(entry.legacyWorkbenchIds).size !== entry.legacyWorkbenchIds.length))
      || !Array.isArray(entry.screenshots) || entry.screenshots.length < 1) {
      fail('Invalid workbench catalog entry.')
    }
    const repositoryId = `${entry.owner}/${entry.repository}`.toLowerCase()
    if (entry.id !== repositoryId || entry.url.toLowerCase() !== `https://github.com/${repositoryId}`) fail('Invalid workbench catalog identity.')
    for (const legacy of [entry.workbenchId, ...(entry.legacyWorkbenchIds || [])]) {
      if (legacy === undefined) continue
      if (legacyIds.has(legacy) && legacyIds.get(legacy) !== entry.id) fail('Duplicate workbench catalog legacy identity.')
      legacyIds.set(legacy, entry.id)
    }
    if (!entry.screenshots.every(image => object(image) && httpsUrl(image.url) && text(image.alt) && /^[a-f0-9]{64}$/.test(image.sha256)
      && Number.isSafeInteger(image.width) && image.width > 0 && Number.isSafeInteger(image.height) && image.height > 0
      && Number.isSafeInteger(image.bytes) && image.bytes > 0)) {
      fail('Invalid workbench catalog screenshot.')
    }
    ids.add(entry.id)
  }
  return structuredClone(value)
}

/** cachePath is optional; cachedOnly reads snapshots without starting or awaiting network work. */
export function createCatalogReader({ fetch: fetchCatalog = globalThis.fetch, url = DEFAULT_CATALOG_URL, now = Date.now, cachePath, onWarning } = {}) {
  let cached
  let fetchedAt = 0
  let pending

  const warn = (stage, error) => onWarning?.(new Error(`Workbench catalog ${stage}: ${error instanceof Error ? error.message : String(error)}`))

  const readSnapshot = async () => {
    if (!cachePath) return undefined
    let handle
    try {
      handle = await open(cachePath, 'r')
      // Bound the actual read as well as stat, even if the file changes in place.
      if ((await handle.stat()).size > MAX_CATALOG_BYTES + 4096) fail('Workbench catalog cache is too large.')
      const bytes = Buffer.alloc(MAX_CATALOG_BYTES + 4097)
      let bytesRead = 0
      while (bytesRead < bytes.length) {
        const chunk = await handle.read(bytes, bytesRead, bytes.length - bytesRead, bytesRead)
        if (chunk.bytesRead === 0) break
        bytesRead += chunk.bytesRead
      }
      if (bytesRead > MAX_CATALOG_BYTES + 4096) fail('Workbench catalog cache is too large.')
      const snapshot = JSON.parse(bytes.subarray(0, bytesRead).toString('utf8'))
      if (!object(snapshot) || snapshot.schemaVersion !== 1 || snapshot.url !== url
        || !Number.isFinite(snapshot.fetchedAt) || snapshot.fetchedAt < 0) fail('Invalid workbench catalog cache.')
      if (Buffer.byteLength(JSON.stringify(snapshot.catalog)) > MAX_CATALOG_BYTES) fail('Workbench catalog cache is too large.')
      return validatePublishedCatalog(snapshot.catalog)
    } catch (error) {
      if (error?.code !== 'ENOENT') warn('cache read failed', error)
      return undefined
    } finally { if (handle) await handle.close().catch(error => warn('cache close failed', error)) }
  }

  const writeSnapshot = async () => {
    if (!cachePath) return
    const temporary = `${cachePath}.${randomUUID()}.tmp`
    try {
      await mkdir(dirname(cachePath), { recursive: true })
      await writeFile(temporary,
        JSON.stringify({ schemaVersion: 1, url, fetchedAt, catalog: cached }), { flag: 'wx', mode: 0o600 })
      await rename(temporary, cachePath)
    } catch (error) {
      warn('cache write failed', error)
    } finally {
      await unlink(temporary).catch(error => { if (error?.code !== 'ENOENT') warn('cache cleanup failed', error) })
    }
  }

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
      await writeSnapshot()
      return { catalog: structuredClone(cached), stale: false }
    } finally { clearTimeout(timeout) }
  }

  return async function readCatalog({ force = false, cachedOnly = false } = {}) {
    if (cachedOnly) {
      // Do not seed fresh-memory state from disk or join an in-flight refresh.
      // Prefer a network result that arrived while the disk read was pending.
      const snapshot = cached || await readSnapshot()
      const catalog = cached || snapshot
      return { catalog: catalog ? structuredClone(catalog) : null, stale: Boolean(catalog) }
    }
    if (!force && cached && now() - fetchedAt < CACHE_MAX_AGE_MS) return { catalog: structuredClone(cached), stale: false }
    if (!pending) pending = fetchFresh().catch(async error => {
      warn('fetch failed', error)
      const fallback = cached || await readSnapshot()
      if (fallback) return { catalog: structuredClone(fallback), stale: true }
      throw error
    }).finally(() => { pending = undefined })
    return pending
  }
}

export { DEFAULT_CATALOG_URL }
