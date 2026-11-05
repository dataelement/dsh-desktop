import type { GpuExitContext } from '../gpu-fallback'
import { totalmem, freemem, release } from 'node:os'
import { resourceSnapshot, graphicsSnapshot } from '../resource-diagnostics'
import { app, dialog, net } from 'electron'
import { join } from 'node:path'
import { formatApplicationText, resolveHarnessLocale, type HarnessLocale } from '../application-locale'
import { DesktopService } from './service'
import { attachDiagnostics } from './diagnostics'

let gpuInfo = 'not-yet-available'
let service: DesktopService | undefined
export let desktopDiagnostics: ReturnType<typeof attachDiagnostics> | undefined

export function createAggregatedUploadConfirmation(options: {
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<{ response: number }>
  getPendingCount?: () => number
  maxReportsPerLaunch?: number
  /** Resolved per prompt: the consent dialog must follow the active UI language (#855). */
  getLocale: () => HarnessLocale
}) {
  let status: 'unprompted' | 'approved' | 'rejected' = 'unprompted'
  let promptPromise: Promise<boolean> | undefined
  let uploadedCount = 0
  const maxReports = options.maxReportsPerLaunch ?? 5

  return {
    async confirmUpload(body: string): Promise<boolean> {
      if (status === 'rejected') {
        return false
      }
      if (status === 'approved') {
        if (uploadedCount < maxReports) {
          uploadedCount++
          return true
        }
        return false
      }

      if (!promptPromise) {
        promptPromise = (async () => {
          try {
            const report = JSON.parse(body) as { version: string; kind: string; lines: string[] }
            const pendingTotal = (options.getPendingCount?.() ?? 0) + 1
            const locale = options.getLocale()
            const { response } = await options.showMessageBox({
              type: 'question',
              title: formatApplicationText(locale, 'crashConsent.title', {}),
              message: formatApplicationText(locale, 'crashConsent.message', {}),
              detail: formatApplicationText(locale, 'crashConsent.detail', {
                version: report.version,
                kind: report.kind,
                aggregation: pendingTotal > 1
                  ? formatApplicationText(locale, 'crashConsent.aggregation', { count: pendingTotal })
                  : '',
                lines: report.lines.length
              }),
              buttons: [
                formatApplicationText(locale, 'crashConsent.dontSend', {}),
                formatApplicationText(locale, 'crashConsent.sendOnce', {})
              ],
              defaultId: 0,
              cancelId: 0,
              noLink: true
            })
            const approved = response === 1
            status = approved ? 'approved' : 'rejected'
            return approved
          } catch {
            status = 'rejected'
            return false
          } finally {
            promptPromise = undefined
          }
        })()
      }

      const approved = await promptPromise
      if (approved) {
        if (uploadedCount < maxReports) {
          uploadedCount++
          return true
        }
        return false
      }
      return false
    },
    getStatus() {
      return status
    },
    getUploadedCount() {
      return uploadedCount
    },
    resetForTesting() {
      status = 'unprompted'
      promptPromise = undefined
      uploadedCount = 0
    }
  }
}

/** Call only after the single-instance lock, before bootstrap writes this session's log. */
export function initializeDesktopService(options: {
  getExitContext?: () => GpuExitContext
  /** Same per-prompt locale source the native recovery dialogs use (#855). */
  getLocale?: () => HarnessLocale
} = {}): void {
  if (!app.isPackaged || service) return
  try {
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox: opts => dialog.showMessageBox(opts),
      getPendingCount: () => service?.pending().length ?? 0,
      // Without an explicit source, follow the machine language rather than
      // freezing the dialog to Chinese, which is the bug this wires up (#855).
      getLocale: options.getLocale ?? (() => resolveHarnessLocale(undefined, app.getPreferredSystemLanguages()))
    })
    service = new DesktopService({
      stateDir: join(app.getPath('userData'), 'desktop-service'),
      logPath: join(app.getPath('logs'), 'harness.log'),
      version: app.getVersion(), platform: process.platform, arch: process.arch,
      // Chromium networking uses the same proxy configuration as the desktop app.
      request: (url, init) => net.fetch(url, init),
      confirmUpload: confirmation.confirmUpload
    })
    void app.whenReady().then(async () => {
      gpuInfo = graphicsSnapshot(await app.getGPUInfo('basic'))
    }).catch(error => console.warn('[desktop-service] GPU metadata unavailable', error instanceof Error ? error.name : 'unknown'))
    desktopDiagnostics = attachDiagnostics(app, service, {
      getExitContext: options.getExitContext,
      resourceEvidence: () => `os=${release()} acceleration=${app.isHardwareAccelerationEnabled()} gpu=${gpuInfo} ${resourceSnapshot(totalmem(), freemem(), app.getAppMetrics())}`,
      onError: error => console.warn('[desktop-service]', error instanceof Error ? error.name : 'Diagnostic failure')
    })
  } catch (error) {
    service = undefined
    console.warn('[desktop-service] initialization failed', error instanceof Error ? error.name : 'Unknown error')
  }
}
export async function checkDesktopUpdate(manual = false) {
  if (!service) throw new Error('Desktop update service is unavailable')
  return service.checkUpdate(manual)
}
