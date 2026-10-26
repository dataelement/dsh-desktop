const MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS = 5_000
const MAIN_WINDOW_RECOVERY_MAX_RELOADS = 3

export interface RendererLoss {
  reason: string
  exitCode: number
}
export interface RendererRecoveryDiagnostic {
  phase: 'load-started' | 'load-failed' | 'retry-scheduled' | 'load-completed' | 'budget-reset' | 'exhausted'
  reloadCount: number
  navigationId: number
  loadId: number
  elapsedMs: number
  rendererLoss?: RendererLoss
  code?: string | number
}

interface RecoveryOptions {
  load: (url: string, cancelled: () => boolean) => Promise<void>
  cancelled: () => boolean
  onError: (error: unknown) => void
  onDiagnostic?: (diagnostic: RendererRecoveryDiagnostic) => void
  cooldownMs?: number
  timeoutMs?: number
  healthyMs?: number
}
interface Operation {
  id: number
  startedAt: number
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
  private navigationSequence = 0
  private loadSequence = 0
  private lastRendererLoss: RendererLoss | undefined
  private healthyTimer: ReturnType<typeof setTimeout> | undefined
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(private readonly options: RecoveryOptions) {}

  private diagnose(phase: RendererRecoveryDiagnostic['phase'], code?: string | number): void {
    // Diagnostics must never take ownership away from navigation/recovery.
    try {
      this.options.onDiagnostic?.({
        phase, reloadCount: this.attempts, navigationId: this.operation?.id ?? 0,
        loadId: this.loadSequence, elapsedMs: Math.max(0, Date.now() - (this.operation?.startedAt ?? Date.now())),
        rendererLoss: this.lastRendererLoss, code
      })
    } catch (error) {
      console.warn('[desktop] renderer recovery diagnostic failed', error)
    }
  }

  private exhausted(): Error {
    this.diagnose('exhausted')
    const loss = this.lastRendererLoss
    return loss
      ? new Error(
        'The renderer failed to load after bounded recovery attempts. Last renderer loss: reason=' + loss.reason + ' exitCode=' + loss.exitCode + '.',
        { cause: { ...loss } }
      )
      : rendererError()
  }

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
      timer = setTimeout(() => { active = false; reject(Object.assign(lossError(), { code: 'RENDERER_LOAD_TIMEOUT' })) }, timeoutMs)
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
    this.loadSequence += 1
    this.diagnose('load-started')
    const result = await this.bounded(operation,
      (cancelled) => this.options.load(operation.url, cancelled).then(() => true),
      this.options.timeoutMs ?? 30_000)
    return result !== false
  }

  private async backoff(operation: Operation): Promise<boolean> {
    if (this.attempts >= MAIN_WINDOW_RECOVERY_MAX_RELOADS) throw this.exhausted()
    this.diagnose('retry-scheduled')
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
    if (!replacement) this.lastRendererLoss = undefined
    const operation: Operation = {
      id: ++this.navigationSequence, startedAt: Date.now(), url,
      cancelled: false, pending: true, superseded, cancel: () => {}
    }
    this.operation = operation
    try {
      if (replacement && !await this.backoff(operation)) return false
      while (!this.inactive(operation)) {
        try {
          const loaded = await this.load(operation)
          if (!loaded || this.inactive(operation)) return false
          operation.pending = false
          this.diagnose('load-completed')
          this.healthyTimer = setTimeout(() => {
            this.healthyTimer = undefined
            this.attempts = 0
            this.lastRendererLoss = undefined
            this.diagnose('budget-reset')
          }, this.options.healthyMs ?? MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS * 4)
          this.healthyTimer.unref?.()
          return true
        } catch (error) {
          if (this.inactive(operation)) return false
          const code = error instanceof Error && 'code' in error &&
            (typeof error.code === 'string' || typeof error.code === 'number') ? error.code : undefined
          this.diagnose('load-failed', code)
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

  rendererGone(currentUrl?: string, loss?: RendererLoss): void {
    const operation = this.operation
    if (!operation || this.inactive(operation)) return
    if (loss) this.lastRendererLoss = { ...loss }
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
