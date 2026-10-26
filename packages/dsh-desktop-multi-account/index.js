/**
 * Host half of DSH Desktop multi-account support.
 *
 * Gives every API-key model provider a pool of named accounts (API keys)
 * with three selection strategies — manual, switch-on-error, and
 * round-robin — without touching the stock model pipeline:
 *
 * - Account state (keys included) lives in one harness credential record
 *   (`dsh-desktop-multi-account/state`, a `grant` record whose payload only
 *   this plugin interprets), so secrets stay in the platform credential
 *   store with its owner-only file permissions and cross-process locking.
 *   Desktop host entries are command-line overlay entries whose plugin
 *   config cannot be persisted through configForms, which rules out keeping
 *   the pool in this plugin's own Config.
 * - "Applying" an account writes its key into the provider's existing
 *   credential reference (`apiKeyEnv`) through `ctx.credentials`. Adapters
 *   resolve that reference per request, so a switch takes effect on the
 *   next model call with no restart and no adapter cooperation.
 * - Selection happens on the `llm/stream` waterfall, the seam the harness
 *   reserves for retry/routing middleware. Round-robin advances before the
 *   call; failover buffers chunks until the first content chunk and, on an
 *   account-terminal failure (auth, quota, rate limit, …) with nothing yet
 *   delivered downstream, switches accounts and re-dispatches invisibly.
 *   Failures after content cannot be replayed, so they only advance the
 *   active account for the next call.
 * - The client half manages accounts through two authenticated Connection
 *   fetch routes. Keys travel client → host only; every read returns the
 *   redacted projection from `accounts.mjs`.
 *
 * Everything here degrades to a no-op when a platform service is missing or
 * state cannot be loaded: an optional desktop plugin must never break model
 * calls.
 */

import { randomUUID } from 'node:crypto'
import {
  AccountInputError,
  activeAccount,
  addAccount,
  clearProvider,
  deriveKeyRef,
  enabledAccounts,
  isSwitchableFailure,
  moveAccount,
  nextEnabledAfter,
  providerView,
  recordFailure,
  recordSuccess,
  removeAccount,
  sanitizeState,
  setActiveAccount,
  setStrategy,
  updateAccount
} from './accounts.mjs'

export const name = 'dsh-desktop-multi-account'
export const inject = ['connection']

const STATE_RECORD_KEY = 'dsh-desktop-multi-account/state'
const STATE_PATH = '/api/desktop-multi-account/state'
const MUTATE_PATH = '/api/desktop-multi-account/mutate'

/** Pre-content chunks held back for a possible invisible retry; usage-only in practice. */
const BUFFER_CAP = 128
/** Directory/credential-reference facts are re-read this often at most. */
const FACTS_TTL_MS = 10_000
/** Stream-driven bookkeeping flushes at this cadence instead of per call. */
const PERSIST_DEBOUNCE_MS = 250

const CONTENT_CHUNK_TYPES = new Set([
  'block-start',
  'text-delta',
  'reasoning-delta',
  'tool-call-delta',
  'block-end'
])

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nowIso() {
  return new Date().toISOString()
}

function valueAtPath(value, path) {
  let current = value
  for (const segment of path) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined
    current = current[segment]
  }
  return current
}

/**
 * One step down a schemastery form schema. Tolerant by necessity:
 * `describe()` hands out schemastery's serialized form — a `{ uid, refs }`
 * envelope whose children are numeric cross-references — while a live
 * schema is a graph of callable nodes carrying `type`/`dict`/`inner`/
 * `list`. Both walk the same way once references resolve. All this needs
 * to answer is whether a profile declares an `apiKeyEnv` field — the same
 * question the Models page answers from the schema before offering a key
 * editor.
 */
function schemaRef(node, refs) {
  return typeof node === 'number' ? refs?.[node] : node
}

function schemaChild(node, segment, refs) {
  node = schemaRef(node, refs)
  if (node === null || node === undefined || (typeof node !== 'object' && typeof node !== 'function')) return undefined
  if (node.type === 'transform') return schemaChild(node.inner, segment, refs)
  if (Array.isArray(node.list)) {
    for (const branch of node.list) {
      const child = schemaChild(branch, segment, refs)
      if (child !== undefined) return child
    }
    return undefined
  }
  const fromDict = isPlainObject(node.dict) ? schemaRef(node.dict[segment], refs) : undefined
  return fromDict ?? schemaRef(node.inner, refs)
}

