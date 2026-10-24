import type { IpcRenderer } from 'electron'
import { WINDOWS_TITLEBAR_HEIGHT } from '../shared/desktop-menu'
import { mountWindowsMenuBar } from './windows-menu-bar'

const LAYOUT_STYLE_ID = 'dsh-desktop-windows-titlebar-layout-style'
const DRAG_REGION_ID = 'dsh-desktop-windows-drag-region'
const MODAL_OPEN_ATTRIBUTE = 'data-dsh-modal-open'

interface TitlebarLayoutMountOptions {
  document: Document
  ipcRenderer: Pick<IpcRenderer, 'invoke'>
}

/** Harness reads this marker while creating its first layout frame. */
export function markWindowsTitlebar(document: Document): void {
  const apply = (root: HTMLElement): void => {
    root.dataset.windowsTitlebar = ''
    root.style.setProperty('--dsh-windows-titlebar-height', `${WINDOWS_TITLEBAR_HEIGHT}px`)
  }
  const root = document.documentElement as HTMLElement | null
  if (root) {
    apply(root)
    return
  }
  // Preload can run before the parser creates <html>. Mark it the moment it
  // exists so every Harness script, including its first layout, sees it.
  const observer = new MutationObserver(() => {
    const created = document.documentElement as HTMLElement | null
    if (!created) return
    observer.disconnect()
    apply(created)
  })
  observer.observe(document, { childList: true })
}

/**
 * Windows caption layout. Harness 0.1.7 owns the caption row on its pages
 * (AppFrame reserves it, paints it and makes it draggable) once the marker is
 * set; Desktop adds the caption menubar in the upstream seat, a drag strip for
 * its own local pages, and releases the drag area while a dialog is open.
 */
export function mountWindowsTitlebarLayout(options: TitlebarLayoutMountOptions): void {
  const { document, ipcRenderer } = options
  markWindowsTitlebar(document)
  if (!document.body) return

  installLayout(document)
  if (document.location.protocol === 'file:') installDragRegion(document)
  trackModals(document)
  mountWindowsMenuBar({ document, ipcRenderer })

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
      box-sizing: border-box !important;
      height: 100% !important;
      padding-top: 0 !important;
    }
    body.dsh-desktop-windows-titlebar-layout > #root {
      height: 100% !important;
      min-height: 0 !important;
    }
    /* A drag region wins over a dialog's buttons in the caption row, so both
       Harness's caption strip and Desktop's own give way while one is open. */
    html[${MODAL_OPEN_ATTRIBUTE}] :has(> [data-shell-overlay])::before {
      -webkit-app-region: no-drag !important;
    }
    html[${MODAL_OPEN_ATTRIBUTE}] #${DRAG_REGION_ID} { display: none !important; }
    body.dsh-desktop-windows-titlebar-layout button,
    body.dsh-desktop-windows-titlebar-layout a,
    body.dsh-desktop-windows-titlebar-layout input,
    body.dsh-desktop-windows-titlebar-layout select,
    body.dsh-desktop-windows-titlebar-layout textarea,
    body.dsh-desktop-windows-titlebar-layout [role="button"],
    body.dsh-desktop-windows-titlebar-layout [role="tab"],
    body.dsh-desktop-windows-titlebar-layout [role="menuitem"],
    body.dsh-desktop-windows-titlebar-layout [data-dsh-no-drag] {
      -webkit-app-region: no-drag !important;
    }
    #${DRAG_REGION_ID} {
      position: fixed;
      z-index: 10;
      top: 0;
      left: 0;
      right: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, calc(100vw - 140px)));
      height: ${WINDOWS_TITLEBAR_HEIGHT}px;
      background: transparent;
      pointer-events: none;
      user-select: none;
      -webkit-app-region: drag;
    }
  `
  document.head.appendChild(style)
}

/** Desktop's local pages have no Harness caption strip, so they get their own. */
function installDragRegion(document: Document): void {
  if (document.getElementById(DRAG_REGION_ID)) return
  const dragRegion = document.createElement('div')
  dragRegion.id = DRAG_REGION_ID
  dragRegion.setAttribute('aria-hidden', 'true')
  document.body.appendChild(dragRegion)
}

function trackModals(document: Document): void {
  // Only semantic dialog markers count: class-name guesses match permanent
  // elements and would release the drag area for good.
  const modalSelector = 'dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]'
  const update = (): void => {
    const hasModal = Array.from(document.querySelectorAll<HTMLElement>(modalSelector)).some((el) => {
      if (el.offsetWidth === 0 || el.offsetHeight === 0) return false
      const style = window.getComputedStyle(el)
      return style.visibility !== 'hidden' && style.opacity !== '0'
    })
    document.documentElement.toggleAttribute(MODAL_OPEN_ATTRIBUTE, hasModal)
  }

  // Streaming output mutates the DOM continuously; check at most once a frame.
  let scheduled = false
  const scheduleUpdate = (): void => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      update()
    })
  }
  const observer = new MutationObserver(scheduleUpdate)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['open', 'style', 'class', 'hidden', 'aria-hidden', 'aria-modal', 'role']
  })
  update()
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
