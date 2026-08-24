import type { UpdateStatus } from '../shared/contracts'
import { updateAction, updateMessage, type UpdateLocale } from './update-view'

const BUTTON_ID = 'sherlock-sidebar-update-button'
const PANEL_ID = 'sherlock-sidebar-update-panel'
const STYLE_ID = 'sherlock-sidebar-update-style'
const FOOTER_SELECTOR = '[data-dsh-sidebar-footer]'
const SETTINGS_SLOT_SELECTOR =
  '[data-dsh-sidebar-root] [data-slot="sidebar.settings"]'
const UPDATE_FOOTER_ATTRIBUTE = 'data-sherlock-update-footer'

export interface SidebarUpdateCallbacks {
  download(): void | Promise<unknown>
  install(): void | Promise<unknown>
  retry(): void | Promise<unknown>
}

export class SidebarUpdateControl {
  private button?: HTMLButtonElement
  private panel?: HTMLElement
  private status?: UpdateStatus

  constructor(
    private readonly document: Document,
    private readonly locale: UpdateLocale,
    private readonly callbacks: SidebarUpdateCallbacks
  ) {}

  mount(): boolean {
    const footer = this.resolveFooter()
    if (!footer) return false

    if (this.button?.isConnected && this.button.parentElement === footer) return true

    this.button?.remove()
    this.panel?.remove()
    this.ensureStyles()

    const button = this.document.createElement('button')
    button.id = BUTTON_ID
    button.type = 'button'
    button.className = 'sherlock-sidebar-update-button'
    button.hidden = true
    button.addEventListener('click', () => this.activate())

    const panel = this.document.createElement('aside')
    panel.id = PANEL_ID
    panel.className = 'sherlock-sidebar-update-panel'
    panel.hidden = true
    panel.setAttribute('aria-live', 'polite')

    footer.append(panel, button)
    this.button = button
    this.panel = panel

    if (this.status) this.render(this.status)
    return true
  }

  private resolveFooter(): HTMLElement | null {
    const explicitFooter = this.document.querySelector<HTMLElement>(FOOTER_SELECTOR)
    if (explicitFooter) {
      explicitFooter.setAttribute(UPDATE_FOOTER_ATTRIBUTE, '')
      return explicitFooter
    }

    const settingsSlot = this.document.querySelector<HTMLElement>(
      SETTINGS_SLOT_SELECTOR
    )
    const settingsArea = settingsSlot?.parentElement
    if (!settingsArea) return null

    settingsArea.setAttribute(UPDATE_FOOTER_ATTRIBUTE, '')
    return settingsArea
  }

  render(status: UpdateStatus): void {
    this.status = status
    if (!this.mount() || !this.button || !this.panel) return

    const action = updateAction(status)
    const button = this.button
    const panel = this.panel

    button.hidden = action.kind === 'hidden'
    button.disabled = false
    button.dataset.action = action.kind
    button.removeAttribute('role')
    button.removeAttribute('aria-valuemin')
    button.removeAttribute('aria-valuemax')
    button.removeAttribute('aria-valuenow')
    button.style.removeProperty('--sherlock-update-progress')
    panel.hidden = true
    panel.replaceChildren()

    switch (action.kind) {
      case 'hidden':
        button.removeAttribute('aria-label')
        button.replaceChildren()
        return
      case 'download':
        button.dataset.action = 'download'
        button.setAttribute(
          'aria-label',
          this.locale === 'zh'
            ? `下载 Sherlock ${action.version} 更新`
            : `Download Sherlock ${action.version} update`
        )
        button.innerHTML = downloadIcon
        return
      case 'progress': {
        const percent = Math.max(0, Math.min(100, Math.round(action.percent)))
        button.dataset.action = 'progress'
        button.disabled = true
        button.setAttribute('role', 'progressbar')
        button.setAttribute('aria-valuemin', '0')
        button.setAttribute('aria-valuemax', '100')
        button.setAttribute('aria-valuenow', String(percent))
        button.setAttribute(
          'aria-label',
          this.locale === 'zh' ? `正在下载更新 ${percent}%` : `Downloading update ${percent}%`
        )
        button.style.setProperty('--sherlock-update-progress', `${percent * 3.6}deg`)
        button.innerHTML = progressIcon
        return
      }
      case 'install':
        button.dataset.action = 'install'
        button.setAttribute(
          'aria-label',
          this.locale === 'zh'
            ? `安装 Sherlock ${action.version} 更新`
            : `Install Sherlock ${action.version} update`
        )
        button.innerHTML = downloadIcon
        this.renderInstallPanel(status)
        return
      case 'retry':
        button.dataset.action = 'retry'
        button.setAttribute(
          'aria-label',
          this.locale === 'zh' ? '重新检查 Sherlock 更新' : 'Check for Sherlock updates again'
        )
        button.innerHTML = retryIcon
        return
    }
  }

