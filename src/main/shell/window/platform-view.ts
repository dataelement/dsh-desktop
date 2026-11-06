import type { EventEmitter } from 'node:events'
import { createHash, randomUUID } from 'node:crypto'
import { WebContentsView, session, shell, type Session, type View, type WebFrameMain } from 'electron'
import {
  mergePlatformCookies,
  platformClientHeaders,
  type AccountClientMetadata,
  type PlatformSession
} from '@deepseek-ai/dsh-deepseek-account'
import { PLATFORM_IPC, type PlatformLocale } from './ipc'

export { PLATFORM_IPC } from './ipc'

/** Bounds in desktop content coordinates, supplied by the owned application renderer. */
export interface PlatformBounds {
  x: number
  y: number
  width: number
  height: number
}

export function platformBounds(value: unknown): PlatformBounds {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid Platform bounds')
  const row = value as Record<string, unknown>
  const result: PlatformBounds = { x: 0, y: 0, width: 0, height: 0 }
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const n = row[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100_000) throw new Error('Invalid Platform bounds')
    result[key] = Math.round(n)
  }
  return result
}

type PlatformOwner = Pick<EventEmitter, 'on' | 'removeListener'> & {
  webContents: Pick<EventEmitter, 'on' | 'removeListener'>
  contentView: Pick<View, 'addChildView' | 'removeChildView'>
  isDestroyed(): boolean
}

type PlatformSender = { sender: object, senderFrame: Pick<WebFrameMain, 'url'> | null }

/** Native view and its credential snapshot are discarded together. */
export class DesktopPlatformView {
  private account: PlatformSession | null = null
  private view: WebContentsView | undefined
  private owner: PlatformOwner | undefined
  private releaseOwner: (() => void) | undefined
  private generation = 0
  private readonly storageCleanup = new Map<Session, Promise<{ error: unknown } | null>>()
  private disposed = false

  constructor(
    private readonly preload: string,
    private readonly getLocale: () => PlatformLocale,
    private readonly platform: 'darwin' | 'win32',
    private readonly clientVersion: string,
    private readonly blocked: (owner: PlatformOwner) => boolean
  ) {}

  setSession(next: PlatformSession | null): void {
    if (next?.token === this.account?.token && next?.origin === this.account?.origin
      && next?.embeddedPageDist === this.account?.embeddedPageDist
      && JSON.stringify(next?.requestHeaders) === JSON.stringify(this.account?.requestHeaders)) {
      if (next?.userId === this.account?.userId || this.account?.userId === null) {
        this.account = next
        return
      }
    }
    this.close()
    this.account = next
  }

