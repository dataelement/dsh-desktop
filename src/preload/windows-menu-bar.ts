import type { IpcRenderer } from 'electron'

type MenuName = 'application' | 'edit'

interface MenuBarOptions {
  document: Document
  ipcRenderer: Pick<IpcRenderer, 'invoke'>
}

const HOST_ATTRIBUTE = 'data-dsh-windows-menu'

/**
 * Mount the Windows caption menubar ("应用" / "编辑") where the upstream
 * Desktop puts it: in the caption row, right of the sidebar toggle. Harness
 * 0.1.7 moves that seat with `--dsh-windows-menu-start` when the sidebar
 * collapses. The popups are native menus opened by the main process.
 *
 * Harness pages wait for AppFrame's shell overlay so the menubar appears with
 * the rendered application; Desktop's own pages (plugin recovery, splash) have
 * no sidebar and mount immediately at the caption's left edge.
 */
export function mountWindowsMenuBar(options: MenuBarOptions): { dispose(): void } {
  const { document, ipcRenderer } = options
  const existing = document.querySelector(`[${HOST_ATTRIBUTE}]`)
  if (existing) return { dispose: () => existing.remove() }

  const host = document.createElement('div')
  host.setAttribute(HOST_ATTRIBUTE, '')
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `
    :host { position: fixed; top: 0; left: var(--dsh-windows-menu-start, 48px); z-index: 1100;
      height: var(--dsh-windows-titlebar-height, 40px); display: flex; align-items: center;
      font-family: var(--dsw-font-family, "Segoe UI", sans-serif); -webkit-app-region: no-drag; }
    :host([data-standalone]) { left: 12px; }
    [role=menubar] { display: flex; gap: 2px; }
    button { height: 28px; padding: 0 10px; border: 0; border-radius: 6px;
      background: transparent; color: var(--dsw-alias-label-secondary, #5f6368);
      font: inherit; font-size: 14px; cursor: default; }
    button:hover, button[aria-expanded=true] {
      background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, .08));
      color: var(--dsw-alias-label-primary, #202124); }
    button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, #4d6bfe); outline-offset: -2px; }
  `
  const bar = document.createElement('div')
  bar.setAttribute('role', 'menubar')

  // Opening a menu must not take focus from the composer: the edit commands
  // act on whatever editor held it.
  let restoreEditor = (): void => {}
  const rememberEditor = (event: FocusEvent): void => {
    const target = event.composedPath()[0]
    if (!(target instanceof HTMLElement) || target === host || shadow.contains(target)) return
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)
      && !target.matches('[contenteditable="true"]')) return
    const input = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : undefined
    const start = input?.selectionStart
    const end = input?.selectionEnd
    const selection = document.getSelection()
    const ranges = selection === null
      ? []
      : Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    restoreEditor = () => {
      if (!target.isConnected) return
      target.focus({ preventScroll: true })
      if (input !== undefined && start != null && end != null) input.setSelectionRange(start, end)
      else if (selection !== null && ranges.length > 0) {
        selection.removeAllRanges()
        for (const range of ranges) selection.addRange(range)
      }
    }
  }
  document.addEventListener('focusout', rememberEditor, true)

  const buttons: HTMLButtonElement[] = []
  const createButton = (name: MenuName, index: number): HTMLButtonElement => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.menu = name
    button.setAttribute('role', 'menuitem')
    button.setAttribute('aria-haspopup', 'menu')
    button.setAttribute('aria-expanded', 'false')
    button.tabIndex = index === 0 ? 0 : -1
    button.addEventListener('pointerdown', (event) => event.preventDefault())
    button.addEventListener('mousedown', (event) => event.preventDefault())
    const open = async (): Promise<void> => {
      if (button.getAttribute('aria-expanded') === 'true') return
      const rect = button.getBoundingClientRect()
      button.setAttribute('aria-expanded', 'true')
      if (document.activeElement === host) restoreEditor()
      try {
        await ipcRenderer.invoke('desktop-titlebar:popup-menu', name, rect.left, rect.bottom)
      } catch (error) {
        console.error('[desktop-titlebar] caption menu failed', error)
      } finally {
        button.setAttribute('aria-expanded', 'false')
      }
    }
    button.addEventListener('click', () => void open())
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const next = buttons[index === 0 ? 1 : 0]
        if (!next) return
        button.tabIndex = -1
        next.tabIndex = 0
        next.focus()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        void open()
      }
    })
    bar.append(button)
    return button
  }
  buttons.push(createButton('application', 0), createButton('edit', 1))
  shadow.append(style, bar)

  const relabel = (): void => {
    const lang = document.documentElement.lang || navigator.language
    const zh = lang.toLowerCase().startsWith('zh')
    bar.setAttribute('aria-label', zh ? '应用菜单' : 'Application menu')
    const [application, edit] = buttons
    if (application) application.textContent = zh ? '应用' : 'Application'
    if (edit) edit.textContent = zh ? '编辑' : 'Edit'
  }
  relabel()
  const languageObserver = new MutationObserver(relabel)
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })

  const standalone = document.location.protocol === 'file:'
  if (standalone) host.dataset.standalone = ''
  const mount = (): void => {
    if (!document.body) return
    // AppFrame owns this seat on Harness pages; before it renders, the
    // caption row belongs to the loading surface.
    if (!standalone && document.querySelector('[data-shell-overlay]') === null) return
    document.body.append(host)
    mountObserver.disconnect()
  }
  const mountObserver = new MutationObserver(mount)
  mountObserver.observe(document.documentElement, { childList: true, subtree: true })
  mount()

  return {
    dispose: () => {
      mountObserver.disconnect()
      languageObserver.disconnect()
      document.removeEventListener('focusout', rememberEditor, true)
      host.remove()
    }
  }
}
