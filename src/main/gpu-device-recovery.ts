/** A burst of device-loss exits warrants checking the page, not immediately
 * disabling acceleration. Each launch can offer recovery at most once. */
export class GpuDeviceRecovery {
  private losses: number[] = []
  private pending = false
  private offered = false
  private disposed = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private cancelProbe: (() => void) | undefined

  constructor(private readonly options: {
    probe: () => Promise<boolean>
    recover: () => void
    note: (message: string) => void
    now?: () => number
    timeoutMs?: number
  }) {}

  recordLoss(): void {
    if (this.disposed || this.offered) return
    const now = (this.options.now ?? Date.now)()
    this.losses = this.losses.filter(t => now - t < 120_000).slice(-2)
    this.losses.push(now)
    if (this.losses.length < 3 || this.pending) return
    this.pending = true
    void this.check()
  }

  private async check(): Promise<void> {
    const timeout = new Promise<boolean>(resolve => {
      this.cancelProbe = () => resolve(true)
      this.timer = setTimeout(() => resolve(false), this.options.timeoutMs ?? 3000)
      this.timer.unref?.()
    })
    // Synchronous failures and rejected probes both mean recovery is unconfirmed.
    const probe = Promise.resolve().then(() => this.options.probe()).catch(() => false)
    const responsive = await Promise.race([probe, timeout])
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.cancelProbe = undefined
    this.pending = false
    this.losses = []
    if (this.disposed) return
    this.options.note(`GPU device-loss burst: page-response=${responsive ? 'confirmed' : 'unconfirmed'}`)
    if (!responsive) {
      this.offered = true
      this.options.recover()
    }
  }

  dispose(): void {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    this.cancelProbe?.()
    this.losses = []
  }
}
