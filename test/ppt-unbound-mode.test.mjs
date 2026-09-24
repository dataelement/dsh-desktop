import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const adapter = await readFile(path.resolve('packages/ppt-runtime/adapter/lib/client.js'), 'utf8')
const core = await readFile(path.resolve('packages/ppt-runtime/core/lib/client.js'), 'utf8')

function slice(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  if (from < 0 || to < 0) throw new Error(`missing ${start}`)
  return source.slice(from, to)
}

function normalizedStoreSource(source) {
  return slice(source, 'const STAGED_MODE_KEY', 'function useMode')
    .replace(/\r\n/g, '\n')
    .replace(
      /^([ \t]*)constructor\(\) \{\n\1[ \t]+this\.states = \/\* @__PURE__ \*\/ new Map\(\);\n\1[ \t]+this\.listeners = \/\* @__PURE__ \*\/ new Map\(\);\n\1\}/m,
      '$1states = /* @__PURE__ */ new Map();\n$1listeners = /* @__PURE__ */ new Map();'
    )
}

const Store = new Function(`${slice(adapter, 'const STAGED_MODE_KEY', 'function useMode')}\nreturn OfficePptHeroStore;`)()
const createOfficePptClient = new Function(`${slice(adapter, 'function createOfficePptClient', 'const standardInject')}\nreturn createOfficePptClient;`)()

function client(handler) {
  const calls = []
  return {
    calls,
    bound: true,
    async call(endpoint, payload) {
      calls.push({ endpoint, payload })
      return handler(endpoint, payload)
    }
  }
}

