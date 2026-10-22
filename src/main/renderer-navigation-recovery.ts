import { MAIN_WINDOW_RECOVERY_MAX_RELOADS, MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS } from './main-window-recovery'

interface RecoveryOptions {
  load: (url: string, cancelled: () => boolean) => Promise<void>
  cancelled: () => boolean
  onError: (error: unknown) => void
  cooldownMs?: number
  timeoutMs?: number
  healthyMs?: number
}
interface Operation {
  url: string
  cancelled: boolean
  pending: boolean
  superseded: () => boolean
  fail?: (error: Error) => void
  cancel: () => void
}

function rendererError(): Error {
  return new Error('The renderer failed to load after bounded recovery attempts.')
}
function retryable(error: unknown): boolean {
  return error instanceof Error && ('rendererFailure' in error ||
    ('code' in error && (error.code === 'ERR_FAILED' || error.code === -2)))
}
function lossError(): Error {
  return Object.assign(rendererError(), { rendererFailure: true })
}

/** Owns replacement loads, not just notifications about the same failed renderer. */
export class RendererNavigationRecovery {
  private operation: Operation | undefined
  private disposed = false
  private attempts = 0
  private healthyTimer: ReturnType<typeof setTimeout> | undefined
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(private readonly options: RecoveryOptions) {}

  private clearHealthy(): void {
    if (this.healthyTimer !== undefined) clearTimeout(this.healthyTimer)
    this.healthyTimer = undefined
  }

  private inactive(operation: Operation): boolean {
    return this.disposed || operation.cancelled || operation.superseded() || this.options.cancelled()
  }

  private async bounded<T>(operation: Operation, action: (cancelled: () => boolean) => Promise<T>, timeoutMs: number, signal = true): Promise<T | false> {
    let timer: ReturnType<typeof setTimeout> | undefined
    let active = true
    const interrupted = new Promise<false>((resolve, reject) => {
      operation.cancel = () => { active = false; operation.cancelled = true; resolve(false) }
      operation.fail = signal ? (error) => { active = false; reject(error) } : undefined
      timer = setTimeout(() => { active = false; reject(lossError()) }, timeoutMs)
      this.timers.add(timer)
    })
    try {
      return await Promise.race([action(() => !active || this.inactive(operation)), interrupted])
    } finally {
      active = false
      operation.fail = undefined
      if (timer !== undefined) { clearTimeout(timer); this.timers.delete(timer) }
    }
  }

  private async load(operation: Operation): Promise<boolean> {
    const result = await this.bounded(operation,
      (cancelled) => this.options.load(operation.url, cancelled).then(() => true),
      this.options.timeoutMs ?? 30_000)
    return result !== false
  }

  private async backoff(operation: Operation): Promise<boolean> {
    if (this.attempts >= MAIN_WINDOW_RECOVERY_MAX_RELOADS) throw rendererError()
    const delay = this.options.cooldownMs ?? MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const ready = await this.bounded(operation, () => new Promise<true>(resolve => {
        timer = setTimeout(() => resolve(true), delay)
        this.timers.add(timer)
      }), delay + 1_000, false)
      if (!ready || this.inactive(operation)) return false
      this.attempts += 1
      return true
    } finally {
      if (timer !== undefined) { clearTimeout(timer); this.timers.delete(timer) }
    }
  }

  async navigate(url: string, replacement = false, superseded: () => boolean = () => false): Promise<boolean> {
    this.operation?.cancel()
    this.clearHealthy()
    const operation: Operation = { url, cancelled: false, pending: true, superseded, cancel: () => {} }
    this.operation = operation
    try {
      if (replacement && !await this.backoff(operation)) return false
      while (!this.inactive(operation)) {
        try {
          const loaded = await this.load(operation)
          if (!loaded || this.inactive(operation)) return false
          operation.pending = false
          this.healthyTimer = setTimeout(() => {
            this.healthyTimer = undefined
            this.attempts = 0
          }, this.options.healthyMs ?? MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS * 4)
          this.healthyTimer.unref?.()
          return true
        } catch (error) {
          if (this.inactive(operation)) return false
          if (!retryable(error)) throw error
          // A paired load/gone event belongs to the failed attempt during backoff.
          if (!await this.backoff(operation)) return false
        }
      }
      return false
    } catch (error) {
      operation.cancelled = true
      throw error
    } finally {
      operation.pending = false
    }
  }

  rendererGone(currentUrl?: string): void {
    const operation = this.operation
    if (!operation || this.inactive(operation)) return
    this.clearHealthy()
    if (operation.pending) {
      operation.fail?.(lossError())
    } else {
      const result = this.navigate(currentUrl || operation.url, true, operation.superseded)
      const reportingOperation = this.operation
      void result.catch(error => {
        // The failed operation is cancelled internally; identity still distinguishes it
        // from a newer navigation without reporting errors after close or supersession.
        if (this.disposed || this.operation !== reportingOperation ||
          this.options.cancelled() || operation.superseded()) return
        this.options.onError(error)
      })
    }
  }

  loadFailed(url: string, code: number, currentUrl?: string): void {
    const operation = this.operation
    if (!operation || code !== -2) return
    // Pending loads belong to the requested URL, not the previous committed URL.
    // After load completion, client routing or redirects can change that URL.
    const expectedUrl = operation.pending ? operation.url : (currentUrl || operation.url)
    if (url !== expectedUrl) return
    this.rendererGone(currentUrl)
  }

  get reloadCount(): number { return this.attempts }

  dispose(): void {
    this.disposed = true
    this.operation?.cancel()
    this.clearHealthy()
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
  }
}
