import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createStateStore, emptyState, MAX_STATE_BYTES } from '../packages/dsh-desktop-workbenches/state.mjs'
import { apply, authorizedStateMigrations, catalogReadOptions } from '../packages/dsh-desktop-workbenches/index.js'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-state-'))
  roots.push(root)
  return { root, store: createStateStore(root) }
}
const WRITER = 'example/writer'
const RESEARCH = 'example/research'
const populated = () => ({ ...emptyState(), added: [WRITER, RESEARCH], pinned: [WRITER, RESEARCH], active: WRITER,
  favorites: [WRITER], sessionBindings: { 'session-1': WRITER }, recentSessions: { [WRITER]: 'session-1' }, notes: { [WRITER]: 'An unsaved business draft' } })

describe('desktop workbench state', () => {
  it('accepts only the explicit force=1 catalog refresh query', () => {
    expect(catalogReadOptions(new Request('http://localhost/api/desktop-workbenches/catalog'))).toEqual({ force: false })
    expect(catalogReadOptions(new Request('http://localhost/api/desktop-workbenches/catalog?force=1'))).toEqual({ force: true })
    for (const query of ['force=true', 'force=0', 'force=1&force=1', 'refresh=1']) {
      expect(() => catalogReadOptions(new Request(`http://localhost/api/desktop-workbenches/catalog?${query}`))).toThrow()
    }
  })

  it('provides detached ownership snapshots from the same persisted state, failing closed on corruption', async () => {
    const { root, store } = await fixture()
    let ownership
    apply({ effect: fn => fn(), inject() {}, reflect: { provide(name, service) {
      expect(name).toBe('desktopWorkbenchOwnership')
      ownership = service
    } }, connection: { fetch: { register() {} } } }, { root })
    await store.write({ revision: 0, state: populated() })
    const snapshot = await ownership.read()
    expect(snapshot).toEqual({ revision: 1, sessionBindings: { 'session-1': WRITER }, added: [WRITER, RESEARCH] })
    snapshot.added.length = 0
    snapshot.sessionBindings['session-1'] = 'huaxue'
    expect((await ownership.read()).sessionBindings['session-1']).toBe(WRITER)
    await store.write({ revision: 1, state: { ...populated(), added: [RESEARCH], pinned: [RESEARCH], active: null } })
    expect((await ownership.read()).added).toEqual([RESEARCH])
    await writeFile(join(root, 'state.json'), '{broken')
    await expect(ownership.read()).rejects.toThrow()
  })
  it('authorizes only published legacy identities for canonical repositories', () => {
    const allowed = authorizedStateMigrations({ workbenches: [{
      id: 'dataelement/dsh-ming-life', workbenchId: 'wb-dataelement-dsh-ming-life', legacyWorkbenchIds: ['ming-life']
    }] })
    expect([...allowed]).toEqual([
      ['wb-dataelement-dsh-ming-life', 'dataelement/dsh-ming-life'],
      ['ming-life', 'dataelement/dsh-ming-life']
    ])
    expect(allowed.has('unknown')).toBe(false)
  })

  it('starts empty, atomically saves and restores state on host restart', async () => {
    const { root, store } = await fixture()
    expect(await store.read()).toEqual({ revision: 0, state: emptyState() })
    const state = populated()
    const saved = await store.write({ revision: 0, state })
    expect(await createStateStore(root).read()).toEqual(saved)
    expect(await readdir(root)).toEqual(['state.json'])
    state.notes[WRITER] = 'mutated caller'
    saved.state.notes[WRITER] = 'mutated response'
    expect((await store.read()).state.notes[WRITER]).toBe('An unsaved business draft')
  })


  it('loads and atomically migrates pre-canonical workbench identities without losing user data', async () => {
    const { root, store } = await fixture()
    const legacy = {
      version: 1,
      added: ['ming-life'],
      pinned: ['ming-life'],
      active: 'ming-life',
      sessionBindings: { 'session-legacy': 'ming-life' },
      recentSessions: { 'ming-life': 'session-legacy' },
      notes: { 'ming-life': 'Keep this note' }
    }
    await writeFile(join(root, 'state.json'), JSON.stringify({ revision: 7, state: legacy }))
    expect(await store.read()).toEqual({ revision: 7, state: { ...legacy, favorites: [] } })

    const canonical = 'dataelement/dsh-ming-life'
    const migrated = { ...legacy, favorites: [], added: [canonical], pinned: [canonical], active: canonical,
      sessionBindings: { 'session-legacy': canonical }, recentSessions: { [canonical]: 'session-legacy' }, notes: { [canonical]: 'Keep this note' } }
    await expect(store.migrate({ revision: 7, state: migrated }, { 'ming-life': canonical })).resolves.toMatchObject({ revision: 8 })
    expect(await store.read()).toEqual({ revision: 8, state: migrated })
  })

  it('does not permit ordinary writes to introduce new legacy identities', async () => {
    const { store } = await fixture()
    await expect(store.write({ revision: 0, state: { ...emptyState(), added: ['ming-life'] } })).rejects.toThrow('repository identities')
  })

  it('persists adding and removing favorites independently of installed workbenches', async () => {
    const { root, store } = await fixture()
    const initial = { ...populated(), favorites: [WRITER, 'example/catalog-only'] }
    await store.write({ revision: 0, state: initial })
    expect((await createStateStore(root).read()).state.favorites).toEqual([WRITER, 'example/catalog-only'])

    const updated = { ...initial, favorites: [RESEARCH] }
    await store.write({ revision: 1, state: updated })
    expect((await createStateStore(root).read()).state.favorites).toEqual([RESEARCH])
    expect((await store.read()).state.sessionBindings).toEqual(initial.sessionBindings)
    expect((await store.read()).state.notes).toEqual(initial.notes)
  })

  it('uses Awesome repository identities for every workbench reference', async () => {
    const { store } = await fixture()
    await expect(store.write({ revision: 0, state: { ...emptyState(), favorites: ['owner/repository'] } })).resolves.toHaveProperty('revision', 1)
    await expect(store.write({ revision: 1, state: { ...emptyState(), added: ['owner/repository'] } })).resolves.toHaveProperty('revision', 2)
  })

  it('rejects a concurrent stale write without losing the winning write', async () => {
    const { store } = await fixture()
    const results = await Promise.allSettled([
      store.write({ revision: 0, state: populated() }),
      store.write({ revision: 0, state: emptyState() })
    ])
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].reason.status).toBe(409)
    expect((await store.read()).revision).toBe(1)
    await expect(store.write({ revision: 1, state: populated() })).resolves.toHaveProperty('revision', 2)
  })

  it('removes workbench entries while preserving session ownership, notes and project files', async () => {
    const { root, store } = await fixture()
    await writeFile(join(root, 'project.md'), 'Original user material')
    await store.write({ revision: 0, state: populated() })
    const state = { ...populated(), added: [RESEARCH], pinned: [RESEARCH], active: null }
    await store.write({ revision: 1, state })
    expect((await store.read()).state.sessionBindings['session-1']).toBe(WRITER)
    expect((await store.read()).state.notes[WRITER]).toBe('An unsaved business draft')
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe('Original user material')
    await expect(store.write({ revision: 2, state: { ...state, sessionBindings: {} } })).rejects.toHaveProperty('status', 400)
    await expect(store.write({ revision: 2, state: { ...state, notes: {} } })).rejects.toHaveProperty('status', 400)
  })

  it.each([
    { added: [WRITER, WRITER] },
    { favorites: [WRITER, WRITER] },
    { favorites: ['../unsafe'] },
    { favorites: WRITER },
    { pinned: ['example/missing'] },
    { active: 'example/missing' },
    { version: 2 },
    { added: ['../unsafe'] },
    { notes: JSON.parse('{"__proto__":"bad"}') },
    { recentSessions: { [WRITER]: 'unbound-session' } },
    { notes: { [WRITER]: 42 } }
  ])('rejects malformed state %j without writing it', async (patch) => {
    const { root, store } = await fixture()
    await expect(store.write({ revision: 0, state: { ...populated(), ...patch } })).rejects.toHaveProperty('status', 400)
    expect(await readdir(root)).toEqual([])
  })

  it('does not silently overwrite malformed stored data', async () => {
    const { root, store } = await fixture()
    await writeFile(join(root, 'state.json'), '{broken data')
    await expect(store.read()).rejects.toHaveProperty('status', 500)
    await expect(store.write({ revision: 0, state: emptyState() })).rejects.toHaveProperty('status', 500)
    expect(await readFile(join(root, 'state.json'), 'utf8')).toBe('{broken data')
  })

  it('registers the public host route and enforces request limits including streamed bodies', async () => {
    const { root } = await fixture()
    const routes = []
    apply({ effect: fn => fn(), inject() {}, reflect: { provide() {} }, connection: { fetch: { register(value) { routes.push(value) } } } }, { root })
    const catalogRoute = routes.find(value => value.path === '/api/desktop-workbenches/catalog')
    const readRoute = routes.find(value => value.path === '/api/desktop-workbenches/state')
    const writeRoute = routes.find(value => value.path === '/api/desktop-workbenches/state/write')
    const migrateRoute = routes.find(value => value.path === '/api/desktop-workbenches/state/migrate')
    expect(catalogRoute.requestBody).toBe('buffered')
    expect(readRoute.methods).toEqual(['GET'])
    // Without buffered mode, the connection bridge creates a streaming body
    // for GET and Node rejects the Request before it reaches the route.
    expect(readRoute.requestBody).toBe('buffered')
    expect(writeRoute.methods).toEqual(['POST'])
    expect(writeRoute.requestBody).toBe('buffered')
    expect(migrateRoute.methods).toEqual(['POST'])
    expect(migrateRoute.requestBody).toBe('buffered')
    expect((await catalogRoute.fetch(new Request('http://localhost' + catalogRoute.path + '?force=true'))).status).toBe(400)
    expect(await (await readRoute.fetch(new Request('http://localhost' + readRoute.path))).json()).toEqual({ revision: 0, state: emptyState() })
    const post = (body) => writeRoute.fetch(new Request('http://localhost' + writeRoute.path, { method: 'POST', body }))
    expect((await post('{invalid')).status).toBe(400)
    const payload = JSON.stringify({ revision: 0, state: populated() })
    expect((await post(payload)).status).toBe(200)
    expect((await post(payload)).status).toBe(409)
    let cancelled = false
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(256 * 1024)) },
      cancel() { cancelled = true }
    })
    const response = await writeRoute.fetch(new Request('http://localhost' + writeRoute.path, { method: 'POST', body: stream, duplex: 'half' }))
    expect(response.status).toBe(413)
    expect(cancelled).toBe(true)
    expect((await post('x'.repeat(MAX_STATE_BYTES + 1))).status).toBe(413)
  })
})