function schemaDeclaresApiKeyEnv(schema, settingsPath) {
  let refs
  let node = schema
  if (isPlainObject(schema) && isPlainObject(schema.refs) && schema.uid !== undefined) {
    refs = schema.refs
    node = refs[schema.uid]
  }
  for (const segment of settingsPath) {
    node = schemaChild(node, segment, refs)
    if (node === undefined) return false
  }
  return schemaChild(node, 'apiKeyEnv', refs) !== undefined
}

/** HTTP-layer error with a stable code; messages never echo secrets or input. */
class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function apply(ctx) {
  const log = (level, message) => {
    try {
      ctx.logger?.[level]?.(`desktop-multi-account: ${message}`)
    } catch { /* logging must never take the plugin down */ }
  }

  const credentialsService = () => ctx.get('credentials')
  const llmService = () => ctx.get('llm')
  const settingsService = () => ctx.get('settings')

  // ------------------------------------------------------------------ store

  let state
  let loading = null
  let writeQueue = Promise.resolve()
  let flushTimer

  async function loadState() {
    if (state !== undefined) return state
    if (loading !== null) return loading
    loading = (async () => {
      const service = credentialsService()
      if (service === undefined) {
        throw new ApiError(503, 'credentials-unavailable', 'The credential store is unavailable')
      }
      const record = await service.readRecord(STATE_RECORD_KEY)
      state = sanitizeState(record?.kind === 'grant' ? record.payload : undefined)
      return state
    })()
    try {
      return await loading
    } catch (error) {
      loading = null
      throw error
    }
  }

  /** Best-effort load for the stream path: any failure means "unmanaged". */
  async function loadStateOrUndefined() {
    try {
      return await loadState()
    } catch {
      return undefined
    }
  }

  function persistNow() {
    if (flushTimer !== undefined) {
      clearTimeout(flushTimer)
      flushTimer = undefined
    }
    const snapshot = state
    if (snapshot === undefined) return writeQueue
    writeQueue = writeQueue.then(async () => {
      const service = credentialsService()
      if (service === undefined) return
      await service.modifyRecord(STATE_RECORD_KEY, async () => ({ kind: 'grant', payload: snapshot }))
    }).catch((error) => {
      log('warn', `could not persist account state: ${error?.message ?? String(error)}`)
    })
    return writeQueue
  }

  function persistSoon() {
    if (flushTimer !== undefined) return
    flushTimer = setTimeout(() => {
      flushTimer = undefined
      void persistNow()
    }, PERSIST_DEBOUNCE_MS)
    flushTimer.unref?.()
  }

  ctx.effect(() => () => {
    if (flushTimer !== undefined) clearTimeout(flushTimer)
    flushTimer = undefined
    void persistNow()
  }, 'desktop-multi-account: flush account state on dispose')

  // ------------------------------------------------------- provider facts

  let factsCache

  function invalidateFacts() {
    factsCache = undefined
  }

  /**
   * Resolve one directory entry to its account facts: whether API-key
   * accounts apply, and through which credential reference. This mirrors
   * the Models page: it offers a key everywhere except OAuth-only routes
   * (and the sign-in-based `deepseek-account` route it special-cases);
   * `nativeAuth.env` is only the fallback when the profile names no
   * reference. A profile already naming a reference is manageable as-is;
   * otherwise, when the settings schema declares `apiKeyEnv`, the first
   * account wires the derived reference exactly like a first typed key.
   */
  function resolveFact(entry, descriptor) {
    const base = {
      entry,
      descriptor,
      manageable: false,
      needsRefWire: false,
      ref: undefined,
      unavailableReason: undefined
    }
    const keylessOAuth = entry.nativeAuth?.oauth === true && (entry.nativeAuth.env?.length ?? 0) === 0
    if (keylessOAuth || entry.provider === 'deepseek-account') {
      return { ...base, unavailableReason: 'oauth-account' }
    }
    const profile = descriptor === undefined ? undefined : valueAtPath(descriptor.value, entry.settingsPath)
    const named = isPlainObject(profile) && typeof profile.apiKeyEnv === 'string' && profile.apiKeyEnv.length > 0
      ? profile.apiKeyEnv
      : undefined
    if (named !== undefined) return { ...base, manageable: true, ref: named }
    if (descriptor !== undefined && schemaDeclaresApiKeyEnv(descriptor.schema, entry.settingsPath)) {
      return { ...base, manageable: true, needsRefWire: true, ref: deriveKeyRef(entry.provider) }
    }
    return { ...base, unavailableReason: 'no-credential-ref' }
  }

