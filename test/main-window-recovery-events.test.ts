import { rendererDiagnosticText, rendererDiagnosticUrl } from '../src/main/renderer-diagnostics'
import { release } from 'node:os'
import { mkdtempSync, readFileSync as readLog, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, expect, it, vi } from 'vitest'
import { navigateDesktopWindow, registerNavigationOwner } from '../src/main/desktop-navigation'
import { RendererNavigationRecovery } from '../src/main/renderer-navigation-recovery'
import { loadDesktopWindowAfterStop } from '../src/main/desktop-window-load'
import { shouldReloadAfterMainWindowRendererLoss, MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS } from '../src/main/main-window-recovery'

function fixture(note: (line: string) => void = () => {}) {
  const source = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
  const start = source.includes('function reloadMainWindowAfterRendererLoss(')
    ? source.indexOf('function reloadMainWindowAfterRendererLoss(')
    : source.indexOf('function installMainWindowRendererRecovery(')
  const end = source.indexOf('function windowsTitleBarOverlay(', start)
  const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const window = new EventEmitter()
  const contents = new EventEmitter()
  const loads: { resolve: () => void; reject: (error: Error) => void }[] = []
  const target = Object.assign(window, {
    isDestroyed: () => false,
    webContents: Object.assign(contents, {
      isDestroyed: () => false, isLoading: vi.fn(() => false), getURL: vi.fn(() => 'file:///splash.html'), reload: vi.fn(), stop: vi.fn()
    }),
    loadURL: vi.fn(() => new Promise<void>((resolve, reject) => loads.push({ resolve, reject })))
  })
  const error = vi.fn()
  const context = {
    rendererDiagnosticText, rendererDiagnosticUrl, release, RendererNavigationRecovery, loadDesktopWindowAfterStop, registerNavigationOwner, shouldReloadAfterMainWindowRendererLoss,
    MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS, mainWindowRecoveryReloadAt: 0,
    mainWindowRecoveryReloadCount: 0, quitting: false, gpuFallbackRelaunching: false,
    harnessRendered: false, clearProfileBootConfirmation: vi.fn(), recordMainWindowRendererLoss: vi.fn((source, details) => note(source + ": " + details)),
    showUnexpectedError: error, isRendererGpuFallbackCandidate: () => false,
    app: { getVersion: () => "test", getGPUFeatureStatus: () => ({}) }, runtime: { note }, process, setTimeout, clearTimeout
  }
  const install: (target: typeof window) => void = runInNewContext(code + ';installMainWindowRendererRecovery', context)
  install(target)
  return { target, contents, loads, error }
}

afterEach(() => vi.useRealTimers())

it('persists native evidence and the exhausted timeline in the raw runtime log without URL secrets', async () => {
  vi.useFakeTimers()
  const dir = mkdtempSync(join(tmpdir(), 'renderer-diagnostics-'))
  const logPath = join(dir, 'harness.log')
  const runtime = new HarnessRuntime({
    dshEntryPath: '', nodeExecutablePath: '', nodeEntryPath: '', dshPatchPath: '', dshSafePatchPath: '',
    dshHome: dir, logPath, launchProcess: () => { throw new Error('Not used') }, onChanged: () => {}
  })
  const f = fixture(line => runtime.note(line))
  const url = 'http://user:credential-secret@127.0.0.1:1234/route?token=query-secret#fragment-secret'
  f.target.webContents.getURL.mockReturnValue(url)
  try {
    const result = navigateDesktopWindow(f.target, url, () => false).catch(f.error)
    for (let i = 0; i < 4; i++) {
      f.contents.emit('did-fail-load', {}, -2, 'ERR_FAILED loading ' + url, url, true)
      f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'launch-failed', exitCode: 18 })
      await vi.advanceTimersByTimeAsync(5_000)
    }
    await result
    await runtime.flushLog()
    // Read the actual bytes, not tailLog(), which would conceal leaks through its own redaction.
    const raw = readLog(logPath, 'utf8')
    expect(raw).toContain('reason=launch-failed exitCode=18')
    expect(raw).toContain('"phase":"exhausted","reloadCount":3')
    expect(raw).toContain('"rendererLoss":{"reason":"launch-failed","exitCode":18}')
    expect(raw).toContain('renderer environment:')
    expect(raw).toContain('http://127.0.0.1:1234/route')
    expect(raw).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(f.error).toHaveBeenCalledTimes(1)
  } finally {
    f.target.emit('closed')
    await runtime.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})
