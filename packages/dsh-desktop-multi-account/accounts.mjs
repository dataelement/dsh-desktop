/**
 * Pure account-pool logic for the DSH Desktop multi-account plugin.
 *
 * This module owns the durable state shape (one versioned document stored by
 * the host half in a harness credential record), every state transition the
 * HTTP API can ask for, the account-selection rules the `llm/stream`
 * middleware applies, and the redacted projection the client is allowed to
 * see. It performs no I/O and knows nothing about Cordis services, so the
 * behavior is testable without booting the harness.
 *
 * State document (version 1):
 *
 * ```json
 * {
 *   "version": 1,
 *   "providers": {
 *     "<provider route id>": {
 *       "strategy": "manual" | "failover" | "round-robin",
 *       "activeId": "<account id>" | null,
 *       "accounts": [{
 *         "id": "...", "label": "...", "apiKey": "...", "enabled": true,
 *         "createdAt": "<iso>", "lastUsedAt": "<iso>" | null,
 *         "lastError": { "code": "QUOTA", "status": 402, "at": "<iso>" } | null
 *       }]
 *     }
 *   }
 * }
 * ```
 *
 * A provider is *managed* exactly while it has at least one account. Removing
 * the last account drops the provider entry, returning the route to the stock
 * single-key behavior (the stored credential is left untouched).
 */

import { createHash } from 'node:crypto'

/** Strategies a provider may use, in UI order. */
export const STRATEGIES = ['manual', 'failover', 'round-robin']

const STATE_VERSION = 1
const MAX_ACCOUNTS_PER_PROVIDER = 50
const MAX_LABEL_LENGTH = 80
const MAX_API_KEY_LENGTH = 8192
const MAX_PROVIDERS = 500

/**
 * LlmFailure codes that mean "this account cannot serve the request" rather
 * than "this request is wrong" — the credential/account-terminal class.
 * Deliberately disjoint from the platform's default retryable set
 * (`EMPTY_RESPONSE`, `SERVER`, `TIMEOUT`, `TRANSPORT`), which dsh-llm-retry
 * already replays against the same account with backoff. `RATE_LIMIT` is in
 * both worlds: rotating to a sibling account usually sidesteps a per-key
 * limit immediately, and when every account is limited the surfaced error
 * still reaches the step-level backoff afterwards.
 */
const SWITCHABLE_CODES = new Set([
  'AUTH',
  'FORBIDDEN',
  'QUOTA',
  'ACCOUNT_QUOTA',
  'RATE_LIMIT',
  'INVALID_CREDENTIAL',
  'MISSING_CREDENTIAL'
])

/** Provider HTTP statuses with the same account-terminal meaning. */
const SWITCHABLE_STATUSES = new Set([401, 402, 403, 429])

