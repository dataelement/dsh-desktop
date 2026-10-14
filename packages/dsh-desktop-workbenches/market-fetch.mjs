import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Select the host transport without changing fetch globally or bypassing a broken host transport.
 * @param {{ runtime?: { versions?: { electron?: string }, type?: string }, loadElectron?: () => { net?: { fetch?: typeof fetch } } }} [options]
 * @returns {typeof fetch}
 */
export function selectMarketFetch({ runtime = process, loadElectron = () => require('electron') } = {}) {
  // macOS Harness runs in a utility process. Its Chromium network context uses
  // system proxy settings; Node's global fetch does not. Other Node hosts keep
  // their existing transport and must not resolve the electron npm launcher.
  if (runtime.versions?.electron && runtime.type === 'utility') {
    const { net } = loadElectron()
    if (typeof net?.fetch !== 'function') throw new Error('Electron utility network transport is unavailable.')
    return net.fetch.bind(net)
  }
  return globalThis.fetch
}