it('drains the previous native load before installing the replacement load promise', async () => {
  vi.useFakeTimers()
  const f = fixture()
  const result = navigateDesktopWindow(f.target, 'file:///splash.html', () => false)
  const outcome = result.then(value => ({ value }), error => ({ error }))
  f.target.webContents.isLoading.mockReturnValue(true)
  f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'launch-failed', exitCode: 18 })
  await vi.advanceTimersByTimeAsync(5_000)
  // Windows can deliver the old abort after the replacement would have started.
  expect(f.target.loadURL).toHaveBeenCalledTimes(1)
  f.loads[0]?.reject(Object.assign(new Error('old load aborted'), { errno: -3, code: '' }))
  f.contents.emit('did-fail-load', {}, -3, '', 'file:///splash.html', true)
  f.target.webContents.isLoading.mockReturnValue(false)
  f.contents.emit('did-stop-loading')
  await vi.advanceTimersByTimeAsync(0)
  expect(f.target.loadURL).toHaveBeenCalledTimes(2)
  f.loads[1]?.resolve()
  await expect(outcome).resolves.toEqual({ value: true })
  f.target.emit('closed')
})

it('actual callbacks recover a settled client route after direct reload failure', async () => {
  vi.useFakeTimers()
  const f = fixture()
  const initial = navigateDesktopWindow(f.target, 'http://127.0.0.1/?token=launch', () => false)
  f.loads[0]?.resolve()
  await initial
  f.target.webContents.getURL.mockReturnValue('http://127.0.0.1/clean')
  f.contents.emit('did-fail-load', {}, -2, 'ERR_FAILED', 'http://127.0.0.1/clean', true)
  await vi.advanceTimersByTimeAsync(5_000)
  expect(f.target.loadURL).toHaveBeenLastCalledWith('http://127.0.0.1/clean')
  f.loads[1]?.resolve()
  await vi.advanceTimersByTimeAsync(0)
  expect(f.error).not.toHaveBeenCalled()
  f.target.emit('closed')
})


it('actual callbacks preserve newer pending navigation and dispose timers on close', async () => {
  vi.useFakeTimers()
  const f = fixture()
  const old = navigateDesktopWindow(f.target, 'file:///splash.html', () => false)
  const current = navigateDesktopWindow(f.target, 'http://127.0.0.1/new', () => false)
  f.contents.emit('did-fail-load', {}, -2, 'ERR_FAILED', 'file:///splash.html', true)
  await expect(old).resolves.toBe(false)
  await vi.advanceTimersByTimeAsync(5_000)
  expect(f.target.loadURL).toHaveBeenCalledTimes(2)
  f.target.emit('closed')
  await expect(current).resolves.toBe(false)
  expect(vi.getTimerCount()).toBe(0)
  expect(f.error).not.toHaveBeenCalled()
})

it.each(['gone-first', 'load-first'])('actual callbacks preserve native evidence and surface exhaustion once: %s', async order => {
  vi.useFakeTimers()
  const f = fixture()
  const result = navigateDesktopWindow(f.target, 'file:///splash.html', () => false).catch(f.error)
  for (let i = 0; i < 4; i++) {
    const gone = () => f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'launch-failed', exitCode: 18 })
    const failed = () => f.contents.emit('did-fail-load', {}, -2, 'ERR_FAILED', 'file:///splash.html', true)
    if (order === 'gone-first') { gone(); failed() } else { failed(); gone() }
    await vi.advanceTimersByTimeAsync(5_000)
    if (i < 3) expect(f.error).not.toHaveBeenCalled()
  }
  await result
  expect(String(f.error.mock.calls[0]?.[0])).toContain('reason=launch-failed exitCode=18')
  expect(f.target.loadURL).toHaveBeenCalledTimes(4)
  expect(f.error).toHaveBeenCalledTimes(1)
  f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'launch-failed', exitCode: 18 })
  await vi.advanceTimersByTimeAsync(5_000)
  expect(f.error).toHaveBeenCalledTimes(1)
  f.target.emit('closed')
})

it.each(['gone-first', 'load-first'])('actual main callbacks await splash replacement without a premature fatal dialog: %s', async order => {
  vi.useFakeTimers()
  const f = fixture()
  let settled = false
  const result = navigateDesktopWindow(f.target, 'file:///splash.html', () => false)
    .then(value => { settled = true; return value }, error => { settled = true; throw error })
  const outcome = result.then(value => ({ value }), error => ({ error }))
  const gone = () => f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'launch-failed', exitCode: 18 })
  const failed = () => f.contents.emit('did-fail-load', {}, -2, 'ERR_FAILED', 'file:///splash.html', true)
  if (order === 'gone-first') { gone(); failed() } else { failed(); gone() }
  f.loads[0]?.reject(Object.assign(new Error('ERR_FAILED'), { code: 'ERR_FAILED' }))
  await vi.advanceTimersByTimeAsync(5_000)
  expect(f.error).not.toHaveBeenCalled()
  expect(settled).toBe(false)
  expect(f.target.loadURL).toHaveBeenCalledTimes(2)
  f.loads[1]?.resolve()
  await expect(outcome).resolves.toEqual({ value: true })
  f.target.emit('closed')
})
