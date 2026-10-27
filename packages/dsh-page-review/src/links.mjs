export function webLink(value, base) {
  try {
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
export function routeWebLinks({ document, origin, sessionId, open, onError }) {
  const click = (event) => {
    if (event.defaultPrevented || (event.button !== 0 && event.button !== 1))
      return
    const anchor = event.target.closest?.('a[href]')
    if (
      !anchor ||
      anchor.hasAttribute('download') ||
      anchor.dataset.browserExternal === 'true'
    )
      return
    const url = webLink(anchor.getAttribute('href'), document.baseURI)
    if (!url || new URL(url).origin === origin) return
    const sid = sessionId()
    if (!sid) return
    event.preventDefault()
    event.stopImmediatePropagation()
    void open(sid, url).catch((error) => onError(error, sid))
  }
  document.addEventListener('click', click, true)
  document.addEventListener('auxclick', click, true)
  return () => {
    document.removeEventListener('click', click, true)
    document.removeEventListener('auxclick', click, true)
  }
}
// Serialize link opens per conversation, including clicks received before the
// browser has mounted. Repeated clicks reveal the existing page.
export function createLinkOpener({ load, read, create, select, show }) {
  const queues = new Map()
  return (sid, value, placement = {}) => {
    const url = webLink(value)
    if (!url) return Promise.reject(Error('只支持不带凭据的 HTTP(S) 网页链接'))
    const work = (queues.get(sid) || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        await load(sid)
        const existing = read(sid).tabs.find((t) => webLink(t.url) === url)
        const state = existing
          ? await select(sid, existing.id)
          : await create(sid, url)
        show(sid, existing?.id || state.active, placement)
      })
    queues.set(sid, work)
    void work
      .finally(() => {
        if (queues.get(sid) === work) queues.delete(sid)
      })
      .catch(() => {})
    return work
  }
}