  async function readFacts() {
    if (factsCache !== undefined && Date.now() - factsCache.at < FACTS_TTL_MS) return factsCache.map
    const llm = llmService()
    const settings = settingsService()
    const map = new Map()
    if (llm !== undefined) {
      let descriptors = new Map()
      if (settings !== undefined) {
        try {
          descriptors = new Map(
            (await settings.describe({ redactSecrets: true })).map((descriptor) => [descriptor.ns, descriptor])
          )
        } catch (error) {
          log('warn', `settings describe failed: ${error?.message ?? String(error)}`)
        }
      }
      for (const entry of llm.listConfigurableProviders()) {
        map.set(entry.provider, resolveFact(entry, descriptors.get(entry.settingsNs)))
      }
    }
    factsCache = { at: Date.now(), map }
    return map
  }

  async function factFor(providerId) {
    return (await readFacts()).get(providerId)
  }

  ctx.on('llm/adapters-updated', invalidateFacts)

  // ------------------------------------------------------------- applying

  /** Serialize the select/apply section per provider so concurrent calls rotate deterministically. */
  const providerLocks = new Map()
  function withProviderLock(providerId, fn) {
    const previous = providerLocks.get(providerId) ?? Promise.resolve()
    const run = previous.then(fn, fn)
    providerLocks.set(providerId, run.catch(() => {}))
    return run
  }

  /** Make the stored credential equal the account's key; adapters re-resolve per request. */
  async function ensureCredential(fact, account) {
    const service = credentialsService()
    if (service === undefined || fact.ref === undefined) return false
    const current = await service.resolve(fact.ref)
    if (current?.value === account.apiKey) return true
    await service.set(fact.ref, account.apiKey)
    return true
  }

  /** Converge one provider's stored credential onto its active account. Caller holds the provider lock. */
  async function applyActiveLocked(providerId) {
    const loaded = await loadStateOrUndefined()
    const account = activeAccount(loaded?.providers[providerId])
    if (account === undefined) return
    const fact = await factFor(providerId)
    if (fact === undefined || !fact.manageable) return
    try {
      await ensureCredential(fact, account)
    } catch (error) {
      log('warn', `could not apply active account for "${providerId}": ${error?.message ?? String(error)}`)
    }
  }

  async function applyActive(providerId) {
    await withProviderLock(providerId, () => applyActiveLocked(providerId))
  }

  let applyingAll = false
  async function applyAllActive() {
    if (applyingAll) return
    applyingAll = true
    try {
      const loaded = await loadStateOrUndefined()
      if (loaded === undefined) return
      for (const providerId of Object.keys(loaded.providers)) await applyActive(providerId)
    } finally {
      applyingAll = false
    }
  }

  // Re-apply on boot (and if the services remount): self-heals credential
  // drift from edits made while the app was closed.
  ctx.inject(['llm', 'credentials', 'settings'], () => {
    void applyAllActive().catch((error) => {
      log('warn', `initial account apply failed: ${error?.message ?? String(error)}`)
    })
  })

  // --------------------------------------------- external credential edits

  // The stock Models editor writes the same credential reference. Adopt
  // such edits into the pool instead of fighting them: a value matching a
  // stored account activates it; an unknown value replaces the active
  // account's key. Our own writes resolve to the active key and are ignored.
  ctx.on('credentials/reference-updated', (ref) => {
    void (async () => {
      const loaded = await loadStateOrUndefined()
      if (loaded === undefined) return
      const facts = await readFacts()
      for (const [providerId, provider] of Object.entries(loaded.providers)) {
        const fact = facts.get(providerId)
        if (fact === undefined || fact.ref !== ref || provider.accounts.length === 0) continue
        await withProviderLock(providerId, async () => {
          const service = credentialsService()
          if (service === undefined) return
          const resolved = await service.resolve(ref)
          const value = resolved?.value
          if (value === undefined || value.length === 0) return
          const current = loaded.providers[providerId]
          if (current === undefined) return
          const active = current.accounts.find((account) => account.id === current.activeId)
          if (active?.apiKey === value) return
          const owner = current.accounts.find((account) => account.apiKey === value)
          if (owner !== undefined) {
            setActiveAccount(loaded, providerId, owner.id)
          } else if (active !== undefined) {
            active.apiKey = value
            active.lastError = null
          } else {
            return
          }
          persistSoon()
        })
      }
    })().catch((error) => {
      log('warn', `credential sync failed: ${error?.message ?? String(error)}`)
    })
  })

