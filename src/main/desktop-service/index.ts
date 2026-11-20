import { desktopPlatformAdapter } from '../../shared/desktop-platform'
import type { GpuExitContext } from '../gpu-fallback'
import { totalmem, freemem, release } from 'node:os'
import { resourceSnapshot, graphicsSnapshot } from '../resource-diagnostics'
import { app, dialog, net } from 'electron'
import { join } from 'node:path'
import { DesktopService } from './service'
import { attachDiagnostics } from './diagnostics'

let gpuInfo = 'not-yet-available'
let service: DesktopService | undefined
let updateServiceFailure: string | undefined
export let desktopDiagnostics: ReturnType<typeof attachDiagnostics> | undefined

function uploadPrompt(
  locale: string | undefined,
  report: { version: string, kind: string, lines: string[] },
  pendingTotal: number
): Electron.MessageBoxOptions {
  const chinese = locale === undefined || locale.toLowerCase().startsWith('zh')
  const countDetail = pendingTotal > 1
    ? (chinese ? `（本次聚合 ${String(pendingTotal)} 项故障报告）` : ` (${String(pendingTotal)} reports in this batch)`)
    : ''
  if (!chinese) {
    return {
      type: 'question',
      title: 'Send diagnostic report',
      message: 'Send this diagnostic report to help investigate the problem?',
      detail: `Version: ${report.version}\nFailure: ${report.kind}${countDetail}\n\nThe report is sent to https://dshdesktop.com/crash. It includes the installation ID, version, platform, failure time, error text, memory, process and graphics details, and up to the last 100 lines of harness.log (${String(report.lines.length)} lines this time).\n\nSend once applies only to this launch. Don't send discards the pending reports and the app keeps running.`,
      buttons: ["Don't send", 'Send once'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    }
  }
  return {
    type: 'question',
    title: '发送故障报告',
    message: '是否发送本次故障报告，帮助排查问题？',
    detail: `版本：${report.version}\n故障类型：${report.kind}${countDetail}\n\n报告将发送到 https://dshdesktop.com/crash，包含安装 ID、版本、平台、故障时间、错误信息、故障时的系统内存/进程资源和显卡信息，以及 harness.log 最后最多 100 行（本次 ${String(report.lines.length)} 行）。\n\n点击“发送一次”仅同意发送本次报告；选择“不发送”将丢弃本次待传报告，不影响继续使用。`,
    buttons: ['不发送', '发送一次'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  }
}

export function createAggregatedUploadConfirmation(options: {
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<{ response: number }>
  getPendingCount?: () => number
  maxReportsPerLaunch?: number
  locale?: () => string
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
            const { response } = await options.showMessageBox(uploadPrompt(options.locale?.(), report, pendingTotal))
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

function rememberUpdateServiceFailure(error: unknown): void {
  service = undefined
  updateServiceFailure = error instanceof Error ? error.message : String(error)
  console.warn('[desktop-service] update service initialization failed', updateServiceFailure)
}

function openDesktopService(): DesktopService {
  const confirmation = createAggregatedUploadConfirmation({
    showMessageBox: opts => dialog.showMessageBox(opts),
    getPendingCount: () => service?.pending().length ?? 0,
    locale: () => app.getLocale()
  })
  return new DesktopService({
    stateDir: join(app.getPath('userData'), 'desktop-service'),
    logPath: join(app.getPath('logs'), 'harness.log'),
    version: app.getVersion(), platform: process.platform, arch: process.arch,
    // Chromium networking uses the same proxy configuration as the desktop app.
    request: (url, init) => net.fetch(url, init),
    confirmUpload: confirmation.confirmUpload
  })
}

/** Official packages only. This does not attach crash diagnostics or open a diagnostic session. */
export function initializeDesktopUpdateService(): void {
  if (!app.isPackaged || !desktopPlatformAdapter(process.platform)?.officialUpdates || service || updateServiceFailure) return
  try {
    service = openDesktopService()
  } catch (error) {
    rememberUpdateServiceFailure(error)
  }
}

/** Call only after the single-instance lock, before bootstrap writes this session's log. */
export function initializeDesktopService(options: { getExitContext?: () => GpuExitContext } = {}): void {
  const adapter = desktopPlatformAdapter(process.platform)
  const enableUpdates = adapter?.officialUpdates === true
  const enableDiagnostics = adapter?.officialDiagnostics === true
  if (!app.isPackaged || (!enableUpdates && !enableDiagnostics) || updateServiceFailure) return
  try {
    if (!service) service = openDesktopService()
    if (!enableDiagnostics || desktopDiagnostics || !service) return
    void app.whenReady().then(async () => {
      gpuInfo = graphicsSnapshot(await app.getGPUInfo('basic'))
    }).catch(error => console.warn('[desktop-service] GPU metadata unavailable', error instanceof Error ? error.name : 'unknown'))
    desktopDiagnostics = attachDiagnostics(app, service, {
      getExitContext: options.getExitContext,
      resourceEvidence: () => `os=${release()} acceleration=${app.isHardwareAccelerationEnabled()} gpu=${gpuInfo} ${resourceSnapshot(totalmem(), freemem(), app.getAppMetrics())}`,
      onError: error => console.warn('[desktop-service]', error instanceof Error ? error.name : 'Diagnostic failure')
    })
  } catch (error) {
    desktopDiagnostics = undefined
    rememberUpdateServiceFailure(error)
  }
}
export async function checkDesktopUpdate(manual = false) {
  if (!desktopPlatformAdapter(process.platform)?.officialUpdates) {
    throw new Error('Desktop update service is unavailable')
  }
  if (!service) throw new Error(updateServiceFailure ?? 'Desktop update service is unavailable')
  return service.checkUpdate(manual)
}
