import { ProcessRecovery } from '../src/main/process-recovery'
import { applicationText } from '../src/main/application-locale'
import type { MessageBoxOptions } from 'electron'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestWindowRestart } from '../src/main/window-restart-prompt'
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
  const fallback = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'reportNativeRecoveryFailure')
  if (!fallback) throw new Error('Missing native fallback')
  const code = ts.transpileModule(handler.getText(parsed) + '\n' + fallback.getText(parsed), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText
  const actions: string[] = []
  const context = {
    Error, applicationText, requestWindowRestart: vi.fn(requestWindowRestart), rendererDiagnosticText,
    quitting: false, gpuFallbackRelaunching: false,
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
  const handlers = runInNewContext(code + ';({ report: showUnexpectedError, fallback: reportNativeRecoveryFailure })', context)
  const processRecovery = new ProcessRecovery({
    cancelled: () => context.quitting || context.gpuFallbackRelaunching,
    stop: async () => {}, releasePage: async () => {},
    prompt: kind => context.requestWindowRestart({
      locale: context.harnessLocale() === 'zh' ? 'zh' : 'en',
      cancelled: () => context.quitting || context.gpuFallbackRelaunching,
      flushDiagnostics: () => context.runtime.flushLog(),
      show: options => context.dialog.showMessageBox(options),
      note: line => context.runtime.note(rendererDiagnosticText(line))
    }, kind),
    restart: () => context.app.relaunch(), quit: () => context.app.quit(),
    onError: handlers.fallback
  })
  const boundContext = Object.assign(context, { processRecovery })
  const report: (error: unknown) => void = handlers.report
  return { context: boundContext, report, actions }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('window restart prompt entry point', () => {
  it('sets the duplicate guard synchronously and holds it while diagnostics and the dialog are pending', async () => {
    const { context, report } = fixture()
    const flush = deferred<void>()
    const dialog = deferred<{ response: number }>()
    context.runtime.flushLog.mockReturnValue(flush.promise)
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('first renderer failure'))
    expect(context.processRecovery.blocked).toBe(true)
    report(new Error('duplicate before flush starts'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.runtime.flushLog).toHaveBeenCalledOnce()
    expect(context.dialog.showMessageBox).not.toHaveBeenCalled()
    report(new Error('duplicate during flush'))
    flush.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    expect(context.processRecovery.blocked).toBe(true)
    report(new Error('duplicate while dialog is open'))
    expect(context.runtime.flushLog).toHaveBeenCalledOnce()
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    dialog.resolve({ response: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).toHaveBeenCalledOnce()
    expect(context.app.quit).toHaveBeenCalledOnce()
    expect(context.processRecovery.blocked).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps sanitized error details in persisted notes and out of the dialog', async () => {
    const { context, report, actions } = fixture()
    context.harnessLocale.mockReturnValue('zh')
    const error = new Error('load failed: http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(actions).toEqual(['flush', 'dialog', 'relaunch', 'quit'])
    const shown = context.dialog.showMessageBox.mock.calls[0]?.[0]
    expect(shown).toEqual({
      type: 'none', title: 'DSH Desktop', message: '窗口暂时无法显示',
      detail: '请重新启动 DSH Desktop 后重试。', buttons: ['重新启动'],
      defaultId: 0, cancelId: 0, noLink: true
    })
    expect(JSON.stringify(shown)).not.toMatch(/load failed|http:|credential-secret|query-secret|fragment-secret|Error:| at /)
    const recoveryOptions = context.requestWindowRestart.mock.calls[0]?.[0]
    expect(recoveryOptions?.locale).toBe('zh')
    const notes = context.runtime.note.mock.calls.map(([line]) => line).join('\n')
    expect(notes).toContain('unexpected error: Error: load failed: http://127.0.0.1:4321/route')
    expect(notes).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] unexpected error:', rendererDiagnosticText(error.stack ?? error.message))
  })

  it('ignores Restart when a GPU relaunch begins while the dialog is open', async () => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    context.gpuFallbackRelaunching = true
    dialog.resolve({ response: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.processRecovery.blocked).toBe(false)
  })

  it('suppresses a deferred dialog rejection after quit and releases the guard', async () => {
    const { context, report } = fixture()
    const dialog = deferred<{ response: number }>()
    context.dialog.showMessageBox.mockReturnValue(dialog.promise)
    report(new Error('renderer failed'))
    await vi.advanceTimersByTimeAsync(0)
    expect(context.processRecovery.blocked).toBe(true)
    expect(context.dialog.showMessageBox).toHaveBeenCalledOnce()
    context.quitting = true
    const failure = new Error('late failure http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    dialog.reject(failure)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.dialog.showErrorBox).not.toHaveBeenCalled()
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
    expect(context.processRecovery.blocked).toBe(false)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    const logged = context.runtime.note.mock.calls.map(([line]) => line).join('\n')
    expect(logged).toContain('native recovery failed')
    expect(logged).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('uses a plain error-box fallback after dialog rejection', async () => {
    const { context, report } = fixture()
    const failure = new Error('native dialog unavailable')
    const error = new Error('load http://user:credential-secret@127.0.0.1:4321/route?token=query-secret#fragment-secret')
    context.dialog.showMessageBox.mockRejectedValue(failure)
    report(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(context.console.error).toHaveBeenCalledWith('[desktop] native recovery failed', rendererDiagnosticText(String(failure)))
    expect(context.dialog.showErrorBox).toHaveBeenCalledOnce()
    const fallbackText = context.dialog.showErrorBox.mock.calls[0]?.[1]
    expect(fallbackText).toContain('Unable to display the window')
    expect(fallbackText).toMatch(/restart/i)
    expect(fallbackText).not.toMatch(/credential-secret|query-secret|fragment-secret|http:|Error:| at |native dialog unavailable/)
    expect(context.runtime.note.mock.calls.map(([line]) => line).join('\n')).toContain('native recovery failed')
    expect(context.processRecovery.blocked).toBe(false)
    expect(context.app.relaunch).not.toHaveBeenCalled()
    expect(context.app.quit).not.toHaveBeenCalled()
  })
})
