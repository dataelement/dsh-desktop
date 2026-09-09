import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'

/** Local, structured timings. Never record environment values, URLs or error messages. */
export class StartupTrace {
  readonly id = randomUUID()
  private readonly started = performance.now()

  constructor(private readonly write: (line: string) => void, details: Record<string, string> = {}) {
    this.mark('launch', 'begin', { ...details, processUptimeMs: Math.round(process.uptime() * 1000) })
  }

  mark(stage: string, status = 'done', details: Record<string, string | number | boolean> = {}): void {
    this.write(`[startup-timing] ${JSON.stringify({ ...details, scope: 'desktop', run: this.id, pid: process.pid,
      at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - this.started), stage, status })}`)
  }

  async measure<T>(stage: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now()
    this.mark(stage, 'begin')
    try {
      const value = await task()
      this.mark(stage, 'done', { durationMs: Math.round(performance.now() - start) })
      return value
    } catch (error) {
      this.mark(stage, 'failed', { durationMs: Math.round(performance.now() - start) })
      throw error
    }
  }

  measureSync<T>(stage: string, task: () => T, details: Record<string, boolean> = {}): T {
    const start = performance.now()
    this.mark(stage, 'begin', details)
    try {
      const value = task()
      this.mark(stage, 'done', { ...details, durationMs: Math.round(performance.now() - start) })
      return value
    } catch (error) {
      this.mark(stage, 'failed', { durationMs: Math.round(performance.now() - start) })
      throw error
    }
  }
}