  // ------------------------------------------------------------- waterfall

  /**
   * Pick the account a new call starts from, applying the strategy.
   * Round-robin advances activeness per call; manual/failover stick.
   * Returns undefined for unmanaged calls (full passthrough).
   */
  async function planStart(providerId) {
    const loaded = await loadStateOrUndefined()
    const provider = loaded?.providers[providerId]
    if (provider === undefined || enabledAccounts(provider).length === 0) return undefined
    const fact = await factFor(providerId)
    if (fact === undefined || !fact.manageable) return undefined
    return withProviderLock(providerId, async () => {
      const current = loaded.providers[providerId]
      if (current === undefined) return undefined
      let account = activeAccount(current)
      if (account === undefined) return undefined
      if (current.strategy === 'round-robin' && enabledAccounts(current).length > 1) {
        const advanced = nextEnabledAfter(current, account.id)
        if (advanced !== undefined) {
          current.activeId = advanced.id
          account = advanced
          persistSoon()
        }
      } else if (current.activeId !== account.id) {
        // Converge a stale/null activeId onto the account actually serving.
        current.activeId = account.id
        persistSoon()
      }
      try {
        await ensureCredential(fact, account)
      } catch (error) {
        log('warn', `could not apply account for "${providerId}": ${error?.message ?? String(error)}`)
      }
      return account
    })
  }

  /**
   * Move activeness past a failed account and apply the successor.
   * Returns the successor to retry with, or undefined when the call must
   * surface its failure (manual strategy, or every sibling already tried).
   */
  async function switchAfterFailure(providerId, failedAccountId, tried, { applyCredential = true } = {}) {
    const loaded = await loadStateOrUndefined()
    if (loaded === undefined) return undefined
    const fact = await factFor(providerId)
    if (fact === undefined || !fact.manageable) return undefined
    return withProviderLock(providerId, async () => {
      const current = loaded.providers[providerId]
      if (current === undefined || current.strategy === 'manual') return undefined
      const successor = nextEnabledAfter(current, failedAccountId, tried)
      if (successor === undefined) return undefined
      current.activeId = successor.id
      persistSoon()
      if (applyCredential) {
        try {
          await ensureCredential(fact, successor)
        } catch (error) {
          log('warn', `could not apply account for "${providerId}": ${error?.message ?? String(error)}`)
        }
      }
      return successor
    })
  }

  function noteOutcome(providerId, accountId, failure) {
    if (state === undefined) return
    const provider = state.providers[providerId]
    if (provider === undefined) return
    if (failure === undefined) recordSuccess(provider, accountId, nowIso())
    else recordFailure(provider, accountId, failure, nowIso())
    persistSoon()
  }