/** Validation failure carrying a stable machine code for the HTTP layer. */
export class AccountInputError extends Error {
  /**
   * @param {string} code - stable machine code (e.g. `duplicate-key`).
   * @param {string} message - human-readable, key-free explanation.
   */
  constructor(code, message) {
    super(message)
    this.name = 'AccountInputError'
    this.code = code
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

/**
 * The conventional credential reference for a provider route: the same
 * derivation the Models settings page applies when a key is typed
 * (`openrouter` → `OPENROUTER_API_KEY`).
 *
 * @param {string} provider - provider route id.
 * @returns {string} the derived credential reference name.
 */
export function deriveKeyRef(provider) {
  return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}

/**
 * Non-reversible fingerprint that lets a surface tell two stored keys apart
 * without echoing any part of a secret. Mirrors the credentials seam's habit
 * of never letting a value ride a read response.
 *
 * @param {string} apiKey - the stored secret.
 * @returns {string} ten hex characters of the key's SHA-256 digest.
 */
export function keyFingerprint(apiKey) {
  return createHash('sha256').update(apiKey, 'utf8').digest('hex').slice(0, 10)
}

/** @returns {object} a fresh empty state document. */
export function emptyState() {
  return { version: STATE_VERSION, providers: {} }
}

function sanitizeError(value) {
  if (!isPlainObject(value) || typeof value.code !== 'string' || value.code.length === 0) return null
  return {
    code: value.code.slice(0, 64),
    ...(Number.isInteger(value.status) ? { status: value.status } : {}),
    at: isIsoTimestamp(value.at) ? value.at : new Date(0).toISOString()
  }
}

function sanitizeAccount(value, seenIds, seenKeys) {
  if (!isPlainObject(value)) return undefined
  if (typeof value.id !== 'string' || value.id.length === 0 || seenIds.has(value.id)) return undefined
  if (typeof value.apiKey !== 'string') return undefined
  const apiKey = value.apiKey.trim()
  if (apiKey.length === 0 || apiKey.length > MAX_API_KEY_LENGTH || seenKeys.has(apiKey)) return undefined
  seenIds.add(value.id)
  seenKeys.add(apiKey)
  return {
    id: value.id,
    label: typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label.trim().slice(0, MAX_LABEL_LENGTH)
      : value.id,
    apiKey,
    enabled: value.enabled !== false,
    createdAt: isIsoTimestamp(value.createdAt) ? value.createdAt : new Date(0).toISOString(),
    lastUsedAt: isIsoTimestamp(value.lastUsedAt) ? value.lastUsedAt : null,
    lastError: sanitizeError(value.lastError)
  }
}

function sanitizeProvider(value) {
  if (!isPlainObject(value) || !Array.isArray(value.accounts)) return undefined
  const seenIds = new Set()
  const seenKeys = new Set()
  const accounts = value.accounts
    .map((account) => sanitizeAccount(account, seenIds, seenKeys))
    .filter((account) => account !== undefined)
    .slice(0, MAX_ACCOUNTS_PER_PROVIDER)
  if (accounts.length === 0) return undefined
  const activeId = accounts.some((account) => account.id === value.activeId) ? value.activeId : null
  return {
    strategy: STRATEGIES.includes(value.strategy) ? value.strategy : 'manual',
    activeId,
    accounts
  }
}

/**
 * Validate an untrusted stored document into the canonical state shape.
 * Anything unrecognized is dropped rather than repaired creatively: a
 * hand-edited or damaged record must degrade to "fewer managed providers",
 * never to invented credentials.
 *
 * @param {unknown} value - the parsed record payload, if any.
 * @returns {object} canonical state.
 */
export function sanitizeState(value) {
  if (!isPlainObject(value) || value.version !== STATE_VERSION || !isPlainObject(value.providers)) {
    return emptyState()
  }
  const providers = {}
  for (const [providerId, providerValue] of Object.entries(value.providers).slice(0, MAX_PROVIDERS)) {
    if (providerId.length === 0) continue
    const provider = sanitizeProvider(providerValue)
    if (provider !== undefined) providers[providerId] = provider
  }
  return { version: STATE_VERSION, providers }
}

/**
 * @param {object | undefined} provider - provider state.
 * @returns {object[]} enabled accounts in list order.
 */
export function enabledAccounts(provider) {
  return provider === undefined ? [] : provider.accounts.filter((account) => account.enabled)
}

/**
 * The account a new call should start from: the marked active account while
 * it is enabled, otherwise the first enabled account. `undefined` when the
 * provider is unmanaged or every account is disabled — the middleware then
 * leaves the call (and the stored credential) completely alone.
 *
 * @param {object | undefined} provider - provider state.
 * @returns {object | undefined} the starting account.
 */
export function activeAccount(provider) {
  if (provider === undefined) return undefined
  const enabled = enabledAccounts(provider)
  return enabled.find((account) => account.id === provider.activeId) ?? enabled[0]
}

/**
 * The next enabled account after `fromId`'s position in list order
 * (wrapping), skipping excluded ids — the failover step and the round-robin
 * advance share it. Position-based (not enabled-list-based) so it also
 * answers "who follows the account that was just disabled".
 *
 * @param {object} provider - provider state.
 * @param {string | null} fromId - account to advance from; unknown ids start at the head.
 * @param {ReadonlySet<string>} [exclude] - ids to skip (already tried in this call).
 * @returns {object | undefined} the next account, or undefined when none qualifies.
 */
export function nextEnabledAfter(provider, fromId, exclude = new Set()) {
  const accounts = provider.accounts
  const fromIndex = accounts.findIndex((account) => account.id === fromId)
  for (let step = 1; step <= accounts.length; step += 1) {
    const candidate = accounts[(fromIndex + step) % accounts.length]
    if (candidate !== undefined && candidate.enabled && candidate.id !== fromId && !exclude.has(candidate.id)) {
      return candidate
    }
  }
  return undefined
}

/**
 * Whether one terminal stream failure marks its account as unable to serve
 * (invalid/expired key, exhausted balance, per-key throttle), so another
 * account should take over. Aborts are the caller's own cancellation and are
 * never classified here — the middleware checks the finish kind first.
 *
 * @param {{ code?: unknown, status?: unknown } | undefined} failure - LlmFailure facts.
 * @returns {boolean} true when a sibling account should be tried.
 */
export function isSwitchableFailure(failure) {
  if (failure === undefined) return false
  if (typeof failure.code === 'string' && SWITCHABLE_CODES.has(failure.code)) return true
  return typeof failure.status === 'number' && SWITCHABLE_STATUSES.has(failure.status)
}

function assertProviderId(providerId) {
  if (typeof providerId !== 'string' || providerId.length === 0 || providerId.length > 256) {
    throw new AccountInputError('invalid-provider', 'A provider route id is required')
  }
}

function normalizeLabel(label, fallback) {
  if (label === undefined || label === null) return fallback
  if (typeof label !== 'string') throw new AccountInputError('invalid-label', 'Account label must be text')
  const trimmed = label.trim()
  if (trimmed.length === 0) return fallback
  if (trimmed.length > MAX_LABEL_LENGTH) {
    throw new AccountInputError('invalid-label', `Account label must be at most ${MAX_LABEL_LENGTH} characters`)
  }
  return trimmed
}

function normalizeApiKey(apiKey) {
  if (typeof apiKey !== 'string') throw new AccountInputError('invalid-key', 'An API key is required')
  const trimmed = apiKey.trim()
  if (trimmed.length === 0) throw new AccountInputError('invalid-key', 'An API key is required')
  if (trimmed.length > MAX_API_KEY_LENGTH) {
    throw new AccountInputError('invalid-key', 'The API key is too long')
  }
  // Control characters and inner whitespace cannot survive an HTTP header;
  // reject here with a local diagnosis instead of inside fetch at call time.
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new AccountInputError('invalid-key', 'The API key contains whitespace or control characters')
  }
  return trimmed
}

function ensureProvider(state, providerId) {
  let provider = state.providers[providerId]
  if (provider === undefined) {
    if (Object.keys(state.providers).length >= MAX_PROVIDERS) {
      throw new AccountInputError('too-many-providers', 'Too many providers have managed accounts')
    }
    provider = { strategy: 'manual', activeId: null, accounts: [] }
    state.providers[providerId] = provider
  }
  return provider
}

function requireProvider(state, providerId) {
  const provider = state.providers[providerId]
  if (provider === undefined) {
    throw new AccountInputError('provider-unmanaged', 'This provider has no managed accounts')
  }
  return provider
}

function requireAccount(provider, accountId) {
  const account = provider.accounts.find((candidate) => candidate.id === accountId)
  if (account === undefined) throw new AccountInputError('account-not-found', 'That account does not exist')
  return account
}

/** After an account leaves the enabled set, keep activeId pointing at an enabled account when one exists. */
function repairActiveId(provider) {
  const active = provider.accounts.find((account) => account.id === provider.activeId)
  if (active !== undefined && active.enabled) return
  const next = provider.activeId === null
    ? enabledAccounts(provider)[0]
    : nextEnabledAfter(provider, provider.activeId)
  provider.activeId = next?.id ?? null
}

/**
 * Append one account to a provider. The first account becomes active. The
 * same key twice under one provider is refused: duplicate keys would make
 * the external-edit adoption in the host half ambiguous and are never what
 * the user means by two accounts.
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {{ label?: unknown, apiKey?: unknown }} input - raw user input.
 * @param {{ id: string, now: string }} stamp - fresh account id and timestamp.
 * @returns {object} the created account.
 */
export function addAccount(state, providerId, input, stamp) {
  assertProviderId(providerId)
  const apiKey = normalizeApiKey(input?.apiKey)
  const provider = ensureProvider(state, providerId)
  if (provider.accounts.length >= MAX_ACCOUNTS_PER_PROVIDER) {
    throw new AccountInputError('too-many-accounts', `A provider can hold at most ${MAX_ACCOUNTS_PER_PROVIDER} accounts`)
  }
  if (provider.accounts.some((account) => account.apiKey === apiKey)) {
    throw new AccountInputError('duplicate-key', 'That API key is already stored for this provider')
  }
  if (provider.accounts.some((account) => account.id === stamp.id)) {
    throw new AccountInputError('duplicate-id', 'Account id collision; please retry')
  }
  const account = {
    id: stamp.id,
    label: normalizeLabel(input?.label, `Account ${provider.accounts.length + 1}`),
    apiKey,
    enabled: true,
    createdAt: stamp.now,
    lastUsedAt: null,
    lastError: null
  }
  provider.accounts.push(account)
  if (provider.activeId === null) provider.activeId = account.id
  return account
}

/**
 * Edit one account's label, key, or enabled flag. Disabling the active
 * account hands activeness to the next enabled account.
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {string} accountId - account to edit.
 * @param {{ label?: unknown, apiKey?: unknown, enabled?: unknown }} input - raw user input.
 * @returns {object} the edited account.
 */
export function updateAccount(state, providerId, accountId, input) {
  assertProviderId(providerId)
  const provider = requireProvider(state, providerId)
  const account = requireAccount(provider, accountId)
  if (input?.label !== undefined) account.label = normalizeLabel(input.label, account.label)
  if (input?.apiKey !== undefined) {
    const apiKey = normalizeApiKey(input.apiKey)
    if (provider.accounts.some((candidate) => candidate.id !== account.id && candidate.apiKey === apiKey)) {
      throw new AccountInputError('duplicate-key', 'That API key is already stored for this provider')
    }
    account.apiKey = apiKey
    account.lastError = null
  }
  if (input?.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') {
      throw new AccountInputError('invalid-enabled', 'Enabled must be true or false')
    }
    account.enabled = input.enabled
    if (!input.enabled && provider.activeId === account.id) repairActiveId(provider)
    if (input.enabled && provider.activeId === null) provider.activeId = account.id
  }
  return account
}

