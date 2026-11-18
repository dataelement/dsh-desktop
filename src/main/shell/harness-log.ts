import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { dirname } from 'node:path'
import { redactHostOutput } from './backend/host-process'

const RECENT_LINE_LIMIT = 200
/** Stay under the crash-upload line cap after the file timestamp is prepended. */
const DIAGNOSTIC_LINE_LIMIT = 1800

/**
 * Append-only harness.log used by crash upload and the existing log parsers.
 * File lines carry a timestamp. The in-memory copy stays unstamped because
 * recovery matches the original text, including `[stdout] `, `[stderr] ` and
 * `[desktop] starting `.
 */
export class HarnessLog {
  private stream: WriteStream | undefined
  private launchClock: number | undefined
  private readonly recent: string[] = []
  private readonly remainders: { stdout: string, stderr: string } = { stdout: '', stderr: '' }

  constructor(private readonly path: string) {}

  recentLines(): readonly string[] {
    return [...this.recent]
  }

  beginLaunch(reason: string): void {
    this.launchClock = Date.now()
    this.note(`\n[desktop] launch requested (${reason})`)
  }

  note(line: string): void {
    if (line.length === 0) return
    this.writeLine(line)
  }

  /**
   * Append the Host IPC diagnostic. Fatal IPC can arrive before the child
   * closes, so this text is not waiting on stderr.
   */
  noteHostDiagnostic(text: string): void {
    const redacted = redactHostOutput(text)
    if (redacted.trim().length === 0) return
    this.note('[desktop] host diagnostic:')
    for (const raw of redacted.split(/\r?\n/)) {
      if (raw.length === 0) continue
      for (let offset = 0; offset < raw.length; offset += DIAGNOSTIC_LINE_LIMIT) {
        this.note(`[desktop] ${raw.slice(offset, offset + DIAGNOSTIC_LINE_LIMIT)}`)
      }
    }
  }

  writeProcessOutput(source: 'stdout' | 'stderr', chunk: string): void {
    const combined = `${this.remainders[source]}${redactHostOutput(chunk)}`
    const parts = combined.split(/\r?\n/)
    this.remainders[source] = parts.pop() ?? ''
    for (const line of parts) {
      if (line.length === 0) continue
      this.writeLine(`[${source}] ${line}`)
    }
  }

  /** Write a trailing partial line that has not yet ended with a newline. */
  finishProcessOutput(): void {
    for (const source of ['stdout', 'stderr'] as const) {
      const line = this.remainders[source]
      this.remainders[source] = ''
      if (line.length === 0) continue
      this.writeLine(`[${source}] ${line}`)
    }
  }

  /**
   * Wait until the bytes already passed to the stream are handed to the OS.
   * Crash upload reads the file only after this resolves.
   */
  flush(): Promise<void> {
    const stream = this.stream
    if (stream?.errored) return Promise.reject(stream.errored)
    if (!stream || stream.destroyed || stream.writableEnded) return Promise.resolve()
    return new Promise((resolve, reject) => {
      stream.write('', error => { if (error) reject(error); else resolve() })
    })
  }

  private writeLine(line: string): void {
    this.recent.push(line)
    if (this.recent.length > RECENT_LINE_LIMIT) this.recent.splice(0, this.recent.length - RECENT_LINE_LIMIT)
    this.ensureStream()
    this.stream?.write(`${this.stamp(line)}\n`)
  }

  private stamp(line: string): string {
    const elapsed = this.launchClock === undefined ? '' : `+${String(Date.now() - this.launchClock).padStart(5, '0')}ms `
    const prefix = `[${new Date().toISOString()}] ${elapsed}`
    return line.startsWith('\n') ? `\n${prefix}${line.slice(1)}` : `${prefix}${line}`
  }

  private ensureStream(): void {
    if (this.stream) return
    try {
      mkdirSync(dirname(this.path), { recursive: true })
      const stream = createWriteStream(this.path, { flags: 'a' })
      stream.on('error', (error: NodeJS.ErrnoException) => {
        console.warn('[desktop] Harness log write failed:', error.code ?? 'UNKNOWN')
      })
      this.stream = stream
    } catch (error) {
      console.warn('[desktop] Harness log could not be opened', error instanceof Error ? error.name : 'unknown')
    }
  }
}