  async function* managedStream(providerId, options, next) {
    let account
    try {
      account = await planStart(providerId)
    } catch (error) {
      log('warn', `account planning failed for "${providerId}": ${error?.message ?? String(error)}`)
      account = undefined
    }
    if (account === undefined) {
      yield* next()
      return
    }

    const tried = new Set()
    while (true) {
      tried.add(account.id)
      const buffered = []
      let committed = false
      let failure
      let thrown
      let terminalKind
      try {
        for await (const chunk of next()) {
          const isFinish = isPlainObject(chunk) && chunk.type === 'finish'
          if (isFinish) {
            terminalKind = chunk.reason?.kind
            if (terminalKind === 'error') failure = chunk.reason?.failure
          }
          if (!committed && ((isPlainObject(chunk) && CONTENT_CHUNK_TYPES.has(chunk.type)) || buffered.length >= BUFFER_CAP)) {
            committed = true
            for (const held of buffered) yield held
            buffered.length = 0
          }
          if (committed) yield chunk
          else buffered.push(chunk)
        }
      } catch (error) {
        if (committed) throw error
        thrown = error
        failure = {
          code: typeof error?.code === 'string' ? error.code : undefined,
          status: error?.failure?.status ?? error?.status
        }
      }

      if (failure === undefined) {
        for (const held of buffered) yield held
        if (terminalKind !== undefined && terminalKind !== 'aborted') {
          noteOutcome(providerId, account.id, undefined)
        }
        return
      }

      const switchable = options?.signal?.aborted !== true && isSwitchableFailure(failure)
      if (switchable) noteOutcome(providerId, account.id, failure)

      if (committed) {
        // The consumer already holds partial output; only the NEXT call can
        // move on. Advance now so the loop's next step uses a sibling.
        if (switchable) {
          void switchAfterFailure(providerId, account.id, tried).catch((error) => {
            log('warn', `account advance failed for "${providerId}": ${error?.message ?? String(error)}`)
          })
        }
        return
      }

      const replacement = switchable
        ? await switchAfterFailure(providerId, account.id, tried)
        : undefined
      if (replacement === undefined) {
        if (thrown !== undefined) throw thrown
        for (const held of buffered) yield held
        return
      }
      account = replacement
    }
  }

  ctx.on('llm/stream', (options, next) => {
    if (typeof options?.provider !== 'string') return next()
    return managedStream(options.provider, options, next)
  }, { global: true, prepend: true })

  // ---------------------------------------------------------------- routes

  function jsonResponse(payload, status = 200) {
    return Response.json(payload, { status, headers: { 'cache-control': 'no-store' } })
  }

  function errorResponse(error) {
    if (error instanceof ApiError) {
      return jsonResponse({ error: error.message, code: error.code }, error.status)
    }
    if (error instanceof AccountInputError) {
      return jsonResponse({ error: error.message, code: error.code }, 400)
    }
    log('warn', `request failed: ${error?.message ?? String(error)}`)
    return jsonResponse({ error: 'The account request failed', code: 'internal' }, 500)
  }

  /** Whether a stored-but-unmanaged key could be imported as an account. */
  async function isImportable(fact, provider) {
    const service = credentialsService()
    if (service === undefined || fact.ref === undefined || !fact.manageable) return false
    try {
      const resolved = await service.resolve(fact.ref)
      const value = resolved?.value
      if (value === undefined || value.trim().length === 0) return false
      return !(provider?.accounts ?? []).some((account) => account.apiKey === value.trim())
    } catch {
      return false
    }
  }

  async function buildViews(loaded) {
    const facts = await readFacts()
    const views = []
    for (const [providerId, fact] of facts) {
      const provider = loaded.providers[providerId]
      views.push(providerView(providerId, provider, {
        displayName: fact.entry.displayName,
        settingsNs: fact.entry.settingsNs,
        manageable: fact.manageable,
        credentialRef: fact.ref,
        importable: await isImportable(fact, provider),
        unavailableReason: fact.unavailableReason
      }))
    }
    return views
  }

  async function buildView(loaded, providerId) {
    const fact = await factFor(providerId)
    if (fact === undefined) throw new ApiError(404, 'unknown-provider', 'That provider is not in the directory')
    const provider = loaded.providers[providerId]
    return providerView(providerId, provider, {
      displayName: fact.entry.displayName,
      settingsNs: fact.entry.settingsNs,
      manageable: fact.manageable,
      credentialRef: fact.ref,
      importable: await isImportable(fact, provider),
      unavailableReason: fact.unavailableReason
    })
  }

  /**
   * Name the derived credential reference on a profile that does not name
   * one yet — the same write the Models page performs when a key is first
   * typed. One conflict retry covers a descriptor read racing another edit.
   */
  async function wireCredentialRef(fact) {
    const settings = settingsService()
    if (settings === undefined) {
      throw new ApiError(503, 'settings-unavailable', 'The settings service is unavailable')
    }
    const ops = [{ op: 'set', path: [...fact.entry.settingsPath, 'apiKeyEnv'], value: fact.ref }]
    try {
      await settings.mutate(fact.entry.settingsNs, ops, fact.descriptor?.revision)
    } catch (error) {
      if (error?.code !== 'SETTINGS_CONFLICT') throw error
      invalidateFacts()
      const fresh = await factFor(fact.entry.provider)
      await settings.mutate(fact.entry.settingsNs, ops, fresh?.descriptor?.revision)
    }
    invalidateFacts()
  }

