import type { IpcRenderer } from 'electron'
import { WINDOWS_TITLEBAR_HEIGHT } from '../shared/desktop-menu'

const LAYOUT_STYLE_ID = 'dsh-desktop-windows-titlebar-layout-style'
const DRAG_REGION_ID = 'dsh-desktop-windows-drag-region'
const SIDEBAR_WIDTH_PROPERTY = '--dsh-desktop-windows-sidebar-width'
const CAPTION_WIDTH_PROPERTY = '--dsh-desktop-windows-caption-width'
const NO_DRAG_PATCH_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [data-dsh-no-drag]'
// One above the drag region (2147483644), below the update card (2147483646).
const NO_DRAG_PATCH_Z_INDEX = '2147483645'

interface TitlebarLayoutMountOptions {
  document: Document
  ipcRenderer: Pick<IpcRenderer, 'invoke'>
}

export function mountWindowsTitlebarLayout(options: TitlebarLayoutMountOptions): void {
  const { document, ipcRenderer } = options
  if (!document.body) return

  installLayout(document)
  installDragRegion(document)
  installNoDragPatches(document)
  trackSidebarLayout(document)

  document.addEventListener('pointerdown', () => {
    void ipcRenderer.invoke('desktop-titlebar:close-menu').catch((error: unknown) => {
      console.warn('[desktop-titlebar] unable to close the application menu', error)
    })
  })

  syncTheme(document, ipcRenderer)
  const themeObserver = new MutationObserver(() => syncTheme(document, ipcRenderer))
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-ds-dark-theme', 'class', 'style']
  })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    syncTheme(document, ipcRenderer)
  })
}

