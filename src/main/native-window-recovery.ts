import type { MessageBoxOptions } from 'electron'

export interface NativeWindowRecoveryOptions {
  message: string
  chinese: boolean
  cancelled: () => boolean
  flushDiagnostics: () => Promise<void>
  show: (options: MessageBoxOptions) => Promise<{ response: number }>
  recoverConfiguration: () => Promise<'retry' | 'continue'>
  revealDiagnostics: () => void
  restart: () => void
  quit: () => void
  note: (line: string) => void
}

/** Keeps the final recovery path available even when no renderer can load. */
export async function runNativeWindowRecovery(options: NativeWindowRecoveryOptions): Promise<void> {
  if (options.cancelled()) return

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // Persistence is best effort: a stalled write must not hide the native recovery dialog.
    await Promise.race([
      Promise.resolve().then(() => options.flushDiagnostics()).catch((error: unknown) => {
        options.note(`[desktop] native recovery diagnostics flush failed: ${String(error)}`)
      }),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          options.note('[desktop] native recovery diagnostics flush timed out after 1000ms')
          resolve()
        }, 1_000)
      })
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }

  while (!options.cancelled()) {
    const { response } = await options.show({
      type: 'error',
      title: 'DSH Desktop',
      message: options.chinese ? '应用窗口无法继续加载' : 'The application window could not load',
      detail: options.message + '\n\n' + (options.chinese
        ? '可查看诊断信息以排查窗口加载失败。恢复配置可检查启动配置，但不保证能解决窗口加载问题。'
        : 'View diagnostics to investigate the window failure. Configuration recovery checks startup settings and may not resolve a window loading problem.'),
      buttons: options.chinese
        ? ['退出', '重新启动', '恢复配置', '查看诊断信息']
        : ['Quit', 'Restart', 'Recover Configuration', 'View Diagnostics'],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    })
    if (options.cancelled()) return
    if (response === 3) {
      try {
        options.revealDiagnostics()
      } catch (error: unknown) {
        options.note(`[desktop] native recovery reveal diagnostics failed: ${String(error)}`)
      }
      continue
    }
    if (response === 2) {
      const result = await options.recoverConfiguration()
      if (options.cancelled()) return
      if (result === 'continue') continue
      options.restart()
    } else if (response === 1) {
      options.restart()
    }
    if (!options.cancelled()) options.quit()
    return
  }
}
