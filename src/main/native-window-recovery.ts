import type { MessageBoxOptions } from 'electron'

export interface NativeWindowRecoveryOptions {
  chinese: boolean
  cancelled: () => boolean
  flushDiagnostics: () => Promise<void>
  show: (options: MessageBoxOptions) => Promise<{ response: number }>
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

  if (options.cancelled()) return
  const { response } = await options.show({
    type: 'error',
    title: 'DSH Desktop',
    message: options.chinese
      ? '应用窗口无法加载。请重新启动 DSH Desktop。'
      : 'The application window could not load. Please restart DSH Desktop.',
    buttons: options.chinese ? ['重新启动'] : ['Restart'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  })
  // Electron maps Esc/native cancellation to cancelId (the sole Restart action).
  // Ignore responses that do not identify a button, if returned by the platform.
  if (options.cancelled() || response !== 0) return
  options.restart()
  if (!options.cancelled()) options.quit()
}
