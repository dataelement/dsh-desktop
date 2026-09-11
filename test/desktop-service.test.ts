import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopService, desktopPlatform, isPrereleaseVersion, tailLog, SERVICE_URL } from '../src/main/desktop-service/service'
import { attachDiagnostics } from '../src/main/desktop-service/diagnostics'
const roots: string[] = []
const disposers: Array<() => void> = []
afterEach(() => { disposers.splice(0).forEach(fn => fn()); roots.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })) })
function fixture(request = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => { throw new Error('offline') })) {
  const dir = mkdtempSync(join(tmpdir(), 'desktop-service-')); roots.push(dir)
  const options = { stateDir: join(dir, 'state'), logPath: join(dir, 'harness.log'), version: '0.8.0', platform: 'darwin', arch: 'arm64', request }
  return { dir, options, request, service: new DesktopService(options) }
}
function queued(service: DesktopService, dir: string) {
  return service.pending().map(name => JSON.parse(readFileSync(join(dir, 'state', 'outbox', name), 'utf8')))
}
describe('desktop service', () => {
  it('persists identity and maps only supported hardware to the new API platforms', () => {
    const { service, options } = fixture()
    expect(new DesktopService(options).installationId).toBe(service.installationId)
    expect(desktopPlatform('darwin', 'arm64')).toBe('mac')
    expect(desktopPlatform('darwin', 'x64')).toBe('mac-intel')
    expect(desktopPlatform('win32', 'x64')).toBe('windows')
    expect(isPrereleaseVersion('0.9.0+build-info')).toBe(false)
    expect(isPrereleaseVersion('0.9.0-rc.1+build')).toBe(true)
    expect(() => desktopPlatform('linux', 'x64')).toThrow('Unsupported')
  })
  it('uploads exactly the last 100 lines, with redaction before disk, and deletes only after acknowledgment', async () => {
    const { options, request, service, dir } = fixture()
    writeFileSync(options.logPath, Array.from({ length: 200 }, (_, n) => `line ${n} api_key=privateValue`).join('\r\n') + '\r\n')
    service.capture('startup-failure', 'Bearer privateToken')
    const report = queued(service, dir)[0]
    expect(report.lines).toHaveLength(100); expect(report.lines[0]).toContain('line 100 ')
    expect(report.lines.at(-1)).toContain('line 199 '); expect(JSON.stringify(report)).not.toContain('private')
    await service.flush(); expect(service.pending()).toHaveLength(1)
    request.mockImplementation(async () => new Response(JSON.stringify({ accepted: true, eventId: 'wrong' })))
    await service.flush(); expect(service.pending()).toHaveLength(1)
    request.mockImplementation(async () => new Response(JSON.stringify({ accepted: true, eventId: report.eventId })))
    await service.flush(); expect(service.pending()).toHaveLength(0)
    expect(request.mock.calls.at(-1)?.[0]).toBe(SERVICE_URL)
  })
  it('bounds huge lines, preserves partial lines, and reports missing logs', () => {
    const { options } = fixture()
    expect(tailLog(options.logPath).logStatus).toBe('missing')
    writeFileSync(options.logPath, 'one\npartial'); expect(tailLog(options.logPath).lines).toEqual(['one', 'partial'])
    writeFileSync(options.logPath, 'x'.repeat(2_000_000) + '\nlast')
    expect(tailLog(options.logPath)).toEqual({ lines: ['last'], logStatus: 'truncated' })
  })
  it('bounds the queue and coalesces concurrent retries', async () => {
    const { service, request } = fixture()
    for (let i = 0; i < 55; i++) service.capture('startup-failure', 'failure')
    expect(service.pending()).toHaveLength(50)
    request.mockImplementation(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({ accepted: true, eventId: JSON.parse(String(init?.body)).eventId })))
    await Promise.all([service.flush(), service.flush()]); expect(request).toHaveBeenCalledTimes(50); expect(service.pending()).toHaveLength(0)
  })
  it('attributes an unclean exit to the previous version and does not report clean shutdowns', () => {
    const { service, options, dir } = fixture()
    service.beginSession()
    const next = new DesktopService({ ...options, version: '0.9.0' }); next.beginSession()
    expect(queued(next, dir)[0]).toMatchObject({ version: '0.8.0', kind: 'unclean-exit' })
    next.markCleanExit(); new DesktopService(options).beginSession(); expect(next.pending()).toHaveLength(1)
  })
  it('does not replace a queued fatal report with a generic unclean-exit report', () => {
    const { service, options, dir } = fixture()
    service.beginSession(); service.captureFatal(new Error('fatal'))
    new DesktopService(options).beginSession()
    expect(queued(service, dir).map(r => r.kind)).toEqual(['main-crash'])
  })
  it('queries with no channel/arch and rejects invalid or downgraded policy responses', async () => {
    const { service, request } = fixture()
    request.mockResolvedValue(new Response(JSON.stringify({ updateAvailable: false })))
    expect(await service.checkUpdate()).toEqual({ updateAvailable: false })
    const url = new URL(request.mock.calls[0]![0])
    expect(url.searchParams.get('platform')).toBe('mac'); expect(url.searchParams.has('channel')).toBe(false); expect(url.searchParams.has('arch')).toBe(false)
    for (const version of ['0.7.0', '0.8.0', '0.9.0-rc.1', '../../evil', '0.9.0-01']) {
      request.mockResolvedValue(new Response(JSON.stringify({ updateAvailable: true, version, feedUrl: `https://dshdesktop.com/updates/archive/${version}/` })))
      await expect(service.checkUpdate()).rejects.toThrow('Invalid')
    }
    request.mockResolvedValue(new Response(JSON.stringify({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://evil.test/' })))
    await expect(service.checkUpdate()).rejects.toThrow('Invalid')
    request.mockResolvedValue(new Response(JSON.stringify({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })))
    expect(await service.checkUpdate()).toMatchObject({ updateAvailable: true, version: '0.9.0' })
  })
})
describe('diagnostic event integration', () => {
  it('waits for log flush, distinguishes startup from runtime failure, and ignores repeated failed snapshots', async () => {
    const { service, options, dir } = fixture()
    const app = new EventEmitter(), events = new EventEmitter()
    const diagnostics = attachDiagnostics(app, service, { processEvents: events }); disposers.push(() => diagnostics.dispose())
    let finish!: () => void
    const flushed = new Promise<void>(resolve => { finish = resolve })
    const snapshot = { phase: 'failed' as const, message: 'startup error', logs: [] }
    diagnostics.runtimeChanged(snapshot, () => flushed)
    diagnostics.runtimeChanged(snapshot, () => flushed)
    expect(service.pending()).toHaveLength(0)
    writeFileSync(options.logPath, 'last failure line\n'); finish()
    await vi.waitFor(() => expect(service.pending()).toHaveLength(1))
    expect(queued(service, dir)[0]).toMatchObject({ kind: 'startup-failure', lines: ['last failure line'] })
    diagnostics.runtimeChanged({ ...snapshot, phase: 'ready' }, async () => {})
    diagnostics.runtimeChanged(snapshot, async () => {})
    await vi.waitFor(() => expect(service.pending()).toHaveLength(2))
    expect(queued(service, dir).map(r => r.kind)).toContain('harness-crash')
  })
  it('captures GPU/renderer loss before recovery and persists fatal errors without intercepting them', () => {
    const { service, dir } = fixture()
    const app = new EventEmitter(), events = new EventEmitter(), contents = new EventEmitter()
    app.on('child-process-gone', () => expect(service.pending()).toHaveLength(1))
    const diagnostics = attachDiagnostics(app, service, { processEvents: events }); disposers.push(() => diagnostics.dispose())
    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })
    app.emit('web-contents-created', {}, contents)
    contents.emit('render-process-gone', {}, { reason: 'clean-exit', exitCode: 0 })
    contents.emit('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })
    events.emit('uncaughtExceptionMonitor', new Error('fatal'))
    expect(events.listenerCount('uncaughtException')).toBe(0)
    expect(queued(service, dir).map(r => r.kind).sort()).toEqual(['gpu-crash', 'main-crash', 'renderer-crash'])
    app.emit('will-quit'); expect(existsSync(join(dir, 'state', 'session.json'))).toBe(false)
  })
})

it('waits for the actual Harness file stream before capturing its final error', async () => {
  const { HarnessRuntime } = await import('../src/main/runtime/harness-runtime')
  const { dir, options } = fixture()
  const runtime = new HarnessRuntime({ dshEntryPath: '', nodeExecutablePath: '', nodeEntryPath: '', dshPatchPath: '', dshSafePatchPath: '', dshHome: dir, logPath: options.logPath, launchProcess: () => { throw new Error('Not used') }, onChanged: () => {} })
  for (let n = 0; n < 150; n++) runtime.note(`error ${n}`)
  await runtime.flushLog()
  const lines = tailLog(options.logPath).lines
  expect(lines).toHaveLength(100); expect(lines[0]).toBe('error 50'); expect(lines.at(-1)).toBe('error 149')
  await runtime.stop()
})
