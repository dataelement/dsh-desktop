import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { attachDiagnostics } from '../../src/main/desktop-service/diagnostics'
import type { DesktopService } from '../../src/main/desktop-service/service'
import { SAFE_MODE_PROFILE } from '../../src/main/recovery/safe-mode-profile'
import { DesktopHostFatalError } from '../../src/main/shell/backend/host-process'
import { crashUploadProfile, createCrashUpload } from '../../src/main/shell/crash-upload'

function session(pluginNames: readonly string[], preserveFailureLog?: (diagnostic: string) => void) {
  const events = new EventEmitter()
  const capture = vi.fn()
  const markCleanExit = vi.fn()
  const service = {
    beginSession: vi.fn(),
    capture,
    discard: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    markCleanExit
  } as unknown as DesktopService
  const diagnostics = attachDiagnostics(events, service, {})
  const upload = createCrashUpload({
    diagnostics: () => diagnostics,
    flushLog: () => Promise.resolve(),
    pluginNames: async () => pluginNames,
    ...(preserveFailureLog === undefined ? {} : { preserveFailureLog })
  })
  return { capture, markCleanExit, diagnostics, upload }
}

async function settleDiagnostics(): Promise<void> {
  await new Promise(resolve => { setTimeout(resolve, 0) })
}

describe('crash upload', () => {
  it('drops a named plugin startup failure before it is captured', async () => {
    const { capture, diagnostics, upload } = session(['example-plugin'])
    upload.startSending()
    upload.beginHostAttempt()
    await upload.reportHostFailure(new Error('example-plugin failed to load'))
    await settleDiagnostics()
    expect(capture).not.toHaveBeenCalled()
    diagnostics.dispose()
  })

  it('reports a failure that happens after the host is ready', async () => {
    const { capture, diagnostics, upload } = session(['example-plugin'])
    upload.startSending()
    upload.beginHostAttempt()
    upload.hostReady()
    await upload.reportHostFailure(new Error('example-plugin failed to load'))
    await settleDiagnostics()
    expect(capture).toHaveBeenCalled()
    expect(capture.mock.calls[0]?.[0]).toBe('harness-crash')
    diagnostics.dispose()
  })

  it('clears the session marker on an intentional exit', () => {
    const { markCleanExit, diagnostics, upload } = session([])
    upload.markCleanExit()
    expect(markCleanExit).toHaveBeenCalledTimes(1)
    diagnostics.dispose()
  })

  it('puts the redacted host diagnostic in the uploaded message after the log has been preserved', async () => {
    const preserveFailureLog = vi.fn()
    const { capture, diagnostics, upload } = session([], preserveFailureLog)
    upload.startSending()
    upload.beginHostAttempt()
    const diagnostic = 'Configuration file: startup.yml\n--- startup entries ---\nhttp://127.0.0.1/?token=secret&token=also-secret'
    await upload.reportHostFailure(new DesktopHostFatalError('host stopped', diagnostic))
    await settleDiagnostics()
    expect(preserveFailureLog).toHaveBeenCalledWith(diagnostic)
    expect(capture).toHaveBeenCalled()
    const reported = String(capture.mock.calls[0]?.[1])
    expect(reported).toContain('host stopped')
    expect(reported).toContain('Configuration file: startup.yml')
    expect(reported).toContain('--- startup entries ---')
    expect(reported).toContain('http://127.0.0.1/?token=[redacted]&token=[redacted]')
    expect(reported.includes('token=secret')).toBe(false)
    expect(reported.includes('also-secret')).toBe(false)
    expect(preserveFailureLog.mock.invocationCallOrder[0]).toBeLessThan(capture.mock.invocationCallOrder[0] ?? 0)
    diagnostics.dispose()
  })

  it('attributes a startup failure to the profile that is actually running', async () => {
    expect(crashUploadProfile(false)).toBe('desktop')
    expect(crashUploadProfile(true)).toBe(SAFE_MODE_PROFILE)
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(source.includes('listInstalledProfilePlugins(harnessHome(), crashUploadProfile(safeMode))')).toBe(true)
  })
})
