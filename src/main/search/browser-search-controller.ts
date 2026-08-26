import type { BrowserWindowConstructorOptions } from 'electron'
import {
  buildSearchUrl,
  isAllowedSearchLocation,
  isSearchChallenge,
  normalizeSearchResults,
  orderedSearchEngines,
  searchExtractionScript,
  type SearchResultCandidate,
  type SearchSource
} from './search-engines'

export interface BrowserSearchWindow {
  readonly webContents: {
    executeJavaScript(script: string): Promise<unknown>
    getURL(): string
    stop(): void
  }
  loadURL(url: string): Promise<void>
  show(): void
  hide(): void
  setTitle(title: string): void
  isDestroyed(): boolean
  destroy(): void
}

export interface BrowserSearchControllerOptions {
  createWindow(options: BrowserWindowConstructorOptions): BrowserSearchWindow
  sleep?(durationMs: number): Promise<void>
  navigationTimeoutMs?: number
  verificationTimeoutMs?: number
}

export interface BrowserSearchResult {
  sources: SearchSource[]
  truncated: false
}

export function browserSearchWindowOptions(): BrowserWindowConstructorOptions {
  return {
    show: false,
    title: 'Sherlock Web Search',
    width: 960,
    height: 720,
    webPreferences: {
      partition: 'sherlock-web-search',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  }
}

export function configureBrowserSearchSecurity(
  window: {
    webContents: {
      setWindowOpenHandler(handler: () => { action: 'deny' }): void
      setAudioMuted(muted: boolean): void
    }
  },
  searchSession: {
    setPermissionRequestHandler(
      handler: (
        webContents: unknown,
        permission: string,
        decide: (allowed: boolean) => void
      ) => void
    ): void
    setPermissionCheckHandler(handler: () => boolean): void
    on(event: 'will-download', handler: (event: { preventDefault(): void }) => void): void
  }
): void {
  searchSession.setPermissionRequestHandler((_webContents, _permission, decide) => {
    decide(false)
  })
  searchSession.setPermissionCheckHandler(() => false)
  searchSession.on('will-download', (event) => {
    event.preventDefault()
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.setAudioMuted(true)
}

export class BrowserSearchController {
  private window: BrowserSearchWindow
  private tail: Promise<void> = Promise.resolve()
  private disposed = false

  constructor(private readonly options: BrowserSearchControllerOptions) {
    this.window = options.createWindow(browserSearchWindowOptions())
  }

  async search(
    query: string,
    maxResults: number,
    signal?: AbortSignal
  ): Promise<BrowserSearchResult> {
    const operation = this.tail.then(() => this.runSearch(query, maxResults, signal))
    this.tail = operation.then(
      () => undefined,
      () => undefined
    )
    return operation
  }

  dispose(): void {
    this.disposed = true
    if (!this.window.isDestroyed()) {
      this.window.webContents.stop()
      this.window.destroy()
    }
  }

  private async runSearch(
    query: string,
    maxResults: number,
    signal?: AbortSignal
  ): Promise<BrowserSearchResult> {
    this.throwIfUnavailable(signal)
    const window = this.currentWindow()
    for (const engine of orderedSearchEngines(query)) {
      this.throwIfUnavailable(signal)
      const url = buildSearchUrl(engine, query)
      try {
        await this.loadUrl(window, url, signal)
      } catch (error) {
        if (isAbortError(error) || signal?.aborted === true) throw abortError(signal)
        continue
      }
      this.throwIfUnavailable(signal)
      if (!isAllowedSearchLocation(engine, window.webContents.getURL())) continue
      try {
        await this.completeVerification(window, signal)
        const extracted = await this.abortable(
          window.webContents.executeJavaScript(searchExtractionScript(engine)),
          signal,
          window
        )
        const candidates = Array.isArray(extracted)
          ? (extracted as SearchResultCandidate[])
          : []
        const sources = normalizeSearchResults(candidates, maxResults)
        if (sources.length > 0) return { sources, truncated: false }
      } catch (error) {
        if (isAbortError(error) || signal?.aborted === true) throw abortError(signal)
      }
    }
    throw new Error('Local browser search returned no usable sources.')
  }

  private async completeVerification(
    window: BrowserSearchWindow,
    signal?: AbortSignal
  ): Promise<void> {
    let state = await this.pageState(window, signal)
    if (!isSearchChallenge(state)) return
    window.setTitle('完成搜索验证')
    window.show()
    const startedAt = Date.now()
    const timeoutMs = this.options.verificationTimeoutMs ?? 5 * 60_000
    try {
      while (isSearchChallenge(state)) {
        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error('Search verification timed out.')
        }
        await this.abortable(this.sleep(1_000), signal, window)
        state = await this.pageState(window, signal)
      }
    } finally {
      window.hide()
    }
  }

  private async pageState(window: BrowserSearchWindow, signal?: AbortSignal): Promise<{
    url: string
    title: string
    text: string
  }> {
    const value = await this.abortable(
      window.webContents.executeJavaScript(`({
        url: location.href,
        title: document.title,
        text: document.body?.innerText?.slice(0, 4000) ?? ''
      })`),
      signal,
      window
    )
    if (typeof value !== 'object' || value === null) {
      return { url: '', title: '', text: '' }
    }
    const page = value as Record<string, unknown>
    return {
      url: typeof page.url === 'string' ? page.url : '',
      title: typeof page.title === 'string' ? page.title : '',
      text: typeof page.text === 'string' ? page.text : ''
    }
  }

  private sleep(durationMs: number): Promise<void> {
    return this.options.sleep?.(durationMs) ??
      new Promise<void>((resolve) => setTimeout(resolve, durationMs))
  }

  private async loadUrl(
    window: BrowserSearchWindow,
    url: string,
    signal?: AbortSignal
  ): Promise<void> {
    const timeoutMs = this.options.navigationTimeoutMs ?? 15_000
    let timeout: ReturnType<typeof setTimeout> | undefined
    const navigationTimeout = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        window.webContents.stop()
        reject(new Error('Search navigation timed out.'))
      }, timeoutMs)
    })
    try {
      await this.abortable(Promise.race([window.loadURL(url), navigationTimeout]), signal, window)
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  private throwIfUnavailable(signal?: AbortSignal): void {
    if (signal?.aborted === true) throw abortError(signal)
    if (this.disposed) {
      throw new Error('Local browser search is unavailable.')
    }
  }

  private currentWindow(): BrowserSearchWindow {
    if (this.window.isDestroyed()) {
      this.window = this.options.createWindow(browserSearchWindowOptions())
    }
    return this.window
  }

  private async abortable<T>(
    operation: Promise<T>,
    signal?: AbortSignal,
    window: BrowserSearchWindow = this.window
  ): Promise<T> {
    if (!signal) return operation
    if (signal.aborted) throw abortError(signal)
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        window.webContents.stop()
        reject(abortError(signal))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      operation.then(
        (value) => {
          signal.removeEventListener('abort', onAbort)
          resolve(value)
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onAbort)
          reject(error)
        }
      )
    })
  }
}

function abortError(signal?: AbortSignal): DOMException {
  return new DOMException(
    signal?.reason instanceof Error ? signal.reason.message : 'Search aborted.',
    'AbortError'
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
