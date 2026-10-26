import type { MessageBoxOptions } from 'electron'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runNativeWindowRecovery, type NativeWindowRecoveryOptions } from '../src/main/native-window-recovery'

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Promise not initialized') }
  let reject: (error: unknown) => void = () => { throw new Error('Promise not initialized') }
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

function setup() {
  return {
    message: 'renderer process failed',
    chinese: false,
    cancelled: vi.fn(() => false),
    flushDiagnostics: vi.fn(async () => {}),
    show: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 })),
    recoverConfiguration: vi.fn<NativeWindowRecoveryOptions['recoverConfiguration']>(async () => 'continue'),
    revealDiagnostics: vi.fn(),
    restart: vi.fn(),
    quit: vi.fn(),
    note: vi.fn()
  }
}

afterEach(() => { vi.useRealTimers() })

describe('native window recovery', () => {
  it('waits for diagnostics persistence before showing the native dialog and clears the timer', async () => {
    vi.useFakeTimers()
    const flush = deferred<void>()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(flush.promise)
    const operation = runNativeWindowRecovery(options)
    await Promise.resolve()
    expect(options.flushDiagnostics).toHaveBeenCalledOnce()
    expect(options.show).not.toHaveBeenCalled()
    flush.resolve()
    await operation
    expect(vi.getTimerCount()).toBe(0)
    expect(options.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error', title: 'DSH Desktop',
      buttons: ['Quit', 'Restart', 'Recover Configuration', 'View Diagnostics'],
      defaultId: 0, cancelId: 0, noLink: true,
      detail: expect.stringContaining(options.message)
    }))
    expect(options.quit).toHaveBeenCalledOnce()
  })

  it('shows recovery after exactly one second when persistence stalls and handles a later rejection', async () => {
    vi.useFakeTimers()
    const flush = deferred<void>()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(flush.promise)
    const operation = runNativeWindowRecovery(options)
    await vi.advanceTimersByTimeAsync(999)
    expect(options.show).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await operation
    expect(options.show).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    flush.reject(new Error('late disk failure'))
    await Promise.resolve()
    await Promise.resolve()
    expect(options.note).toHaveBeenCalledWith(expect.stringContaining('late disk failure'))
  })

  it.each(['reject', 'throw'] as const)('logs a flush %s and still shows recovery', async (failure) => {
    vi.useFakeTimers()
    const options = setup()
    if (failure === 'reject') options.flushDiagnostics.mockRejectedValue(new Error('disk unavailable'))
    else options.flushDiagnostics.mockImplementation(() => { throw new Error('disk unavailable') })
    await runNativeWindowRecovery(options)
    expect(options.note).toHaveBeenCalledWith(expect.stringContaining('diagnostics flush failed: Error: disk unavailable'))
    expect(options.show).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does nothing when cancelled before starting', async () => {
    const options = setup()
    options.cancelled.mockReturnValue(true)
    await runNativeWindowRecovery(options)
    expect(options.flushDiagnostics).not.toHaveBeenCalled()
    expect(options.show).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('does not show a dialog if cancelled while flushing diagnostics', async () => {
    const options = setup()
    options.flushDiagnostics.mockImplementation(async () => { options.cancelled.mockReturnValue(true) })
    await runNativeWindowRecovery(options)
    expect(options.show).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it.each([0, 1, 2, 3])('ignores dialog response %i after cancellation while the dialog is open', async (response) => {
    const options = setup()
    const dialog = deferred<{ response: number }>()
    options.show.mockReturnValue(dialog.promise)
    // The show mock marks the point where the awaited native dialog is open.
    const opened = deferred<void>()
    options.show.mockImplementation(() => { opened.resolve(); return dialog.promise })
    const operation = runNativeWindowRecovery(options)
    await opened.promise
    options.cancelled.mockReturnValue(true)
    dialog.resolve({ response })
    await operation
    expect(options.recoverConfiguration).not.toHaveBeenCalled()
    expect(options.revealDiagnostics).not.toHaveBeenCalled()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('views diagnostics then returns to the native dialog and restarts before quitting', async () => {
    const options = setup()
    const actions: string[] = []
    options.show.mockResolvedValueOnce({ response: 3 }).mockResolvedValueOnce({ response: 1 })
    options.revealDiagnostics.mockImplementation(() => { actions.push('view') })
    options.restart.mockImplementation(() => { actions.push('restart') })
    options.quit.mockImplementation(() => { actions.push('quit') })
    await runNativeWindowRecovery(options)
    expect(actions).toEqual(['view', 'restart', 'quit'])
    expect(options.show).toHaveBeenCalledTimes(2)
    expect(options.flushDiagnostics).toHaveBeenCalledOnce()
  })

  it('logs reveal failures and keeps the native recovery dialog available', async () => {
    const options = setup()
    options.show.mockResolvedValueOnce({ response: 3 })
    options.revealDiagnostics.mockImplementation(() => { throw new Error('folder unavailable') })
    await runNativeWindowRecovery(options)
    expect(options.note).toHaveBeenCalledWith(expect.stringContaining('reveal diagnostics failed: Error: folder unavailable'))
    expect(options.show).toHaveBeenCalledTimes(2)
    expect(options.quit).toHaveBeenCalledOnce()
  })

  it.each(['retry', 'continue'] as const)('handles configuration recovery returning %s', async (result) => {
    const options = setup()
    const actions: string[] = []
    options.show.mockResolvedValueOnce({ response: 2 })
    options.recoverConfiguration.mockResolvedValue(result)
    options.restart.mockImplementation(() => { actions.push('restart') })
    options.quit.mockImplementation(() => { actions.push('quit') })
    await runNativeWindowRecovery(options)
    expect(options.recoverConfiguration).toHaveBeenCalledOnce()
    expect(options.show).toHaveBeenCalledTimes(result === 'retry' ? 1 : 2)
    expect(actions).toEqual(result === 'retry' ? ['restart', 'quit'] : ['quit'])
  })

  it.each(['retry', 'continue'] as const)('ignores configuration result %s after cancellation during recovery', async (result) => {
    const options = setup()
    const recovery = deferred<'retry' | 'continue'>()
    const started = deferred<void>()
    options.show.mockResolvedValue({ response: 2 })
    options.recoverConfiguration.mockImplementation(() => { started.resolve(); return recovery.promise })
    const operation = runNativeWindowRecovery(options)
    await started.promise
    options.cancelled.mockReturnValue(true)
    recovery.resolve(result)
    await operation
    expect(options.show).toHaveBeenCalledOnce()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('uses Chinese native actions and explains the limited scope of configuration recovery', async () => {
    const options = setup()
    options.chinese = true
    await runNativeWindowRecovery(options)
    expect(options.show).toHaveBeenCalledWith(expect.objectContaining({
      buttons: ['退出', '重新启动', '恢复配置', '查看诊断信息'],
      detail: expect.stringContaining('不保证能解决窗口加载问题')
    }))
  })

  it.each(['dialog', 'configuration'] as const)('propagates %s errors to the caller fallback', async (stage) => {
    const options = setup()
    const error = new Error('native recovery failed')
    if (stage === 'dialog') options.show.mockRejectedValue(error)
    else {
      options.show.mockResolvedValue({ response: 2 })
      options.recoverConfiguration.mockRejectedValue(error)
    }
    await expect(runNativeWindowRecovery(options)).rejects.toBe(error)
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })
})
