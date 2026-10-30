import type { EventEmitter } from 'node:events'
import { emptyGpuExitContext, type GpuExitContext } from './gpu-fallback'

export type ProcessFailureKind = 'window' | 'memory' | 'graphics'
export type ProcessRecoveryAction = 'quit' | 'restart' | 'software'

interface ProcessRecoveryOptions {
  cancelled?: () => boolean
  probe?: () => Promise<boolean>
  note?: (message: string) => void
  stop: () => Promise<void>
  releasePage: () => Promise<void>
  prompt: (kind: ProcessFailureKind) => Promise<ProcessRecoveryAction | undefined>
  restart: (software: boolean) => void
  quit: () => void
  onError: (error: unknown) => void
  now?: () => number
  probeTimeoutMs?: number
}

/** One application-scoped owner for exit evidence, GPU probes and terminal
 * recovery. Navigation retries and GPU fallback policy remain separate; neither
 * owns a native prompt or reads a hidden global registry. */
export class ProcessRecovery {
  private failure: ProcessFailureKind | undefined
  private memoryStop: Promise<void> | undefined
  private readonly lifecycle = emptyGpuExitContext()
  private losses: number[] = []
  private pendingProbe = false
  private disposed = false
  private cancelProbe: (() => void) | undefined
  private unbind: (() => void) | undefined

  constructor(private readonly options: ProcessRecoveryOptions) {}

  get blocked(): boolean { return this.failure !== undefined }
  get exitContext(): GpuExitContext { return { ...this.lifecycle } }
  private get cancelled(): boolean { return this.disposed || Boolean(this.options.cancelled?.()) }

  attach(app: EventEmitter): void {
    if (this.unbind || this.disposed) return
    const windows = new Map<EventEmitter, () => void>()
    const created = (_event: unknown, window: EventEmitter) => {
      const requested = () => { this.lifecycle.sessionEndRequested = true }
      const ending = () => { this.lifecycle.sessionEnding = true }
      const closed = () => { cleanup(); windows.delete(window) }
      const cleanup = () => {
        window.removeListener('query-session-end', requested)
        window.removeListener('session-end', ending)
        window.removeListener('closed', closed)
      }
      window.on('query-session-end', requested)
      window.on('session-end', ending)
      window.once('closed', closed)
      windows.set(window, cleanup)
    }
    const requested = () => { this.lifecycle.quitRequested = true }
    const exited = () => { this.lifecycle.appExiting = true; this.dispose() }
    app.on('browser-window-created', created)
    app.on('before-quit', requested)
    app.on('quit', exited)
    this.unbind = () => {
      app.removeListener('browser-window-created', created)
      app.removeListener('before-quit', requested)
      app.removeListener('quit', exited)
      for (const cleanup of windows.values()) cleanup()
      windows.clear()
    }
  }

  recordGpuLoss(): void {
    if (this.cancelled || this.blocked) return
    const now = (this.options.now ?? Date.now)()
    this.losses = this.losses.filter(t => now - t < 120_000).slice(-2)
    this.losses.push(now)
    if (this.losses.length < 3 || this.pendingProbe) return
    this.pendingProbe = true
    void this.checkGpu().catch(this.options.onError)
  }

  private async checkGpu(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<boolean>(resolve => {
      this.cancelProbe = () => resolve(true)
      timer = setTimeout(() => resolve(false), this.options.probeTimeoutMs ?? 3000)
      timer.unref?.()
    })
    const probe = Promise.resolve().then(() => this.options.probe?.() ?? false).catch(() => false)
    const responsive = await Promise.race([probe, timeout])
    if (timer) clearTimeout(timer)
    this.cancelProbe = undefined
    this.pendingProbe = false
    this.losses = []
    if (this.cancelled || this.blocked) return
    this.options.note?.(`GPU device-loss burst: page-response=${responsive ? 'confirmed' : 'unconfirmed'}`)
    if (!responsive) this.start('graphics')
  }

  start(kind: ProcessFailureKind): void {
    if (this.cancelled) return
    this.cancelProbe?.()
    if (this.blocked) {
      // An existing window/GPU prompt must not mask a subsequent OOM.
      if (kind === 'memory') {
        this.failure = kind
        void this.stopForMemory().catch(this.options.onError)
      }
      return
    }
    this.failure = kind
    void this.recover(kind).catch(this.options.onError).finally(() => {
      // Preserve the existing generic-window prompt lifecycle. OOM/graphics
      // remain terminal until explicit restart, including when the dialog fails.
      if (this.failure === 'window') this.failure = undefined
    })
  }

  private stopForMemory(): Promise<void> {
    this.memoryStop ??= this.options.stop().then(() => this.options.releasePage())
    return this.memoryStop
  }

  private async recover(kind: ProcessFailureKind): Promise<void> {
    if (kind === 'memory') await this.stopForMemory()
    if (this.cancelled) return
    const action = await this.options.prompt(kind)
    if (this.memoryStop) await this.memoryStop
    if (this.cancelled || action === undefined) return
    if (action !== 'quit') this.options.restart(action === 'software')
    if (!this.cancelled) this.options.quit()
  }

  dispose(): void {
    this.disposed = true
    this.cancelProbe?.()
    this.unbind?.()
    this.unbind = undefined
    this.losses = []
  }
}
