import type { EventEmitter } from 'node:events'
import type { RuntimeSnapshot } from '../../shared/contracts'
import { DesktopService, type FailureKind } from './service'

/** Bind before webContents are created. Capture synchronously before recovery can app.exit(). */
export function attachDiagnostics(app: EventEmitter, service: DesktopService, options: {
  processEvents?: EventEmitter
  onError?: (error: unknown) => void
} = {}) {
  const processEvents = options.processEvents ?? process
  const safe = (operation: () => void) => { try { operation() } catch (error) { options.onError?.(error) } }
  const flush = () => { void service.flush().catch(error => options.onError?.(error)) }
  let canSend = false
  const capture = (kind: FailureKind, message: string) => {
    safe(() => service.capture(kind, message))
    if (canSend) flush()
  }
  safe(() => service.beginSession())
  const fatal = (error: Error) => safe(() => service.captureFatal(error))
  processEvents.on('uncaughtExceptionMonitor', fatal)
  const contentsListeners = new Map<EventEmitter, (...args: any[]) => void>()
  const created = (_event: unknown, contents: EventEmitter) => {
    const gone = (_event: unknown, details: { reason: string; exitCode: number }) => {
      if (!['clean-exit', 'killed'].includes(details.reason)) capture('renderer-crash', `reason=${details.reason} exitCode=${details.exitCode}`)
    }
    contentsListeners.set(contents, gone)
    contents.prependListener('render-process-gone', gone)
    contents.once('destroyed', () => contentsListeners.delete(contents))
  }
  app.on('web-contents-created', created)
  const childGone = (_event: unknown, details: { type: string; reason: string; exitCode: number }) => {
    if (details.type === 'GPU' && !['clean-exit', 'killed'].includes(details.reason)) capture('gpu-crash', `reason=${details.reason} exitCode=${details.exitCode}`)
  }
  app.prependListener('child-process-gone', childGone)
  const clean = () => safe(() => service.markCleanExit())
  app.on('will-quit', clean)
  let previousAttempt = -1
  let wasReady = false
  let previousPhase: RuntimeSnapshot['phase'] | undefined
  return {
    startSending() {
      if (canSend) return
      canSend = true
      flush()
    },
    runtimeChanged(snapshot: RuntimeSnapshot, flushLog: () => Promise<void>, attempt = 0) {
      if (attempt !== previousAttempt) wasReady = false
      if (snapshot.phase === 'starting') wasReady = false
      if (snapshot.phase === 'ready') wasReady = true
      if (snapshot.phase === 'failed' && (previousPhase !== 'failed' || attempt !== previousAttempt)) {
        const kind = wasReady ? 'harness-crash' : 'startup-failure'
        // Wait for the actual Harness stream callback, not a guessed timer.
        void flushLog().catch(error => options.onError?.(error)).then(() => capture(kind, snapshot.message))
      }
      previousPhase = snapshot.phase
      previousAttempt = attempt
    },
    startupFailed(error: unknown) { capture('startup-failure', error instanceof Error ? error.stack ?? error.message : String(error)) },
    markCleanExit: clean,
    dispose() {
      processEvents.removeListener('uncaughtExceptionMonitor', fatal)
      app.removeListener('web-contents-created', created)
      app.removeListener('child-process-gone', childGone)
      app.removeListener('will-quit', clean)
      for (const [contents, listener] of contentsListeners) contents.removeListener('render-process-gone', listener)
      contentsListeners.clear()
    }
  }
}
