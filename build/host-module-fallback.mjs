import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const HOST_PACKAGE_PREFIX = '@deepseek-ai/'

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
        if (!specifier.startsWith(HOST_PACKAGE_PREFIX) || error?.code !== 'ERR_MODULE_NOT_FOUND') {
          throw error
        }
        return nextResolve(specifier, { ...context, parentURL: hostEntryUrl })
      }
    }
  })
}
