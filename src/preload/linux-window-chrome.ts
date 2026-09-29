/**
 * Linux window chrome.
 *
 * Two jobs, on two schedules:
 *
 * 1. `markLinuxPlatform` runs as the preload loads, before Harness's client
 *    modules mount. Harness reads `data-platform` for its window geometry and
 *    the desktop geometry patches key off it; leaving it unset does not mean
 *    "Linux", because the patches express "the host that reserves a native
 *    caption strip" as the absence of `data-platform` — which is why Windows
 *    leaves it unset and why an unset attribute gave Linux 32px of dead space
 *    above the sidebar. The browser-keyboard escape hatch is mandatory too:
 *    Harness throws `Desktop keyboard bridge unavailable` when it resolves
 *    `runtime: desktop` without `window.dshDesktop.keyboard`, and this host
 *    exposes no such bridge, so `runtime` stays `web` exactly as
 *    `macos-window-chrome.ts` keeps it.
 *
 * 2. `mountLinuxWindowChrome` runs once the document has a body, like the
 *    Windows caption layout does. The window has no native frame on Linux
 *    (`frame: false`), so the desktop draws its own minimize/maximize/close —
 *    including on the recovery and Safe Mode pages, where no Harness slot exists
 *    to put them in. Windows borrows the OS overlay for this
 *    (`titleBarOverlay`); Linux has no equivalent, so the controls live here.
 *
 * Position is the one thing the page owns: the controls are aligned with the
 * conversation header's title row, and the bands upstream marks with
 * `data-window-drag` reserve room for them on their right edge. Those bands are
 * also the drag region — a frameless window has to be movable by something, and
 * their interactive elements are switched back to `no-drag`.
 *
 * The right sidebar's own band is the exception: it drops below the caption
 * instead of reserving room in it. Upstream draws that band — the sidebar tabs
 * and the split/fullscreen/collapse actions — on the caption row, which left its
 * collapse button wedged against the window controls as if it belonged to them,
 * while the same sidebar collapsed shows its toggle one row lower. Both states
 * now use that lower row, so opening and closing the sidebar stay in one place.
 */

const STYLE_ID = 'dsh-desktop-linux-window-chrome-style'
const CONTROLS_ID = 'dsh-desktop-linux-window-controls'
const STATE_CHANNEL = 'desktop-window:state-changed'

/** The caption band the controls sit in. */
const CONTROLS_WIDTH = 100
const CONTROLS_HEIGHT = 32
const CONTROLS_TOP = 8
const CONTROLS_RIGHT = 12
/** Right padding a drag band keeps so its own content cannot run under the controls. */
const BAND_CLEARANCE = CONTROLS_WIDTH + CONTROLS_RIGHT + 8
/**
 * Top padding of the right sidebar's own band, which moves its tabs and actions
 * to the row below the caption. The band's buttons sit at the top of its content
 * box and upstream's collapsed-sidebar toggle is anchored to that same row, so
 * this is also the buttons' top edge: it lines up with the toggle, and the value
 * is measured against it in the running app rather than derived from the
 * sidebar's own padding.
 */
const SIDEBAR_BAND_TOP = CONTROLS_TOP + CONTROLS_HEIGHT + 10

const COPY = {
  zh: {
    controls: '窗口控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '向下还原',
    close: '关闭'
  },
  en: {
    controls: 'Window controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close'
  }
}

type Copy = (typeof COPY)['en']

const MINIMIZE_ICON =
  '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M2.5 6h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
const MAXIMIZE_ICON =
  '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><rect x="2.6" y="2.6" width="6.8" height="6.8" rx="1.2" stroke="currentColor" stroke-width="1.2"/></svg>'
const RESTORE_ICON =
  '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><rect x="2.6" y="4.4" width="5" height="5" rx="1.1" stroke="currentColor" stroke-width="1.2"/><path d="M4.8 4.4v-.9a1.1 1.1 0 0 1 1.1-1.1h2.7a1.1 1.1 0 0 1 1.1 1.1v2.7a1.1 1.1 0 0 1-1.1 1.1h-.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
const CLOSE_ICON =
  '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M3.4 3.4l5.2 5.2M8.6 3.4l-5.2 5.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'

/** The desktop host's own language, taken from the page Harness renders. */
function copyFor(doc: Document): Copy {
  return doc.documentElement.lang?.toLowerCase().startsWith('zh') ? COPY.zh : COPY.en
}

