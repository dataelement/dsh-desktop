// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BOOT_COVER_DARK_MARK_URL,
  BOOT_COVER_ID,
  BOOT_COVER_LIGHT_MARK_URL,
  BOOT_COVER_STYLE_ID,
  isHarnessBootCoverTarget,
  mountBootCover,
  shouldReleaseBootCover,
  type BootCoverOptions
} from '../src/preload/boot-cover'

function createTimers(): {
  schedule: BootCoverOptions['schedule']
  cancel: BootCoverOptions['cancel']
  fire: () => void
  pending: () => number
} {
  const queued = new Map<number, () => void>()
  let nextId = 1
  return {
    schedule: (callback) => {
      const id = nextId
      nextId += 1
      queued.set(id, callback)
      return id
    },
    cancel: (timer) => {
      queued.delete(timer)
    },
    fire: () => {
      const callback = [...queued.values()][0]
      queued.clear()
      callback?.()
    },
    pending: () => queued.size
  }
}

interface ThemeQuery extends MediaQueryList {
  listenerCount(): number
}

function createThemeQuery(matches: boolean): ThemeQuery {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener)
    },
    listenerCount: () => listeners.size
  } as ThemeQuery
}

function mountHarnessCover(options: Partial<BootCoverOptions> = {}) {
  const doc = document.implementation.createHTMLDocument()
  const timers = createTimers()
  const theme = createThemeQuery(false)
  const unsubscribePageHide = vi.fn()
  let pageHide: (() => void) | undefined
  const cover = mountBootCover('dsh-desktop://harness/', {
    document: doc,
    locale: 'en',
    schedule: timers.schedule,
    cancel: timers.cancel,
    matchMedia: () => theme,
    subscribePageHide: (listener) => {
      pageHide = listener
      return unsubscribePageHide
    },
    ...options
  })
  return { doc, timers, theme, cover, pageHide: () => pageHide?.(), unsubscribePageHide }
}

describe('boot cover target', () => {
  it('covers the packaged shell and legacy loopback page, but not other documents', () => {
    expect(isHarnessBootCoverTarget('dsh-desktop://harness/')).toBe(true)
    expect(isHarnessBootCoverTarget('http://127.0.0.1:43129/')).toBe(true)
    expect(isHarnessBootCoverTarget('dsh-desktop://harness.evil/')).toBe(false)
    expect(isHarnessBootCoverTarget('dsh-desktop://user@harness/')).toBe(false)
    expect(isHarnessBootCoverTarget('https://example.com/')).toBe(false)
    expect(isHarnessBootCoverTarget('file:///tmp/plugin-recovery.html')).toBe(false)
    expect(isHarnessBootCoverTarget('dsh-desktop://desktop/safe-mode.html')).toBe(false)
  })

  it('keeps the cover when a failure is still pending beside a ready shell', () => {
    expect(shouldReleaseBootCover({ bootFailurePending: true, clientReady: true })).toBe(false)
    expect(shouldReleaseBootCover({ bootFailurePending: false, clientReady: true })).toBe(true)
    expect(shouldReleaseBootCover({ bootFailurePending: false, clientReady: false })).toBe(false)
  })
})

