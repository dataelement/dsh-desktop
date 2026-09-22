import semver from 'semver'
import { createPublicKey, randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyMarketLease } from './market-policy.js'
import { installOfflineBundle, sha256, verifyInstalledBundle } from './offline-bundle.js'
import { createMarketRuntime } from './market-runtime.js'

const PREFIX = '/api/v1/dsh/market'
const MAX_CATALOG_PAGES = 100
const MAX_CATALOG_SIZE = MAX_CATALOG_PAGES * 100

/** Both the UI and installer consume this host-owned compatibility verdict. */
export function isMarketVersionCompatible(version, minimum) {
  return Boolean(semver.valid(version) && semver.valid(minimum) && semver.gte(version, minimum))
}

function validatedCatalog(value) {
  if (!value || !Array.isArray(value.data) || value.data.length > 100 ||
      !Number.isSafeInteger(value.total) || value.total < 0 || value.total > MAX_CATALOG_SIZE) {
    throw new Error('Invalid enterprise catalog pagination.')
  }
  return value
}

function canonicalPublicKey(value) {
  const key = createPublicKey(typeof value === 'string' ? value.replace(/\\n/gu, '\n') : value)
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Unsupported marketplace signing key.')
  return key.export({ type: 'spki', format: 'pem' }).toString()
}