/**
 * Announce the platform to Harness's client modules before they mount.
 * @param doc - the window's document.
 */
export function markLinuxPlatform(doc: Document): void {
  const mark = (): void => {
    const root = doc.documentElement
    if (!root) return
    root.dataset.dshDesktopWebShortcuts = 'true'
    root.dataset.platform = 'linux'
  }
  mark()
  doc.addEventListener('DOMContentLoaded', mark, { once: true })
}

/**
 * The slice of `IpcRenderer` the chrome uses. Declared here instead of picking
 * Electron's type so the module depends on nothing but the two calls it makes,
 * and a plain test double satisfies it as readily as the real bridge.
 */
export interface LinuxWindowChromeIpc {
  invoke: (channel: string) => Promise<unknown>
  on(channel: string, listener: (event: unknown, value: unknown) => void): void
  removeListener(channel: string, listener: (event: unknown, value: unknown) => void): void
}

export interface LinuxWindowChromeOptions {
  document: Document
  ipcRenderer: LinuxWindowChromeIpc
}

/**
 * Draw the window's own controls and make the app's header bands draggable.
 * @param options - the window's document and the IPC bridge to main.
 * @returns a disposer that removes every node and listener it added.
 */
export function mountLinuxWindowChrome(options: LinuxWindowChromeOptions): () => void {
  const { document: doc, ipcRenderer } = options
  if (!doc.body) return () => undefined
  // initializeUi can run again after the document changes; one cluster, always.
  if (doc.getElementById(CONTROLS_ID)) return () => undefined

  const copy = copyFor(doc)
  installStyle(doc)
  return installControls(doc, copy, ipcRenderer)
}

function installStyle(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  // Fallbacks matter: the recovery and Safe Mode pages are standalone and never
  // receive Harness's tokens, so every token here has a plain value behind it.
  style.textContent = `
    html[data-platform=linux] {
      --dsh-desktop-window-controls-width: ${CONTROLS_WIDTH}px;
    }
    #${CONTROLS_ID} {
      position: fixed;
      z-index: 2147482000;
      top: ${CONTROLS_TOP}px;
      right: ${CONTROLS_RIGHT}px;
      height: ${CONTROLS_HEIGHT}px;
      display: flex;
      align-items: center;
      gap: 2px;
      -webkit-app-region: no-drag;
    }
    #${CONTROLS_ID} button {
      width: 32px;
      height: 32px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--dsw-alias-label-secondary, rgba(32, 33, 36, 0.62));
      cursor: default;
      -webkit-app-region: no-drag;
    }
    #${CONTROLS_ID} button:hover {
      background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, 0.08));
      color: var(--dsw-alias-label-primary, rgba(32, 33, 36, 0.9));
    }
    #${CONTROLS_ID} button:active {
      background: var(--dsw-alias-interactive-bg-pressed, rgba(32, 33, 36, 0.14));
    }
    #${CONTROLS_ID} button:focus-visible {
      outline: 2px solid var(--dsw-alias-state-business-primary, #4d6bfe);
      outline-offset: 1px;
    }
    #${CONTROLS_ID} button[data-dsh-window-close]:hover {
      background: #d93025;
      color: #ffffff;
    }
    /* The bands upstream marks as window-drag are the window's handle. Only the
       ones the controls can reach reserve room on their right: the sidebar's own
       row sits against the opposite edge, and padding it squeezed the brand
       lockup and dragged its collapse button across the column. */
    [data-window-drag] {
      -webkit-app-region: drag;
      box-sizing: border-box;
    }
    [data-window-drag]:not([data-dsh-sidebar-root] *):not([data-rightbar-col] *) {
      padding-right: ${BAND_CLEARANCE}px !important;
    }
    /* The right sidebar's band leaves the caption row instead of reserving room
       in it: upstream draws the sidebar's tabs and its split/fullscreen/collapse
       actions on that row, which parked the collapse button against the window
       controls while the collapsed sidebar's toggle sat one row lower. Dropping
       the band to that row puts both buttons in one place; leaving the band's
       height to its content keeps its box over the caption it vacated, which
       stays draggable. The right padding is the controls' own inset so the last
       button lines up with them. */
    [data-rightbar-col] [data-window-drag] {
      height: auto !important;
      padding-top: ${SIDEBAR_BAND_TOP}px !important;
      padding-right: ${CONTROLS_RIGHT}px !important;
    }
    [data-window-drag] button,
    [data-window-drag] a,
    [data-window-drag] input,
    [data-window-drag] select,
    [data-window-drag] textarea,
    [data-window-drag] [role="button"],
    [data-window-drag] [role="tab"],
    [data-window-drag] [role="menuitem"],
    [data-dsh-no-drag] {
      -webkit-app-region: no-drag !important;
    }
    @media (prefers-color-scheme: dark) {
      #${CONTROLS_ID} button {
        color: var(--dsw-alias-label-secondary, rgba(243, 244, 246, 0.68));
      }
      #${CONTROLS_ID} button:hover {
        background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.1));
        color: var(--dsw-alias-label-primary, rgba(243, 244, 246, 0.92));
      }
      #${CONTROLS_ID} button:active {
        background: var(--dsw-alias-interactive-bg-pressed, rgba(255, 255, 255, 0.16));
      }
    }
    body[data-ds-dark-theme] #${CONTROLS_ID} button {
      color: var(--dsw-alias-label-secondary, rgba(243, 244, 246, 0.68));
    }
    body[data-ds-dark-theme] #${CONTROLS_ID} button:hover {
      background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.1));
      color: var(--dsw-alias-label-primary, rgba(243, 244, 246, 0.92));
    }
  `
  doc.head.appendChild(style)
}

