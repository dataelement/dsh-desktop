import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { runNativeWindowRecovery } from '../src/main/native-window-recovery'

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
    await runNativeWindowRecovery({
      message: 'renderer launch-failed exitCode=18', chinese: false, cancelled: () => false,
      flushDiagnostics: () => runtime.flushLog(), show, recoverConfiguration: async () => 'continue',
      revealDiagnostics: () => {}, restart: () => {}, quit, note
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
