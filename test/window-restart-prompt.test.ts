import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import type { HarnessLocale } from '../src/main/application-locale'
import type { MessageBoxOptions } from 'electron'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestWindowRestart, showWindowRestartPrompt } from '../src/main/window-restart-prompt'

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Promise not initialized') }
  let reject: (error: unknown) => void = () => { throw new Error('Promise not initialized') }
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

function setup() {
  return {
    locale: 'en' as HarnessLocale,
    cancelled: vi.fn(() => false),
    flushDiagnostics: vi.fn(async () => {}),
    show: vi.fn(async (_options: MessageBoxOptions) => ({ response: 0 })),
    restart: vi.fn(),
    quit: vi.fn(),
    note: vi.fn()
  }
}

afterEach(() => { vi.useRealTimers() })

describe('window restart prompt', () => {
  it('waits for diagnostics persistence before showing the native dialog and clears the timer', async () => {
    vi.useFakeTimers()
    const actions: string[] = []
    const flush = deferred<void>()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(flush.promise)
    options.restart.mockImplementation(() => { actions.push('restart') })
    options.quit.mockImplementation(() => { actions.push('quit') })
    const operation = showWindowRestartPrompt(options)
    await Promise.resolve()
    expect(options.flushDiagnostics).toHaveBeenCalledOnce()
    expect(options.show).not.toHaveBeenCalled()
    flush.resolve()
    await operation
    expect(vi.getTimerCount()).toBe(0)
    expect(options.show).toHaveBeenCalledWith({
      type: 'none', title: 'DSH Desktop',
      message: 'Unable to display the window', detail: 'Please restart DSH Desktop to try again.',
      buttons: ['Restart'], defaultId: 0, cancelId: 0, noLink: true
    })
    expect(actions).toEqual(['restart', 'quit'])
  })

  it('shows recovery after exactly one second when persistence stalls and handles a later rejection', async () => {
    vi.useFakeTimers()
    const flush = deferred<void>()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(flush.promise)
    const operation = showWindowRestartPrompt(options)
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

  it('logs a synchronous flush failure and still shows recovery', async () => {
    vi.useFakeTimers()
    const options = setup()
    options.flushDiagnostics.mockImplementation(() => { throw new Error('disk unavailable') })
    await showWindowRestartPrompt(options)
    expect(options.note).toHaveBeenCalledWith(expect.stringContaining('diagnostics flush failed: Error: disk unavailable'))
    expect(options.show).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does nothing when cancelled before starting', async () => {
    const options = setup()
    options.cancelled.mockReturnValue(true)
    await showWindowRestartPrompt(options)
    expect(options.flushDiagnostics).not.toHaveBeenCalled()
    expect(options.show).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('does not show recovery after the flush deadline if cancelled while persistence stalls', async () => {
    vi.useFakeTimers()
    const options = setup()
    options.flushDiagnostics.mockReturnValue(new Promise<void>(() => {}))
    const operation = showWindowRestartPrompt(options)
    await vi.advanceTimersByTimeAsync(999)
    options.cancelled.mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(1)
    await operation
    expect(options.show).not.toHaveBeenCalled()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores a platform response with no matching button', async () => {
    const options = setup()
    options.show.mockResolvedValue({ response: -1 })
    await showWindowRestartPrompt(options)
    expect(options.show).toHaveBeenCalledOnce()
    expect(options.restart).not.toHaveBeenCalled()
    expect(options.quit).not.toHaveBeenCalled()
  })

  it('does not quit if restart triggers cancellation', async () => {
    const options = setup()
    options.restart.mockImplementation(() => { options.cancelled.mockReturnValue(true) })
    await showWindowRestartPrompt(options)
    expect(options.restart).toHaveBeenCalledOnce()
    expect(options.quit).not.toHaveBeenCalled()
  })
})

it('keeps native recovery available after a real asynchronous log-file write error', async () => {
  const root = mkdtempSync(join(tmpdir(), 'native-recovery-write-error-'))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  // An existing directory cannot be opened as a log file on either supported OS.
  const runtime = new HarnessRuntime({
    dshEntryPath: '', nodeExecutablePath: '', nodeEntryPath: '', dshPatchPath: '', dshSafePatchPath: '',
    dshHome: root, logPath: root, launchProcess: () => { throw new Error('Not used') }, onChanged: () => {}
  })
  const show = vi.fn(async () => ({ response: 0 }))
  const quit = vi.fn()
  const note = vi.fn()
  try {
    runtime.note('renderer launch-failed exitCode=18')
    await showWindowRestartPrompt({
      locale: 'en', cancelled: () => false,
      flushDiagnostics: () => runtime.flushLog(), show, restart: () => {}, quit, note
    })
    // The file error event can follow its write callback; observe that event before cleanup.
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(show).toHaveBeenCalledOnce()
    expect(quit).toHaveBeenCalledOnce()
    expect(note).toHaveBeenCalledWith(expect.stringContaining('diagnostics flush failed'))
    expect(runtime.snapshot().logs).toContain('renderer launch-failed exitCode=18')
    await expect(runtime.flushLog()).rejects.toBeInstanceOf(Error)
  } finally {
    await runtime.stop()
    warn.mockRestore()
    rmSync(root, { recursive: true, force: true })
  }
})


it.each(['memory', 'graphics'] as const)('requires an explicit restart choice for %s', async kind => {
  const options = setup()
  expect(await requestWindowRestart(options, kind)).toBe('quit')
  expect(options.show.mock.calls[0]?.[0]).toMatchObject({ defaultId: 0, cancelId: 0 })
  options.show.mockResolvedValue({ response: 1 })
  expect(await requestWindowRestart(options, kind)).toBe(kind === 'memory' ? 'restart' : 'software')
  options.show.mockResolvedValue({ response: -1 })
  expect(await requestWindowRestart(options, kind)).toBeUndefined()
  expect(options.restart).not.toHaveBeenCalled()
  expect(options.quit).not.toHaveBeenCalled()
})
