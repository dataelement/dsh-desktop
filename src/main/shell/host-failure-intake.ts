/**
 * One owner for a Host startup failure.
 * The controller publishes the error before rejecting the start promise.
 * The rejection ends normal startup and does not enqueue again.
 * Object identity drops a repeated event. A later attempt is a new object,
 * so the same message can still be presented after a retry.
 */

export interface HostFailureIntake {
  /** @returns false when this same value is already queued, in progress, or done. */
  enqueue(failure: unknown): boolean
  /** Resolves when no drain is running and none was scheduled from its teardown. */
  whenIdle(): Promise<void>
}

export function createHostFailureIntake(options: {
  quitting: () => boolean
  handle: (failure: unknown) => Promise<void>
  degrade: (failure: unknown, recoveryError: unknown) => Promise<void>
}): HostFailureIntake {
  const seen = new Set<unknown>()
  const pending: unknown[] = []
  let draining = false
  let idle = Promise.resolve()
  let resolveIdle = (): void => undefined
  let busy = false
  let recheck: (() => void) | undefined

  const note = (error: unknown): void => { console.error(error) }

  const becomeBusy = (): void => {
    if (busy) return
    busy = true
    idle = new Promise(resolve => { resolveIdle = resolve })
  }

  const becomeIdle = (): void => {
    if (!busy) return
    busy = false
    resolveIdle()
  }

  const schedule = (): void => {
    if (draining) return
    if (pending.length === 0 || options.quitting()) {
      if (recheck !== undefined) return
      const check = (): void => {
        if (recheck !== check) return
        recheck = undefined
        if (draining) return
        if (pending.length > 0 && !options.quitting()) {
          schedule()
          return
        }
        becomeIdle()
      }
      recheck = check
      queueMicrotask(check)
      return
    }
    becomeBusy()
    void drain().catch(note)
  }

  const drain = async (): Promise<void> => {
    draining = true
    try {
      while (pending.length > 0 && !options.quitting()) {
        // `undefined` is a real queued failure. Emptiness is only `pending.length`.
        const failure = pending.shift()
        try {
          await options.handle(failure)
        } catch (recoveryError) {
          if (options.quitting()) return
          try {
            await options.degrade(failure, recoveryError)
          } catch (dialogError) {
            note(dialogError)
          }
        }
      }
    } finally {
      draining = false
      schedule()
    }
  }

  return {
    enqueue(failure: unknown): boolean {
      if (seen.has(failure)) return false
      seen.add(failure)
      pending.push(failure)
      schedule()
      return true
    },
    whenIdle: () => idle
  }
}

/**
 * Wait for the published startup attempt.
 * False means the normal continuation, including the application page, must not run.
 * The published error is already queued by the backend listener.
 */
export async function continueAfterHostStartup(startup: Promise<void>): Promise<boolean> {
  try {
    await startup
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
