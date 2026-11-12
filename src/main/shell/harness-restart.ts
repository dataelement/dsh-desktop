/** Application document used when the page open during restart is not the desktop app. */
export const HARNESS_APP_URL = 'dsh-app://app/'

/**
 * Keep the desktop application address, including its path, query, and hash.
 * Any other origin falls back to the application root.
 */
export function harnessResumeUrl(currentUrl: string): string {
  try {
    const url = new URL(currentUrl)
    if (
      url.protocol !== 'dsh-app:'
      || url.hostname !== 'app'
      || url.port !== ''
      || url.username !== ''
      || url.password !== ''
    ) return HARNESS_APP_URL
    return url.href
  } catch {
    return HARNESS_APP_URL
  }
}

export interface HarnessRestartSession {
  readonly id: number
  readonly resumeUrl: string
}

/**
 * One accepted harness restart. A later request cannot replace the resume URL
 * until this session ends.
 */
export class HarnessRestartSessions {
  private open: HarnessRestartSession | undefined
  private nextId = 1

  begin(currentUrl: string): HarnessRestartSession | undefined {
    if (this.open !== undefined) return undefined
    const session: HarnessRestartSession = {
      id: this.nextId,
      resumeUrl: harnessResumeUrl(currentUrl)
    }
    this.nextId += 1
    this.open = session
    return session
  }

  current(): HarnessRestartSession | undefined {
    return this.open
  }

  isCurrent(id: number): boolean {
    return this.open?.id === id
  }

  resumeUrl(id: number): string | undefined {
    return this.open?.id === id ? this.open.resumeUrl : undefined
  }

  end(id: number): void {
    if (this.open?.id === id) this.open = undefined
  }
}

export interface HarnessRestartSteps {
  sessionId: number
  isCurrent: (sessionId: number) => boolean
  end: (sessionId: number) => void
  /** Quit, or the window is already gone. */
  cancelled: () => boolean
  /** Process recovery already owns the window, so this restart must not navigate. */
  blocked: () => boolean
  /** Local waiting page. A false result is an ordinary load failure and the restart continues. */
  showWaiting: () => Promise<boolean>
  stop: () => Promise<void>
  start: () => Promise<void>
  /** Load the saved application document for this session. */
  resume: (sessionId: number) => Promise<boolean>
  recoverDocument: () => void
  reportStopFailure: (error: unknown) => Promise<void>
}

/**
 * Show the waiting page before stopping the old host, then start the new one.
 * Start failure leaves the session open for the existing host-failure queue.
 * Stop failure ends the session and reports a visible error.
 * @returns true only when the host is ready and the application document loaded.
 */
export async function runHarnessRestart(steps: HarnessRestartSteps): Promise<boolean> {
  try {
    // False is an ordinary waiting-page miss. Cancellation is checked afterwards.
    await steps.showWaiting()
  } catch {
    if (abandoned(steps)) return false
  }
  if (abandoned(steps)) return false
  try {
    await steps.stop()
  } catch (error) {
    if (!steps.isCurrent(steps.sessionId)) return false
    if (steps.cancelled() || steps.blocked()) {
      steps.end(steps.sessionId)
      return false
    }
    steps.end(steps.sessionId)
    await steps.reportStopFailure(error)
    return false
  }
  if (abandoned(steps)) return false
  try {
    await steps.start()
  } catch {
    if (!steps.isCurrent(steps.sessionId)) return false
    if (steps.cancelled() || steps.blocked()) {
      steps.end(steps.sessionId)
      return false
    }
    return false
  }
  if (abandoned(steps)) return false
  return resumeHarnessRestart(steps)
}

/**
 * Load the saved application document after a later host retry succeeds.
 * A stale session cannot clear or navigate the restart that replaced it.
 */
export async function resumeHarnessRestart(steps: HarnessRestartSteps): Promise<boolean> {
  if (abandoned(steps)) return false
  const opened = await steps.resume(steps.sessionId)
  if (!steps.isCurrent(steps.sessionId)) return false
  if (steps.cancelled()) {
    steps.end(steps.sessionId)
    return false
  }
  if (opened) {
    steps.end(steps.sessionId)
    return true
  }
  if (!steps.blocked()) steps.recoverDocument()
  steps.end(steps.sessionId)
  return false
}

/** End the session when this restart must not continue. A replaced session is left alone. */
function abandoned(steps: HarnessRestartSteps): boolean {
  if (!steps.isCurrent(steps.sessionId)) return true
  if (!steps.cancelled() && !steps.blocked()) return false
  steps.end(steps.sessionId)
  return true
}
