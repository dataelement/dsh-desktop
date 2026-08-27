/**
 * Some Windows machines cannot start Chromium's GPU process inside its
 * sandbox at all: a virtual display driver (Todesk, GameViewer) stacked on
 * an AMD integrated GPU takes the GPU process down with 0x80000003, the
 * renderer follows it, and loading the harness page fails with ERR_FAILED
 * before the user ever sees a window. Nothing in the app can recover from
 * that after the fact — the switches have to be in place before Chromium
 * boots — so the level that worked is remembered on disk and applied on the
 * next launch.
 *
 * Degrading is not free: it costs the GPU sandbox and eventually hardware
 * acceleration, on a machine that may only have hiccuped once. So the
 * fallback is deliberately hard to enter and never permanent — see
 * `planGpuFallbackResponse` for the thresholds and `planStableLaunch` for
 * the way back down.
 */
export type GpuFallbackLevel = 'default' | 'sandbox-disabled' | 'gpu-disabled'

export interface GpuFallbackState {
  level: GpuFallbackLevel
  /** GPU losses seen at this level while the app was usable. */
  failures: number
  /** Launches that ran at this level without losing the GPU process. */
  stableLaunches: number
}

const levels: readonly GpuFallbackLevel[] = ['default', 'sandbox-disabled', 'gpu-disabled']

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

export function isGpuLossFatal(reason: string): boolean {
  return !survivableReasons.has(reason)
}

/**
 * The command line switches a level asks Chromium for. Each level keeps the
 * previous level's switches: a machine that needed the sandbox dropped still
 * needs it dropped once hardware acceleration is off as well.
 */
export function gpuFallbackSwitches(level: GpuFallbackLevel): string[] {
  switch (level) {
    case 'default':
      return []
    case 'sandbox-disabled':
      return ['disable-gpu-sandbox']
    case 'gpu-disabled':
      return ['disable-gpu-sandbox', 'disable-gpu', 'disable-gpu-compositing']
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
  const next = levels[levels.indexOf(state.level) + 1]
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
  if (state.level === 'default') return defaultGpuFallbackState
  const stableLaunches = state.stableLaunches + 1
  if (stableLaunches < GPU_FALLBACK_PROBE_LAUNCHES) {
    return { level: state.level, failures: 0, stableLaunches }
  }
  const previous = levels[levels.indexOf(state.level) - 1]
  return { level: previous ?? state.level, failures: 0, stableLaunches: 0 }
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
    const level = parsed.level
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
