import { WebContentsView, type BrowserWindow, type WebContents } from 'electron'
import { secureWindow } from './security'

/** Keep the recovery dialog inside the host window, including its full backdrop. */
export class SafeModeOverlay {
  readonly view: WebContentsView
  readonly webContents: WebContents
  private closed = false

  constructor(
    readonly parent: BrowserWindow,
    preload: string,
    private readonly onClose: () => void
  ) {
    this.view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload,
        sandbox: true,
        webSecurity: true
      }
    })
    this.webContents = this.view.webContents
    this.view.setBackgroundColor('#00000000')
    this.view.setVisible(false)
    secureWindow(this.view, () => undefined)
    parent.contentView.addChildView(this.view)
    parent.on('resize', this.syncBounds)
    parent.on('enter-full-screen', this.syncBounds)
    parent.on('leave-full-screen', this.syncBounds)
    parent.once('closed', this.close)
    parent.webContents.on('focus', this.focus)
    this.syncBounds()
  }

  isDestroyed(): boolean { return this.closed || this.webContents.isDestroyed() }

  private readonly syncBounds = (): void => {
    if (this.parent.isDestroyed() || this.isDestroyed()) return
    const { width, height } = this.parent.getContentBounds()
    this.view.setBounds({ x: 0, y: 0, width, height })
  }

  private readonly focus = (): void => {
    if (!this.isDestroyed() && this.view.getVisible()) this.webContents.focus()
  }

  show(): void {
    this.syncBounds()
    this.view.setVisible(true)
    this.focus()
  }

  readonly close = (): void => {
    if (this.closed) return
    this.closed = true
    this.parent.removeListener('resize', this.syncBounds)
    this.parent.removeListener('enter-full-screen', this.syncBounds)
    this.parent.removeListener('leave-full-screen', this.syncBounds)
    this.parent.removeListener('closed', this.close)
    if (!this.parent.isDestroyed()) {
      this.parent.webContents.removeListener('focus', this.focus)
      this.parent.contentView.removeChildView(this.view)
    }
    if (!this.webContents.isDestroyed()) this.webContents.close()
    if (!this.parent.isDestroyed() && this.parent.isFocused()) this.parent.webContents.focus()
    this.onClose()
  }
}
