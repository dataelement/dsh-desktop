import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATALOG_URL, createCatalogReader, validatePublishedCatalog } from '../packages/dsh-desktop-workbenches/catalog.mjs'

function catalog() {
  return {
    schemaVersion: 2,
    kind: 'catalog',
    categories: [{ id: 'productivity', name: { zh: '效率' } }],
    workbenches: [{
      id: 'owner/repository', owner: 'owner', repository: 'repository', url: 'https://github.com/owner/repository',
      name: '项目助手', category: 'productivity', description: { zh: '整理项目资料。', en: 'Organize project materials.' },
      version: '1.0.0', sourceCommit: 'a'.repeat(40), license: 'MIT',
      distribution: { type: 'github-source', url: 'https://github.com/owner/repository', commit: 'a'.repeat(40), version: '1.0.0' },
      screenshots: [{ url: 'https://raw.githubusercontent.com/owner/repository/main/overview.webp', alt: '项目助手截图 1', width: 1280, height: 720, bytes: 100, sha256: 'b'.repeat(64) }],
      probe: { status: 'ok' }
    }]
  }
}

describe('Awesome workbench published catalog', () => {
  it('uses the DSH Desktop market domain', () => {
    expect(DEFAULT_CATALOG_URL).toBe('https://market.dshdesktop.com/index.json')
  })

  it('uses the published repository identity as the workbench identity', () => {
    const value = validatePublishedCatalog(catalog())
    expect(value.workbenches[0]).toMatchObject({ id: 'owner/repository', url: 'https://github.com/owner/repository' })
  })

  it('rejects unsupported schemas and repository identity mismatches', () => {
    expect(() => validatePublishedCatalog({ ...catalog(), schemaVersion: 1 })).toThrow('Unsupported workbench catalog')
    const mismatch = catalog()
    mismatch.workbenches[0].id = 'other/repository'
    expect(() => validatePublishedCatalog(mismatch)).toThrow('identity')
    const duplicateRepository = catalog()
    duplicateRepository.workbenches.push({ ...duplicateRepository.workbenches[0] })
    expect(() => validatePublishedCatalog(duplicateRepository)).toThrow('Invalid workbench catalog entry')
  })

  it('caches successful reads and serves the last good catalog after a refresh failure', async () => {
    let time = 0
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json(catalog()))
      .mockRejectedValueOnce(new Error('offline'))
    const read = createCatalogReader({ fetch, now: () => time })
    await expect(read()).resolves.toMatchObject({ stale: false })
    time = 16 * 60 * 1000
    await expect(read()).resolves.toMatchObject({ stale: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
