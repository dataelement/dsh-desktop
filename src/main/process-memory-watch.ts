import { desktopHeapBudget, type ProcessResourceMetric } from './resource-budget'

/** A low-frequency safety check in Electron main, independent of the Harness
 * event loop. No healthy samples are logged or uploaded. This covers Electron
 * processes only; arbitrary external tool descendants are not app metrics. */
export class ProcessMemoryWatch {
  private timer: ReturnType<typeof setInterval> | undefined
  private tripped = false
  constructor(private readonly options: {
    totalBytes: number
    sample: () => readonly ProcessResourceMetric[]
    harnessPid: () => number | undefined
    onLimit: (evidence: string) => void
    onError: (error: unknown) => void
  }) {}

  check(): void {
    if (this.tripped) return
    try {
      const metrics = this.options.sample()
      const budget = desktopHeapBudget(this.options.totalBytes)
      const harness = metrics.find(p => p.pid === this.options.harnessPid())
      const harnessMb = (harness?.memory.workingSetSize ?? 0) / 1024
      const totalMb = metrics.reduce((sum, p) => sum + (p.memory.privateBytes ?? p.memory.workingSetSize) / 1024, 0)
      const appLimitMb = Math.max(768, Math.min(6144, this.options.totalBytes / 1024 ** 2 / 2))
      if (harnessMb <= budget.harnessMb + 512 && totalMb <= appLimitMb) return
      this.tripped = true
      this.dispose()
      this.options.onLimit(`Harness RSS=${Math.round(harnessMb)}MiB limit=${budget.harnessMb + 512}MiB; Electron aggregate=${Math.round(totalMb)}MiB limit=${Math.round(appLimitMb)}MiB`)
    } catch (error) { this.options.onError(error) }
  }

  start(): void {
    if (this.timer || this.tripped) return
    this.timer = setInterval(() => this.check(), 30_000)
    this.timer.unref?.()
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }
}
