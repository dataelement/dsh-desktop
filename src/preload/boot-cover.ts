import { isHarnessBootPage } from '../shared/harness-boot'

export const BOOT_COVER_ID = 'dsh-desktop-boot-cover'
export const BOOT_COVER_STYLE_ID = 'dsh-desktop-boot-cover-style'
export const BOOT_COVER_STALL_MS = 20_000
/** Same files splash.html loads, served by the desktop protocol so the Harness origin can paint them. */
export const BOOT_COVER_LIGHT_MARK_URL = 'dsh-desktop://desktop/dsh-loader.gif'
export const BOOT_COVER_DARK_MARK_URL = 'dsh-desktop://desktop/dsh-loader-dark.gif'

const LIGHT_BACKGROUND = '#f8f8f6'
const DARK_BACKGROUND = '#141416'
const MARK_WIDTH_PX = 196
const MARK_ASPECT_RATIO = '640 / 360'

export interface BootCoverOptions {
  document: Document
  locale: 'en' | 'zh'
  stallMs?: number
  /** Defaults to the current process. Tests pass this to check the Windows inset. */
  platform?: string
  schedule?: (callback: () => void, delayMs: number) => number
  cancel?: (timer: number) => void
  matchMedia?: (query: string) => MediaQueryList
  subscribePageHide?: (listener: () => void) => () => void
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

/** Cover the packaged Harness shell and legacy loopback page, never recovery documents. */
export const isHarnessBootCoverTarget = isHarnessBootPage

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
  const platform = options.platform ?? process.platform
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
  if (platform === 'win32') cover.dataset.platform = 'windows'
  cover.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483646',
    `background:${LIGHT_BACKGROUND}`,
    'color:#17181a'
  ].join(';')
  const shadow = cover.attachShadow({ mode: 'open' })
  // Matches build/splash.html. The outer visibility rule cannot enter this
  // shadow tree, so the splash itself forces visibility.
  const style = doc.createElement('style')
  style.textContent = `
    :host, :host * { visibility: visible !important; }
    :host { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .panel {
      position:fixed;
      inset:0;
      box-sizing:border-box;
      display:grid;
      align-content:center;
      justify-items:center;
      gap:12px;
      padding:32px;
      text-align:center;
    }
    :host([data-platform="windows"]) .panel { padding-top:70px; }
    .markFrame { display:grid; place-items:center; }
    .mark {
      grid-area:1 / 1;
      width:${MARK_WIDTH_PX}px;
      aspect-ratio:${MARK_ASPECT_RATIO};
      height:auto;
      image-rendering:pixelated;
    }
    .markDark { display:none; }
    h1 { margin:0; font-size:23px; font-weight:650; letter-spacing:-0.02em; }
    p { margin:-4px 0 0; color:#777a80; font-size:13px; }
    :host([data-theme="dark"]) { color:#f3f4f6; background:${DARK_BACKGROUND}; color-scheme:dark; }
    :host([data-theme="dark"]) .markLight { display:none; }
    :host([data-theme="dark"]) .markDark {
      display:block;
      filter:brightness(2.4) saturate(0.72) drop-shadow(0 0 7px rgba(111, 134, 255, 0.16));
    }
    :host([data-theme="dark"]) p { color:#9ca0a8; }
  `
  const panel = doc.createElement('div')
  panel.className = 'panel'
  const markFrame = doc.createElement('div')
  markFrame.className = 'markFrame'
  markFrame.setAttribute('aria-hidden', 'true')
  const markLight = doc.createElement('img')
  markLight.className = 'mark markLight'
  markLight.alt = ''
  markLight.src = BOOT_COVER_LIGHT_MARK_URL
  const markDark = doc.createElement('img')
  markDark.className = 'mark markDark'
  markDark.alt = ''
  markDark.src = BOOT_COVER_DARK_MARK_URL
  markFrame.append(markLight, markDark)
  const title = doc.createElement('h1')
  const status = doc.createElement('p')
  const starting = locale === 'zh'
    ? { title: '正在启动 DSH Desktop', status: '首次启动可能需要一点时间。' }
    : { title: 'Starting DSH Desktop', status: 'First launch may take a moment.' }
  const stalled = locale === 'zh'
    ? {
      title: '启动时间较长',
      status: '仍在加载，可以继续等待；准备就绪后会自动进入。'
    }
    : {
      title: 'Startup is taking longer than usual',
      status: 'Still loading. You can keep waiting; the app continues on its own once ready.'
    }
  title.textContent = starting.title
  status.textContent = starting.status
  panel.append(markFrame, title, status)
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

  // Paint as soon as <html> exists. Waiting for <body> is the blank frame
  // between splash and this cover. Do not synthesize a <body>: the parser owns
  // it, and a stand-in leaves the theme probe looking at the wrong element.
  // The parser can still discard nodes inserted before it finishes the tree.
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
    if (cover.isConnected && pageStyle.isConnected) return
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
