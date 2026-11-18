import {
  DIRECTORY_PICK_DEADLINE_MS,
  DIRECTORY_PICK_TICK_INTERVAL_MS,
  type DirectoryPickerTick
} from '../../shared/directory-picker'

/** The native panel did not call back before the deadline. */
export class DirectoryPickTimeoutError extends Error {
  constructor() {
    super('directory picker timed out')
    this.name = 'DirectoryPickTimeoutError'
  }
}

/**
 * Settle `operation`, or reject once `deadlineMs` passes. A late result after
 * the deadline is ignored so it cannot surface as an unhandled rejection.
 */
export function settleWithin<T>(operation: Promise<T>, deadlineMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new DirectoryPickTimeoutError())
    }, deadlineMs)
    timer.unref?.()
    operation.then(value => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }, (error: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    })
  })
}

export function directoryPickDeadline(overrideMs: number | undefined): number {
  return overrideMs === undefined ? DIRECTORY_PICK_DEADLINE_MS : overrideMs
}

/**
 * Mark the main thread as alive for one in-flight pick. The first tick is
 * synchronous, before the native panel, so a thread blocked inside the panel
 * shows up as one tick and then silence. `stop` is idempotent.
 */
export function startDirectoryPickTicks(options: {
  requestId: string
  send: (tick: DirectoryPickerTick) => void
  intervalMs?: number
}): { stop: () => void } {
  const send = (): void => {
    try {
      options.send({ requestId: options.requestId })
    } catch {
      // The window can close between ticks. A missed mark is the stall signal, not a second failure.
    }
  }
  send()
  const timer = setInterval(send, options.intervalMs ?? DIRECTORY_PICK_TICK_INTERVAL_MS)
  timer.unref?.()
  let stopped = false
  return {
    stop: () => {
      if (stopped) return
      stopped = true
      clearInterval(timer)
    }
  }
}
