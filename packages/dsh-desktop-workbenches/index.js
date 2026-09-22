import Schema from '@deepseek-ai/schemastery'
import { CatalogError, createCatalogReader } from './catalog.mjs'
import { awaitHandle, createMarketInstallStore, MarketInstallError, resolveInstallTarget } from './market-install.mjs'
import { readSubmissionStatus, SubmissionStatusError } from './submission-status.mjs'
import { createStateStore, MAX_STATE_BYTES, StateError } from './state.mjs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-desktop-workbenches'
export const inject = ['connection']
export const Config = Schema.object({ root: Schema.string().required() })

export function authorizedStateMigrations(catalog) {
  const allowed = new Map()
  for (const entry of catalog.workbenches) {
    for (const legacy of [entry.workbenchId, ...(entry.legacyWorkbenchIds || [])]) {
      if (typeof legacy === 'string' && legacy !== entry.id) allowed.set(legacy, entry.id)
    }
  }
  return allowed
}

async function readPayload(request, maximum = MAX_STATE_BYTES, tooLarge = 'Workbench state is too large.') {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximum) throw new StateError(tooLarge, 413)
  const reader = request.body?.getReader()
  if (!reader) throw new StateError('A JSON body is required.')
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > maximum) {
        await reader.cancel()
        throw new StateError(tooLarge, 413)
      }
      chunks.push(value)
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
    catch { throw new StateError('Invalid JSON body.') }
  } finally { reader.releaseLock() }
}

export function apply(ctx, config) {
  const store = createStateStore(config.root)
  const readCatalog = createCatalogReader()
  const marketInstalls = createMarketInstallStore(config.root)
  // Providers must use the same persisted ownership as Desktop, never a second
  // settings namespace that could accidentally authorize an ordinary session.
  ctx.effect(() => ctx.reflect.provide('desktopWorkbenchOwnership', {
    async read() {
      const { revision, state } = await store.read()
      return { revision, sessionBindings: { ...state.sessionBindings }, added: [...state.added] }
    }
  }))
  // Both documents are published on the website; these are the offline copies
  // bundled with this Desktop version.
  const documentRoute = (path, file) => ({
    path,
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try {
        const text = await readFile(join(dirname(fileURLToPath(import.meta.url)), file), 'utf8')
        return new Response(text, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } })
      } catch {
        return Response.json({ error: `Could not read ${file}.` }, { status: 500, headers: { 'cache-control': 'no-store' } })
      }
    }
  })
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/development-guide', 'development-guide.zh.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/author-guide', 'development-guide.zh.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/market-acceptance', 'market-acceptance.zh.md'))
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/catalog',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try {
        const result = await readCatalog()
        return Response.json(result, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof CatalogError ? error.message : 'Could not read the workbench catalog.' }, {
          status: error instanceof CatalogError ? error.status : 500,
          headers: { 'cache-control': 'no-store' }
        })
      }
    }
  })
  const stateFailure = (error) => Response.json({ error: error instanceof StateError || error instanceof CatalogError ? error.message : 'Could not access workbench state.' }, {
    status: error instanceof StateError || error instanceof CatalogError ? error.status : 500,
    headers: { 'cache-control': 'no-store' }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/state',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try {
        return Response.json(await store.read(), { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof StateError ? error.message : 'Could not access workbench state.' }, {
          status: error instanceof StateError ? error.status : 500,
          headers: { 'cache-control': 'no-store' }
        })
      }
    }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/state/write',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        return Response.json(await store.write(await readPayload(request)), { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return stateFailure(error) }
    }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/state/migrate',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const payload = await readPayload(request)
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !payload.migrations || typeof payload.migrations !== 'object' || Array.isArray(payload.migrations)) throw new StateError('A workbench ID migration is required.')
        const allowed = authorizedStateMigrations((await readCatalog()).catalog)
        if (!Object.entries(payload.migrations).length || !Object.entries(payload.migrations).every(([from, to]) => allowed.get(from) === to)) throw new StateError('This workbench ID migration is not authorized by the market.', 403)
        return Response.json(await store.migrate({ revision: payload.revision, state: payload.state }, payload.migrations), { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return stateFailure(error) }
    }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/submission-status',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const status = await readSubmissionStatus(new URL(request.url).searchParams.get('url'))
        return Response.json(status, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof SubmissionStatusError ? error.message : 'Could not read the pull request.' }, {
          status: error instanceof SubmissionStatusError ? error.status : 500, headers: { 'cache-control': 'no-store' }
        })
      }
    }
  })
  const known = (error) => error instanceof MarketInstallError || error instanceof CatalogError || error instanceof StateError
  const installFailure = (error, fallback) => Response.json({ error: known(error) ? error.message : fallback }, {
    status: known(error) ? error.status : 500,
    headers: { 'cache-control': 'no-store' }
  })
  // Market entries are identified by their Awesome repository identity.
  const catalogIdFrom = async (request) => {
    const payload = await readPayload(request, 4096, 'Request is too large.')
    if (typeof payload?.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.\.?$)[A-Za-z0-9_.-]{1,100}$/.test(payload.id)) throw new MarketInstallError('A workbench market entry is required.')
    return payload.id
  }
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/market-installs',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try { return Response.json({ installs: await marketInstalls.read() }, { headers: { 'cache-control': 'no-store' } }) }
      catch (error) { return installFailure(error, 'Could not read workbench market installs.') }
    }
  })
  // Installing needs Desktop's package service; without it the market stays browse-only.
  ctx.inject(['desktopPnpm'], (ctx) => {
    ctx.connection.fetch.register({
      path: '/api/desktop-workbenches/market-install',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const id = await catalogIdFrom(request)
          // The install source always comes from the Awesome catalog, never from the request.
          const entry = (await readCatalog()).catalog.workbenches.find((item) => item.id === id)
          if (!entry) throw new MarketInstallError('This workbench is no longer listed in the workbench market.', 404)
          const target = await resolveInstallTarget(entry)
          try {
            let handle
            try {
              handle = ctx.desktopPnpm.installWorkbenchGeneration({
                pluginSpec: target.pluginSpec,
                expectedPluginName: target.expectedPluginName,
                expectedVersion: target.expectedVersion,
                npmIntegrity: target.npmIntegrity
              }, config.root)
            } catch (error) { throw new MarketInstallError(error instanceof Error ? error.message : String(error), 409) }
            await awaitHandle(handle)
          } finally { await target.cleanup() }
          const install = { catalogId: entry.id, pluginName: target.expectedPluginName, version: entry.version, source: entry.distribution.type, installedAt: new Date().toISOString() }
          await marketInstalls.record(id, install)
          return Response.json({ install, restartRequired: true }, { headers: { 'cache-control': 'no-store' } })
        } catch (error) { return installFailure(error, 'Could not install the workbench.') }
      }
    })
    ctx.connection.fetch.register({
      path: '/api/desktop-workbenches/market-uninstall',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const id = await catalogIdFrom(request)
          const install = (await marketInstalls.read())[id]
          if (!install) throw new MarketInstallError('This workbench was not installed from the workbench market.', 404)
          let handle
          try { handle = ctx.desktopPnpm.runPlugin(['remove', install.pluginName], config.root) }
          catch (error) { throw new MarketInstallError(error instanceof Error ? error.message : String(error), 409) }
          await awaitHandle(handle)
          await marketInstalls.forget(id)
          return Response.json({ restartRequired: true }, { headers: { 'cache-control': 'no-store' } })
        } catch (error) { return installFailure(error, 'Could not uninstall the workbench.') }
      }
    })
  })
}
