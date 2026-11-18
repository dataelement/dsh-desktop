import {
  DIRECTORY_PICK_TICK_STALL_MS,
  isDirectoryPickOutcome,
  isDirectoryPickerTick
} from '../shared/directory-picker'

/**
 * Bridge one directory pick to `string | null` for the stock native surface,
 * and reject with a readable error when main-process ticks stop. A tick that
 * keeps arriving means the user may simply be browsing, so silence is the
 * only stall signal. A result that arrives after the stall is ignored.
 */
export function watchDirectoryPick(input: {
  stallMs?: number
  invoke: () => Promise<unknown>
  subscribe: (onTick: (tick: unknown) => void) => () => void
  notifyStall: (elapsedMs: number) => void
  message: () => string
  now?: () => number
  schedule?: (callback: () => void, ms: number) => () => void
}): Promise<string | null> {
  const now = input.now ?? Date.now
  const stallMs = input.stallMs ?? DIRECTORY_PICK_TICK_STALL_MS
  const schedule = input.schedule ?? ((callback, ms) => {
    const timer = setInterval(callback, ms)
    return () => { clearInterval(timer) }
  })
  return new Promise((resolve, reject) => {
    let settled = false
    let requestId: string | undefined
    let lastMark = now()
    const started = lastMark
    let stop = (): void => {}
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      stop()
      reject(error)
    }
    const succeed = (path: string | null): void => {
      if (settled) return
      settled = true
      stop()
      resolve(path)
    }
    const unsubscribe = input.subscribe(tick => {
      if (!isDirectoryPickerTick(tick)) return
      if (requestId === undefined) requestId = tick.requestId
      if (tick.requestId !== requestId) return
      lastMark = now()
    })
    const cancelSchedule = schedule(() => {
      if (settled) return
      if (now() - lastMark < stallMs) return
      input.notifyStall(Math.max(0, now() - started))
      fail(new Error(input.message()))
    }, Math.min(500, stallMs))
    stop = () => {
      cancelSchedule()
      unsubscribe()
    }
    input.invoke().then(value => {
      if (settled) return
      if (!isDirectoryPickOutcome(value)) {
        fail(new Error(input.message()))
        return
      }
      if (value.kind === 'picked') succeed(value.path)
      else if (value.kind === 'cancelled') succeed(null)
      else fail(new Error(value.message))
    }, () => {
      fail(new Error(input.message()))
    })
  })
}
