/**
 * Some Windows machines cannot start Chromium's GPU process inside its
 * sandbox at all: a virtual display driver (Todesk, GameViewer) stacked on
 * an AMD integrated GPU takes the GPU process down with 0x80000003, the
 * renderer follows it, and loading the harness page fails with ERR_FAILED
 * before the user ever sees a window. Nothing in the app can recover from
 * that after the fact — the switches have to be in place before Chromium
 * boots — so the level that worked is remembered on disk and applied on the
 * next launch.
 */
export type GpuFallbackLevel = 'default' | 'sandbox-disabled' | 'gpu-disabled'

const levels: readonly GpuFallbackLevel[] = ['default', 'sandbox-disabled', 'gpu-disabled']

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
 * Decide what a GPU process loss should change. A window that never painted
 * means this launch is unusable, so the app relaunches itself immediately to
 * pick up the next set of switches; a window that already painted keeps
 * running and only records the fallback for next time, because relaunching
 * under the user would throw away whatever they were doing. Escalation stops
 * at the last level, which is what keeps a permanently broken GPU from
 * relaunching the app forever.
 */
export function planGpuFallbackResponse(options: {
  level: GpuFallbackLevel
  firstPaintDone: boolean
}): { level: GpuFallbackLevel; relaunch: boolean } {
  const next = levels[levels.indexOf(options.level) + 1]
  if (next === undefined) return { level: options.level, relaunch: false }
  return { level: next, relaunch: !options.firstPaintDone }
}

export function serializeGpuFallbackLevel(level: GpuFallbackLevel): string {
  return JSON.stringify({ level })
}

export function parseGpuFallbackLevel(raw: string): GpuFallbackLevel {
  try {
    const parsed = JSON.parse(raw) as { level?: unknown }
    const level = parsed.level
    return levels.includes(level as GpuFallbackLevel) ? (level as GpuFallbackLevel) : 'default'
  } catch {
    return 'default'
  }
}
