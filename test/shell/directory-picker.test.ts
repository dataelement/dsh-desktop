import { describe, expect, it, vi } from 'vitest'
import { NativeDirectoryPicker } from '../../src/main/shell/native-locale'
import { settleWithin, startDirectoryPickTicks } from '../../src/main/shell/directory-pick'
import { watchDirectoryPick } from '../../src/preload/directory-pick'
import {
  DIRECTORY_PICK_DEADLINE_MS,
  directoryPickLogLine,
  directoryPickStallElapsed,
  directoryPickUserMessage,
  isDirectoryPickOutcome
} from '../../src/shared/directory-picker'

const openOptions = {
  locale: 'en' as const,
  nativeLocale: 'en' as const,
  native: true,
  confirmRestart: async () => 'deferred' as const
}

describe('directory picker failure exit', () => {
  it('releases the in-flight guard when the panel never calls back', async () => {
    const picker = new NativeDirectoryPicker()
    const hung = await picker.pick({
      ...openOptions,
      deadlineMs: 20,
      open: () => new Promise(() => {})
    })
    expect(hung).toEqual({
      kind: 'failed',
      reason: 'timed-out',
      message: directoryPickUserMessage(false, 'unavailable')
    })
    expect(await picker.pick({ ...openOptions, open: async () => '/workspace' })).toEqual({
      kind: 'picked',
      path: '/workspace'
    })
  })

  it('releases the guard when the language check throws, and keeps the failure readable', async () => {
    const picker = new NativeDirectoryPicker()
    const failed = await picker.pick({
      locale: 'zh',
      nativeLocale: 'en',
      native: true,
      confirmRestart: async () => { throw new Error('/Users/secret/settings') },
      open: async () => '/workspace'
    })
    expect(failed).toEqual({
      kind: 'failed',
      reason: 'unexpected',
      message: directoryPickUserMessage(true, 'unavailable')
    })
    expect(await picker.pick({
      locale: 'zh',
      nativeLocale: 'zh',
      native: true,
      confirmRestart: async () => 'deferred',
      open: async () => '/workspace'
    })).toEqual({ kind: 'picked', path: '/workspace' })
  })

  it('ignores a panel result that arrives after the deadline', async () => {
    let settle: (path: string) => void = () => {}
    const operation = settleWithin(new Promise<string>(resolve => { settle = resolve }), 15)
    await expect(operation).rejects.toThrow('directory picker timed out')
    settle('/late')
    await new Promise(resolve => setTimeout(resolve, 0))
  })

  it('ticks immediately and stops without leaving a timer', async () => {
    vi.useFakeTimers()
    try {
      const sent: string[] = []
      const ticks = startDirectoryPickTicks({
        requestId: 'pick-1',
        intervalMs: 1_000,
        send: tick => { sent.push(tick.requestId) }
      })
      expect(sent).toEqual(['pick-1'])
      await vi.advanceTimersByTimeAsync(1_000)
      expect(sent).toEqual(['pick-1', 'pick-1'])
      ticks.stop()
      ticks.stop()
      await vi.advanceTimersByTimeAsync(5_000)
      expect(sent).toEqual(['pick-1', 'pick-1'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps ticking when the window is already gone', () => {
    const ticks = startDirectoryPickTicks({
      requestId: 'pick-1',
      send: () => { throw new Error('window destroyed') }
    })
    ticks.stop()
  })

  it('rejects once when ticks stop and ignores a late selection', async () => {
    let clock = 0
    let fire = (): void => {}
    let resolveInvoke: (value: unknown) => void = () => {}
    const stalled: number[] = []
    const pending = watchDirectoryPick({
      stallMs: 1_000,
      now: () => clock,
      schedule: callback => {
        fire = callback
        return () => { fire = () => {} }
      },
      invoke: () => new Promise(resolve => { resolveInvoke = resolve }),
      subscribe: () => () => {},
      notifyStall: elapsed => { stalled.push(elapsed) },
      message: () => directoryPickUserMessage(true, 'stalled')
    })
    clock = 1_000
    fire()
    await expect(pending).rejects.toThrow(directoryPickUserMessage(true, 'stalled'))
    expect(stalled).toEqual([1_000])
    fire()
    resolveInvoke({ kind: 'picked', path: '/late' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(stalled).toEqual([1_000])
  })

  it('does not treat a slow browse with live ticks as a stall', async () => {
    let clock = 0
    let fire = (): void => {}
    let onTick: (tick: unknown) => void = () => {}
    let resolveInvoke: (value: unknown) => void = () => {}
    const pending = watchDirectoryPick({
      stallMs: 1_000,
      now: () => clock,
      schedule: callback => {
        fire = callback
        return () => {}
      },
      invoke: () => new Promise(resolve => { resolveInvoke = resolve }),
      subscribe: listener => {
        onTick = listener
        return () => {}
      },
      notifyStall: () => { throw new Error('stall') },
      message: () => 'stalled'
    })
    onTick({ requestId: 'pick-1' })
    clock = 5_000
    onTick({ requestId: 'pick-1' })
    onTick({ requestId: 'other' })
    fire()
    resolveInvoke({ kind: 'picked', path: '/workspace' })
    await expect(pending).resolves.toBe('/workspace')
  })

  it('maps cancel and a failed panel without accepting a non-outcome', async () => {
    const watch = (value: unknown): Promise<string | null> => watchDirectoryPick({
      invoke: async () => value,
      subscribe: () => () => {},
      notifyStall: () => {},
      message: () => 'stalled',
      schedule: () => () => {}
    })
    await expect(watch({ kind: 'cancelled' })).resolves.toBeNull()
    await expect(watch({ kind: 'failed', message: '无法打开文件夹选择器，请稍后重试。', reason: 'open-failed' })).rejects.toThrow('无法打开文件夹选择器，请稍后重试。')
    await expect(watch({ kind: 'picked', path: '' })).rejects.toThrow('stalled')
  })

  it('logs the outcome without a path and rejects an implausible stall duration', () => {
    const line = directoryPickLogLine({ platform: 'darwin', elapsedMs: 1200.4, outcome: 'stalled' })
    expect(line).toBe('[desktop] directory-picker stalled platform=darwin elapsedMs=1200')
    expect(line).not.toContain('/Users')
    expect(directoryPickStallElapsed(1200)).toBe(1200)
    expect(directoryPickStallElapsed(-1)).toBeUndefined()
    expect(directoryPickStallElapsed(DIRECTORY_PICK_DEADLINE_MS + 1)).toBeUndefined()
    expect(directoryPickStallElapsed(Number.NaN)).toBeUndefined()
    expect(isDirectoryPickOutcome({ kind: 'cancelled' })).toBe(true)
    expect(isDirectoryPickOutcome({ kind: 'picked', path: '/workspace' })).toBe(true)
    expect(isDirectoryPickOutcome({ kind: 'failed', message: '' })).toBe(false)
  })
})
