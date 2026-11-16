/** Cross-process result of one desktop directory pick. `cancelled` is a user choice; `failed` is not. */
export type DirectoryPickOutcome =
  | { kind: 'picked'; path: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string; reason: DirectoryPickFailureReason }

export type DirectoryPickFailureReason = 'timed-out' | 'open-failed' | 'unexpected'

/** One liveness mark from the main process while a pick is in flight. */
export interface DirectoryPickerTick {
  requestId: string
}

/**
 * How long a missing tick means the main thread stopped. A live chooser keeps
 * ticking, so a slow browse does not look like a stall.
 */
export const DIRECTORY_PICK_TICK_STALL_MS = 3_000

/** Tick cadence while a pick is in flight. Not a standing timer. */
export const DIRECTORY_PICK_TICK_INTERVAL_MS = 1_000

/**
 * Last-resort bound so a chooser whose completion callback never runs still
 * returns and releases the in-flight guard. Long on purpose: Electron cannot
 * close a panel that is already open, and a short bound would drop a real selection.
 */
export const DIRECTORY_PICK_DEADLINE_MS = 10 * 60 * 1000

export function directoryPickUserMessage(chinese: boolean, reason: 'stalled' | 'unavailable'): string {
  if (reason === 'stalled') {
    return chinese
      ? '系统文件夹选择器没有响应，应用可能短时间无响应。请稍后重试。'
      : 'The system folder picker is not responding, and the app may be briefly unresponsive. Try again shortly.'
  }
  return chinese
    ? '无法打开文件夹选择器，请稍后重试。'
    : 'The folder picker could not be opened. Try again shortly.'
}

export function isDirectoryPickOutcome(value: unknown): value is DirectoryPickOutcome {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
  const record = value as { kind?: unknown; path?: unknown; message?: unknown }
  if (record.kind === 'cancelled') return true
  if (record.kind === 'picked') return typeof record.path === 'string' && record.path.length > 0
  if (record.kind === 'failed') return typeof record.message === 'string' && record.message.length > 0
  return false
}

export function isDirectoryPickerTick(value: unknown): value is DirectoryPickerTick {
  if (typeof value !== 'object' || value === null || !('requestId' in value)) return false
  const requestId = (value as { requestId?: unknown }).requestId
  return typeof requestId === 'string' && requestId.length > 0
}

/** One harness.log line. It names the outcome, never the chosen path. */
export function directoryPickLogLine(input: {
  platform: string
  elapsedMs: number
  outcome: 'failed' | 'timed-out' | 'stalled'
}): string {
  const elapsed = Number.isFinite(input.elapsedMs) ? Math.max(0, Math.round(input.elapsedMs)) : 0
  return `[desktop] directory-picker ${input.outcome} platform=${input.platform} elapsedMs=${String(elapsed)}`
}

export function directoryPickStallElapsed(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value < 0 || value > DIRECTORY_PICK_DEADLINE_MS) return undefined
  return Math.round(value)
}
