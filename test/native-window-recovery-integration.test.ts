import type { MessageBoxOptions } from 'electron'
import { readFileSync } from 'node:fs'
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
    Error, runNativeWindowRecovery: vi.fn(runNativeWindowRecovery), rendererDiagnosticText,
    nativeRecoveryActive: false, quitting: false, gpuFallbackRelaunching: false,
    harnessLocale: vi.fn(() => 'en'),
    runtime: {
      note: vi.fn((_line: string) => {}),
      flushLog: vi.fn(async () => { actions.push('flush') })
    },
    dialog: {
      showMessageBox: vi.fn(async (_options: MessageBoxOptions) => { actions.push('dialog'); return { response: 0 } }),
      showErrorBox: vi.fn()
    },
    app: {
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
    dialog.resolve({ response: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).toHaveBeenCalledOnce()
    expect(context.app.quit).toHaveBeenCalledOnce()
    expect(context.nativeRecoveryActive).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps sanitized error details in persisted notes and out of the dialog', async () => {
    const { context, report, actions } = fixture()
    const error = new Error('load failed: http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(actions).toEqual(['flush', 'dialog', 'relaunch', 'quit'])
    const shown = context.dialog.showMessageBox.mock.calls[0]?.[0]
    expect(shown).not.toHaveProperty('detail')
    expect(JSON.stringify(shown)).not.toMatch(/load failed|http:|credential-secret|query-secret|fragment-secret|Error:| at /)
    const recoveryOptions = context.runNativeWindowRecovery.mock.calls[0]?.[0]
    expect(recoveryOptions).not.toHaveProperty('message')
    expect(recoveryOptions).not.toHaveProperty('recoverConfiguration')
    expect(recoveryOptions).not.toHaveProperty('revealDiagnostics')
    const notes = context.runtime.note.mock.calls.map(([line]) => line).join('\n')
    expect(notes).toContain('unexpected error: Error: load failed: http://127.0.0.1:4321/route')
    expect(notes).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] unexpected error:', rendererDiagnosticText(error.stack ?? error.message))
  })

  it.each(['en', 'zh'])('shows only the localized Restart action for %s', async (locale) => {
    const { context, report, actions } = fixture()
    context.harnessLocale.mockReturnValue(locale)
    report(new Error('renderer failed with private diagnostic context'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledExactlyOnceWith({
      type: 'error', title: 'DSH Desktop',
      message: locale === 'zh' ? '应用窗口无法加载。请重新启动 DSH Desktop。' : 'The application window could not load. Please restart DSH Desktop.',
      buttons: locale === 'zh' ? ['重新启动'] : ['Restart'],
      defaultId: 0, cancelId: 0, noLink: true
    })
    expect(actions).toEqual(['flush', 'dialog', 'relaunch', 'quit'])
    expect(context.app.relaunch).toHaveBeenCalledOnce()
    expect(context.app.quit).toHaveBeenCalledOnce()
  })

  it('treats Electron cancellation mapped to the only button as Restart', async () => {
    const { context, report } = fixture()
    context.dialog.showMessageBox.mockImplementation(async (options: { cancelId?: number }) => ({ response: options.cancelId ?? -1 }))
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).toHaveBeenCalledOnce()
    expect(context.app.quit).toHaveBeenCalledOnce()
  })

  it('ignores a platform response with no button selection and releases the guard', async () => {
    const { context, report } = fixture()
    context.dialog.showMessageBox.mockResolvedValue({ response: -1 })
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.nativeRecoveryActive).toBe(false)
  })

  it.each(['quitting', 'gpuFallbackRelaunching'] as const)('ignores the returned native action when %s begins while the dialog is open', async (flag) => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    context[flag] = true
    dialog.resolve({ response: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.nativeRecoveryActive).toBe(false)
  })

  it.each(['quitting', 'gpuFallbackRelaunching'] as const)('suppresses a deferred dialog rejection after %s and releases the guard', async (flag) => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.nativeRecoveryActive).toBe(true)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    context[flag] = true
    const failure = new Error('late failure http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    dialog.reject(failure)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showErrorBox).not.toHaveBeenCalled()
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.nativeRecoveryActive).toBe(false)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    const logged = context.runtime.note.mock.calls.map(([line]) => line).join('\n')
    expect(logged).toContain('native recovery failed')
    expect(logged).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['en', 'zh'])('uses plain localized error-box fallback after dialog rejection for %s', async (locale) => {
    const { context, report } = fixture()
    context.harnessLocale.mockReturnValue(locale)
    const failure = new Error('native dialog unavailable')
    const error = new Error('load http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    context.dialog.showMessageBox.mockRejectedValue(failure)
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    expect(context.dialog.showErrorBox).toHaveBeenCalledOnce()
    const fallbackText = context.dialog.showErrorBox.mock.calls[0]?.[1]
    expect(fallbackText).toMatch(locale === 'zh' ? /窗口.*无法.*加载/ : /window.*could not load/i)
    expect(fallbackText).toMatch(locale === 'zh' ? /重新启动/ : /restart/i)
    expect(fallbackText).not.toMatch(/credential-secret|query-secret|fragment-secret|http:|Error:| at |native dialog unavailable/)
    expect(context.runtime.note.mock.calls.map(([line]) => line).join('\n')).toContain('native recovery failed')
    expect(context.nativeRecoveryActive).toBe(false)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
  })
})