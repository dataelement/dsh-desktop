import { localWorkbenchInstallTool } from './local-install-tool.mjs'
import { createRestartStatus, readLocalWorkbenchSnapshot } from './restart-status.mjs'
import { readInstallEvidence } from './install-evidence.mjs'
import { randomUUID } from 'node:crypto'
import Schema from '@deepseek-ai/schemastery'
import { CatalogError, createCatalogReader } from './catalog.mjs'
import { selectMarketFetch } from './market-fetch.mjs'
import { createMarketInstallStore, MarketInstallError, resolveInstallTarget } from './market-install.mjs'
import { readSubmissionStatus, SubmissionStatusError } from './submission-status.mjs'
import { createStateStore, MAX_STATE_BYTES, StateError } from './state.mjs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-desktop-workbenches'
export const inject = ['connection']
export const Config = Schema.object({ root: Schema.string().required() })

export function catalogReadOptions(request) {
  const params = new URL(request.url).searchParams
  for (const key of params.keys()) {
    if (key !== 'force' && key !== 'cache') throw new CatalogError('Unsupported workbench catalog query.', 400)
  }
  const force = params.getAll('force')
  const cache = params.getAll('cache')
  if (cache.length) {
    if (cache.length !== 1 || cache[0] !== '1' || force.length) throw new CatalogError('Invalid workbench catalog cache request.', 400)
    return { cachedOnly: true }
  }
  if (force.length === 0) return { force: false }
  if (force.length !== 1 || force[0] !== '1') throw new CatalogError('Invalid workbench catalog refresh request.', 400)
  return { force: true }
}

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
  const readCatalog = createCatalogReader({
    fetch: selectMarketFetch(),
    cachePath: join(config.root, 'workbench-catalog-cache.json'),
    onWarning: error => ctx.logger?.warn?.(error)
  })
  const marketInstalls = createMarketInstallStore(config.root)
  const restartRuntimeId = randomUUID()
  const restartStatus = createRestartStatus(async () => readLocalWorkbenchSnapshot(undefined, await marketInstalls.read()))
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/restart-status',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try {
        return Response.json({ ...await restartStatus.read(), runtimeId: restartRuntimeId }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        ctx.logger?.warn?.('Could not inspect local workbench restart status: %s', error.message)
        return Response.json({ error: 'Could not inspect local workbench restart status.' }, { status: 503, headers: { 'cache-control': 'no-store' } })
      }
    }
  })
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
  // A fixed packaged asset keeps the market header available offline without
  // exposing a filesystem path or allowing arbitrary file reads.
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/assets/market-header.png',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch() {
      try {
        const image = await readFile(new URL('./assets/market-header.png', import.meta.url))
        return new Response(image, { headers: { 'content-type': 'image/png', 'cache-control': 'no-cache' } })
      } catch {
        return Response.json({ error: 'Could not read the workbench header image.' }, { status: 500 })
      }
    }
  })
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/development-guide', 'development-guide.zh.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/author-guide', 'development-guide.zh.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/market-acceptance', 'market-acceptance.zh.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/development-guide-en', 'development-guide.en.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/author-guide-en', 'development-guide.en.md'))
  ctx.connection.fetch.register(documentRoute('/api/desktop-workbenches/market-acceptance-en', 'market-acceptance.en.md'))
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/catalog',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const result = await readCatalog(catalogReadOptions(request))
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
  const installFailure = (error, fallback) => Response.json({ error: known(error) ? error.message : fallback,
    ...(error instanceof MarketInstallError && error.code ? { code: error.code, params: error.params } : {})
  }, {
    status: known(error) ? error.status : 500,
    headers: { 'cache-control': 'no-store' }
  })
  // Market entries are identified by their Awesome repository identity.
  const catalogPayloadFrom = async (request) => {
    const payload = await readPayload(request, 4096, 'Request is too large.')
    if (typeof payload?.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.\.?$)[A-Za-z0-9_.-]{1,100}$/.test(payload.id)) throw new MarketInstallError('A workbench market entry is required.')
    return payload
  }
  let lifecycleManager
  const lifecycleSnapshot = async () => lifecycleManager ? {
    bundles: await lifecycleManager.listBundles(),
    plugins: await lifecycleManager.listPlugins(),
    applications: lifecycleManager.listApplications?.() ?? []
  } : null
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/market-installs',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const installs = await marketInstalls.read()
        const requested = new URL(request.url).searchParams.getAll('package').slice(0, 64)
        const listed = await readCatalog({ cachedOnly: true }).then(value => value.catalog?.workbenches.map(item => item.distribution?.name).filter(Boolean) || [], () => [])
        return Response.json({ installs, packages: await readInstallEvidence(installs, undefined, [...requested, ...listed]), lifecycle: await lifecycleSnapshot() }, { headers: { 'cache-control': 'no-store' } })
      }
      catch (error) { return installFailure(error, 'Could not read workbench market installs.') }
    }
  })
  // Agent-scoped tools inherit the current Profile manager. Installation stays
  // behind the same escalation boundary as upstream plugin_manager tools.
  ctx.inject(['tools', 'pluginManager', 'sandboxPolicy'], scoped => {
    scoped.tools.register(localWorkbenchInstallTool(scoped, restartStatus))
  })
  // The manager owns package selection, activation, switches and removal. Market
  // records identify catalog provenance only; they are not runtime state.
  ctx.inject(['pluginManager'], (ctx) => {
    const manager = ctx.pluginManager
    lifecycleManager = manager
    ctx.effect(() => () => { if (lifecycleManager === manager) lifecycleManager = undefined })
    const lifecycleResponse = (result, extra = {}) => {
      if (!result || !['applied', 'restart-required', 'overridden', 'failed', 'cancelled'].includes(result.application)) {
        throw new MarketInstallError('Plugin Manager returned no lifecycle outcome.', 502)
      }
      const failed = result.application === 'failed' || result.application === 'cancelled'
      return Response.json({
        ...extra, result, application: result.application,
        restartRequired: result.application === 'restart-required',
        reloadRequired: false,
        actionRequired: result.application === 'restart-required' ? 'restart' : 'none',
        ...(result.restartReason ? { restartReason: result.restartReason } : {}),
        ...(failed ? { error: result.error?.message || result.error?.code || 'Plugin operation did not complete.', code: result.error?.code || result.application } : {})
      }, { status: failed ? 409 : 200, headers: { 'cache-control': 'no-store' } })
    }
    ctx.connection.fetch.register({
      path: '/api/desktop-workbenches/market-install',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const { id, confirmedReplacement } = await catalogPayloadFrom(request)
          // Never accept a package spec from the browser: the reviewed catalog
          // supplies the pinned target and the backend verifies it before publish.
          const entry = (await readCatalog()).catalog.workbenches.find((item) => item.id === id)
          if (!entry) throw new MarketInstallError('This workbench is no longer listed in the workbench market.', 404)
          const installs = await marketInstalls.read()
          const requireReplacement = async (names) => {
            if (confirmedReplacement === true) return
            const packages = await readInstallEvidence(installs, undefined, names)
            const risk = names.map(name => packages[name]).find(item => item && (item.origin === 'local' || ['local', 'modified'].includes(item.updateRisk)))
            if (risk) {
              const updateRisk = risk.origin === 'local' || risk.updateRisk === 'local' ? 'local' : 'modified'
              throw new MarketInstallError('Confirm updating the installed workbench code; local changes may be overwritten.', 409, 'confirmation_required', { updateRisk })
            }
          }
          await requireReplacement([entry.distribution.name, installs[id]?.pluginName].filter(Boolean))
          const target = await resolveInstallTarget(entry)
          let result
          try {
            await requireReplacement([target.expectedPluginName])
            const bundles = await manager.listBundles()
            result = await manager.installBundle(target.pluginSpec, {
              enabled: true,
              expectedName: target.expectedPluginName,
              expectedVersion: target.expectedVersion,
              ...(target.npmIntegrity ? { npmIntegrity: target.npmIntegrity } : {}),
              replace: bundles.some(bundle => bundle.name === target.expectedPluginName && bundle.installed)
            })
          } finally { await target.cleanup() }
          // Validation/installation failures do not establish an installed package.
          // Activation failures may leave a validated installation on disk: retain
          // its provenance, but expose the failed manager outcome unchanged.
          let install
          if (result?.bundle === target.expectedPluginName && result.stage === 'enable') {
            install = { catalogId: entry.id, pluginName: target.expectedPluginName, version: target.expectedVersion, source: entry.distribution.type, installedAt: new Date().toISOString() }
            const evidence = (await readInstallEvidence({}, undefined, [install.pluginName]))[install.pluginName]
            if (evidence?.fingerprint) install.fingerprint = evidence.fingerprint
            await marketInstalls.record(id, install)
          }
          return lifecycleResponse(result, install ? { install } : {})
        } catch (error) { return installFailure(error, 'Could not install the workbench.') }
      }
    })
    const installedPackage = async (id) => {
      const record = (await marketInstalls.read())[id]
      if (!record) throw new MarketInstallError('This workbench has no recorded package identity.', 404)
      return record.pluginName
    }
    ctx.connection.fetch.register({
      path: '/api/desktop-workbenches/market-enabled',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const { id, enabled } = await catalogPayloadFrom(request)
          if (typeof enabled !== 'boolean') throw new MarketInstallError('An enabled boolean is required.')
          return lifecycleResponse(await manager.setBundleEnabled(await installedPackage(id), enabled))
        } catch (error) { return installFailure(error, 'Could not change workbench enablement.') }
      }
    })
    ctx.connection.fetch.register({
      path: '/api/desktop-workbenches/market-uninstall',
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        try {
          const { id } = await catalogPayloadFrom(request)
          const name = await installedPackage(id)
          const bundles = await manager.listBundles()
          // A package removed elsewhere leaves provenance only. The manager rejects
          // absent bundles, so clear this record after a successful inventory read.
          if (!bundles.some(bundle => bundle.name === name)) {
            await marketInstalls.forget(id)
            return lifecycleResponse({ target: name, stage: 'remove', application: 'applied', changed: true, warnings: [] })
          }
          const result = await manager.removeBundle(name)
          if (result?.application === 'applied') await marketInstalls.forget(id)
          return lifecycleResponse(result)
        } catch (error) { return installFailure(error, 'Could not uninstall the workbench.') }
      }
    })
  })
}
