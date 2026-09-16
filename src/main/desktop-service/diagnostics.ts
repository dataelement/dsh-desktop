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
  const randomId = () => {
    try {
      const { randomUUID } = require('node:crypto') as typeof import('node:crypto')
      return randomUUID()
    } catch {
      return '00000000-0000-4000-8000-000000000000'
    }
  }
  let canSend = false
  let pendingPluginFailureEventId: string | undefined
  let suppressPluginFailure = false
  const capture = (kind: FailureKind, message: string, eventId?: string) => {
    safe(() => service.capture(kind, message, eventId))
    if (canSend && eventId !== pendingPluginFailureEventId) flush()
  }
  safe(() => service.beginSession())
  const fatal = (error: Error) => safe(() => service.captureFatal(error))
  processEvents.on('uncaughtExceptionMonitor', fatal)
  const contentsListeners = new Map<EventEmitter, (...args: any[]) => void>()
  const created = (_event: unknown, contents: EventEmitter) => {
    const gone = (_event: unknown, details: { reason: string; exitCode: number }) => {
      if (!['clean-exit', 'killed'].includes(details.reason)) {
        let urlInfo = ''
        try {
          const url = (contents as { getURL?: () => string }).getURL?.()
          if (url) urlInfo = ` url=${url}`
        } catch { /* ignore */ }
        capture('renderer-crash', `reason=${details.reason} exitCode=${details.exitCode}${urlInfo}`)
      }
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
      if (attempt !== previousAttempt) {
        wasReady = false
        suppressPluginFailure = false
        pendingPluginFailureEventId = undefined
      }
      if (snapshot.phase === 'starting') {
        wasReady = false
        suppressPluginFailure = false
      }
      if (snapshot.phase === 'ready') {
        wasReady = true
        suppressPluginFailure = false
        if (pendingPluginFailureEventId) {
          service.discard(pendingPluginFailureEventId)
          pendingPluginFailureEventId = undefined
        }
      }
      if (snapshot.phase === 'failed' && (previousPhase !== 'failed' || attempt !== previousAttempt)) {
        const kind = wasReady ? 'harness-crash' : 'startup-failure'
        // Wait for the actual Harness stream callback, not a guessed timer.
        void flushLog().catch(error => options.onError?.(error)).then(() => {
          const isPluginFailure = Boolean(snapshot.pluginFailures && snapshot.pluginFailures.length > 0)
          if (!wasReady && isPluginFailure && suppressPluginFailure) {
            return
          }
          const eventId = randomId()
          if (!wasReady && isPluginFailure) {
            pendingPluginFailureEventId = eventId
          }
          capture(kind, snapshot.message, eventId)
        })
      }
      previousPhase = snapshot.phase
      previousAttempt = attempt
    },
    discardPendingPluginFailure() {
      suppressPluginFailure = true
      if (pendingPluginFailureEventId) {
        service.discard(pendingPluginFailureEventId)
        pendingPluginFailureEventId = undefined
      }
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
