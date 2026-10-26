import type { EventEmitter } from 'node:events'

/** Signals observed in this process; a request may subsequently be cancelled. */
export interface GpuExitContext {
  sessionEndRequested: boolean
  sessionEnding: boolean
  quitRequested: boolean
  appExiting: boolean
}

const contexts = new WeakMap<EventEmitter, GpuExitContext>()

export function getGpuExitContext(app: EventEmitter): GpuExitContext {
  return { ...(contexts.get(app) ?? {
    sessionEndRequested: false, sessionEnding: false, quitRequested: false, appExiting: false
  }) }
}

/** Query/before-quit are requests that can be cancelled, not proof of shutdown. */
export function trackGpuExitContext(app: EventEmitter): () => void {
  const state: GpuExitContext = {
    sessionEndRequested: false, sessionEnding: false, quitRequested: false, appExiting: false
  }
  contexts.set(app, state)
  const windows = new Map<EventEmitter, () => void>()
  const created = (_event: unknown, window: EventEmitter) => {
    const requested = () => { state.sessionEndRequested = true }
    const ending = () => { state.sessionEnding = true }
    const destroyed = () => { cleanup(); windows.delete(window) }
    const cleanup = () => {
      window.removeListener('query-session-end', requested)
      window.removeListener('session-end', ending)
      window.removeListener('closed', destroyed)
    }
    window.on('query-session-end', requested)
    window.on('session-end', ending)
    window.once('closed', destroyed)
    windows.set(window, cleanup)
  }
  const requested = () => { state.quitRequested = true }
  const exiting = () => { state.appExiting = true }
  app.on('browser-window-created', created)
  app.on('before-quit', requested)
  app.on('quit', exiting)
  return () => {
    app.removeListener('browser-window-created', created)
    app.removeListener('before-quit', requested)
    app.removeListener('quit', exiting)
    for (const cleanup of windows.values()) cleanup()
    windows.clear()
    contexts.delete(app)
  }
}

export function classifyGpuExit(platform: NodeJS.Platform, exitCode: number, context: GpuExitContext): 'unclassified' | 'logoff-during-exit' | 'logoff-impact-unknown' {
  if (platform !== 'win32' || (exitCode >>> 0) !== 0xc000026b) return 'unclassified'
  return context.sessionEnding || context.appExiting ? 'logoff-during-exit' : 'logoff-impact-unknown'
}
