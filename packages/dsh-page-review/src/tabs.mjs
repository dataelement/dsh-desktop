// Browser pages use the sidebar's own tab records, rather than a second strip.
export const browserAddress = (sessionId, pageId) =>
  `dsh-resource://page-review/${encodeURIComponent(sessionId)}/${encodeURIComponent(pageId)}`
export function browserPage(address, sessionId) {
  try {
    const u = new URL(address),
      parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    return u.protocol === 'dsh-resource:' &&
      u.hostname === 'page-review' &&
      parts.length === 2 &&
      parts[0] === sessionId
      ? parts[1]
      : null
  } catch {
    return null
  }
}
export function createBrowserTabs({
  sessionId,
  kind,
  native,
  model,
  create,
  close,
  hasDraft,
  onError,
}) {
  let ready = false,
    paneId,
    scheduled = false,
    disposed = false,
    launching
  const closing = new Set()
  const records = () => native.tabsIn(sessionId).filter((t) => t.kind === kind)
  const open = (id, options = {}) =>
    native.openResourceIn(sessionId, browserAddress(sessionId, id), {
      kind,
      paneId,
      ...options,
    })
  const sync = () => {
    if (!ready || disposed || !model.get().loaded) return
    const state = model.get(),
      tabs = state.tabs.filter((t) => !closing.has(t.id)),
      live = records()
    const missing = tabs.filter(
      (t) => !live.some((n) => browserPage(n.contentId, sessionId) === t.id),
    )
    for (const t of missing) open(t.id)
    // Newly opened links become the active native tab, regardless of array order.
    if (missing.length)
      open(
        tabs.some((t) => t.id === state.active)
          ? state.active
          : missing.at(-1).id,
      )
  }
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      try {
        sync()
      } catch (e) {
        onError(e)
      }
    })
  }
  const unsubscribe = model.subscribe(schedule)
  return {
    filter: (patch) =>
      patch.tabs
        ? { ...patch, tabs: patch.tabs.filter((t) => !closing.has(t.id)) }
        : patch,
    adopt(info) {
      paneId = info.panel.id
      if (!ready) {
        ready = true
        schedule()
      }
    },
    launch(info) {
      if (launching) return launching
      paneId = info.panel.id
      launching = (async () => {
        const restored = records().some((t) =>
          browserPage(t.contentId, sessionId),
        )
        let state = model.get()
        if (ready || restored || !state.tabs.length) {
          state = await create()
          model.set(state)
        }
        ready = true
        const id = state.tabs.some((t) => t.id === state.active)
          ? state.active
          : state.tabs[0].id
        // Replace the old Browser/guide placeholder with the actual webpage.
        open(id, { replaceTab: info.tab.id })
        sync()
        open(id)
      })()
        .catch(onError)
        .finally(() => {
          launching = null
        })
      return launching
    },
    open,
    beforeClose(tab) {
      const id = browserPage(tab.contentId, sessionId)
      if (!id) return
      if (closing.has(id)) return
      if (records().filter((t) => t.contentId === tab.contentId).length > 1)
        return
      if (hasDraft(id)) {
        const error = Error('请先保存或取消当前批注')
        onError(error)
        throw error
      }
      const previous = model.get()
      closing.add(id)
      model.set({ tabs: model.get().tabs.filter((t) => t.id !== id) })
      // Keep the closed identity retired for this client lifetime: an older
      // in-flight frame may arrive even after the close acknowledgement.
      void close(id)
        .then((state) => model.set(state))
        .catch((error) => {
          closing.delete(id)
          model.set({
            tabs: [
              ...model.get().tabs,
              ...previous.tabs.filter((t) => t.id === id),
            ],
          })
          schedule()
          onError(error)
        })
    },
    dispose() {
      disposed = true
      unsubscribe()
    },
  }
}