describe('unbound PPT mode', () => {
  it('keeps the staged store implementation aligned between the two clients', () => {
    expect(normalizedStoreSource(adapter)).toBe(normalizedStoreSource(core))
    const asWindowsCheckout = (source) => source.replace(/\r?\n/g, '\r\n')
    expect(normalizedStoreSource(asWindowsCheckout(adapter))).toBe(
      normalizedStoreSource(asWindowsCheckout(core))
    )
  })

  it('selects a template locally and writes it once when a blank session appears', async () => {
    const mode = new Store()
    let selected = null
    const rpc = client(() => ({
      templates: [{ id: 'built-in-a' }],
      presentationMode: selected === null ? null : 'ppt',
      selectedTemplateId: selected
    }))
    rpc.call = async (endpoint, payload) => {
      rpc.calls.push({ endpoint, payload })
      if (endpoint === 'template/select') selected = payload.templateId
      return {
        templates: [{ id: 'built-in-a' }],
        presentationMode: selected === null ? null : 'ppt',
        selectedTemplateId: selected
      }
    }
    mode.setMode(undefined, 'ppt')
    mode.select(undefined, { id: 'built-in-a' }, 'ppt')
    expect(rpc.calls).toEqual([])
    await mode.adopt('session-a', rpc)
    expect(rpc.calls.map(call => call.endpoint)).toEqual(['state', 'template/select', 'state'])
    expect(rpc.calls[1].payload).toEqual({ templateId: 'built-in-a', mode: 'ppt' })
    expect(mode.snapshot('session-a').selectedId).toBe('built-in-a')
    expect(mode.snapshot('session-a').activeMode).toBe('ppt')
    const again = rpc.calls.length
    await mode.adopt('session-a', rpc)
    expect(rpc.calls).toHaveLength(again)
  })

  it('does not write when the staged choice was cancelled', async () => {
    const mode = new Store()
    const rpc = client(() => ({ templates: [], presentationMode: null }))
    mode.setMode(undefined, 'ppt')
    mode.setMode(undefined, null)
    await mode.adopt('session-a', rpc)
    expect(rpc.calls).toEqual([])
    expect(mode.snapshot(undefined).activeMode).toBeNull()
  })

  it('keeps an occupied session and discards the staged choice', async () => {
    const mode = new Store()
    const rpc = client(endpoint => {
      if (endpoint === 'state') return { templates: [{ id: 'existing' }], presentationMode: 'ppt', selectedTemplateId: 'existing' }
      throw new Error(endpoint)
    })
    mode.setMode(undefined, 'ppt')
    mode.select(undefined, { id: 'staged' }, 'ppt')
    await mode.adopt('session-a', rpc)
    expect(rpc.calls.map(call => call.endpoint)).toEqual(['state'])
    expect(mode.snapshot('session-a').selectedId).toBe('existing')
    expect(mode.snapshot('session-a').activeMode).toBe('ppt')
    expect(mode.snapshot(undefined).activeMode).toBeNull()
  })

  it('keeps PPT mode and surfaces an error when the staged template cannot be selected', async () => {
    const mode = new Store()
    const rpc = client(endpoint => {
      if (endpoint === 'template/select') throw new Error('template missing')
      if (endpoint === 'state') return { templates: [], presentationMode: null }
      return { presentationMode: 'ppt' }
    })
    mode.select(undefined, { id: 'missing' }, 'ppt')
    await mode.adopt('session-a', rpc)
    expect(rpc.calls.map(call => call.endpoint)).toEqual(['state', 'template/select', 'presentation/mode'])
    const next = mode.snapshot('session-a')
    expect(next.activeMode).toBe('ppt')
    expect(next.selectedId).toBeNull()
    expect(next.error).toContain('template missing')
  })

  it('keeps a staged template selected when an older catalog response arrives after migration', async () => {
    const mode = new Store()
    mode.select(undefined, { id: 'built-in-a' }, 'ppt')
    const seenRevision = mode.revision('session-a')
    let selected = null
    let releaseState
    let heldState = new Promise(resolve => {
      releaseState = () => resolve({ templates: [{ id: 'built-in-a' }], presentationMode: null, selectedTemplateId: null })
    })
    const rpc = {
      calls: [],
      bound: true,
      call(endpoint, payload) {
        this.calls.push({ endpoint, payload })
        if (endpoint === 'state' && heldState) {
          const pending = heldState
          heldState = null
          return pending
        }
        if (endpoint === 'template/select') {
          selected = payload.templateId
          return Promise.resolve({})
        }
        return Promise.resolve({
          templates: [{ id: 'built-in-a' }],
          presentationMode: selected === null ? null : 'ppt',
          selectedTemplateId: selected
        })
      }
    }
    const migration = mode.adopt('session-a', rpc)
    expect(mode.revision('session-a')).toBeGreaterThan(seenRevision)
    releaseState()
    await migration
    let deselected = 0
    const deselect = mode.deselect.bind(mode)
    mode.deselect = (...args) => {
      deselected += 1
      return deselect(...args)
    }
    const applied = mode.applyLoadedTemplates('session-a', rpc, seenRevision, {
      templates: [{ id: 'late-catalog' }],
      presentationMode: null,
      selectedTemplateId: null
    }, { client: rpc, sessionId: 'session-a' })
    expect(applied).toBe(false)
    expect(deselected).toBe(0)
    expect(mode.snapshot('session-a').selectedId).toBe('built-in-a')
    expect(mode.snapshot('session-a').templates.some(template => template.id === 'late-catalog')).toBe(false)
    expect(mode.snapshot('session-a').mutationRevision).toBeUndefined()
  })

  it('does not let an unbound catalog response write a session that has since bound', () => {
    const mode = new Store()
    mode.select(undefined, { id: 'built-in-a' }, 'ppt')
    const unbound = { bound: false }
    const bound = { bound: true }
    mode.bump('session-a')
    const seenRevision = mode.revision('session-a')
    const applied = mode.applyLoadedTemplates('session-a', bound, seenRevision, {
      templates: [{ id: 'late-catalog' }],
      presentationMode: null,
      selectedTemplateId: null
    }, { client: unbound, sessionId: undefined })
    expect(applied).toBe(false)
    expect(mode.snapshot('session-a').templates).toEqual([])
    expect(mode.snapshot(undefined).selectedId).toBe('built-in-a')
  })

  it('drops a catalog response invalidated by a mode click and accepts the reload', () => {
    const mode = new Store()
    const client = { bound: false }
    const request = { client, sessionId: undefined }
    mode.setLoading(undefined, true)
    const seenRevision = mode.revision(undefined)
    mode.setMode(undefined, 'ppt')
    const stale = mode.applyLoadedTemplates(undefined, client, seenRevision, {
      templates: [{ id: 'late-catalog', supportedModes: ['ppt'] }],
      presentationMode: null,
      selectedTemplateId: null
    }, request)
    expect(stale).toBe(false)
    expect(mode.snapshot(undefined).templates).toEqual([])
    expect(mode.snapshot(undefined).loading).toBe(true)
    const reloaded = mode.applyLoadedTemplates(undefined, client, mode.revision(undefined), {
      templates: [{ id: 'built-in-a', supportedModes: ['ppt'] }],
      presentationMode: null,
      selectedTemplateId: null
    }, request)
    expect(reloaded).toBe(true)
    expect(mode.snapshot(undefined).templates.map(template => template.id)).toEqual(['built-in-a'])
    expect(mode.snapshot(undefined).loading).toBe(false)
    expect(mode.snapshot(undefined).activeMode).toBe('ppt')
  })

  it('reloads the catalog when the mode revision changes and does not stop because loading is true', () => {
    const effect = slice(adapter, 'const catalogRevision = mode.revision(sessionId);', 'const deselect = () =>')
    expect(effect).toContain('if (!loadTemplates || state.templates.length > 0 || state.error !== "") return;')
    expect(effect).not.toContain('state.loading ||')
    expect(effect).toContain('catalogRevision,')
    expect(slice(core, 'const catalogRevision = mode.revision(sessionId);', 'const deselect = () =>')).toBe(effect)
  })

  it('leaves the revision unchanged for loading and error updates', () => {
    const mode = new Store()
    const before = mode.revision('session-a')
    mode.setLoading('session-a', true)
    mode.setError('session-a', 'try again')
    expect(mode.revision('session-a')).toBe(before)
    mode.setMode('session-a', 'ppt')
    expect(mode.revision('session-a')).toBe(before + 1)
  })

  it('routes an unbound catalog read without a session id and refuses writes', async () => {
    const calls = []
    const rpc = { async call(route, endpoint, payload) { calls.push({ route, endpoint, payload }); return { ok: true, value: { status: 'ok', data: { templates: [{ id: 'built-in-a', origin: 'built-in' }] } } } } }
    const unbound = createOfficePptClient(rpc, undefined)
    expect(unbound.bound).toBe(false)
    await expect(unbound.call('presentation/mode', { mode: 'ppt' })).rejects.toThrow('PPT session is not ready')
    const state = await unbound.call('state')
    expect(state.templates).toEqual([{ id: 'built-in-a', origin: 'built-in' }])
    expect(state.selectedTemplateId).toBeNull()
    expect(calls).toEqual([{ route: '/dsh-ppt', endpoint: 'template/catalog', payload: {} }])
  })
})
