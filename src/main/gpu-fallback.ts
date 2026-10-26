export interface GpuExitContext {
  sessionEndRequested: boolean
  sessionEnding: boolean
  quitRequested: boolean
  appExiting: boolean
}

export function emptyGpuExitContext(): GpuExitContext {
  return { sessionEndRequested: false, sessionEnding: false, quitRequested: false, appExiting: false }
}

export function classifyGpuExit(platform: NodeJS.Platform, exitCode: number, context: GpuExitContext): 'unclassified' | 'logoff-during-exit' | 'logoff-impact-unknown' {
  if (platform !== 'win32' || (exitCode >>> 0) !== 0xc000026b) return 'unclassified'
  return context.sessionEnding || context.appExiting ? 'logoff-during-exit' : 'logoff-impact-unknown'
}

/** Graphics failures can leave the window blank before the user can recover.
 * Persist a bounded software-rendering fallback without removing the sandbox.
 * The legacy sandbox-disabled value is accepted only for state migration. */
export type GpuFallbackLevel = 'default' | 'sandbox-disabled' | 'gpu-disabled'

export interface GpuFallbackState {
  level: GpuFallbackLevel
  /** GPU losses seen at this level while the app was usable. */
  failures: number
  /** Launches that ran at this level without losing the GPU process. */
  stableLaunches: number
}

const levels: readonly GpuFallbackLevel[] = ['default', 'gpu-disabled']

export const defaultGpuFallbackState: GpuFallbackState = {
  level: 'default',
  failures: 0,
  stableLaunches: 0
}

/**
 * How many GPU losses a running app tolerates before degrading. A window the
 * user is working in survives a lost GPU process — Chromium restarts it — so
 * one crash during a driver update must not cost this machine its sandbox.
 * Chromium's own internal fallback uses a threshold for the same reason.
 */
export const GPU_FALLBACK_FAILURE_THRESHOLD = 3

/**
 * How many clean launches at a degraded level it takes before trying the next
 * level up again. This is what keeps a one-off crash from pinning a machine to
 * software rendering forever: hardware that was replaced, a driver that was
 * updated, a virtual display that was uninstalled all get another chance. If
 * the machine is still broken the probe launch fails before painting and is
 * relaunched at the level that works, which costs one restart every this many
 * launches.
 */
export const GPU_FALLBACK_PROBE_LAUNCHES = 20

/**
 * GPU process exits that say nothing about this machine's ability to run the
 * GPU sandbox. Chromium tears the GPU process down on shutdown, and Electron
 * reports that as a loss like any other; degrading on it would degrade every
 * user who quits the app.
 */
const survivableReasons: ReadonlySet<string> = new Set(['clean-exit', 'killed'])

/**
 * Native Windows exceptions observed when Chromium's renderer follows a
 * broken graphics stack down. Electron reports Windows process exit codes as
 * signed numbers, while crash reports and Event Viewer normally print the
 * same bits as unsigned hexadecimal NTSTATUS values.
 */
const windowsRendererFallbackCodes: ReadonlySet<number> = new Set([
  0xc0000005, // STATUS_ACCESS_VIOLATION
  0x80000003 // STATUS_BREAKPOINT
])

/**
 * Chromium's own exit code when the GPU process detects a lost D3D11 device
 * — normally because the OS reset the graphics driver (TDR) — and exits on
 * purpose so Chromium can restart it. This is Chromium's device-loss
 * recovery working as designed, not evidence this machine cannot run the
 * GPU sandbox: counting it toward the fallback ladder would strip hardware
 * acceleration from a driver hiccup that already fixed itself.
 */
const GPU_DEVICE_LOST_EXIT_CODE = 34

export function isGpuLossFatal(reason: string, exitCode?: number, lifecycle?: {
  platform: NodeJS.Platform
  context: GpuExitContext
}): boolean {
  // The status alone does not prove the user was logging off. Requests may
  // be cancelled; only confirmed session/app exit suppresses degradation.
  if (exitCode !== undefined && lifecycle &&
    classifyGpuExit(lifecycle.platform, exitCode, lifecycle.context) === 'logoff-during-exit') return false
  if (!survivableReasons.has(reason)) {
    if (reason === 'crashed' && exitCode === GPU_DEVICE_LOST_EXIT_CODE) return false
    return true
  }
  return false
}

