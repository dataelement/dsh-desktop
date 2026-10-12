import { Notification } from 'electron'

/** One notice the renderer asked for after observing Harness session state. */
export interface TurnNotificationRequest {
  title: string
  body: string
  sound: boolean
  unfocusedOnly: boolean
}

/** Native presentation seam, replaceable so tests never reach a real notification centre. */
export interface TurnNotificationPlatform {
  supported(): boolean
  show(options: { title: string; body: string; silent: boolean }): TurnNotificationHandle
}

/** One presented native notice. */
export interface TurnNotificationHandle {
  close(): void
  /** Subscribe to a user click; the returned disposer releases the listener. */
  onClick(listener: () => void): () => void
}

export interface DesktopTurnNotificationOptions {
  /** Whether the conversation window still holds the user's attention. */
  isFocused: () => boolean
  /** Bring the application back after a click. */
  activate: () => void
  /** Shell dictionary used when the renderer sends no usable copy. */
  locale: () => 'en' | 'zh'
  platform?: TurnNotificationPlatform
  /** Diagnostics sink; a failed notice must never take the main process down. */
  warn?: (line: string) => void
}

/** Copy boundaries: renderer strings are presentation input, never identifiers. */
const MAX_COPY_LENGTH = 200

const FALLBACK_COPY = {
  en: { title: 'DSH Desktop', body: 'The turn is complete.' },
  zh: { title: 'DSH Desktop', body: '轮次已完成。' }
} as const

class SystemTurnNotificationPlatform implements TurnNotificationPlatform {
  supported(): boolean {
    try {
      return Notification.isSupported()
    } catch {
      return false
    }
  }

  show(options: { title: string; body: string; silent: boolean }): TurnNotificationHandle {
    const notification = new Notification(options)
    notification.show()
    return {
      close: () => {
        notification.removeAllListeners()
        notification.close()
      },
      onClick: (listener) => {
        notification.once('click', listener)
        return () => notification.removeAllListeners('click')
      }
    }
  }
}

function acceptCopy(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const text = value.trim()
  if (text.length === 0 || text.length > MAX_COPY_LENGTH) return fallback
  return text
}

/**
 * Completed-turn attention for a window the user is not looking at.
 *
 * The renderer observes Harness sessions and deciding modes, but only this
 * process knows whether the window is focused and owns the notification
 * centre, so every request is re-validated here: copy is bounded, the payload
 * never carries a window, path, or command, and a background-only notice is
 * suppressed while the user is already looking at the conversation.
 */
export class DesktopTurnNotification {
  private readonly platform: TurnNotificationPlatform
  private readonly warn: (line: string) => void
  private current: TurnNotificationHandle | undefined
  private release: (() => void) | undefined

  constructor(private readonly options: DesktopTurnNotificationOptions) {
    this.platform = options.platform ?? new SystemTurnNotificationPlatform()
    this.warn = options.warn ?? ((line) => console.warn(line))
  }

  /**
   * Present one notice when the request is background news for this window.
   * @param payload - renderer payload, treated as untrusted input.
   * @returns whether a native notice was presented.
   */
  present(payload: unknown): { ok: boolean } {
    const parsed = this.parse(payload)
    if (!parsed) return { ok: false }
    if (parsed.unfocusedOnly && this.options.isFocused()) return { ok: false }
    try {
      if (!this.platform.supported()) return { ok: false }
      this.clear()
      const handle = this.platform.show({
        title: parsed.title,
        body: parsed.body,
        silent: !parsed.sound
      })
      this.current = handle
      this.release = handle.onClick(() => this.invoke(handle))
      return { ok: true }
    } catch (error) {
      this.warn(`[desktop] turn notification failed: ${describeError(error)}`)
      return { ok: false }
    }
  }

  /** Release the presented notice and its listener without presenting another. */
  clear(): void {
    const handle = this.current
    this.current = undefined
    const release = this.release
    this.release = undefined
    try {
      release?.()
    } catch (error) {
      this.warn(`[desktop] turn notification listener release failed: ${describeError(error)}`)
    }
    try {
      handle?.close()
    } catch (error) {
      this.warn(`[desktop] turn notification close failed: ${describeError(error)}`)
    }
  }

  /** Activate the application for a click on the notice still presented. */
  private invoke(handle: TurnNotificationHandle): void {
    if (this.current !== handle) return
    this.clear()
    this.options.activate()
  }

  private parse(payload: unknown): TurnNotificationRequest | undefined {
    if (typeof payload !== 'object' || payload === null) return undefined
    const source = payload as Record<string, unknown>
    const fallback = FALLBACK_COPY[this.options.locale()]
    return {
      title: acceptCopy(source.title, fallback.title),
      body: acceptCopy(source.body, fallback.body),
      sound: source.sound === true,
      unfocusedOnly: source.unfocusedOnly !== false
    }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
