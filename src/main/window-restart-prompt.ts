import type { ProcessFailureKind, ProcessRecoveryAction } from './process-recovery'
import type { MessageBoxOptions } from 'electron'
import { applicationText, type HarnessLocale } from './application-locale'

export interface WindowRestartPromptOptions {
  locale: HarnessLocale
  cancelled: () => boolean
  flushDiagnostics: () => Promise<void>
  show: (options: MessageBoxOptions) => Promise<{ response: number }>
  restart: () => void
  quit: () => void
  note: (line: string) => void
}

/** Keeps the final recovery path available even when no renderer can load. */
export async function requestWindowRestart(
  options: Omit<WindowRestartPromptOptions, 'restart' | 'quit'>,
  kind: ProcessFailureKind = 'window'
): Promise<ProcessRecoveryAction | undefined> {
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
  if (kind !== 'window') {
    const memory = kind === 'memory'
    const { response } = await options.show({
      type: 'error', title: 'DSH Desktop', noLink: true, defaultId: 0, cancelId: 0,
      message: memory
        ? applicationText(options.locale, 'memoryRecovery.heading')
        : applicationText(options.locale, 'graphicsRecovery.heading'),
      detail: memory
        ? applicationText(options.locale, 'memoryRecovery.description')
        : applicationText(options.locale, 'graphicsRecovery.description'),
      buttons: [
        applicationText(options.locale, 'common.quit'),
        applicationText(options.locale, memory ? 'common.restart' : 'graphicsRecovery.restart')
      ]
    })
    if (options.cancelled() || (response !== 0 && response !== 1)) return
    return response === 0 ? 'quit' : memory ? 'restart' : 'software'
  }
  const { response } = await options.show({
    type: 'none',
    title: 'DSH Desktop',
    message: applicationText(options.locale, 'windowRecovery.heading'),
    detail: applicationText(options.locale, 'windowRecovery.description'),
    buttons: [applicationText(options.locale, 'common.restart')],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  })
  // Electron maps Esc/native cancellation to cancelId (the sole Restart action).
  // Ignore responses that do not identify a button, if returned by the platform.
  if (options.cancelled() || response !== 0) return
  return 'restart'
}

export async function showWindowRestartPrompt(options: WindowRestartPromptOptions): Promise<void> {
  if (await requestWindowRestart(options) !== 'restart') return
  options.restart()
  if (!options.cancelled()) options.quit()
}
