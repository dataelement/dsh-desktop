import { afterEach, describe, expect, it, vi } from 'vitest'
import { desktopHeapBudget, graphicsSnapshot, isMemoryExit, resourceSnapshot } from '../src/main/resource-budget'
import { GpuDeviceRecovery } from '../src/main/gpu-device-recovery'
import { ProcessFailureRecovery } from '../src/main/process-failure-recovery'
import { buildNodeArguments } from '../src/main/runtime/harness-runtime'
import { buildDisclaimedUtilityProcessSpec } from '../src/main/runtime/disclaimed-utility-process'

afterEach(() => vi.useRealTimers())

describe('memory boundaries', () => {
  it.each([[2, 512, 256], [4, 1024, 512], [8, 2048, 1024], [32, 2048, 1024]])(
    'reserves headroom on a %i GiB computer', (gb, harnessMb, rendererMb) => {
      expect(desktopHeapBudget(gb * 1024 ** 3)).toEqual({ harnessMb, rendererMb })
    })
  it('handles invalid capacities and identifies signed/unsigned OOM independently of GPU failures', () => {
    expect(desktopHeapBudget(NaN)).toEqual({ harnessMb: 1024, rendererMb: 512 })
    expect(isMemoryExit('oom', 0)).toBe(true)
    expect(isMemoryExit('crashed', -536870904)).toBe(true)
    expect(isMemoryExit('crashed', 0xe0000008)).toBe(true)
    expect(isMemoryExit('crashed', -1073741819)).toBe(false)
  })
  it('passes the same explicit budget to Node argv and the macOS utility execArgv', () => {
    const args = buildNodeArguments('/host/entry.mjs', '/host/dsh.js', 1234, undefined, 'web', 1024)
    expect(args.slice(0, 3)).toEqual(['--expose-internals', '--max-old-space-size=1024', '/host/entry.mjs'])
    const spec = buildDisclaimedUtilityProcessSpec(args, {})
    expect(spec.modulePath).toBe('/host/entry.mjs')
    expect(spec.options.execArgv).toEqual(['--expose-internals', '--max-old-space-size=1024'])
    expect(spec.args[0]).toBe('/host/dsh.js')
    expect(() => buildNodeArguments('entry', 'dsh', 1, undefined, 'web', NaN)).toThrow('budget')
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
    const controller = new GpuDeviceRecovery({ probe, recover, note: vi.fn() })
    controller.recordLoss()
    await vi.advanceTimersByTimeAsync(120_001)
    controller.recordLoss()
    expect(probe).not.toHaveBeenCalled()
    controller.recordLoss(); controller.recordLoss()
    await vi.advanceTimersByTimeAsync(0)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(recover).not.toHaveBeenCalled()
    controller.dispose()
  })
  it('bounds hanging probes, offers recovery once, and ignores late success', async () => {
    vi.useFakeTimers()
    let finish: (value: boolean) => void = () => {}
    const probe = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve })), recover = vi.fn()
    const controller = new GpuDeviceRecovery({ probe, recover, note: vi.fn() })
    for (let i = 0; i < 10; i++) controller.recordLoss()
    await vi.advanceTimersByTimeAsync(3001)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(recover).toHaveBeenCalledTimes(1)
    finish(true)
    controller.recordLoss()
    await vi.advanceTimersByTimeAsync(10000)
    expect(recover).toHaveBeenCalledTimes(1)
    controller.dispose()
  })
  it('does not act on a disposed in-flight probe', async () => {
    vi.useFakeTimers()
    const recover = vi.fn()
    const controller = new GpuDeviceRecovery({ probe: async () => false, recover, note: vi.fn() })
    controller.recordLoss(); controller.recordLoss(); controller.recordLoss()
    controller.dispose()
    await vi.advanceTimersByTimeAsync(4000)
    expect(recover).not.toHaveBeenCalled()
  })
})

describe('explicit failure recovery', () => {
  it('blocks reloads immediately, stops the workload before prompting and never restarts automatically', async () => {
    const calls: string[] = []
    const controller = new ProcessFailureRecovery({
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
    const controller = new ProcessFailureRecovery({ stop, releasePage: vi.fn(), prompt: async () => 'software', restart, quit, onError: vi.fn() })
    controller.start('graphics')
    await vi.waitFor(() => expect(restart).toHaveBeenCalledWith(true))
    expect(stop).not.toHaveBeenCalled()
    expect(quit).toHaveBeenCalledTimes(1)
  })
})

describe('independent process memory safety check', () => {
  it('stops an over-budget Harness even if its own event loop cannot report', async () => {
    const { ProcessMemoryWatch } = await import('../src/main/process-memory-watch')
    vi.useFakeTimers()
    let rss = 100
    const sample = vi.fn(() => [{ pid: 42, type: 'Utility', cpu: { percentCPUUsage: 100 }, memory: { workingSetSize: rss * 1024 } }])
    const onLimit = vi.fn()
    const watch = new ProcessMemoryWatch({ totalBytes: 8 * 1024 ** 3, sample, harnessPid: () => 42, onLimit, onError: vi.fn() })
    watch.start(); watch.start()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(onLimit).not.toHaveBeenCalled()
    rss = 3000
    await vi.advanceTimersByTimeAsync(30_000)
    expect(onLimit).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sample).toHaveBeenCalledTimes(2)
    watch.dispose()
  })
  it('covers aggregate Chromium pressure and survives missing or failing samples', async () => {
    const { ProcessMemoryWatch } = await import('../src/main/process-memory-watch')
    const onLimit = vi.fn(), onError = vi.fn()
    const sample = vi.fn<() => Array<{ pid: number; type: string; cpu: { percentCPUUsage: number }; memory: { workingSetSize: number } }>>()
      .mockImplementationOnce(() => { throw Error('unavailable') }).mockReturnValueOnce([])
      .mockReturnValue([{ pid: 1, type: 'Tab', cpu: { percentCPUUsage: 0 }, memory: { workingSetSize: 2200 * 1024 } }])
    const watch = new ProcessMemoryWatch({ totalBytes: 4 * 1024 ** 3, sample, harnessPid: () => undefined, onLimit, onError })
    watch.check(); watch.check()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onLimit).not.toHaveBeenCalled()
    watch.check()
    expect(onLimit).toHaveBeenCalledTimes(1)
    watch.dispose()
  })
})

it('a pending graphics prompt cannot mask a later memory emergency', async () => {
  const stop = vi.fn(async () => {}), releasePage = vi.fn(async () => {}), restart = vi.fn()
  let answer: (action: 'quit') => void = () => {}
  const prompt = vi.fn(() => new Promise<'quit'>(resolve => { answer = resolve }))
  const controller = new ProcessFailureRecovery({ stop, releasePage, restart, prompt, quit: vi.fn(), onError: vi.fn() })
  controller.start('graphics')
  controller.start('memory')
  controller.start('memory')
  await vi.waitFor(() => expect(releasePage).toHaveBeenCalledTimes(1))
  expect(stop).toHaveBeenCalledTimes(1)
  expect(prompt).toHaveBeenCalledTimes(1)
  expect(restart).not.toHaveBeenCalled()
  answer('quit')
})