/**
 * Whether a renderer loss is strong enough evidence to try the GPU fallback.
 *
 * A renderer can crash for many reasons, so ordinary crashes, load failures,
 * out-of-memory exits and non-Windows platforms stay on the bounded reload
 * path. These two native exceptions are the signatures seen when affected
 * Windows display/virtual-display stacks kill the renderer without Electron
 * reporting a separate `child-process-gone` event for the GPU process.
 */
export function isRendererGpuFallbackCandidate(options: {
  platform: NodeJS.Platform
  reason: string
  exitCode: number
}): boolean {
  if (options.platform !== 'win32' || options.reason !== 'crashed') return false
  return windowsRendererFallbackCodes.has(options.exitCode >>> 0)
}

/** Software rendering preserves Chromium's sandbox, including when reading
 * an old persisted sandbox-disabled state. */
export function gpuFallbackSwitches(level: GpuFallbackLevel): string[] {
  switch (level) {
    case 'default':
      return []
    case 'sandbox-disabled':
      return ['disable-gpu', 'disable-gpu-compositing']
    case 'gpu-disabled':
      return ['disable-gpu', 'disable-gpu-compositing']
  }
}

/**
 * Decide what a GPU process loss should change.
 *
 * A launch whose harness never rendered is unusable no matter what the user
 * does, so a single loss is decisive: degrade and relaunch immediately to pick
 * up the next set of switches. A launch that did render keeps running — the
 * GPU process comes back on its own — and only degrades once losses pile up,
 * and even then only records the level for next time, because relaunching
 * under the user would throw away whatever they were doing.
 *
 * Escalation stops at the last level, which is what keeps a permanently broken
 * GPU from relaunching the app forever.
 */
export function planGpuFallbackResponse(options: {
  state: GpuFallbackState
  harnessRendered: boolean
}): { state: GpuFallbackState; relaunch: boolean } {
  const { state, harnessRendered } = options
  const failures = state.failures + 1
  const next = state.level === 'default' ? 'gpu-disabled' : undefined
  if (next === undefined) {
    return { state: { ...state, failures, stableLaunches: 0 }, relaunch: false }
  }
  if (!harnessRendered) {
    return { state: { level: next, failures: 0, stableLaunches: 0 }, relaunch: true }
  }
  if (failures < GPU_FALLBACK_FAILURE_THRESHOLD) {
    return { state: { ...state, failures, stableLaunches: 0 }, relaunch: false }
  }
  return { state: { level: next, failures: 0, stableLaunches: 0 }, relaunch: false }
}

/**
 * Record a launch that rendered the harness and kept its GPU process. Enough
 * of those in a row at a degraded level and the next launch tries the level
 * above, so a machine only stays degraded as long as it still needs to be.
 */
export function planStableLaunch(state: GpuFallbackState): GpuFallbackState {
  if (state.level === 'sandbox-disabled') return planStableLaunch({ ...state, level: 'gpu-disabled' })
  if (state.level === 'default') return defaultGpuFallbackState
  const stableLaunches = state.stableLaunches + 1
  if (stableLaunches < GPU_FALLBACK_PROBE_LAUNCHES) {
    return { level: state.level, failures: 0, stableLaunches }
  }
  const previous = levels[levels.indexOf(state.level) - 1]
  return { level: previous ?? state.level, failures: 0, stableLaunches: 0 }
}

/** No lower graphics mode remains: stop retrying an unusable launch or a
 * repeated failure burst at the software-rendering level. */
export function hasExhaustedGpuRecovery(state: GpuFallbackState, unusableLaunch: boolean): boolean {
  return state.level === 'gpu-disabled' && (unusableLaunch || state.failures >= GPU_FALLBACK_FAILURE_THRESHOLD)
}

export function gpuFallbackStateEquals(a: GpuFallbackState, b: GpuFallbackState): boolean {
  return (
    a.level === b.level && a.failures === b.failures && a.stableLaunches === b.stableLaunches
  )
}

export function serializeGpuFallbackState(state: GpuFallbackState): string {
  return JSON.stringify(state)
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0
}

export function parseGpuFallbackState(raw: string): GpuFallbackState {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof GpuFallbackState, unknown>>
    // Migrate old sandbox-disabled installations to software rendering while
    // restoring the GPU sandbox. New failures never remove the sandbox.
    const level = parsed.level === 'sandbox-disabled' ? 'gpu-disabled' : parsed.level
    if (!levels.includes(level as GpuFallbackLevel)) return defaultGpuFallbackState
    return {
      level: level as GpuFallbackLevel,
      failures: readCount(parsed.failures),
      stableLaunches: readCount(parsed.stableLaunches)
    }
  } catch {
    return defaultGpuFallbackState
  }
}
