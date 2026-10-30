import { HarnessBootCover } from '../src/main/harness-boot-cover'
import { isMemoryExit } from '../src/main/resource-diagnostics'
import { rendererDiagnosticText, rendererDiagnosticUrl } from '../src/main/renderer-diagnostics'
import { freemem, release, totalmem } from 'node:os'
import { randomUUID } from 'node:crypto'
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
import { RendererNavigationRecovery } from '../src/main/main-window-recovery'
import { loadDesktopWindowAfterStop } from '../src/main/desktop-window-load'

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
    id: 1, isDestroyed: () => false,
    webContents: Object.assign(contents, {
      id: 2, getOSProcessId: vi.fn(() => 1234),
      isDestroyed: () => false, isLoading: vi.fn(() => false), getURL: vi.fn(() => 'file:///splash.html'), reload: vi.fn(), stop: vi.fn()
    }),
    loadURL: vi.fn(() => new Promise<void>((resolve, reject) => loads.push({ resolve, reject })))
  })
  const error = vi.fn()
  const context = {
    HarnessBootCover, rendererDiagnosticText, rendererDiagnosticUrl, freemem, release, totalmem, randomUUID, RendererNavigationRecovery, loadDesktopWindowAfterStop, registerNavigationOwner,
    processRecovery: { blocked: false, start: vi.fn() }, isMemoryExit,
    quitting: false, gpuFallbackRelaunching: false,
    harnessRendered: false, clearProfileBootConfirmation: vi.fn(), recordMainWindowRendererLoss: vi.fn((source, details) => note(source + ": " + details)),
    showUnexpectedError: error, isRendererGpuFallbackCandidate: () => false,
    app: { getVersion: () => "test", getGPUFeatureStatus: () => ({}) }, runtime: { note, snapshot: () => ({ phase: 'ready' }) }, process, setTimeout, clearTimeout
  }
  const install: (target: typeof window) => void = runInNewContext(code + ';installMainWindowRendererRecovery', context)
  install(target)
  return { target, contents, loads, error, context }
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
    expect(raw).toContain('"phase":"environment"')
    const events = raw.split(String.fromCharCode(10)).filter(line => line.includes('[desktop] renderer recovery: '))
      .map(line => JSON.parse(line.slice(line.indexOf('{'))) as Record<string, unknown>)
    expect(new Set(events.map(event => event.recoveryId)).size).toBe(1)
    expect(events.every(event => event.stage === 'startup' && event.windowId === 1 && event.webContentsId === 2)).toBe(true)
    expect(events.filter(event => event.phase === 'load-started').map(event => event.loadId)).toEqual([1, 2, 3, 4])
    expect(events.at(-1)).toMatchObject({ navigationId: 1, elapsedMs: 15_000, phase: 'exhausted' })
    expect(raw).toContain('http://127.0.0.1:1234/route')
    expect(raw).not.toMatch(/credential-secret|query-secret|fragment-secret/)
    expect(f.error).toHaveBeenCalledTimes(1)
  } finally {
    f.target.emit('closed')
    await runtime.stop()
    rmSync(dir, { recursive: true, force: true })
  }
})
it('distinguishes a running renderer loss and retains its last live PID in the correlated log', async () => {
  vi.useFakeTimers()
  const notes: string[] = []
  const f = fixture(line => notes.push(line))
  const initial = navigateDesktopWindow(f.target, 'http://127.0.0.1/', () => false)
  f.loads[0]?.resolve()
  await initial
  f.context.harnessRendered = true
  f.target.webContents.getOSProcessId.mockReturnValue(0)
  f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'oom', exitCode: 14 })
  await vi.advanceTimersByTimeAsync(5_000)
  f.loads[1]?.resolve()
  await vi.advanceTimersByTimeAsync(0)
  const events = notes.filter(line => line.startsWith('[desktop] renderer recovery: '))
    .map(line => JSON.parse(line.slice(line.indexOf('{'))) as Record<string, unknown>)
  const loss = events.find(event => event.phase === 'renderer-gone')
  expect(loss).toMatchObject({ stage: 'running', harnessPhase: 'ready', lastRendererPid: 1234,
    reason: 'oom', exitCode: 14, systemMemory: { freeBytes: expect.any(Number), totalBytes: expect.any(Number) } })
  expect(events.at(-1)).toMatchObject({ phase: 'renderer-gone', stage: 'running' })
  expect(f.context.processRecovery.start).toHaveBeenCalledWith('memory')
  expect(f.loads).toHaveLength(1)
  const otherNotes: string[] = []
  const other = fixture(line => otherNotes.push(line))
  const otherLoad = navigateDesktopWindow(other.target, 'file:///splash.html', () => false)
  other.loads[0]?.resolve()
  await otherLoad
  expect(otherNotes.join('')).not.toContain(String(loss?.recoveryId))
  f.target.emit('closed')
  other.target.emit('closed')
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


it('allows OOM escalation through an existing recovery gate without retrying navigation', async () => {
  const f = fixture()
  f.context.processRecovery.blocked = true
  f.contents.emit('render-process-gone', { preventDefault() {} }, { reason: 'oom', exitCode: 14 })
  expect(f.context.processRecovery.start).toHaveBeenCalledExactlyOnceWith('memory')
  expect(f.loads).toHaveLength(0)
  f.target.emit('closed')
})
