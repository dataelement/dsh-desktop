export const BOOT_COVER_ID = 'dsh-desktop-boot-cover'
export const BOOT_COVER_STYLE_ID = 'dsh-desktop-boot-cover-style'
export const BOOT_COVER_STALL_MS = 20_000

const LIGHT_BACKGROUND = '#f8f8f6'
const DARK_BACKGROUND = '#141416'

export interface BootCoverOptions {
  document: Document
  locale: 'en' | 'zh'
  stallMs?: number
  schedule?: (callback: () => void, delayMs: number) => number
  cancel?: (timer: number) => void
  matchMedia?: (query: string) => MediaQueryList
  subscribePageHide?: (listener: () => void) => () => void
  /**
   * Remove the main-process hide before dropping this cover. Without it, the
   * failure document stays `visibility: hidden` and the details button reveals
   * a blank page.
   */
  revealPage?: () => Promise<unknown>
}

export interface BootCover {
  holdForFailure(): void
  releaseWhenReady(): void
  dispose(): void
}

/**
 * A client shell is ready only when Harness has mounted it and this launch has
 * not already started collecting a boot failure. The failure screen can briefly
 * coexist with a sidebar root; failure keeps the cover up.
 */
export function shouldReleaseBootCover(input: {
  bootFailurePending: boolean
  clientReady: boolean
}): boolean {
  return input.clientReady && !input.bootFailurePending
}

