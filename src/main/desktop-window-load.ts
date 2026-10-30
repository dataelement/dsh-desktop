interface LoadingContents {
  isDestroyed(): boolean
  isLoading(): boolean
  stop(): void
  once(event: 'did-stop-loading' | 'destroyed', listener: () => void): unknown
  removeListener(event: 'did-stop-loading' | 'destroyed', listener: () => void): unknown
}
interface LoadingWindow {
  isDestroyed(): boolean
  webContents: LoadingContents
  loadURL(url: string): Promise<void>
}

/** Electron's loadURL promise also observes failures from an older stopped load.
 * Drain that load before registering the replacement promise, rather than treating
 * a late ERR_ABORTED as successful recovery or retrying arbitrary cancellations.
 */
export async function loadDesktopWindowAfterStop(
  window: LoadingWindow,
  url: string,
  cancelled: () => boolean,
  drainTimeoutMs = 5_000
): Promise<void> {
  const contents = window.webContents
  const inactive = () => cancelled() || window.isDestroyed() || contents.isDestroyed()
  if (inactive()) return
  if (contents.isLoading()) {
    await new Promise<void>((resolve, reject) => {
      let finished = false
      const cleanup = () => {
        clearTimeout(timer)
        contents.removeListener('did-stop-loading', stopped)
        contents.removeListener('destroyed', stopped)
      }
      const stopped = () => {
        if (finished) return
        finished = true
        cleanup()
        resolve()
      }
      const timer = setTimeout(() => {
        if (finished) return
        finished = true
        cleanup()
        if (inactive()) resolve()
        else reject(Object.assign(new Error('Timed out draining the previous desktop navigation.'), { code: 'ERR_FAILED' }))
      }, drainTimeoutMs)
      contents.once('did-stop-loading', stopped)
      contents.once('destroyed', stopped)
      try {
        contents.stop()
      } catch (error) {
        finished = true
        cleanup()
        reject(error)
      }
    })
  }
  // A controller timeout or superseding navigation may finish while draining.
  if (inactive()) return
  await window.loadURL(url)
}
