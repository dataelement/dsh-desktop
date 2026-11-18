import type { RuntimeSnapshot } from '../../shared/contracts'
import type { PluginStartupFailure } from '../../shared/plugin-startup-failure'
import { SAFE_MODE_PROFILE } from '../recovery/safe-mode-profile'
import { DesktopHostFatalError, redactHostOutput } from './backend/host-process'

export interface CrashUploadDiagnostics {
  startSending(): void
  runtimeChanged(snapshot: RuntimeSnapshot, flushLog: () => Promise<void>, attempt?: number): void
  discardPendingPluginFailure(): void
  startupFailed(error: unknown): void
  markCleanExit(): void
}

export interface CrashUploadOptions {
  diagnostics: () => CrashUploadDiagnostics | undefined
  flushLog: () => Promise<void>
  pluginNames: (message: string, diagnostic: string) => Promise<readonly string[]>
  /**
   * Commit a partial harness.log line and append the Host diagnostic before
   * the upload reads the file. The POST message is capped; the log tail is
   * where the rest of the diagnostic survives.
   */
  preserveFailureLog?: (diagnostic: string) => void
}

/** Plugin discard follows the profile this process actually launched. */
export function crashUploadProfile(safeMode: boolean): string {
  return safeMode ? SAFE_MODE_PROFILE : 'desktop'
}

/**
 * Translate the new Host lifecycle into the pre-0.14 diagnostic session.
 * A named installed plugin suppresses a startup failure. A failure after ready
 * still uploads. The Host diagnostic is redacted the same way as harness.log,
 * then travels with the short message so the report is not limited to `Error.message`.
 */
export function createCrashUpload(options: CrashUploadOptions) {
  let attempt = 0
  const flushLog = () => options.flushLog()
  const diagnostics = () => options.diagnostics()

  return {
    startSending(): void {
      diagnostics()?.startSending()
    },
    markCleanExit(): void {
      diagnostics()?.markCleanExit()
    },
    startupFailed(error: unknown): void {
      diagnostics()?.startupFailed(error)
    },
    discardPendingPluginFailure(): void {
      diagnostics()?.discardPendingPluginFailure()
    },
    beginHostAttempt(): void {
      attempt += 1
      diagnostics()?.runtimeChanged({ phase: 'starting', message: '', logs: [] }, flushLog, attempt)
    },
    hostReady(): void {
      diagnostics()?.runtimeChanged({ phase: 'ready', message: '', logs: [] }, flushLog, attempt)
    },
    async reportHostFailure(failure: unknown): Promise<void> {
      const message = failure instanceof Error && failure.message.length > 0 ? failure.message : 'Desktop host failed'
      const diagnostic = failure instanceof DesktopHostFatalError ? failure.diagnostic ?? '' : ''
      const reportedDiagnostic = redactHostOutput(diagnostic)
      const current = diagnostics()
      let names: readonly string[] = []
      if (current) {
        try {
          names = await options.pluginNames(message, diagnostic)
        } catch (error) {
          console.error(error)
        }
      }
      // After the plugin lookup yields, commit any stderr that arrived and
      // append the diagnostic before runtimeChanged reads the file.
      try {
        options.preserveFailureLog?.(diagnostic)
      } catch (error) {
        console.error(error)
      }
      if (!current) return
      const pluginFailures: PluginStartupFailure[] = names.filter(name => name.length > 0).map(packageName => ({
        stage: 'startup',
        packageName,
        message,
        chain: []
      }))
      current.runtimeChanged({
        phase: 'failed',
        message: reportedDiagnostic.length > 0 ? `${message}\n${reportedDiagnostic}` : message,
        logs: [],
        ...(pluginFailures.length > 0 ? { pluginFailures } : {})
      }, flushLog, attempt)
      if (pluginFailures.length > 0) current.discardPendingPluginFailure()
    }
  }
}
