/** Enable Harness's native macOS layout before its client modules mount. */
export function mountMacosWindowChrome(
  doc: Document,
  subscribe: (listener: (fullscreen: boolean) => void) => () => void
): () => void {
  let fullscreen = false
  const mark = (): void => {
    const root = doc.documentElement
    if (!root) return
    // This host retains Harness's browser keyboard adapter, not the official
    // desktop's native keyboard/settings bridge. Layout and keyboard are separate.
    root.dataset.dshDesktopWebShortcuts = 'true'
    root.dataset.platform = 'darwin'
    if (fullscreen) root.dataset.fullscreen = 'true'
    else delete root.dataset.fullscreen
  }
  mark()
  doc.addEventListener('DOMContentLoaded', mark, { once: true })
  const unsubscribe = subscribe(value => {
    fullscreen = value
    mark()
  })
  return () => {
    doc.removeEventListener('DOMContentLoaded', mark)
    unsubscribe()
  }
}