  async function handleMutate(body) {
    if (!isPlainObject(body)) throw new ApiError(400, 'invalid-body', 'A JSON object is required')
    const { action, provider: providerId } = body
    if (typeof providerId !== 'string' || providerId.length === 0) {
      throw new ApiError(400, 'invalid-provider', 'A provider route id is required')
    }
    const loaded = await loadState()
    const fact = await factFor(providerId)
    if (fact === undefined) throw new ApiError(404, 'unknown-provider', 'That provider is not in the directory')

    const requireManageable = () => {
      if (!fact.manageable) {
        throw new ApiError(400, 'provider-not-manageable', 'This provider does not authenticate with an API key')
      }
    }
    const requireAccountId = () => {
      if (typeof body.accountId !== 'string' || body.accountId.length === 0) {
        throw new ApiError(400, 'invalid-account', 'An account id is required')
      }
      return body.accountId
    }
    const ensureWire = async () => {
      if (!fact.needsRefWire) return
      try {
        await wireCredentialRef(fact)
      } catch (error) {
        if (error instanceof ApiError) throw error
        log('warn', `could not wire credential reference for "${providerId}": ${error?.message ?? String(error)}`)
        throw new ApiError(400, 'ref-wire-failed', 'This provider cannot store a credential reference')
      }
    }

    // Validate and stage the account before wiring the settings reference:
    // naming a reference changes how the adapter authenticates, so invalid
    // input must never cause that write. A wiring failure rolls the staged
    // account back out of the in-memory state.
    const stageAccount = async (apiKey, label) => {
      const account = addAccount(loaded, providerId, { label, apiKey }, { id: randomUUID(), now: nowIso() })
      try {
        await ensureWire()
      } catch (error) {
        removeAccount(loaded, providerId, account.id)
        throw error
      }
    }

    await withProviderLock(providerId, async () => {
      switch (action) {
        case 'add-account': {
          requireManageable()
          await stageAccount(body.apiKey, body.label)
          break
        }
        case 'import-current': {
          requireManageable()
          const service = credentialsService()
          const resolved = service === undefined || fact.ref === undefined
            ? undefined
            : await service.resolve(fact.ref)
          const value = resolved?.value?.trim()
          if (value === undefined || value.length === 0) {
            throw new ApiError(409, 'nothing-to-import', 'No API key is currently stored for this provider')
          }
          await stageAccount(value, body.label)
          break
        }
        case 'update-account':
          updateAccount(loaded, providerId, requireAccountId(), {
            label: body.label,
            apiKey: body.apiKey,
            enabled: body.enabled
          })
          break
        case 'remove-account':
          removeAccount(loaded, providerId, requireAccountId())
          break
        case 'move-account':
          moveAccount(loaded, providerId, requireAccountId(), body.direction)
          break
        case 'set-active':
          setActiveAccount(loaded, providerId, requireAccountId())
          break
        case 'set-strategy':
          setStrategy(loaded, providerId, body.strategy)
          break
        case 'clear-provider':
          clearProvider(loaded, providerId)
          break
        default:
          throw new ApiError(400, 'unknown-action', 'That action is not supported')
      }

      await persistNow()
      // Converge the live credential onto the (possibly new) active account;
      // a failure here retries on the next model call, so do not fail the
      // already-durable mutation over it.
      await applyActiveLocked(providerId)
    })
    return { provider: await buildView(loaded, providerId) }
  }

  ctx.connection.fetch.register({
    path: STATE_PATH,
    methods: ['GET', 'HEAD'],
    requestBody: 'buffered',
    async fetch() {
      try {
        const loaded = await loadState()
        return jsonResponse({ providers: await buildViews(loaded) })
      } catch (error) {
        return errorResponse(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: MUTATE_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
        if (contentType !== 'application/json') {
          throw new ApiError(415, 'invalid-content-type', 'Content type must be application/json')
        }
        let body
        try {
          body = await request.json()
        } catch {
          throw new ApiError(400, 'invalid-json', 'The request body is not valid JSON')
        }
        return jsonResponse(await handleMutate(body))
      } catch (error) {
        return errorResponse(error)
      }
    }
  })
}
