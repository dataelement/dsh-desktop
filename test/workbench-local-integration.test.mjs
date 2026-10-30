import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import { isLocalPackageName, localWorkbenchId } from '../packages/dsh-desktop-workbenches/identity.mjs'

const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

// Exercise the actual browser controller against the real host routes and disk
// state store. No replica identity resolver or in-memory state writer is used.
async function fixture(document = { querySelector: () => null }) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-local-registration-'))
  roots.push(root)
  vi.stubEnv('DSH_HOME', root)
  const routes = new Map()
  let ownership
  apply({ effect: fn => fn(), inject() {}, reflect: { provide(_name, value) { ownership = value } },
    connection: { fetch: { register(route) { routes.set(route.path, route) } } } }, { root })
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const source = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
  let exports
  vm.runInNewContext(source, {
    window: { localStorage: storage, sessionStorage: storage, __ModuleLoader__: { load({ factory }) {
      exports = factory(name => name === 'react' ? React : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol() } } : { Switch: () => null })
    } } }, document, console, setTimeout, clearTimeout, AbortController
  })
  const request = (path, options) => {
    const route = routes.get(new URL(path, 'http://localhost').pathname)
    if (!route) throw new Error(`Unexpected route ${path}`)
    return route.fetch(new Request(new URL(path, 'http://localhost'), options))
  }
  const makeController = async packageName => {
    const ctx = { fiber: { entry: { options: { name: packageName } } },
      sessions: { list: { getSnapshot: () => ({ ids: [], byId: {} }) } },
      workspaces: { list: { getSnapshot: () => ({ items: [] }) } },
      layout: { beginNavigation: () => new AbortController().signal, selectPanel() {} }
    }
    const service = new exports.Workbenches(ctx, request)
    const saved = await service.read()
    service.state = saved.state
    service.revision = saved.revision
    service.native = { status: 'ready', bundles: { [packageName]: { installed: true, enabled: true, version: '1.0.0' } } }
    service.ready = true
    return { service, ctx }
  }
  return { root, makeController, ownership, exports }
}

describe('local workbench registration through real host state routes', () => {
  it('keeps browser and persisted-state package validation identical', async () => {
    const { makeController } = await fixture()
    const { service } = await makeController('review')
    for (const name of ['review', '@hr/review', 'a'.repeat(214), '@a/' + 'b'.repeat(211),
      undefined, null, '', 'Review', '@HR/review', '@hr/Review', 'a'.repeat(215), '@a/' + 'b'.repeat(212),
      '_name', '.name', '@scope', '@scope/', '@scope/a/b', 'scope/name', 'name@1.0.0', 'name:1', 'file:name',
      'C:\\private\\review', '/tmp/review', 'name name', 'name%20', 'name?query', 'name#hash', '__proto__',
      'constructor', 'prototype', '@constructor/name', '@scope/prototype', 'node_modules', 'favicon.ico', 'name\n']) {
      if (isLocalPackageName(name)) expect(service.localIdentity(name)).toBe(localWorkbenchId(name))
      else expect(() => service.localIdentity(name)).toThrow('Invalid local workbench package name')
    }
  })

  it.each(['resume-review', '@hr/resume-review'])('registers and opens %s without GitHub, retaining sessions and notes across restart/removal', async packageName => {
    const { makeController, ownership } = await fixture()
    const id = `local:${packageName}`
    const { service } = await makeController(packageName)
    const Panel = () => React.createElement('p', null, 'Resume review ready')
    const unregister = service.register({ title: 'Resume review', customFrame: true }, Panel)
    await service.queue
    expect(service.blocked).toBe(false)
    expect(service.state.added).toContain(id)
    expect(service.state.pinned).toContain(id)
    expect(service.getSnapshot().catalog.find(entry => entry.id === id)).toMatchObject({ listed: false, installed: true })
    await service.open(id)
    expect(service.isActive()).toBe(true)
    expect(renderToStaticMarkup(React.createElement(service.catalog.get(id).Component))).toContain('Resume review ready')
    await service.commit(state => {
      state.sessionBindings['private-session'] = id
      state.recentSessions[id] = 'private-session'
      state.notes[id] = 'Retained private draft'
      state.hiddenWorkspaces[id] = ['private-workspace']
    })
    expect(service.ownsSession('private-session')).toBe(true)
    expect(await ownership.read()).toMatchObject({ sessionBindings: { 'private-session': id }, added: [id] })
    unregister()
    const { service: restarted } = await makeController(packageName)
    const dispose = restarted.register({ title: 'Resume review', version: '2.0.0', customFrame: true }, Panel)
    await restarted.queue
    expect(restarted.state.sessionBindings['private-session']).toBe(id)
    expect(restarted.catalog.has(id)).toBe(true)
    expect(restarted.state.notes[id]).toBe('Retained private draft')
    await restarted.remove(id)
    dispose()
    const saved = await restarted.read()
    expect(saved.state.added).not.toContain(id)
    expect(saved.state.sessionBindings['private-session']).toBe(id)
    expect(saved.state.notes[id]).toBe('Retained private draft')
    expect(saved.state.hiddenWorkspaces[id]).toEqual(['private-workspace'])
  })

  it('renders registration errors in the real management component and recovers after a corrected registration', async () => {
    const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>')
    const { makeController, exports } = await fixture(dom.window.document)
    const { service } = await makeController('broken-review')
    vi.stubGlobal('window', dom.window)
    vi.stubGlobal('document', dom.window.document)
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = dom.window.document.getElementById('root')
    const view = createRoot(container)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() => service.register({ title: 'Broken', repository: 'not-a-repository' }, () => null)).toThrow()
      await act(async () => view.render(React.createElement(exports.Market, { service })))
      expect(container.querySelector('[role="alert"]').textContent).toContain('broken-review')
      expect(container.querySelector('[role="alert"]').textContent).toContain('GitHub URL')
      let dispose
      await act(async () => {
        dispose = service.register({ title: 'Corrected', customFrame: true }, () => React.createElement('p', null, 'Ready'))
        await service.queue
      })
      expect(container.textContent).not.toContain('GitHub URL')
      expect(service.catalog.has('local:broken-review')).toBe(true)
      await act(async () => dispose())
    } finally {
      await act(async () => view.unmount())
      dom.window.close()
      vi.unstubAllGlobals()
    }
  })
})
