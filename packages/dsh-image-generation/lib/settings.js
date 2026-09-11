import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { DEFAULTS, MODEL_CATALOG, ImageError, listModels, profile, safeError, validateConnection } from './provider.js'

const KEY = credentialKey('dsh-image-generation', 'configuration')
const EMPTY = () => ({ revision: 0, provider: 'bytedance', profiles: {} })

/** Keep each validated endpoint/model/key together in one atomic host credential record. */
export function createSettings(ctx, validate = validateConnection) {
  async function read() {
    const record = await ctx.credentials.readRecord(KEY)
    if (!record) return EMPTY()
    if (record.kind !== 'grant' || !Number.isSafeInteger(record.payload?.revision) || !record.payload?.profiles) {
      throw new ImageError('CONFIGURATION', 'The stored image configuration needs to be saved again.', 500)
    }
    return record.payload
  }
  async function describe() {
    const state = await read()
    const info = await ctx.credentials.describeRecord(KEY)
    return {
      revision: state.revision, provider: state.provider, writable: info.writable, catalogs: MODEL_CATALOG,
      profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([provider, defaults]) => {
        const stored = state.profiles[provider]
        return [provider, { ...defaults, ...(stored ? profile(provider, stored) : {}), configured: Boolean(stored?.key), validation: stored?.validation ?? null }]
      })),
    }
  }
  async function active() {
    const state = await read()
    const spec = state.profiles[state.provider]
    if (!spec?.key) throw new ImageError('NOT_CONFIGURED', 'Configure the image tool in Settings > Plugins before generating an image.')
    return { provider: state.provider, ...profile(state.provider, spec), key: spec.key }
  }
  async function prepared(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ImageError('CONFIGURATION', 'Enter a valid image configuration.')
    const before = await read()
    if (!Number.isSafeInteger(input.revision) || input.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
    const spec = profile(input.provider, input)
    const previous = before.profiles[input.provider]
    const key = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
    if (!key && previous && new URL(previous.baseUrl).origin !== new URL(spec.baseUrl).origin) {
      throw new ImageError('KEY_REQUIRED', 'Enter the API key again for the new API origin.')
    }
    const effectiveKey = key || previous?.key
    if (!effectiveKey || effectiveKey.length > 4096 || /[\s\x00-\x1f\x7f]/u.test(effectiveKey)) throw new ImageError('KEY_REQUIRED', 'Enter a valid API key.')
    return { before, spec, effectiveKey }
  }
  async function models(input, signal) {
    const { spec, effectiveKey } = await prepared(input)
    return listModels(input.provider, spec, effectiveKey, { signal })
  }
  async function save(input, signal) {
    const { before, spec, effectiveKey } = await prepared(input)
    if (!(await ctx.credentials.describeRecord(KEY)).writable) throw new ImageError('READ_ONLY', 'The host credential store is read-only.', 403)
    try {
      const validation = await validate(input.provider, spec, effectiveKey, { signal })
      signal?.throwIfAborted()
      await ctx.credentials.modifyRecord(KEY, async record => {
        const latest = record?.kind === 'grant' ? record.payload : EMPTY()
        if (latest.revision !== before.revision) throw new ImageError('CONFLICT', 'The settings changed in another window. Reopen this card before saving.', 409)
        return { kind: 'grant', payload: {
          revision: before.revision + 1, provider: input.provider,
          profiles: { ...before.profiles, [input.provider]: { ...spec, key: effectiveKey, validation } },
        } }
      })
      ctx.logger.info('image-generation: configuration saved; provider=%s validation=%s', input.provider, validation)
      return await describe()
    } catch (error) {
      const safe = safeError(error)
      ctx.logger.info('image-generation: configuration save failed; provider=%s code=%s', input.provider, safe.code)
      throw safe
    }
  }
  return { describe, active, save, models }
}