function installControls(
  doc: Document,
  copy: Copy,
  ipcRenderer: LinuxWindowChromeOptions['ipcRenderer']
): () => void {
  const controls = doc.createElement('div')
  controls.id = CONTROLS_ID
  controls.setAttribute('role', 'group')
  controls.setAttribute('aria-label', copy.controls)

  const minimize = controlButton(doc, copy.minimize, MINIMIZE_ICON)
  const toggle = controlButton(doc, copy.maximize, MAXIMIZE_ICON)
  const close = controlButton(doc, copy.close, CLOSE_ICON)
  close.dataset.dshWindowClose = ''
  controls.append(minimize, toggle, close)
  doc.body.appendChild(controls)

  const applyMaximized = (maximized: boolean): void => {
    toggle.innerHTML = maximized ? RESTORE_ICON : MAXIMIZE_ICON
    const label = maximized ? copy.restore : copy.maximize
    toggle.setAttribute('aria-label', label)
    toggle.title = label
  }

  const run = (channel: string): void => {
    void ipcRenderer.invoke(channel).catch((error: unknown) => {
      console.warn('[desktop-window] window control failed', error)
    })
  }
  const onMinimize = (): void => run('desktop-window:minimize')
  const onToggle = (): void => run('desktop-window:toggle-maximize')
  const onClose = (): void => run('desktop-window:close')
  const onDoubleClick = (): void => run('desktop-window:toggle-maximize')
  minimize.addEventListener('click', onMinimize)
  toggle.addEventListener('click', onToggle)
  close.addEventListener('click', onClose)
  // Nothing native is left to turn a double-click on the drag band into a
  // maximize, which is what Windows gets from its caption overlay.
  doc.addEventListener('dblclick', onDoubleClick)

  const onStateChanged = (_event: unknown, value: unknown): void => {
    const maximized = (value as { maximized?: unknown } | null)?.maximized
    if (typeof maximized === 'boolean') applyMaximized(maximized)
  }
  ipcRenderer.on(STATE_CHANNEL, onStateChanged)
  void ipcRenderer
    .invoke('desktop-window:get-state')
    .then((state: unknown) => {
      applyMaximized((state as { maximized?: unknown } | null)?.maximized === true)
    })
    .catch((error: unknown) => {
      console.warn('[desktop-window] unable to read the window state', error)
    })

  return () => {
    minimize.removeEventListener('click', onMinimize)
    toggle.removeEventListener('click', onToggle)
    close.removeEventListener('click', onClose)
    doc.removeEventListener('dblclick', onDoubleClick)
    ipcRenderer.removeListener(STATE_CHANNEL, onStateChanged)
    controls.remove()
  }
}

function controlButton(doc: Document, label: string, icon: string): HTMLButtonElement {
  const button = doc.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', label)
  button.title = label
  // Trusted static markup: the icons are module constants, never page input.
  button.innerHTML = icon
  return button
}
