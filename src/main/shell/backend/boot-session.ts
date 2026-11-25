/** One Host generation's boot data. The page only receives the generation that is still ready. */
export interface DesktopBootReady {
  readonly url: string
  readonly injections: readonly unknown[]
  readonly cookie: string
}

export interface DesktopBootPayload {
  readonly injections: readonly unknown[]
  readonly streamBaseUrl: string
}

export interface DesktopBootDocument {
  readonly frontendRoot: string
  readonly hostUrl?: string
  readonly cookie?: string
}

/**
 * Boot injections and the Host cookie for the current start.
 * Leaving ready drops both, and a publish from an older start cannot put them back.
 */
export class DesktopBootSession {
  private generation = 0
  private published: DesktopBootReady | undefined
  private attempt: Promise<void> = Promise.resolve()

  /** Drop the published generation. A later publish must use the returned generation. */
  suspend(): number {
    this.generation += 1
    this.published = undefined
    return this.generation
  }

  /** Generation captured at the start of the current Host attempt. */
  capture(): number {
    return this.generation
  }

  publish(generation: number, ready: DesktopBootReady): void {
    if (generation !== this.generation) return
    this.published = ready
  }

  get ready(): DesktopBootReady | undefined {
    return this.published
  }

  /** Follow this start. A replacement Host must replace the previous attempt. */
  track(attempt: Promise<void>): void {
    this.attempt = attempt
  }

  async readBoot(): Promise<DesktopBootPayload> {
    await this.attempt
    const ready = this.published
    if (ready === undefined) throw new Error('Desktop Host is unavailable')
    return {
      injections: ready.injections,
      streamBaseUrl: new URL(ready.url).origin
    }
  }

  documentTarget(frontendRoot: string): DesktopBootDocument {
    const ready = this.published
    if (ready === undefined || ready.cookie.length === 0) return { frontendRoot }
    return { frontendRoot, hostUrl: ready.url, cookie: ready.cookie }
  }
}

/** Clear the boot generation whenever the backend is not ready. */
export function retainDesktopBoot(session: DesktopBootSession, phase: 'starting' | 'ready' | 'error'): void {
  if (phase !== 'ready') session.suspend()
}
