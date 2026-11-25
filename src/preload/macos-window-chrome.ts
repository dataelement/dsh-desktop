const sidebarThemes = new WeakMap<Document, { style: HTMLStyleElement; owners: number }>()

/** Enable Harness's native macOS layout before its client modules mount. */
export function mountMacosWindowChrome(
  doc: Document,
  subscribe: (listener: (fullscreen: boolean) => void) => () => void
): () => void {
  let fullscreen = false
  let theme = sidebarThemes.get(doc)
  if (!theme) {
    theme = { style: doc.createElement('style'), owners: 0 }
    sidebarThemes.set(doc, theme)
  }
  theme.owners++
  const style = theme.style
  style.dataset.dshMacosSidebarTheme = ''
  // The Desktop sidebar uses Harness theme colors over the native window material.
  // This is window chrome: the host owns the transparent macOS BrowserWindow.
  style.textContent = 'html[data-platform="darwin"][data-dsh-desktop-web-shortcuts="true"] [data-dsh-sidebar-root] { background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base, #f8f8f6)); }'
  const mark = (): void => {
    const root = doc.documentElement
    if (!root) return
    // This host retains Harness's browser keyboard adapter, not the official
    // desktop's native keyboard/settings bridge. Layout and keyboard are separate.
    if (!style.isConnected && doc.head) doc.head.append(style)
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
    if (--theme.owners === 0) { style.remove(); sidebarThemes.delete(doc) }
  }
}

/** The preview fills the BrowserWindow, whose native buttons do not use page zoom. */
export function mountMacosPreviewChrome(
  doc: Document,
  getZoomFactor: () => number,
  subscribe: (listener: (fullscreen: boolean) => void) => () => void
): () => void {
  const style = doc.createElement('style')
  style.dataset.dshMacosPreviewChrome = ''
  style.textContent = `
    html[data-platform="darwin"]:not([data-fullscreen])
    [data-sidebar-right-panel="fullscreen"] [data-dockkit-strip] {
      box-sizing: border-box;
      min-block-size: calc(38px / var(--dsh-macos-preview-zoom, 1));
    }
    html[data-platform="darwin"]:not([data-fullscreen])
    [data-sidebar-right-panel="fullscreen"]
    [data-dockkit-host="dock"][data-dockkit-column="0"] [data-dockkit-strip] {
      --dsh-dockkit-strip-inline-start: calc(88px / var(--dsh-macos-preview-zoom, 1));
    }
  `

  const view = doc.defaultView
  let fullscreen = false
  const update = (): void => {
    const root = doc.documentElement
    if (!root) return
    if (!style.isConnected && doc.head) doc.head.append(style)
    root.style.setProperty('--dsh-macos-preview-zoom', String(Math.min(1, getZoomFactor())))
    if (fullscreen) root.dataset.fullscreen = 'true'
    else delete root.dataset.fullscreen
  }
  const unsubscribe = subscribe(value => {
    fullscreen = value
    update()
  })
  // Chromium changes the layout viewport on page zoom and emits a resize.
  view?.addEventListener('resize', update)
  doc.addEventListener('DOMContentLoaded', update, { once: true })
  update()

  const dispose = (): void => {
    view?.removeEventListener('resize', update)
    view?.removeEventListener('unload', dispose)
    doc.removeEventListener('DOMContentLoaded', update)
    unsubscribe()
    doc.documentElement?.style.removeProperty('--dsh-macos-preview-zoom')
    doc.documentElement?.removeAttribute('data-fullscreen')
    style.remove()
  }
  view?.addEventListener('unload', dispose, { once: true })
  return dispose
}
