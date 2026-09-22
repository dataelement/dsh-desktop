import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const HOST_PACKAGE_PREFIX = '@deepseek-ai/'

/**
 * Resolution failures the installation anchor can legitimately answer.
 *
 * `ERR_MODULE_NOT_FOUND` is the plugin having no copy at all.
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` is the copy it found being older than the
 * subpath its importer needs — observed in the field as
 * `@deepseek-ai/dsh-subprocess-local` importing `dsh-subprocess/control` from a
 * stale `profiles/node_modules` copy. Retrying it is safe: the retry only
 * succeeds when the host copy really exports that subpath.
 */
const HOST_RETRYABLE = new Set(['ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'])

/**
 * Let linked Profile plugins consume the Harness packages carried by Desktop.
 *
 * Node resolves a symlinked plugin's imports from the plugin's physical source
 * directory. That directory normally has no node_modules of its own, while the
 * peer packages intentionally live beside the bundled DSH entry. Preserve the
 * plugin's normal resolution first and only retry missing @deepseek-ai packages
 * from the installation anchor; unrelated dependencies must remain plugin-owned.
 */
export function registerHostModuleFallback(dshEntryPath) {
  const hostEntryUrl = pathToFileURL(dshEntryPath).href
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context)
      } catch (error) {
        if (!specifier.startsWith(HOST_PACKAGE_PREFIX) || !HOST_RETRYABLE.has(error?.code)) {
          throw error
        }
        try {
          return nextResolve(specifier, { ...context, parentURL: hostEntryUrl })
        } catch (hostError) {
          // Only the first failure names the importing plugin, and crash
          // reports lose `code` to Harness's wrapper — so the message that
          // carries `imported from <plugin path>` is the one to keep.
          error.message += `\n  host fallback from ${hostEntryUrl} also failed: ${hostError.message}`
          error.cause ??= hostError
          throw error
        }
      }
    }
  })
}