  private activate(): void {
    const action = this.button?.dataset.action
    if (action === 'download') {
      this.invoke(this.callbacks.download)
    } else if (action === 'install') {
      if (this.panel) this.panel.hidden = !this.panel.hidden
    } else if (action === 'retry') {
      this.invoke(this.callbacks.retry)
    }
  }

  private renderInstallPanel(status: UpdateStatus): void {
    if (!this.panel) return

    const message = this.document.createElement('p')
    message.className = 'sherlock-sidebar-update-message'
    message.textContent = updateMessage(status, this.locale)

    const actions = this.document.createElement('div')
    actions.className = 'sherlock-sidebar-update-actions'

    const confirm = this.document.createElement('button')
    confirm.type = 'button'
    confirm.dataset.updateConfirm = 'true'
    confirm.textContent = this.locale === 'zh' ? '重新启动并安装' : 'Restart and install'
    confirm.addEventListener('click', () => {
      confirm.disabled = true
      confirm.textContent = this.locale === 'zh' ? '正在重启…' : 'Restarting…'
      this.invoke(this.callbacks.install)
    })

    const later = this.document.createElement('button')
    later.type = 'button'
    later.dataset.updateLater = 'true'
    later.textContent = this.locale === 'zh' ? '稍后' : 'Later'
    later.addEventListener('click', () => {
      if (this.panel) this.panel.hidden = true
    })

    actions.append(confirm, later)
    this.panel.append(message, actions)
  }

  private invoke(callback: () => void | Promise<unknown>): void {
    try {
      void Promise.resolve(callback()).catch((error: unknown) => {
        console.error('[updater] sidebar update action failed', error)
      })
    } catch (error) {
      console.error('[updater] sidebar update action failed', error)
    }
  }

  private ensureStyles(): void {
    if (this.document.getElementById(STYLE_ID)) return
    const style = this.document.createElement('style')
    style.id = STYLE_ID
    style.textContent = styles
    ;(this.document.head || this.document.documentElement).appendChild(style)
  }
}

const downloadIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
  </svg>`

const progressIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 7v10M7 12h10" />
  </svg>`

const retryIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 8a8 8 0 1 0 .5 7M19 4v4h-4" />
  </svg>`

const styles = `
  #${BUTTON_ID}[hidden], #${PANEL_ID}[hidden] { display: none !important; }
  [${UPDATE_FOOTER_ATTRIBUTE}] {
    display: flex !important;
    align-items: center;
    position: relative;
  }
  #${BUTTON_ID} {
    appearance: none;
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 999px;
    color: #fff;
    background: #1677ff;
    box-shadow: none;
    cursor: pointer;
    transition: transform 150ms ease, background-color 150ms ease;
  }
  #${BUTTON_ID}:hover:not(:disabled) {
    transform: translateY(calc(-50% - 1px));
    background: #0f6fe8;
  }
  #${BUTTON_ID}:active:not(:disabled) { transform: translateY(-50%) scale(.96); }
  #${BUTTON_ID}:focus-visible { outline: 2px solid #69a7ff; outline-offset: 2px; }
  #${BUTTON_ID}:disabled { cursor: default; }
  #${BUTTON_ID}[data-action="progress"] {
    background: conic-gradient(#fff var(--sherlock-update-progress, 0deg), rgba(255,255,255,.25) 0), #1677ff;
    border: 3px solid #1677ff;
  }
  #${BUTTON_ID} svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  #${BUTTON_ID}[data-action="progress"] svg {
    width: 14px;
    height: 14px;
    padding: 3px;
    border-radius: 999px;
    background: #1677ff;
  }
  #${PANEL_ID} {
    box-sizing: border-box;
    position: absolute;
    right: 0;
    bottom: 48px;
    z-index: 2147483646;
    width: 260px;
    padding: 13px;
    color: var(--dsw-alias-label-primary, #f3f4f6);
    background: var(--dsw-alias-bg-layer-2, rgba(38, 38, 41, .98));
    border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, .14));
    border-radius: 12px;
    box-shadow: 0 14px 34px rgba(0, 0, 0, .3);
    font: 500 13px/19px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .sherlock-sidebar-update-message { margin: 0; }
  .sherlock-sidebar-update-actions { display: flex; gap: 8px; margin-top: 11px; }
  .sherlock-sidebar-update-actions button {
    appearance: none;
    min-height: 30px;
    padding: 5px 10px;
    border: 0;
    border-radius: 8px;
    font: 600 12px/18px inherit;
    cursor: pointer;
  }
  .sherlock-sidebar-update-actions [data-update-confirm] { color: #fff; background: #1677ff; }
  .sherlock-sidebar-update-actions [data-update-later] {
    color: inherit;
    background: rgba(127, 127, 127, .15);
  }
  @media (prefers-reduced-motion: reduce) {
    #${BUTTON_ID} { transition: none; }
  }
`
