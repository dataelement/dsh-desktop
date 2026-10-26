import type { MessageBoxOptions } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runNativeWindowRecovery } from '../src/main/native-window-recovery'
import { rendererDiagnosticText } from '../src/main/renderer-diagnostics'

function deferred<T>() {
  let resolve: (value: T) => void = () => { throw new Error('Promise not initialized') }
  let reject: (error: unknown) => void = () => { throw new Error('Promise not initialized') }
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

function fixture() {
  const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
  const parsed = ts.createSourceFile('index.ts', source, ts.ScriptTarget.ES2022, true)
  const handler = parsed.statements.find((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'showUnexpectedError')
  if (!handler) throw new Error('Missing showUnexpectedError entry point')
  const code = ts.transpileModule(handler.getText(parsed), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText
  const actions: string[] = []
  const context = {
    Error, join, runNativeWindowRecovery, rendererDiagnosticText,
    nativeRecoveryActive: false, quitting: false, gpuFallbackRelaunching: false,
    harnessLocale: vi.fn(() => 'en'),
    recoverCoreConfiguration: vi.fn(async () => 'continue'),
    runtime: {
      note: vi.fn((_line: string) => {}),
      flushLog: vi.fn(async () => { actions.push('flush') })
    },
    dialog: {
      showMessageBox: vi.fn(async (_options: MessageBoxOptions) => { actions.push('dialog'); return { response: 0 } }),
      showErrorBox: vi.fn()
    },
    shell: { showItemInFolder: vi.fn((_path: string) => { actions.push('reveal') }) },
    app: {
      getPath: vi.fn((_name: string) => 'diagnostic-logs'),
      relaunch: vi.fn(() => { actions.push('relaunch') }),
      quit: vi.fn(() => { actions.push('quit') })
    },
    console: { error: vi.fn() }
  }
  const report: (error: unknown) => void = runInNewContext(code + ';showUnexpectedError', context)
  return { context, report, actions }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('native recovery entry point integration', () => {
  it('sets the duplicate guard synchronously and holds it while diagnostics and the dialog are pending', async () => {
    const { context, report } = fixture()
    const flush = deferred<void>()
    const dialog = deferred<{ response: number }>()
    context.runtime.flushLog.mockReturnValue(flush.promise)
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('first renderer failure'))
    expect(context.nativeRecoveryActive).toBe(true)
    report(new Error('duplicate before flush starts'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.runtime.flushLog).toHaveBeenCalledOnce()
    expect(context.dialog.showMessageBox).not.toHaveBeenCalled()
    report(new Error('duplicate during flush'))
    flush.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    expect(context.nativeRecoveryActive).toBe(true)
    report(new Error('duplicate while dialog is open'))
    expect(context.runtime.flushLog).toHaveBeenCalledOnce()
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    dialog.resolve({ response: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.quit).toHaveBeenCalledOnce()
    expect(context.nativeRecoveryActive).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('flushes before the dialog and sanitizes error URLs in both native copy and persisted notes', async () => {
    const { context, report, actions } = fixture()
    const error = new Error('load failed: http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(actions).toEqual(['flush', 'dialog', 'quit'])
    const shown = context.dialog.showMessageBox.mock.calls[0]?.[0]
    expect(shown?.detail).toContain('http://127.0.0.1:4321/route')
    expect(shown?.detail).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    const notes = context.runtime.note.mock.calls.map(([line]) => line).join('\n')
    expect(notes).toContain('unexpected error: Error: load failed: http://127.0.0.1:4321/route')
    expect(notes).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] unexpected error:', rendererDiagnosticText(error.stack ?? error.message))
  })

  it('reveals the persisted harness log and offers native actions again before restarting', async () => {
    const { context, report, actions } = fixture()
    context.dialog.showMessageBox.mockResolvedValueOnce({ response: 3 }).mockResolvedValueOnce({ response: 1 })
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.getPath).toHaveBeenCalledWith('logs')
    expect(context.shell.showItemInFolder).toHaveBeenCalledWith(join('diagnostic-logs', 'harness.log'))
    expect(context.dialog.showMessageBox).toHaveBeenCalledTimes(2)
    for (const [options] of context.dialog.showMessageBox.mock.calls) {
      expect(options).toMatchObject({
        type: 'error', buttons: ['Quit', 'Restart', 'Recover Configuration', 'View Diagnostics'],
        defaultId: 0, cancelId: 0, noLink: true
      })
    }
    expect(actions).toEqual(['flush', 'reveal', 'relaunch', 'quit'])
    expect(context.app.relaunch).toHaveBeenCalledOnce()
    expect(context.app.quit).toHaveBeenCalledOnce()
  })

  it.each(['quitting', 'gpuFallbackRelaunching'] as const)('ignores the returned native action when %s begins while the dialog is open', async (flag) => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    context[flag] = true
    dialog.resolve({ response: 1 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.recoverCoreConfiguration).not.toHaveBeenCalled()
    expect(context.nativeRecoveryActive).toBe(false)
  })

  it.each([
    ['dialog', 'quitting'],
    ['dialog', 'gpuFallbackRelaunching'],
    ['configuration', 'quitting'],
    ['configuration', 'gpuFallbackRelaunching']
  ] as const)('suppresses a deferred %s rejection after %s and releases the guard', async (stage, flag) => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    const configuration = deferred<string>()
    if (stage === 'dialog') context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    else {
      context.dialog.showMessageBox.mockResolvedValue({ response: 2 })
      context.recoverCoreConfiguration.mockReturnValue(configuration.promise)
    }
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.nativeRecoveryActive).toBe(true)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    if (stage === 'configuration') expect(context.recoverCoreConfiguration).toHaveBeenCalledOnce()
    else expect(context.recoverCoreConfiguration).not.toHaveBeenCalled()
    context[flag] = true
    const failure = new Error('late failure http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    if (stage === 'dialog') dialog.reject(failure)
    else configuration.reject(failure)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showErrorBox).not.toHaveBeenCalled()
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.nativeRecoveryActive).toBe(false)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    const logged = context.console.error.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(logged).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses the native error-box fallback after a rejected dialog and releases the guard', async () => {
    const { context, report } = fixture()
    const failure = new Error('native dialog unavailable')
    const error = new Error('load http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    context.dialog.showMessageBox.mockRejectedValue(failure)
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    expect(context.dialog.showErrorBox).toHaveBeenCalledWith('DSH Desktop', rendererDiagnosticText(error.stack ?? error.message))
    expect(context.dialog.showErrorBox.mock.calls[0]?.[1]).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(context.nativeRecoveryActive).toBe(false)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
  })
})