/**
 * Remove one account. Removing the last one unmans the provider.
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {string} accountId - account to remove.
 */
export function removeAccount(state, providerId, accountId) {
  assertProviderId(providerId)
  const provider = requireProvider(state, providerId)
  const account = requireAccount(provider, accountId)
  const successor = provider.activeId === account.id
    ? nextEnabledAfter(provider, account.id)
    : undefined
  provider.accounts = provider.accounts.filter((candidate) => candidate.id !== account.id)
  if (provider.accounts.length === 0) {
    delete state.providers[providerId]
    return
  }
  if (provider.activeId === account.id) provider.activeId = successor?.id ?? null
}

/**
 * Move one account one step in the failover/round-robin order.
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {string} accountId - account to move.
 * @param {unknown} direction - -1 (earlier) or 1 (later).
 */
export function moveAccount(state, providerId, accountId, direction) {
  assertProviderId(providerId)
  if (direction !== -1 && direction !== 1) {
    throw new AccountInputError('invalid-direction', 'Direction must be -1 or 1')
  }
  const provider = requireProvider(state, providerId)
  const index = provider.accounts.findIndex((candidate) => candidate.id === accountId)
  if (index < 0) throw new AccountInputError('account-not-found', 'That account does not exist')
  const target = index + direction
  if (target < 0 || target >= provider.accounts.length) return
  const [account] = provider.accounts.splice(index, 1)
  provider.accounts.splice(target, 0, account)
}

