export function validateCommunityCatalog(value) {
  if (value?.schemaVersion !== 1 || !Array.isArray(value.workbenches)) throw new Error('Invalid community catalog')
  const ids = new Set()
  for (const entry of value.workbenches) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid community entry')
    const repo = entry.repository
    const url = `https://github.com/xyb-openharness-dsh-plugins/${repo}`
    if (!/^[a-z0-9-]+-workbench$/.test(repo) || entry.id !== `xyb-openharness-dsh-plugins/${repo}` || ids.has(entry.id)
      || entry.owner !== 'xyb-openharness-dsh-plugins' || entry.url !== url
      || entry.distribution?.url !== url || entry.distribution.type !== 'github-source'
      || !/^[a-f0-9]{40}$/.test(entry.distribution.commit)
      || typeof entry.distribution.name !== 'string' || !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(entry.distribution.name) || typeof entry.name !== 'string' || !entry.name.trim() || entry.category !== 'community-care' || typeof entry.description?.en !== 'string' || typeof entry.license !== 'string' || !entry.version || entry.version !== entry.distribution.version
      || typeof entry.description?.zh !== 'string' || !Array.isArray(entry.screenshots) || entry.screenshots.length !== 0) throw new Error('Invalid community entry')
    ids.add(entry.id)
  }
  return structuredClone(value)
}
export function createCommunityReader({ url, fetchImpl = fetch, loadCache = async () => null, saveCache = async () => {}, warn = () => {} }) {
  let cached, pending
  return async ({ cachedOnly = false } = {}) => {
    if (!cached) {
      try { const disk = await loadCache(); if (disk) cached = validateCommunityCatalog(disk) } catch (error) { warn(error) }
    }
    if (cachedOnly) return { catalog: cached ? structuredClone(cached) : null, stale: true }
    if (!pending) pending = (async () => {
      try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' })
        if (!response.ok) throw new Error(`Community catalog HTTP ${response.status}`)
        const reader = response.body.getReader()
        const chunks = []
        let length = 0
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            length += value.byteLength
            if (length > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Community catalog too large') }
            chunks.push(value)
          }
        } finally { reader.releaseLock() }
        const bytes = new Uint8Array(length)
        let offset = 0
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
        const text = new TextDecoder().decode(bytes)
        cached = validateCommunityCatalog(JSON.parse(text))
        try { await saveCache(cached) } catch (error) { warn(error) }
        return { catalog: structuredClone(cached), stale: false }
      } catch (error) {
        warn(error)
        if (!cached) throw error
        return { catalog: structuredClone(cached), stale: true }
      }
    })().finally(() => { pending = undefined })
    return pending
  }
}