  async open(owner: PlatformOwner, page: 'usage' | 'top-up', bounds: PlatformBounds): Promise<void> {
    if (this.disposed) throw new Error('Platform view disposed')
    if (this.blocked(owner)) throw new Error('Platform view blocked by update prompt')
    this.close()
    const account = this.account
    if (account === null) throw new Error('Platform account unavailable')
    if (owner.isDestroyed()) return
    const generation = this.generation
    this.owner = owner
    const closeOwnedView = (): void => { if (generation === this.generation) this.close() }
    const navigateOwner = (_event: Electron.Event, _url: string, isInPlace: boolean, isMainFrame: boolean): void => {
      if (isMainFrame && !isInPlace) closeOwnedView()
    }
    owner.webContents.on('did-start-navigation', navigateOwner)
    owner.webContents.on('render-process-gone', closeOwnedView)
    owner.webContents.on('destroyed', closeOwnedView)
    owner.on('closed', closeOwnedView)
    this.releaseOwner = () => {
      owner.webContents.removeListener('did-start-navigation', navigateOwner)
      owner.webContents.removeListener('render-process-gone', closeOwnedView)
      owner.webContents.removeListener('destroyed', closeOwnedView)
      owner.removeListener('closed', closeOwnedView)
    }
    const partition = account.userId === null
      ? `dsh-platform-${randomUUID()}`
      : `persist:dsh-platform-${createHash('sha256').update(JSON.stringify([account.origin, account.userId])).digest('hex')}`
    const browserSession = session.fromPartition(partition)
    const failure = await this.cleanStorage(browserSession)
    if (generation !== this.generation) return
    if (this.blocked(owner)) {
      this.close()
      throw new Error('Platform view blocked by update prompt')
    }
    if (failure !== null) {
      this.close()
      throw failure.error
    }
    browserSession.setPermissionRequestHandler((_contents, _permission, callback) => { callback(false) })
    browserSession.setPermissionCheckHandler(() => false)
    const deploymentHeaders = account.requestHeaders ?? {}
    const injectedNames = new Set([...Object.keys(deploymentHeaders),
      ...Object.keys(platformClientHeaders(this.platform, this.clientMetadata()))]
      .map(name => name.toLowerCase()))
    const injectedRequests = new Set<number>()
    browserSession.webRequest.onCompleted(details => { injectedRequests.delete(details.id) })
    browserSession.webRequest.onErrorOccurred(details => { injectedRequests.delete(details.id) })
    browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
      let headers = Object.fromEntries(Object.entries(details.requestHeaders).map(([name, value]) => [name.toLowerCase(), value]))
      if (new URL(details.url).origin === account.origin) {
        injectedRequests.add(details.id)
        const injected = {
          ...deploymentHeaders,
          ...platformClientHeaders(this.platform, this.clientMetadata())
        }
        const cookie = headers.cookie ?? ''
        Object.assign(headers, injected)
        if (injected.cookie !== undefined) headers.cookie = mergePlatformCookies(cookie, injected.cookie)
      } else if (injectedRequests.has(details.id)) {
        headers = Object.fromEntries(Object.entries(headers).filter(([name]) => !injectedNames.has(name.toLowerCase())))
      }
      callback({ requestHeaders: headers })
    })
    const view = new WebContentsView({
      webPreferences: {
        session: browserSession,
        preload: this.preload,
        sandbox: true,
        contextIsolation: true,
        additionalArguments: [`--dsh-platform-origin=${account.origin}`],
        nodeIntegration: false,
        webSecurity: true
      }
    })
    this.view = view
    view.webContents.setWindowOpenHandler(({ url }) => {
      const destination = new URL(url)
      if (destination.protocol === 'https:' && destination.username === '' && destination.password === '') {
        void shell.openExternal(url).catch(() => {})
      }
      return { action: 'deny' }
    })
    const allowNavigation = (url: string): boolean => {
      try {
        const parsed = new URL(url)
        return parsed.origin === account.origin && parsed.username === '' && parsed.password === ''
      } catch {
        return false
      }
    }
    view.webContents.on('will-navigate', (event, url) => { if (!allowNavigation(url)) event.preventDefault() })
    view.webContents.on('will-redirect', (event, url) => { if (!allowNavigation(url)) event.preventDefault() })
    view.webContents.on('will-attach-webview', event => { event.preventDefault() })
    view.webContents.on('preload-error', () => { if (this.view === view) this.close() })
    view.webContents.on('render-process-gone', () => { if (this.view === view) this.close() })
    view.setVisible(false)
    owner.contentView.addChildView(view)
    view.setBounds(bounds)
    try {
      const url = new URL(page === 'usage' ? '/usage' : '/top_up', account.origin)
      if (account.embeddedPageDist !== undefined) url.searchParams.set('dist', account.embeddedPageDist)
      await view.webContents.loadURL(url.href)
    } catch (error) {
      const aborted = error instanceof Error && 'code' in error && error.code === 'ERR_ABORTED'
      if (!aborted) {
        if (generation === this.generation) this.close()
        throw error
      }
    }
    if (generation === this.generation && this.view === view) view.setVisible(true)
  }

  setBounds(bounds: PlatformBounds): void {
    this.view?.setBounds(bounds)
  }

  bootstrap(event: PlatformSender): Pick<PlatformSession, 'origin' | 'token'> & { locale: PlatformLocale } {
    const view = this.view
    const account = this.account
    if (view === undefined || account === null || event.sender !== view.webContents
      || event.senderFrame !== view.webContents.mainFrame
      || new URL(event.senderFrame.url).origin !== account.origin) {
      throw new Error('Rejected Platform bootstrap')
    }
    return { origin: account.origin, token: account.token, locale: this.getLocale() }
  }

  notifyLocaleChanged(): void {
    const view = this.view
    if (view !== undefined && !view.webContents.isDestroyed()) {
      view.webContents.send(PLATFORM_IPC.localeChanged, this.getLocale())
    }
  }

  close(): void {
    this.generation += 1
    const view = this.view
    this.view = undefined
    this.releaseOwner?.()
    this.releaseOwner = undefined
    const owner = this.owner
    this.owner = undefined
    if (view === undefined) return
    if (owner !== undefined && !owner.isDestroyed()) owner.contentView.removeChildView(view)
    const browserSession = view.webContents.session
    const destroyed = new Promise<void>(resolve => {
      if (view.webContents.isDestroyed()) resolve()
      else {
        view.webContents.once('destroyed', () => { resolve() })
        view.webContents.close({ waitForBeforeUnload: false })
      }
    })
    browserSession.webRequest.onBeforeSendHeaders(null)
    browserSession.webRequest.onCompleted(null)
    browserSession.webRequest.onErrorOccurred(null)
    browserSession.flushStorageData()
    void this.cleanStorage(browserSession, destroyed)
  }

  async dispose(): Promise<void> {
    this.disposed = true
    this.account = null
    await this.closeAndWait()
  }

  async closeAndWait(): Promise<void> {
    this.close()
    const results = await Promise.all(this.storageCleanup.values())
    const failures = results.filter(result => result !== null)
    if (failures.length > 0) {
      throw new AggregateError(failures.map(result => result.error), 'Platform storage cleanup failed')
    }
  }

  private clientMetadata(): AccountClientMetadata {
    return {
      version: this.clientVersion,
      locale: this.getLocale(),
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60
    }
  }

  private cleanStorage(browserSession: Session, destroyed: Promise<void> = Promise.resolve()): Promise<{ error: unknown } | null> {
    const previous = this.storageCleanup.get(browserSession)
    const cleanup = Promise.all([previous, destroyed]).then(async () => {
      await browserSession.closeAllConnections()
      const results = await Promise.allSettled([
        browserSession.clearStorageData(browserSession.isPersistent()
          ? { storages: ['cookies', 'filesystem', 'indexdb', 'shadercache', 'serviceworkers', 'cachestorage'] }
          : undefined),
        browserSession.clearCache(),
        browserSession.clearAuthCache()
      ])
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        throw new AggregateError(failures.map(result => result.reason), 'Platform storage cleanup failed')
      }
    }).then(() => null, (error: unknown) => ({ error }))
    this.storageCleanup.set(browserSession, cleanup)
    return cleanup
  }
}