function installLayout(document: Document): void {
  document.body.classList.add('dsh-desktop-windows-titlebar-layout')
  if (document.getElementById(LAYOUT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = LAYOUT_STYLE_ID
  style.textContent = `
    html, body { height: 100% !important; }
    body.dsh-desktop-windows-titlebar-layout {
      ${CAPTION_WIDTH_PROPERTY}: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, calc(100vw - 140px)));
      box-sizing: border-box !important;
      height: 100% !important;
      padding-top: 0 !important;
    }
    body.dsh-desktop-windows-titlebar-layout > #root {
      height: 100% !important;
      min-height: 0 !important;
    }
    body.dsh-desktop-windows-titlebar-layout [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] {
      padding-top: 6px !important;
    }
    body.dsh-desktop-windows-titlebar-layout [data-slot="conversation.session.header"] > header {
      padding-right: calc(var(${CAPTION_WIDTH_PROPERTY}, 140px) + 52px) !important;
    }
    body.dsh-desktop-windows-titlebar-layout button,
    body.dsh-desktop-windows-titlebar-layout a,
    body.dsh-desktop-windows-titlebar-layout input,
    body.dsh-desktop-windows-titlebar-layout select,
    body.dsh-desktop-windows-titlebar-layout textarea,
    body.dsh-desktop-windows-titlebar-layout [role="button"],
    body.dsh-desktop-windows-titlebar-layout [data-dsh-no-drag] {
      -webkit-app-region: no-drag !important;
    }
    #${DRAG_REGION_ID} {
      position: fixed;
      z-index: 2147483644;
      top: 0;
      left: 0;
      right: calc(var(${CAPTION_WIDTH_PROPERTY}, 140px) + 44px);
      height: 36px;
      background: transparent;
      pointer-events: none;
      user-select: none;
      -webkit-app-region: drag;
    }
  `
  document.head.appendChild(style)
}

function installDragRegion(document: Document): void {
  if (document.getElementById(DRAG_REGION_ID)) return
  const dragRegion = document.createElement('div')
  dragRegion.id = DRAG_REGION_ID
  dragRegion.setAttribute('aria-hidden', 'true')
  document.body.appendChild(dragRegion)
}

/**
 * The drag region above intentionally sits on top of every page element, so
 * `-webkit-app-region` resolves to `drag` for the whole strip and the global
 * `no-drag` rule on buttons below it never wins (app-region is resolved by
 * paint order, not DOM proximity — pointer-events does not opt out of it).
 * Punch transparent `no-drag` holes one layer above the drag region for every
 * interactive element that intersects the strip, so Harness controls (and
 * third-party plugin UI) stay clickable while the rest of the strip keeps
 * dragging the window.
 */
function installNoDragPatches(document: Document): void {
  const patches = new Map<Element, HTMLElement>()

  const sync = (): void => {
    for (const [element, patch] of patches) {
      if (!element.isConnected) {
        patch.remove()
        patches.delete(element)
      }
    }
    for (const element of document.querySelectorAll<HTMLElement>(NO_DRAG_PATCH_SELECTOR)) {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.bottom <= 0 || rect.top >= WINDOWS_TITLEBAR_HEIGHT) {
        const stale = patches.get(element)
        if (stale) {
          stale.remove()
          patches.delete(element)
        }
        continue
      }
      const top = Math.max(rect.top, 0)
      const height = Math.min(rect.bottom, WINDOWS_TITLEBAR_HEIGHT) - top
      let patch = patches.get(element)
      if (!patch) {
        patch = document.createElement('div')
        patch.setAttribute('aria-hidden', 'true')
        patch.style.position = 'fixed'
        patch.style.pointerEvents = 'none'
        patch.style.userSelect = 'none'
        patch.style.background = 'transparent'
        patch.style.zIndex = NO_DRAG_PATCH_Z_INDEX
        patch.style.setProperty('-webkit-app-region', 'no-drag')
        document.body.appendChild(patch)
        patches.set(element, patch)
      }
      patch.style.left = `${rect.left}px`
      patch.style.top = `${top}px`
      patch.style.width = `${rect.width}px`
      patch.style.height = `${height}px`
    }
  }

  let frame: number | null = null
  const schedule = (): void => {
    if (frame !== null) return
    frame = window.requestAnimationFrame(() => {
      frame = null
      sync()
    })
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('scroll', schedule, { passive: true, capture: true })
  sync()
}

function trackSidebarLayout(document: Document): void {
  let observedSidebarColumn: HTMLElement | null = null
  const resizeObserver = new ResizeObserver(() => updateSidebarWidth())

  const updateSidebarWidth = (): void => {
    if (!observedSidebarColumn) {
      document.documentElement.style.setProperty(SIDEBAR_WIDTH_PROPERTY, '0px')
      return
    }
    const width = observedSidebarColumn.getBoundingClientRect().width
    document.documentElement.style.setProperty(SIDEBAR_WIDTH_PROPERTY, `${Math.max(0, width)}px`)
  }

  const sync = (): void => {
    const sidebarRoot = document.querySelector<HTMLElement>('[data-dsh-sidebar-root]')
    const sidebarColumn = sidebarRoot?.parentElement ?? null

    if (sidebarColumn !== observedSidebarColumn) {
      if (observedSidebarColumn) resizeObserver.unobserve(observedSidebarColumn)
      observedSidebarColumn = sidebarColumn
      if (sidebarColumn) resizeObserver.observe(sidebarColumn)
    }
    updateSidebarWidth()
  }

  const observer = new MutationObserver(sync)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  sync()
}

function syncTheme(document: Document, ipcRenderer: Pick<IpcRenderer, 'invoke'>): void {
  const isDark = documentIsDark(document)
  void ipcRenderer.invoke('desktop-titlebar:set-theme', isDark).catch((error: unknown) => {
    console.warn('[desktop-titlebar] unable to synchronize native theme', error)
  })
}

export function documentIsDark(document: Document): boolean {
  if (document.body.hasAttribute('data-ds-dark-theme')) return true
  const color = document.defaultView?.getComputedStyle(document.body).backgroundColor ?? ''
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length < 3 || channels.some(Number.isNaN)) {
    return document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false
  }
  const [red = 255, green = 255, blue = 255] = channels
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128
}
