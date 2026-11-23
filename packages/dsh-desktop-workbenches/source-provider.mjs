/**
 * Minimal upstream seam for product-owned Workbench sources.
 * Providers own transport, credentials, labels and business behavior.
 */
export function createWorkbenchSourceRegistry() {
  const providers = new Map()
  const listeners = new Set()
  const notify = () => { for (const listener of listeners) listener([...providers.values()]) }
  return {
    register(provider) {
      if (!provider || typeof provider.sourceId !== 'string' || !provider.sourceId.trim()) throw new TypeError('A Workbench provider sourceId is required.')
      for (const method of ['list', 'refresh', 'open', 'install', 'remove', 'availability']) if (typeof provider[method] !== 'function') throw new TypeError(`Workbench provider ${method} is required.`)
      if (providers.has(provider.sourceId)) throw new Error(`Workbench provider ${provider.sourceId} is already registered.`)
      providers.set(provider.sourceId, provider)
      notify()
      return () => { if (providers.get(provider.sourceId) === provider) { providers.delete(provider.sourceId); notify() } }
    },
    get(sourceId) { return providers.get(sourceId) },
    list() { return [...providers.values()] },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }
  }
}

/** Shared card shape. The UI owns rendering and invokes provider-owned actions. */
export function createWorkbenchSourceCard(item, state = {}) {
  return {
    ...item,
    sourceId: item?.sourceId,
    sourceLabel: item?.sourceLabel,
    loading: state.loading === true,
    error: state.error ?? null,
    empty: state.empty === true,
    actions: {
      open: typeof state.open === 'function' ? state.open : undefined,
      install: typeof state.install === 'function' ? state.install : undefined,
      remove: typeof state.remove === 'function' ? state.remove : undefined
    }
  }
}
