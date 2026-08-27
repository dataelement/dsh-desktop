import { describe, expect, it } from 'vitest'
import {
  gpuFallbackSwitches,
  parseGpuFallbackLevel,
  planGpuFallbackResponse,
  serializeGpuFallbackLevel
} from '../src/main/gpu-fallback'

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

describe('gpu fallback planning', () => {
  it('drops the GPU sandbox and relaunches when the window never painted', () => {
    expect(planGpuFallbackResponse({ level: 'default', firstPaintDone: false })).toEqual({
      level: 'sandbox-disabled',
      relaunch: true
    })
  })

  it('escalates to a fully disabled GPU when the sandbox-less launch also failed', () => {
    expect(planGpuFallbackResponse({ level: 'sandbox-disabled', firstPaintDone: false })).toEqual({
      level: 'gpu-disabled',
      relaunch: true
    })
  })

  it('stops relaunching once every fallback has been tried', () => {
    expect(planGpuFallbackResponse({ level: 'gpu-disabled', firstPaintDone: false })).toEqual({
      level: 'gpu-disabled',
      relaunch: false
    })
  })

  it('remembers the fallback for the next launch without interrupting a painted window', () => {
    expect(planGpuFallbackResponse({ level: 'default', firstPaintDone: true })).toEqual({
      level: 'sandbox-disabled',
      relaunch: false
    })
  })

  it('keeps a painted window running when no fallback is left to record', () => {
    expect(planGpuFallbackResponse({ level: 'gpu-disabled', firstPaintDone: true })).toEqual({
      level: 'gpu-disabled',
      relaunch: false
    })
  })
})

describe('gpu fallback persistence', () => {
  it('round-trips a recorded level', () => {
    expect(parseGpuFallbackLevel(serializeGpuFallbackLevel('gpu-disabled'))).toBe('gpu-disabled')
  })

  it('falls back to the default level for unreadable state', () => {
    expect(parseGpuFallbackLevel('not json')).toBe('default')
  })

  it('falls back to the default level for an unknown level', () => {
    expect(parseGpuFallbackLevel('{"level":"turbo"}')).toBe('default')
  })
})
