import { describe, expect, it } from 'vitest'
import {
  GPU_FALLBACK_FAILURE_THRESHOLD,
  GPU_FALLBACK_PROBE_LAUNCHES,
  type GpuFallbackState,
  defaultGpuFallbackState,
  gpuFallbackStateEquals,
  gpuFallbackSwitches,
  isGpuLossFatal,
  parseGpuFallbackState,
  planGpuFallbackResponse,
  planStableLaunch,
  serializeGpuFallbackState
} from '../src/main/gpu-fallback'

function state(overrides: Partial<GpuFallbackState> = {}): GpuFallbackState {
  return { ...defaultGpuFallbackState, ...overrides }
}

describe('gpu fallback switches', () => {
  it('leaves the sandbox and the GPU alone at the default level', () => {
    expect(gpuFallbackSwitches('default')).toEqual([])
  })

  it('drops only the GPU sandbox at the first fallback level', () => {
    expect(gpuFallbackSwitches('sandbox-disabled')).toEqual(['disable-gpu-sandbox'])
  })

  it('turns hardware acceleration off entirely at the last fallback level', () => {
    expect(gpuFallbackSwitches('gpu-disabled')).toEqual([
      'disable-gpu-sandbox',
      'disable-gpu',
      'disable-gpu-compositing'
    ])
  })
})

describe('gpu loss classification', () => {
  it('ignores the GPU process being shut down with the app', () => {
    expect(isGpuLossFatal('clean-exit')).toBe(false)
    expect(isGpuLossFatal('killed')).toBe(false)
  })

  it('treats a crashed or unlaunchable GPU process as evidence', () => {
    expect(isGpuLossFatal('crashed')).toBe(true)
    expect(isGpuLossFatal('abnormal-exit')).toBe(true)
    expect(isGpuLossFatal('launch-failed')).toBe(true)
    expect(isGpuLossFatal('oom')).toBe(true)
  })
})

describe('gpu fallback planning before the harness renders', () => {
  it('drops the GPU sandbox and relaunches on the first loss', () => {
    expect(planGpuFallbackResponse({ state: state(), harnessRendered: false })).toEqual({
      state: { level: 'sandbox-disabled', failures: 0, stableLaunches: 0 },
      relaunch: true
    })
  })

  it('escalates to a fully disabled GPU when the sandbox-less launch also failed', () => {
    expect(
      planGpuFallbackResponse({
        state: state({ level: 'sandbox-disabled' }),
        harnessRendered: false
      })
    ).toEqual({
      state: { level: 'gpu-disabled', failures: 0, stableLaunches: 0 },
      relaunch: true
    })
  })

  it('stops relaunching once every fallback has been tried', () => {
    expect(
      planGpuFallbackResponse({ state: state({ level: 'gpu-disabled' }), harnessRendered: false })
    ).toEqual({
      state: { level: 'gpu-disabled', failures: 1, stableLaunches: 0 },
      relaunch: false
    })
  })
})

describe('gpu fallback planning while the user is working', () => {
  it('rides out a single lost GPU process without degrading anything', () => {
    expect(planGpuFallbackResponse({ state: state(), harnessRendered: true })).toEqual({
      state: { level: 'default', failures: 1, stableLaunches: 0 },
      relaunch: false
    })
  })

  it('degrades only once the losses reach the threshold', () => {
    let current = state()
    for (let i = 0; i < GPU_FALLBACK_FAILURE_THRESHOLD - 1; i += 1) {
      current = planGpuFallbackResponse({ state: current, harnessRendered: true }).state
      expect(current.level).toBe('default')
    }
    expect(planGpuFallbackResponse({ state: current, harnessRendered: true })).toEqual({
      state: { level: 'sandbox-disabled', failures: 0, stableLaunches: 0 },
      relaunch: false
    })
  })

  it('never relaunches out from under a rendered harness', () => {
    expect(
      planGpuFallbackResponse({
        state: state({ failures: GPU_FALLBACK_FAILURE_THRESHOLD }),
        harnessRendered: true
      }).relaunch
    ).toBe(false)
  })

  it('keeps a rendered harness running when no fallback is left to record', () => {
    expect(
      planGpuFallbackResponse({
        state: state({ level: 'gpu-disabled', failures: GPU_FALLBACK_FAILURE_THRESHOLD }),
        harnessRendered: true
      })
    ).toEqual({
      state: {
        level: 'gpu-disabled',
        failures: GPU_FALLBACK_FAILURE_THRESHOLD + 1,
        stableLaunches: 0
      },
      relaunch: false
    })
  })
})

describe('climbing back out of the fallback', () => {
  it('costs nothing on a machine that never degraded', () => {
    expect(planStableLaunch(state())).toEqual(defaultGpuFallbackState)
  })

  it('counts stable launches at a degraded level', () => {
    expect(planStableLaunch(state({ level: 'gpu-disabled', failures: 2 }))).toEqual({
      level: 'gpu-disabled',
      failures: 0,
      stableLaunches: 1
    })
  })

  it('tries the level above once enough launches have been clean', () => {
    expect(
      planStableLaunch(
        state({ level: 'gpu-disabled', stableLaunches: GPU_FALLBACK_PROBE_LAUNCHES - 1 })
      )
    ).toEqual({ level: 'sandbox-disabled', failures: 0, stableLaunches: 0 })
  })

  it('walks all the way back to an untouched Chromium', () => {
    expect(
      planStableLaunch(
        state({ level: 'sandbox-disabled', stableLaunches: GPU_FALLBACK_PROBE_LAUNCHES - 1 })
      )
    ).toEqual(defaultGpuFallbackState)
  })
})

describe('gpu fallback persistence', () => {
  it('round-trips a recorded state', () => {
    const recorded = state({ level: 'gpu-disabled', failures: 2, stableLaunches: 7 })
    expect(parseGpuFallbackState(serializeGpuFallbackState(recorded))).toEqual(recorded)
  })

  it('falls back to the default state for unreadable state', () => {
    expect(parseGpuFallbackState('not json')).toEqual(defaultGpuFallbackState)
  })

  it('falls back to the default state for an unknown level', () => {
    expect(parseGpuFallbackState('{"level":"turbo"}')).toEqual(defaultGpuFallbackState)
  })

  it('reads a level written before the counters existed', () => {
    expect(parseGpuFallbackState('{"level":"sandbox-disabled"}')).toEqual({
      level: 'sandbox-disabled',
      failures: 0,
      stableLaunches: 0
    })
  })

  it('ignores nonsensical counters', () => {
    expect(
      parseGpuFallbackState('{"level":"gpu-disabled","failures":-3,"stableLaunches":"lots"}')
    ).toEqual({ level: 'gpu-disabled', failures: 0, stableLaunches: 0 })
  })

  it('compares states by every field that is persisted', () => {
    expect(gpuFallbackStateEquals(state(), state())).toBe(true)
    expect(gpuFallbackStateEquals(state(), state({ failures: 1 }))).toBe(false)
    expect(gpuFallbackStateEquals(state(), state({ stableLaunches: 1 }))).toBe(false)
    expect(gpuFallbackStateEquals(state(), state({ level: 'gpu-disabled' }))).toBe(false)
  })
})