/** Desktop only covers the loopback Harness origin. Its own file and desktop pages stay visible. */
export function isHarnessBootCoverTarget(href: string): boolean {
  try {
    const url = new URL(href)
    return url.protocol === 'http:' && url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

const covers = new WeakMap<Document, BootCover>()

/**
 * Cover the Harness document until its client shell is ready.
 * The boot failure screen is painted by Harness itself; this host seam hides
 * that screen without navigating away from the diagnostics Desktop still reads.
 * There is no plugin slot at this point because the failure is that plugins did not mount.
 */
export function mountBootCover(href: string, options: BootCoverOptions): BootCover | undefined {
  if (!isHarnessBootCoverTarget(href)) return undefined
  const existing = covers.get(options.document)
  if (existing) return existing

  const doc = options.document
  const locale = options.locale
  const stallMs = options.stallMs ?? BOOT_COVER_STALL_MS
  const schedule = options.schedule ?? ((callback, delayMs): number => {
    const view = doc.defaultView
    // The DOM timer id is a number. The compiler also sees Node's Timeout
    // because this package typechecks with both libraries.
    const timer = view ? view.setTimeout(callback, delayMs) : setTimeout(callback, delayMs)
    return timer as unknown as number
  })
  const cancel = options.cancel ?? ((timer: number) => {
    const view = doc.defaultView
    if (view) view.clearTimeout(timer)
    else clearTimeout(timer)
  })
  const subscribePageHide = options.subscribePageHide ?? ((listener: () => void) => {
    const view = doc.defaultView
    if (!view) return () => {}
    view.addEventListener('pagehide', listener)
    view.addEventListener('unload', listener)
    return () => {
      view.removeEventListener('pagehide', listener)
      view.removeEventListener('unload', listener)
    }
  })

  const pageStyle = doc.createElement('style')
  pageStyle.id = BOOT_COVER_STYLE_ID
  // A descendant can set visibility:visible and show through a hidden parent.
  // Hide the whole boot tree, then explicitly paint the cover which lives
  // outside body so Harness cannot replace it with the failure screen.
  pageStyle.textContent = `
    html { background: ${LIGHT_BACKGROUND} !important; }
    @media (prefers-color-scheme: dark) {
      html { background: ${DARK_BACKGROUND} !important; }
    }
    body, body * { visibility: hidden !important; }
    #${BOOT_COVER_ID}, #${BOOT_COVER_ID} * { visibility: visible !important; }
  `
  const cover = doc.createElement('div')
  cover.id = BOOT_COVER_ID
  cover.setAttribute('role', 'status')
  cover.setAttribute('aria-live', 'polite')
  cover.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483646',
    'display:grid',
    'place-items:center',
    `background:${LIGHT_BACKGROUND}`,
    'color:#17181a'
  ].join(';')
  const shadow = cover.attachShadow({ mode: 'open' })
  const style = doc.createElement('style')
  style.textContent = `
    :host { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .panel { display:grid; justify-items:center; gap:12px; max-width:28rem; padding:32px; text-align:center; }
    h1 { margin:0; font-size:23px; font-weight:650; letter-spacing:-0.02em; }
    p { margin:-4px 0 0; color:#777a80; font-size:13px; }
    button { min-height:32px; padding:6px 12px; border:1px solid rgba(120,120,125,.45); border-radius:8px; color:inherit; background:transparent; cursor:pointer; font:inherit; font-size:13px; font-weight:600; }
    button:focus-visible { outline:2px solid #4d6bfe; outline-offset:2px; }
    :host([data-theme="dark"]) { color:#f3f4f6; background:${DARK_BACKGROUND}; }
    :host([data-theme="dark"]) p { color:#9ca0a8; }
  `
  const panel = doc.createElement('div')
  panel.className = 'panel'
  const title = doc.createElement('h1')
  const status = doc.createElement('p')
  const details = doc.createElement('button')
  details.type = 'button'
  details.hidden = true
  const starting = locale === 'zh'
    ? { title: '正在启动 DSH Desktop', status: '首次启动可能需要一点时间。' }
    : { title: 'Starting DSH Desktop', status: 'First launch may take a moment.' }
  const stalled = locale === 'zh'
    ? {
      title: '启动时间较长',
      status: '可以继续等待，或查看当前页面的详细信息。',
      action: '显示详细信息'
    }
    : {
      title: 'Startup is taking longer than usual',
      status: 'You can keep waiting, or view details on the current page.',
      action: 'Show details'
    }
  title.textContent = starting.title
  status.textContent = starting.status
  details.textContent = stalled.action
  details.setAttribute('aria-label', stalled.action)
  panel.append(title, status, details)
  shadow.append(style, panel)

  const colorScheme = options.matchMedia ?? doc.defaultView?.matchMedia?.bind(doc.defaultView)
  const darkQuery = colorScheme?.('(prefers-color-scheme: dark)')
  const applyTheme = (): void => {
    const dark = darkQuery?.matches === true
    cover.dataset.theme = dark ? 'dark' : 'light'
    cover.style.background = dark ? DARK_BACKGROUND : LIGHT_BACKGROUND
    cover.style.color = dark ? '#f3f4f6' : '#17181a'
  }
  applyTheme()
  darkQuery?.addEventListener('change', applyTheme)

  let failureHeld = false
  let disposed = false
  let released = false
  let stallTimer: number | undefined
  let documentObserver: MutationObserver | undefined
  let rootObserver: MutationObserver | undefined
  let observedRoot: Node | undefined
  const unsubscribePageHide = subscribePageHide(() => dispose())

  // The HTML parser can discard nodes inserted before the real document is
  // built, and Harness can replace the boot tree later. Keep putting the cover
  // back until Desktop decides the client is ready. Never insert it before
  // <body> exists: that leaves document.body null and aborts the theme probe.
  const attach = (): void => {
    if (disposed || released) return
    const root = doc.documentElement
    if (!root) return
    if (observedRoot !== root) {
      rootObserver?.disconnect()
      rootObserver = new MutationObserver(() => attach())
      rootObserver.observe(root, { childList: true })
      observedRoot = root
    }
    if (!doc.body || (cover.isConnected && pageStyle.isConnected)) return
    if (!pageStyle.isConnected) root.append(pageStyle)
    if (!cover.isConnected) root.append(cover)
  }

  const watchDocument = (): void => {
    if (documentObserver) return
    documentObserver = new MutationObserver(() => attach())
    documentObserver.observe(doc, { childList: true })
  }

  const stopWatching = (): void => {
    rootObserver?.disconnect()
    rootObserver = undefined
    documentObserver?.disconnect()
    documentObserver = undefined
    observedRoot = undefined
  }

  const revealStall = (): void => {
    stallTimer = undefined
    if (disposed) return
    title.textContent = stalled.title
    status.textContent = stalled.status
    details.hidden = false
    details.focus()
  }

  const stopStallTimer = (): void => {
    if (stallTimer === undefined) return
    cancel(stallTimer)
    stallTimer = undefined
  }

  stallTimer = schedule(revealStall, stallMs)
  watchDocument()
  attach()

  const detach = (): void => {
    released = true
    stopStallTimer()
    stopWatching()
    pageStyle.remove()
    cover.remove()
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    detach()
    darkQuery?.removeEventListener('change', applyTheme)
    unsubscribePageHide()
    covers.delete(doc)
  }
  let revealing = false
  details.addEventListener('click', () => {
    if (disposed || revealing) return
    const reveal = options.revealPage
    if (!reveal) {
      dispose()
      return
    }
    revealing = true
    void Promise.resolve(reveal()).then(() => {
      dispose()
    }).catch(() => {
      // The main-process rule is still applied. Removing the cover now
      // would leave a blank document instead of the failure details.
      revealing = false
    })
  })

  const controller: BootCover = {
    holdForFailure() {
      if (disposed) return
      failureHeld = true
      released = false
      if (stallTimer === undefined) stallTimer = schedule(revealStall, stallMs)
      watchDocument()
      attach()
    },
    releaseWhenReady() {
      if (disposed || failureHeld) return
      detach()
    },
    dispose
  }
  covers.set(doc, controller)
  return controller
}
