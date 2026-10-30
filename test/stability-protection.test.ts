import { afterEach, describe, expect, it, vi } from 'vitest'
import { graphicsSnapshot, isMemoryExit, resourceSnapshot } from '../src/main/resource-diagnostics'
import { createProcessRecovery } from './helpers/process-recovery'
import { ProcessRecovery } from '../src/main/process-recovery'

afterEach(() => vi.useRealTimers())

describe('memory boundaries', () => {
  it('identifies signed/unsigned OOM independently of GPU failures', () => {
    expect(isMemoryExit('oom', 0)).toBe(true)
    expect(isMemoryExit('crashed', -536870904)).toBe(true)
    expect(isMemoryExit('crashed', 0xe0000008)).toBe(true)
    expect(isMemoryExit('crashed', -1073741819)).toBe(false)
  })
  it('bounds fault metadata and excludes arbitrary GPU fields', () => {
    const info = graphicsSnapshot({ gpuDevice: [{ vendorId: 42, driverVersion: '1', secret: 'do-not-upload' }] })
    expect(info).toContain('vendorId')
    expect(info).not.toContain('secret')
    const metrics = Array.from({ length: 100 }, (_, pid) => ({ pid, type: 'GPU', cpu: { percentCPUUsage: 2 }, memory: { workingSetSize: pid * 1024 } }))
    const snapshot = JSON.parse(resourceSnapshot(8 * 1024 ** 3, 1024 ** 3, metrics))
    expect(snapshot.processes).toHaveLength(8)
    expect(snapshot.processes[0]).toMatchObject({ pid: 99, rssMb: 99 })
  })
})

describe('device-loss bursts', () => {
  it('allows isolated device loss and leaves a responsive page alone after a burst', async () => {
    vi.useFakeTimers()
    const probe = vi.fn(async () => true), recover = vi.fn()
    const controller = createProcessRecovery({ probe, prompt: async () => { recover(); return 'quit' } })
    controller.recordGpuLoss()
    await vi.advanceTimersByTimeAsync(120_001)
    controller.recordGpuLoss()
    expect(probe).not.toHaveBeenCalled()
    controller.recordGpuLoss(); controller.recordGpuLoss()
    await vi.advanceTimersByTimeAsync(0)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(recover).not.toHaveBeenCalled()
    controller.dispose()
  })
  it('bounds hanging probes, offers recovery once, and ignores late success', async () => {
    vi.useFakeTimers()
    let finish: (value: boolean) => void = () => {}
    const probe = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve })), recover = vi.fn()
    const controller = createProcessRecovery({ probe, prompt: async () => { recover(); return 'quit' } })
    for (let i = 0; i < 10; i++) controller.recordGpuLoss()
    await vi.advanceTimersByTimeAsync(3001)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(recover).toHaveBeenCalledTimes(1)
    finish(true)
    controller.recordGpuLoss()
    await vi.advanceTimersByTimeAsync(10000)
    expect(recover).toHaveBeenCalledTimes(1)
    controller.dispose()
  })
  it('does not act on a disposed in-flight probe', async () => {
    vi.useFakeTimers()
    const recover = vi.fn()
    const controller = createProcessRecovery({ probe: async () => false, prompt: async () => { recover(); return 'quit' } })
    controller.recordGpuLoss(); controller.recordGpuLoss(); controller.recordGpuLoss()
    controller.dispose()
    await vi.advanceTimersByTimeAsync(4000)
    expect(recover).not.toHaveBeenCalled()
  })
})

describe('explicit failure recovery', () => {
  it('blocks reloads immediately, stops the workload before prompting and never restarts automatically', async () => {
    const calls: string[] = []
    const controller = new ProcessRecovery({
      stop: async () => { calls.push('stop') }, releasePage: async () => { calls.push('release') },
      prompt: async () => { calls.push('prompt'); return 'quit' },
      restart: () => { calls.push('restart') }, quit: () => { calls.push('quit') }, onError: vi.fn()
    })
    controller.start('memory'); controller.start('memory')
    expect(controller.blocked).toBe(true)
    await vi.waitFor(() => expect(calls).toEqual(['stop', 'release', 'prompt', 'quit']))
  })
  it('changes graphics mode only after the user selects software restart', async () => {
    const restart = vi.fn(), stop = vi.fn(), quit = vi.fn()
    const controller = new ProcessRecovery({ stop, releasePage: vi.fn(), prompt: async () => 'software', restart, quit, onError: vi.fn() })
    controller.start('graphics')
    await vi.waitFor(() => expect(restart).toHaveBeenCalledWith(true))
    expect(stop).not.toHaveBeenCalled()
    expect(quit).toHaveBeenCalledTimes(1)
  })
})

it('a pending graphics prompt cannot mask a later memory emergency', async () => {
  const stop = vi.fn(async () => {}), releasePage = vi.fn(async () => {}), restart = vi.fn()
  let answer: (action: 'quit') => void = () => {}
  const prompt = vi.fn(() => new Promise<'quit'>(resolve => { answer = resolve }))
  const controller = new ProcessRecovery({ stop, releasePage, restart, prompt, quit: vi.fn(), onError: vi.fn() })
  controller.start('graphics')
  controller.start('memory')
  controller.start('memory')
  await vi.waitFor(() => expect(releasePage).toHaveBeenCalledTimes(1))
  expect(stop).toHaveBeenCalledTimes(1)
  expect(prompt).toHaveBeenCalledTimes(1)
  expect(restart).not.toHaveBeenCalled()
  answer('quit')
})

it('OOM cancels a pending GPU probe and stops once across overlapping failures', async () => {
  vi.useFakeTimers()
  const stop = vi.fn(async () => {}), prompt = vi.fn(async () => 'quit' as const)
  const controller = createProcessRecovery({ stop, prompt, probe: () => new Promise(() => {}) })
  controller.recordGpuLoss(); controller.recordGpuLoss(); controller.recordGpuLoss()
  controller.start('memory'); controller.start('memory')
  await vi.advanceTimersByTimeAsync(4000)
  expect(stop).toHaveBeenCalledTimes(1)
  expect(prompt).toHaveBeenCalledExactlyOnceWith('memory')
  expect(vi.getTimerCount()).toBe(0)
})

it('OOM during a window prompt stops the workload and keeps the terminal gate', async () => {
  const stop = vi.fn(async () => {}), releasePage = vi.fn(async () => {})
  let answer: (action: 'restart') => void = () => {}
  const prompt = vi.fn(() => new Promise<'restart'>(resolve => { answer = resolve }))
  const controller = createProcessRecovery({ stop, releasePage, prompt })
  controller.start('window')
  controller.start('memory')
  await vi.waitFor(() => expect(releasePage).toHaveBeenCalledTimes(1))
  answer('restart')
  await Promise.resolve()
  expect(controller.blocked).toBe(true)
  expect(prompt).toHaveBeenCalledTimes(1)
})

it('disposal prevents a late prompt answer from restarting or quitting', async () => {
  let answer: (action: 'software') => void = () => {}
  const restart = vi.fn(), quit = vi.fn()
  const controller = createProcessRecovery({
    prompt: () => new Promise<'software'>(resolve => { answer = resolve }), restart, quit
  })
  controller.start('graphics')
  controller.dispose()
  answer('software')
  await Promise.resolve()
  expect(restart).not.toHaveBeenCalled()
  expect(quit).not.toHaveBeenCalled()
})
