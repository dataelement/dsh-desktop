/**
 * The set of DSH Desktop windows that may drive privileged IPC.
 *
 * The desktop used to keep a single `mainWindow` reference and compare every
 * IPC sender against it, so a second Harness window could only ever be a
 * stranger that every privileged handler rejected. Membership replaces that
 * identity check, which is what makes several windows possible without
 * widening what a renderer may ask for: a frame is trusted because this
 * process created and hardened the window it belongs to, never because of
 * anything the renderer sent.
 */

/** The part of a window this registry reasons about, kept narrow for testing. */
export interface AppWindowHandle {
  readonly id: number
  readonly webContents: {
    readonly id: number
    readonly mainFrame: object
  }
  isDestroyed(): boolean
}

/** The part of an IPC event this registry reasons about. */
export interface AppWindowFrameEvent {
  readonly sender: unknown
  readonly senderFrame: unknown
}

export interface AppWindowRegistryOptions<T extends AppWindowHandle> {
  /** Notified whenever the window `primaryWindow()` reports changes. */
  onPrimaryChange?: (window: T | undefined) => void
}

export class AppWindowRegistry<T extends AppWindowHandle> {
  private readonly entries = new Map<number, T>()
  private readonly onPrimaryChange: ((window: T | undefined) => void) | undefined
  private primaryId: number | undefined

  constructor(options: AppWindowRegistryOptions<T> = {}) {
    this.onPrimaryChange = options.onPrimaryChange
  }

  /** Windows still registered. Destroyed ones leave through `unregister`. */
  get size(): number {
    return this.entries.size
  }

  register(window: T, options: { primary?: boolean } = {}): void {
    this.entries.set(window.id, window)
    if (!options.primary && this.primaryId !== undefined && this.entries.has(this.primaryId)) return
    this.setPrimary(window.id)
  }

  unregister(window: T): void {
    this.entries.delete(window.id)
    if (this.primaryId !== window.id) return
    // The tray icon, `activate` and the About dialog all act on "the app
    // window", so a closed primary hands that role to a survivor instead of
    // leaving the app running with no window the user can reach.
    this.setPrimary([...this.entries.values()].at(-1)?.id)
  }

  primaryWindow(): T | undefined {
    return this.primaryId === undefined ? undefined : this.entries.get(this.primaryId)
  }

  isPrimary(window: T): boolean {
    return this.primaryId === window.id
  }

  all(): T[] {
    return [...this.entries.values()]
  }

  findWindowById(id: number): T | undefined {
    const window = this.entries.get(id)
    return window && !window.isDestroyed() ? window : undefined
  }

  findWindowBySender(sender: unknown): T | undefined {
    for (const window of this.entries.values()) {
      if (window.isDestroyed()) continue
      if (window.webContents === sender) return window
    }
    return undefined
  }

  /**
   * Whether an IPC event comes from the main frame of a window this process
   * created. Sub-frames and windows the desktop did not build stay rejected.
   */
  isTrustedFrameEvent(event: AppWindowFrameEvent): boolean {
    const window = this.findWindowBySender(event.sender)
    return window !== undefined && event.senderFrame === window.webContents.mainFrame
  }

  /**
   * Whether an event comes from the current primary main frame. This narrower
   * boundary protects operations that commit app-wide boot or migration state.
   */
  isPrimaryFrameEvent(event: AppWindowFrameEvent): boolean {
    const window = this.primaryWindow()
    return !!window && !window.isDestroyed() &&
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame
  }

  private setPrimary(id: number | undefined): void {
    if (this.primaryId === id) return
    this.primaryId = id
    this.onPrimaryChange?.(this.primaryWindow())
  }
}