export function createMarketController(ctx, accountController, options = {}) {
  const home = options.home ?? process.env.DSH_HOME
  const target = options.target ?? `${process.platform}-${process.arch}`
  const pinnedPublicKey = options.publicKey ?? process.env.DSH_DESKTOP_MARKET_PUBLIC_KEY
  let publicKey = pinnedPublicKey
  const desktopVersion = () => options.desktopVersion ?? accountController.state().desktopVersion ?? ''
  const load = options.load ?? createMarketRuntime(ctx)
  let key, document = { device_id: randomUUID(), installed: [], lease: null }
  let account, capability, policy, lastError, queue = Promise.resolve(), epoch = 0
  let online = false, expiryTimer, cancellation = 0, operationGeneration = 0, cleaning = false
  const running = new Map()
  const directory = home ? join(home, 'enterprise-market') : null
  const serialized = (task, cleanup = false) => {
    const generation = cancellation
    const next = queue.then(async () => {
      if (!cleanup && generation !== cancellation) throw new Error('Enterprise account changed.')
      operationGeneration = generation
      cleaning = cleanup
      try { return await task() } finally { cleaning = false }
    })
    queue = next.catch(error => { lastError = error.message })
    return next
  }
  const assertCurrentOperation = () => {
    if (!cleaning && operationGeneration !== cancellation) throw new Error('Enterprise account changed.')
  }
  const save = async () => {
    assertCurrentOperation()
    if (!directory || !key) return
    await mkdir(directory, { recursive: true })
    const path = join(directory, `${key}.json`), temporary = `${path}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(document), { mode: 0o600 })
    await rename(temporary, path)
  }
  const identityKey = value => value?.connected ? sha256(`${value.base}|${value.tenant.id}|${value.user.id}`) : null
  const request = async (path, body) => {
    assertCurrentOperation()
    const startedEpoch = epoch, startedIdentity = identityKey(accountController.state())
    const data = await accountController.marketRequest(PREFIX + path, body)
    if (startedEpoch !== epoch || startedIdentity !== identityKey(accountController.state())) throw new Error('Enterprise account changed.')
    if (!data || data.status_code !== 200) throw new Error(data?.status_message || 'Enterprise market request failed.')
    return data.data
  }
  const authorized = record => {
    const rule = policy?.policies.find(p => p.plugin_id === record.plugin_id && p.name === record.name)
    return rule && !rule.disabled && rule.versions.some(v => v.id === record.version_id && v.digest === record.digest)
  }
  const checkLease = () => {
    if (account?.sessionExpiresAt && Date.parse(account.sessionExpiresAt) <= Date.now()) throw new Error('Enterprise session expired.')
    policy = verifyMarketLease(document.lease, account, document.device_id, publicKey)
    clearTimeout(expiryTimer)
    expiryTimer = setTimeout(() => { epoch += 1; cancellation += 1; void serialized(async () => { online = false; await enforce() }, true).catch(error => { lastError = error.message }) },
      Math.max(1, Math.min(policy.expires_at * 1000, account.sessionExpiresAt ? Date.parse(account.sessionExpiresAt) : Infinity) - Date.now()))
    expiryTimer.unref?.()
    return policy
  }
  const stopRecord = async record => {
    const fiber = running.get(record.plugin_id)
    if (fiber) { await fiber.dispose(); running.delete(record.plugin_id) }
    record.status = 'disabled'
  }
  const startRecord = async (record, startedEpoch) => {
    assertCurrentOperation()
    checkLease()
    if (!/^[a-z0-9+_.-]+$/iu.test(record.generation_id) || record.directory !== join(home, 'profiles', '.enterprise-generations', record.generation_id)) throw new Error('Invalid enterprise generation path.')
    if (!authorized(record) || startedEpoch !== epoch) throw new Error('Plugin usage authorization changed.')
    await verifyInstalledBundle(record, target)
    if (startedEpoch !== epoch) throw new Error('Enterprise account changed.')
    const fiber = await load(record)
    if (startedEpoch !== epoch) { await fiber.dispose(); throw new Error('Enterprise account changed.') }
    running.set(record.plugin_id, fiber)
    record.status = 'enabled'
  }
  const enforce = async () => {
    let valid = false
    try { if (account) { checkLease(); valid = true } } catch (error) { lastError = error.message }
    for (const record of document.installed) {
      if (!valid || !authorized(record)) {
        await stopRecord(record)
        if (valid) record.enabled = false
        record.revision = policy?.policies.find(p => p.plugin_id === record.plugin_id)?.revision ?? record.revision
      }
    }
    await save()
  }
  const bind = async () => {
    const current = accountController.state()
    if (!current.connected) throw new Error('Sign in to your enterprise account first.')
    if (!home) throw new Error('Desktop home is unavailable.')
    const nextKey = sha256(`${current.base}|${current.tenant.id}|${current.user.id}`)
    if (nextKey === key) { account = current; return }
    for (const record of document.installed) await stopRecord(record)
    epoch += 1; account = current; key = nextKey; capability = null; policy = null
    try { document = JSON.parse(await readFile(join(directory, `${key}.json`), 'utf8')) }
    catch (error) {
      if (error.code !== 'ENOENT') throw error
      document = { device_id: randomUUID(), installed: [], lease: null }
    }
    assertCurrentOperation()
    publicKey = pinnedPublicKey ?? document.public_key
    for (const record of document.installed) record.status = 'disabled'
  }
  const synchronize = async () => {
    await bind()
    online = false
    const bindingEpoch = epoch
    try {
      capability = await request('/capabilities')
      if (capability.contract_version !== 1 || !capability.enabled) throw new Error('Enterprise plugin market is not configured on this server.')
      if (capability.tenant_id !== account.tenant.id) throw new Error('Enterprise market tenant mismatch.')
      // First use trusts the confirmed enterprise origin. Later synchronizations
      // retain that key; administrators can supply an independent deployment pin.
      const advertised = canonicalPublicKey(capability.public_key)
      if (publicKey && canonicalPublicKey(publicKey) !== advertised) {
        throw new Error('Enterprise signing key changed. Administrator verification is required.')
      }
      publicKey ??= advertised
      document.public_key = publicKey
      await save()
      const receipt = await request('/sync', { device_id: document.device_id, plugins: [...document.installed.map(record => ({
        plugin_id: record.plugin_id, version_id: record.version_id, status: record.status, revision: record.revision
      })), ...(document.installed.length < 500 ? (document.tombstones ?? []).slice(-(500 - document.installed.length)) : [])] })
      policy = verifyMarketLease(receipt, account, document.device_id, publicKey)
      document.lease = receipt; online = true; lastError = null
    } catch (error) {
      if (operationGeneration !== cancellation || bindingEpoch !== epoch || identityKey(accountController.state()) !== key) throw error
      lastError = error.message
    }
    await enforce()
    const startedEpoch = epoch
    for (const record of document.installed) {
      if (record.enabled && record.status !== 'enabled') {
        try { await startRecord(record, startedEpoch) }
        catch (error) { record.status = 'failed'; record.error = error.message }
      }
    }
    await save()
  }
  const state = () => {
    const current = accountController.state()
    const sameAccount = current.connected && account?.base === current.base && account?.user.id === current.user.id && account?.tenant.id === current.tenant.id
    return { configured: Boolean(current.connected), base: current.base,
      connected: Boolean(current.connected), online: Boolean(sameAccount && online), target, desktopVersion: desktopVersion(),
      tenant: current.tenant, user: current.user, installed: sameAccount ? document.installed.map(({ directory: _directory, config: _config, ...record }) => record) : [],
      accountKey: current.connected ? sha256(`${current.base}|${current.tenant.id}|${current.user.id}`) : null,
      error: lastError, expiresAt: sameAccount ? policy?.expires_at : undefined }
  }
  const audit = async (input, result) => {
    if (!directory || !account) return
    await mkdir(directory, { recursive: true })
    await appendFile(join(directory, 'operations.jsonl'), `${JSON.stringify({ time: new Date().toISOString(), tenant_id: account.tenant.id,
      user_id: account.user.id, plugin_id: input.plugin_id, action: input.action, result })}\n`, { mode: 0o600 })
  }

  return {
    state,
    synchronize: () => serialized(synchronize),
    catalog: (query = '', page = 1) => serialized(async () => {
      if (!accountController.state().connected) return { ...state(), data: [], total: 0 }
      await synchronize()
      if (capability && capability.tenant_id !== account?.tenant.id) throw new Error('Enterprise market tenant mismatch.')
      if (!Number.isSafeInteger(page) || page < 1 || page > MAX_CATALOG_PAGES) throw new Error('Invalid catalog page.')
      const startedEpoch = epoch
      const catalog = validatedCatalog(await request(`/catalog?q=${encodeURIComponent(query.trim().slice(0, 200))}&page=${page}&size=100`))
      if (startedEpoch !== epoch) throw new Error('Enterprise account changed.')
      const data = catalog.data.map(plugin => ({ ...plugin, versions: plugin.versions.map(version => ({
        ...version, compatible: Boolean(version.manifest?.targets?.[target]) && isMarketVersionCompatible(desktopVersion(), version.manifest?.plugin?.desktop_min)
      })) }))
      return { ...state(), data, total: catalog.total, installReady: online }
    }),
    act: input => serialized(async () => {
      if (!['install', 'enable', 'disable', 'uninstall', 'configure'].includes(input.action)) throw new Error('Unknown plugin operation.')
      if (!/^[a-f0-9]{32}$/u.test(input.plugin_id)) throw new Error('Invalid plugin identifier.')
      if (input.config !== undefined && (!input.config || Array.isArray(input.config) || typeof input.config !== 'object' || Buffer.byteLength(JSON.stringify(input.config)) > 65536)) throw new Error('Plugin configuration must be an object under 64 KiB.')
      await bind()
      await audit(input, 'started')
      let operationResult = 'succeeded'
      try {
      const startedEpoch = epoch
      const previous = document.installed.find(p => p.plugin_id === input.plugin_id)
      if (input.action === 'disable' || input.action === 'uninstall') {
        if (!previous) throw new Error('Plugin is not installed.')
        await stopRecord(previous); previous.enabled = false
        if (input.action === 'uninstall') {
          document.installed = document.installed.filter(p => p !== previous)
          document.tombstones = [...(document.tombstones ?? []).filter(p => p.plugin_id !== previous.plugin_id),
            { plugin_id: previous.plugin_id, version_id: previous.version_id, status: 'uninstalled', revision: previous.revision }].slice(-500)
        }
        await save(); return state()
      }
      await synchronize()
      if (!online) throw new Error(lastError || 'Connect to the enterprise market to enable plugins.')
      if (input.action === 'configure') {
        if (!previous || input.config === undefined) throw new Error('Choose an installed plugin and provide its configuration.')
        const saved = { ...previous }
        await stopRecord(previous)
        previous.config = input.config
        try {
          if (saved.enabled) await startRecord(previous, epoch)
          await save()
        } catch (error) {
          await stopRecord(previous)
          Object.assign(previous, saved)
          if (saved.enabled && startedEpoch === epoch) await startRecord(previous, startedEpoch)
          throw error
        }
        return state()
      }
      if (input.action === 'enable') {
        if (!previous) throw new Error('Plugin is not installed.')
        if (!running.has(previous.plugin_id)) await startRecord(previous, epoch)
        previous.enabled = true; await save(); return state()
      }
      if (!previous && document.installed.length >= 500) throw new Error('This device has reached the 500 plugin limit.')
      let selected
      for (let page = 1; page <= MAX_CATALOG_PAGES; page++) {
        const result = validatedCatalog(await request(`/catalog?page=${page}&size=100`))
        selected = result.data.find(p => p.id === input.plugin_id)
        if (selected || result.data.length === 0 || page * 100 >= result.total) break
      }
      const version = selected?.versions.find(v => v.id === selected.current_version_id)
      if (!version || (input.version_id && version.id !== input.version_id)) throw new Error('Published version changed. Refresh the market.')
      const metadata = version.manifest.plugin
      if (!version.manifest.targets[target] || !isMarketVersionCompatible(desktopVersion(), metadata.desktop_min)) throw new Error('Plugin is incompatible with this Desktop or platform.')
      if (!semver.valid(version.version)) throw new Error('Invalid plugin version.')
      if (previous && (!semver.valid(previous.version) || semver.gt(previous.version, version.version))) throw new Error('The enterprise version is older. Uninstall before choosing a lower version.')
      const bytes = await accountController.marketRequest(`${PREFIX}/plugins/${selected.id}/versions/${version.id}/artifact`, undefined, true)
      if (startedEpoch !== epoch || identityKey(accountController.state()) !== key) throw new Error('Enterprise account changed.')
      const expected = { name: selected.name, version: version.version, digest: version.digest }
      const generation = await installOfflineBundle(home, bytes, expected, target)
      await synchronize()
      if (startedEpoch !== epoch || !online) throw new Error('Enterprise authorization changed during installation.')
      const record = { ...expected, directory: generation.directory, generation_id: generation.id, plugin_id: selected.id,
        version_id: version.id, revision: selected.revision, enabled: true, status: 'disabled', display_name: selected.display_name, description: selected.description, config: input.config ?? previous?.config ?? {} }
      if (!authorized(record) || policy.policies.find(p => p.plugin_id === record.plugin_id)?.current_version_id !== record.version_id) throw new Error('Published version changed during installation.')
      const previousRecords = document.installed
      if (previous) await stopRecord(previous)
      try {
        await startRecord(record, startedEpoch)
        document.installed = [...document.installed.filter(p => p.plugin_id !== selected.id), record]
        document.tombstones = (document.tombstones ?? []).filter(p => p.plugin_id !== record.plugin_id)
        await save()
      }
      catch (error) {
        await stopRecord(record)
        document.installed = previousRecords
        if (startedEpoch === epoch && previous?.enabled && authorized(previous)) await startRecord(previous, startedEpoch)
        throw error
      }
      return state()
      } catch (error) { operationResult = 'failed'; throw error }
      finally { await audit(input, operationResult) }
    }),
    stop(clearLease = true) {
      // Invalidate in-flight work immediately; every document/fiber mutation is queued.
      epoch += 1; cancellation += 1
      return serialized(async () => {
      online = false
      clearTimeout(expiryTimer)
      for (const record of document.installed) await stopRecord(record)
      if (clearLease) document.lease = null
      await save(); account = null; key = null; policy = null
      document = { device_id: randomUUID(), installed: [], lease: null }
      }, true)
    },
    tick: () => serialized(async () => {
      if (!accountController.state().connected) {
        epoch += 1; online = false; clearTimeout(expiryTimer); document.lease = null
        for (const record of document.installed) await stopRecord(record)
        await save(); return
      }
      await synchronize()
    })
  }
}

export function applyEnterpriseMarket(ctx, accountController) {
  const market = createMarketController(ctx, accountController)
  const register = (path, methods, handler) => ctx.connection.fetch.register({ path, methods, requestBody: 'buffered', fetch: async request => {
    try {
      await accountController.refreshState?.()
      return Response.json(await handler(request), { headers: { 'cache-control': 'no-store' } })
    }
    catch (error) { return Response.json({ error: error.message }, { status: 400 }) }
  } })
  register('/api/enterprise.market.state', ['GET'], () => market.state())
  register('/api/enterprise.market.catalog', ['GET'], request => {
    const url = new URL(request.url)
    return market.catalog(url.searchParams.get('q') || '', Math.max(1, Number(url.searchParams.get('page') || 1)))
  })
  register('/api/enterprise.market.action', ['POST'], async request => {
    const body = await request.text()
    if (Buffer.byteLength(body) > 70000) throw new Error('Plugin request exceeds 70 KiB.')
    return market.act(JSON.parse(body))
  })
  const tick = async () => { await accountController.refreshState?.(); await market.tick() }
  const timer = setInterval(() => { void tick().catch(() => undefined) }, 60_000)
  timer.unref?.()
  ctx.effect(() => () => { clearInterval(timer); return market.stop(false) }, 'enterprise-market lifecycle')
  void tick().catch(() => undefined)
  return market
}
