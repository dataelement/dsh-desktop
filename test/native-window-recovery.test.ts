import type { MessageBoxOptions } from 'electron'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runNativeWindowRecovery } from '../src/main/native-window-recovery'

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Promise not initialized') }
  let reject: (error: unknown) => void = () => { throw new Error('Promise not initialized') }
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

function setup() {
  return {
    chinese: false,
    cancelled: vi.fn(() => false),
    flushDiagnostics: vi.fn(async () => {}),
    show: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 })),
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
      buttons: ['Restart'],
      defaultId: 0, cancelId: 0, noLink: true
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
    expect(options.note).toHaveBeenCalledWith('[desktop] native recovery diagnostics flush timed out after 1000ms')
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

  it('does not show recovery after the flush deadline if cancelled while persistence stalls', async () => {
    vi.useFakeTimers()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(new Promise<void>(() => {}))
    const operation = runNativeWindowRecovery(options)
    await vi.advanceTimersByTimeAsync(999)
    options.cancelled.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(1)
    await operation
    expect(options.show).not.toHaveBeenCalled()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([-1, 0])('ignores response %i after cancellation while the dialog is open', async (response) => {
    const options = setup()
    const dialog = deferred<{ response: number }>()
    const opened = deferred<void>()
    options.show.mockImplementation(() => { opened.resolve(); return dialog.promise })
    const operation = runNativeWindowRecovery(options)
    await opened.promise
    options.cancelled.mockReturnValue(true)
    dialog.resolve({ response })
    await operation
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it.each([
    [false, 'The application window could not load. Please restart DSH Desktop.', 'Restart'],
    [true, '应用窗口无法加载。请重新启动 DSH Desktop。', '重新启动']
  ] as const)('uses only clear load and restart copy for chinese=%s', async (chinese, message, button) => {
    const options = setup()
    options.chinese = chinese
    await runNativeWindowRecovery(options)
    expect(options.show).toHaveBeenCalledExactlyOnceWith({
      type: 'error', title: 'DSH Desktop', message, buttons: [button],
      defaultId: 0, cancelId: 0, noLink: true
    })
    expect(options.show.mock.calls[0]?.[0]).not.toHaveProperty('detail')
  })

  it('restarts before quitting once even if a native promise resolves twice', async () => {
    const options = setup()
    const dialog = deferred<{ response: number }>()
    const actions: string[] = []
    options.show.mockReturnValue(dialog.promise)
    options.restart.mockImplementation(() => { actions.push('restart') })
    options.quit.mockImplementation(() => { actions.push('quit') })
    const operation = runNativeWindowRecovery(options)
    dialog.resolve({ response: 0 })
    dialog.resolve({ response: 0 })
    await operation
    expect(actions).toEqual(['restart', 'quit'])
    expect(options.show).toHaveBeenCalledOnce()
    expect(options.flushDiagnostics).toHaveBeenCalledOnce()
  })

  it.each([-1, 1, 2, 3])('does not restart or quit for a platform response without a matching button %i', async (response) => {
    const options = setup()
    options.show.mockResolvedValue({ response })
    await runNativeWindowRecovery(options)
    expect(options.show).toHaveBeenCalledOnce()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('does not quit if restart triggers cancellation', async () => {
    const options = setup()
    options.restart.mockImplementation(() => { options.cancelled.mockReturnValue(true) })
    await runNativeWindowRecovery(options)
    expect(options.restart).toHaveBeenCalledOnce()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('propagates dialog errors to the caller fallback', async () => {
    const options = setup()
    const error = new Error('native recovery failed')
    options.show.mockRejectedValue(error)
    await expect(runNativeWindowRecovery(options)).rejects.toBe(error)
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })
})