/**
 * Mark one account active (manual switching). Activating also enables: the
 * user asked for this account to serve, so a stale disabled flag must not
 * silently veto the click.
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {string} accountId - account to activate.
 * @returns {object} the activated account.
 */
export function setActiveAccount(state, providerId, accountId) {
  assertProviderId(providerId)
  const provider = requireProvider(state, providerId)
  const account = requireAccount(provider, accountId)
  account.enabled = true
  provider.activeId = account.id
  return account
}

/**
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 * @param {unknown} strategy - one of {@link STRATEGIES}.
 */
export function setStrategy(state, providerId, strategy) {
  assertProviderId(providerId)
  if (!STRATEGIES.includes(strategy)) {
    throw new AccountInputError('invalid-strategy', 'Strategy must be manual, failover, or round-robin')
  }
  requireProvider(state, providerId).strategy = strategy
}

/**
 * Drop all accounts of one provider (back to the stock single-key behavior).
 *
 * @param {object} state - state document (mutated).
 * @param {string} providerId - provider route id.
 */
export function clearProvider(state, providerId) {
  assertProviderId(providerId)
  delete state.providers[providerId]
}

/**
 * Record that one account served a call successfully.
 *
 * @param {object} provider - provider state (mutated).
 * @param {string} accountId - serving account.
 * @param {string} now - ISO timestamp.
 */
