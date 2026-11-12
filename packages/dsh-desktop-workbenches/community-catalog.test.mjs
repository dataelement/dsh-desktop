import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCommunityReader, validateCommunityCatalog } from './community-catalog.mjs'
const catalog = { schemaVersion: 1, workbenches: [] }
test('refresh fetches each time and saves validated snapshot', async () => {
  let calls = 0, saved
  const read = createCommunityReader({ url: 'https://example.com/catalog', fetchImpl: async () => { calls++; return new Response(JSON.stringify(catalog)) }, saveCache: async value => { saved = value } })
  assert.equal((await read()).stale, false)
  await read()
  assert.equal(calls, 2)
  assert.deepEqual(saved, catalog)
})
test('offline refresh preserves last valid list', async () => {
  const read = createCommunityReader({ url: 'https://example.com/catalog', loadCache: async () => catalog, fetchImpl: async () => { throw Error('offline') } })
  assert.deepEqual(await read(), { catalog, stale: true })
})
test('cached-only does not request network', async () => {
  const read = createCommunityReader({ url: 'https://example.com/catalog', fetchImpl: async () => { throw Error('must not run') } })
  assert.equal((await read({ cachedOnly: true })).catalog, null)
})
test('foreign repository cannot become an installation source', () => {
  assert.throws(() => validateCommunityCatalog({ schemaVersion: 1, workbenches: [{ repository: 'evil-workbench', owner: 'other' }] }))
})

const entry = { id: 'xyb-openharness-dsh-plugins/test-workbench', owner: 'xyb-openharness-dsh-plugins', repository: 'test-workbench', url: 'https://github.com/xyb-openharness-dsh-plugins/test-workbench', name: 'Test', category: 'community-care', description: { zh: '测试', en: 'Test' }, license: 'MIT', version: '1.0.0', screenshots: [], distribution: { type: 'github-source', name: '@xyb/test', version: '1.0.0', url: 'https://github.com/xyb-openharness-dsh-plugins/test-workbench', commit: 'a'.repeat(40) } }
test('valid source pins a commit and rejects altered install identities', () => {
  const value = { schemaVersion: 1, workbenches: [entry] }
  assert.deepEqual(validateCommunityCatalog(value), value)
  for (const change of [{ commit: 'main' }, { name: 'evil;run' }, { version: '2' }, { url: 'https://evil.example/repo' }]) {
    assert.throws(() => validateCommunityCatalog({ ...value, workbenches: [{ ...entry, distribution: { ...entry.distribution, ...change } }] }))
  }
  assert.throws(() => validateCommunityCatalog({ ...value, workbenches: [entry, entry] }))
})
test('oversize and invalid responses retain a valid snapshot', async () => {
  for (const body of ['x'.repeat(2 * 1024 * 1024 + 1), '{invalid', JSON.stringify({ schemaVersion: 1, workbenches: [null] })]) {
    const read = createCommunityReader({ url: 'https://example.com/catalog', loadCache: async () => catalog, fetchImpl: async () => new Response(body) })
    assert.deepEqual(await read(), { catalog, stale: true })
  }
})
