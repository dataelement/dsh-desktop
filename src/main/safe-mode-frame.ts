import type { BrowserWindow } from 'electron'

export const SAFE_MODE_FRAME_CHANNEL = 'safe-mode:frame'
export const SAFE_MODE_FRAME_UPDATE_CHANNEL = 'safe-mode:frame-update'

/** A later view model for the page already showing `seq`, applied in place. */
export interface SafeModeFrameUpdate {
  seq: string
  model: unknown
}

/**
 * Keep the Safe Mode page inside the Harness page, over its main pane. The
 * page is an iframe the host page's preload mounts, so it is ordinary pane
 * content: Harness modals such as settings and About stack above it, and the
 * sidebar stays usable beside it. Every `show` reloads the frame, which is
 * how the page picks up a fresh view model.
 */
export class SafeModeFrame {
  private closed = false
  private url: string | undefined
  private update: SafeModeFrameUpdate | undefined

  constructor(
    readonly parent: BrowserWindow,
    private readonly onClose: () => void
  ) {
    parent.once('closed', this.close)
    // The host page may still be loading when the frame is first requested,
    // and a Harness restart reloads it; the frame comes back with the page.
    parent.webContents.on('did-finish-load', this.resend)
  }

  isDestroyed(): boolean { return this.closed || this.parent.isDestroyed() }

  show(url: string): void {
    if (this.isDestroyed()) return
    this.url = url
    this.update = undefined
    this.send()
  }

  /** Refresh the page in place, keeping what the user is in the middle of. */
  applyUpdate(update: SafeModeFrameUpdate): void {
    if (this.isDestroyed() || !this.url) return
    this.update = update
    this.sendUpdate()
  }

  private readonly resend = (): void => {
    if (!this.url) return
    this.send()
    this.sendUpdate()
  }

  private send(): void {
    const host = this.parent.webContents
    if (!host.isDestroyed()) host.send(SAFE_MODE_FRAME_CHANNEL, this.url ?? null)
  }

  private sendUpdate(): void {
    const host = this.parent.webContents
    if (this.update && !host.isDestroyed()) host.send(SAFE_MODE_FRAME_UPDATE_CHANNEL, this.update)
  }

  readonly close = (): void => {
    if (this.closed) return
    this.closed = true
    this.url = undefined
    this.update = undefined
    this.parent.removeListener('closed', this.close)
    if (!this.parent.isDestroyed()) {
      this.parent.webContents.removeListener('did-finish-load', this.resend)
      this.send()
    }
    this.onClose()
  }
}