export function recordSuccess(provider, accountId, now) {
  const account = provider.accounts.find((candidate) => candidate.id === accountId)
  if (account === undefined) return
  account.lastUsedAt = now
  account.lastError = null
}

/**
 * Record an account-terminal failure against its account, for the UI badge.
 *
 * @param {object} provider - provider state (mutated).
 * @param {string} accountId - failing account.
 * @param {{ code?: unknown, status?: unknown }} failure - LlmFailure facts.
 * @param {string} now - ISO timestamp.
 */
export function recordFailure(provider, accountId, failure, now) {
  const account = provider.accounts.find((candidate) => candidate.id === accountId)
  if (account === undefined) return
  account.lastError = sanitizeError({
    code: typeof failure?.code === 'string' ? failure.code : 'UNKNOWN',
    status: failure?.status,
    at: now
  })
}

/**
 * The redacted projection one provider contributes to the client. Contains
 * no secret material — fingerprints instead of keys — mirroring the
 * credentials seam's `CredentialInfo` contract.
 *
 * @param {string} providerId - provider route id.
 * @param {object | undefined} provider - provider state, when managed.
 * @param {object} facts - directory facts resolved by the host half.
 * @param {string} facts.displayName - human-readable provider name.
 * @param {string} facts.settingsNs - owning settings namespace (slot key).
 * @param {boolean} facts.manageable - whether API-key accounts apply to this route.
 * @param {string | undefined} facts.credentialRef - reference the active key is applied to.
 * @param {boolean} facts.importable - whether a not-yet-managed key is currently stored.
 * @param {string | undefined} [facts.unavailableReason] - why the route is not manageable.
 * @returns {object} JSON-safe view.
 */
export function providerView(providerId, provider, facts) {
  return {
    provider: providerId,
    displayName: facts.displayName,
    settingsNs: facts.settingsNs,
    manageable: facts.manageable,
    ...(facts.unavailableReason === undefined ? {} : { unavailableReason: facts.unavailableReason }),
    ...(facts.credentialRef === undefined ? {} : { credentialRef: facts.credentialRef }),
    importable: facts.importable,
    strategy: provider?.strategy ?? 'manual',
    activeId: provider?.activeId ?? null,
    accounts: (provider?.accounts ?? []).map((account) => ({
      id: account.id,
      label: account.label,
      enabled: account.enabled,
      fingerprint: keyFingerprint(account.apiKey),
      createdAt: account.createdAt,
      lastUsedAt: account.lastUsedAt,
      lastError: account.lastError
    }))
  }
}