describe('boot cover lifecycle', () => {
  afterEach(() => {
    document.getElementById(BOOT_COVER_ID)?.remove()
    document.getElementById(BOOT_COVER_STYLE_ID)?.remove()
  })

  it('mounts one cover on a Harness document and none on a desktop page', () => {
    const harness = mountHarnessCover()
    const first = harness.doc.getElementById(BOOT_COVER_ID)
    const repeat = mountBootCover('dsh-desktop://harness/', {
      document: harness.doc,
      locale: 'en'
    })
    expect(first).not.toBeNull()
    expect(harness.doc.querySelectorAll(`#${BOOT_COVER_ID}`)).toHaveLength(1)
    expect(repeat).toBe(harness.cover)
    const shadow = first?.shadowRoot
    expect(shadow?.querySelector('h1')?.textContent).toBe('Starting DSH Desktop')
    expect(shadow?.querySelector('img.markLight')?.getAttribute('src')).toBe(BOOT_COVER_LIGHT_MARK_URL)
    expect(shadow?.querySelector('img.markDark')?.getAttribute('src')).toBe(BOOT_COVER_DARK_MARK_URL)
    expect(shadow?.querySelector('.markFrame')?.getAttribute('aria-hidden')).toBe('true')

    const desktop = document.implementation.createHTMLDocument()
    expect(mountBootCover('file:///tmp/splash.html', { document: desktop, locale: 'zh' })).toBeUndefined()
    expect(desktop.getElementById(BOOT_COVER_ID)).toBeNull()
    harness.cover?.dispose()
  })

  it('paints the splash before the parser creates body and keeps a single cover', async () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body?.remove()
    const timers = createTimers()
    const cover = mountBootCover('dsh-desktop://harness/', {
      document: doc,
      locale: 'zh',
      schedule: timers.schedule,
      cancel: timers.cancel,
      subscribePageHide: () => () => {}
    })
    expect(doc.body).toBeNull()
    const painted = doc.getElementById(BOOT_COVER_ID)
    expect(painted?.shadowRoot?.querySelector('h1')?.textContent).toBe('正在启动 DSH Desktop')
    expect(painted?.shadowRoot?.querySelector('img.markLight')?.getAttribute('src')).toBe(BOOT_COVER_LIGHT_MARK_URL)
    expect(doc.getElementById(BOOT_COVER_STYLE_ID)?.textContent).toContain('body, body *')

    painted?.remove()
    doc.getElementById(BOOT_COVER_STYLE_ID)?.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(doc.getElementById(BOOT_COVER_ID)).not.toBeNull()

    const body = doc.createElement('body')
    doc.documentElement?.append(body)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(doc.body).toBe(body)
    expect(doc.querySelectorAll(`#${BOOT_COVER_ID}`)).toHaveLength(1)
    cover?.dispose()
    expect(timers.pending()).toBe(0)
  })

  it('uses the Chinese startup copy', () => {
    const { doc, cover } = mountHarnessCover({ locale: 'zh' })
    expect(doc.getElementById(BOOT_COVER_ID)?.shadowRoot?.querySelector('h1')?.textContent).toBe('正在启动 DSH Desktop')
    cover?.dispose()
  })

  it('follows the dark color scheme and reserves the splash mark', () => {
    const { doc, cover } = mountHarnessCover({
      matchMedia: () => createThemeQuery(true)
    })
    const root = doc.getElementById(BOOT_COVER_ID)
    const css = root?.shadowRoot?.querySelector('style')?.textContent ?? ''
    expect(root?.dataset.theme).toBe('dark')
    expect(css).toContain(':host([data-theme="dark"]) .markLight { display:none; }')
    expect(css).toContain('brightness(2.4) saturate(0.72)')
    expect(css).toContain('aspect-ratio:640 / 360')
    cover?.dispose()
  })

  it('insets the splash below the Windows caption, matching the startup page', () => {
    const { doc, cover } = mountHarnessCover({ platform: 'win32' })
    const root = doc.getElementById(BOOT_COVER_ID)
    expect(root?.dataset.platform).toBe('windows')
    expect(root?.shadowRoot?.querySelector('style')?.textContent).toContain('padding-top:70px')
    cover?.dispose()
  })

  it('stays up while a boot failure is pending and leaves once the client is ready', () => {
    const { doc, timers, cover } = mountHarnessCover()
    cover?.holdForFailure()
    cover?.releaseWhenReady()
    expect(doc.getElementById(BOOT_COVER_ID)).not.toBeNull()
    expect(timers.pending()).toBe(1)

    const ready = mountHarnessCover()
    ready.cover?.releaseWhenReady()
    expect(ready.doc.getElementById(BOOT_COVER_ID)).toBeNull()
    expect(ready.timers.pending()).toBe(0)
  })

  it('keeps covering a slow startup and leaves only when the client is ready', () => {
    const { doc, timers, cover } = mountHarnessCover({ locale: 'zh' })
    timers.fire()
    const root = doc.getElementById(BOOT_COVER_ID)
    expect(root).not.toBeNull()
    expect(root?.shadowRoot?.querySelector('h1')?.textContent).toBe('启动时间较长')
    expect(root?.shadowRoot?.querySelector('p')?.textContent)
      .toBe('仍在加载，可以继续等待；准备就绪后会自动进入。')
    // A stalled startup is slow, not failed, so the cover offers no action:
    // revealing the page would only show an empty startup document.
    expect(root?.shadowRoot?.querySelector('button')).toBeNull()
    expect(timers.pending()).toBe(0)
    cover?.releaseWhenReady()
    expect(doc.getElementById(BOOT_COVER_ID)).toBeNull()
  })

  it.each(['en', 'zh'] as const)('keeps a stalled startup covered without an action (%s)', locale => {
    const waiting = mountHarnessCover({ locale })
    waiting.timers.fire()
    const root = waiting.doc.getElementById(BOOT_COVER_ID)
    expect(root?.isConnected).toBe(true)
    expect(waiting.doc.getElementById(BOOT_COVER_STYLE_ID)).not.toBeNull()
    expect(root?.shadowRoot?.querySelector('button')).toBeNull()
    expect(root?.shadowRoot?.querySelector('h1')?.textContent).toBe(
      locale === 'zh' ? '启动时间较长' : 'Startup is taking longer than usual')
    waiting.cover?.releaseWhenReady()
    expect(root?.isConnected).toBe(false)
    waiting.cover?.dispose()
  })

  it('holds the cover over a known boot failure until the client renders', () => {
    const waiting = mountHarnessCover({ locale: 'en' })
    waiting.doc.body.innerHTML = '<div data-dsh-boot>Failed to load plugins: fixture import failed</div>'
    waiting.cover?.holdForFailure()
    waiting.timers.fire()
    const root = waiting.doc.getElementById(BOOT_COVER_ID)
    expect(root?.isConnected).toBe(true)
    expect(root?.shadowRoot?.querySelector('button')).toBeNull()
    expect(waiting.doc.body.textContent).toContain('fixture import failed')
    waiting.cover?.releaseWhenReady()
    expect(root?.isConnected).toBe(true)
    waiting.cover?.dispose()
    expect(waiting.doc.getElementById(BOOT_COVER_ID)).toBeNull()
  })

  it('restores the cover if the page removes it, and again after the client was ready', async () => {
    const restored = mountHarnessCover()
    restored.doc.getElementById(BOOT_COVER_ID)?.remove()
    restored.doc.getElementById(BOOT_COVER_STYLE_ID)?.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(restored.doc.getElementById(BOOT_COVER_ID)).not.toBeNull()
    expect(restored.doc.getElementById(BOOT_COVER_STYLE_ID)).not.toBeNull()
    restored.cover?.releaseWhenReady()
    expect(restored.doc.getElementById(BOOT_COVER_ID)).toBeNull()
    expect(restored.doc.getElementById(BOOT_COVER_STYLE_ID)).toBeNull()
    restored.cover?.holdForFailure()
    expect(restored.doc.getElementById(BOOT_COVER_ID)).not.toBeNull()
    restored.cover?.dispose()
  })

  it('clears the timer and listeners when the page goes away or the client is ready', () => {
    const hidden = mountHarnessCover()
    hidden.pageHide()
    expect(hidden.unsubscribePageHide).toHaveBeenCalledOnce()
    expect(hidden.timers.pending()).toBe(0)
    expect(hidden.theme.listenerCount?.()).toBe(0)
    expect(hidden.doc.getElementById(BOOT_COVER_ID)).toBeNull()

    const ready = mountHarnessCover()
    ready.cover?.releaseWhenReady()
    expect(ready.doc.getElementById(BOOT_COVER_ID)).toBeNull()
    expect(ready.timers.pending()).toBe(0)
    ready.pageHide()
    expect(ready.unsubscribePageHide).toHaveBeenCalledOnce()
    expect(ready.theme.listenerCount?.()).toBe(0)
  })

  it('clears the timer when the real page is hidden', () => {
    const timers = createTimers()
    const cover = mountBootCover('dsh-desktop://harness/', {
      document,
      locale: 'en',
      schedule: timers.schedule,
      cancel: timers.cancel
    })
    expect(document.getElementById(BOOT_COVER_ID)).not.toBeNull()
    window.dispatchEvent(new Event('pagehide'))
    expect(document.getElementById(BOOT_COVER_ID)).toBeNull()
    expect(timers.pending()).toBe(0)
    cover?.dispose()
  })
})
