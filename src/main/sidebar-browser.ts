/**
 * Adapted from DeepSeek Harness apps/desktop/src/browser-guests.ts at
 * f3803c96974ad4a94195fb97e5c637e9c2a3afe3 (https://github.com/deepseek-ai/deepseek-harness).
 * Copyright (c) 2026 DeepSeek. MIT License:
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { randomUUID } from 'node:crypto'
import { session, type BrowserWindow, type Session, type WebContents } from 'electron'
import { SIDEBAR_BROWSER_IPC } from '../shared/sidebar-browser'

interface GuestLease {
  readonly owner: WebContents
  readonly partition: string
  attached: boolean
  ready: boolean
  guest?: WebContents
  releaseInput?: () => void
}

const CLOSE_DEADLINE_MS = 1000
const RESERVATION_PREFIX = 'about:blank#'

/** Main-process authority for one-shot guests and process-lifetime workspace storage. */
export class SidebarBrowserGuests {
  private readonly partitions = new Map<string, string>()
  private readonly leases = new Map<string, GuestLease>()
  private readonly owners = new WeakSet<WebContents>()

  constructor(private readonly hostUrl: () => string | undefined) {}

  acquire(owner: WebContents, workspace: unknown): { lease: string, partition: string } {
    if (!this.owners.has(owner) || owner.isDestroyed()) throw new Error('sidebar browser: invalid owner')
    if (typeof workspace !== 'string' || workspace.trim().length === 0 || workspace.length > 4096) {
      throw new Error('sidebar browser: a workspace storage identity is required')
    }
    let partition = this.partitions.get(workspace)
    if (partition === undefined) {
      partition = 'dsh-sidebar-browser-' + randomUUID()
      this.configureSession(session.fromPartition(partition))
      this.partitions.set(workspace, partition)
    }
    const lease = randomUUID()
    this.leases.set(lease, { owner, partition, attached: false, ready: false })
    return { lease, partition }
  }

  async release(owner: WebContents, id: unknown): Promise<void> {
    if (typeof id !== 'string') throw new Error('sidebar browser: invalid guest lease')
    const lease = this.leases.get(id)
    if (lease === undefined) return
    if (lease.owner !== owner) throw new Error('sidebar browser: guest belongs to another window')
    const releaseInput = lease.releaseInput
    lease.releaseInput = undefined
    // Revoke authority synchronously, including while close is awaiting Electron.
    this.leases.delete(id)
    releaseInput?.()
    const guest = lease.guest
    if (guest === undefined || guest.isDestroyed()) return
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(timer)
        guest.removeListener('destroyed', destroyed)
        if (error === undefined) resolve()
        else reject(error)
      }
      const destroyed = (): void => finish()
      const timer = setTimeout(() => finish(new Error('sidebar browser: guest close deadline exceeded')), CLOSE_DEADLINE_MS)
      guest.once('destroyed', destroyed)
      try { guest.close({ waitForBeforeUnload: false }) }
      catch (error) { finish(error instanceof Error ? error : new Error('sidebar browser: guest close failed')) }
    })
  }

  bind(window: BrowserWindow, attachInput?: (guest: WebContents, name: string) => () => void): void {
    const owner = window.webContents
    if (this.owners.has(owner)) return
    this.owners.add(owner)
    // Pair accepted attachments before dom-ready. The initial main-frame URL
    // and session are checked again, so reordered/substituted guests fail closed.
    const pending: string[] = []
    owner.on('will-attach-webview', (event, preferences, params) => {
      const id = typeof params.src === 'string' && params.src.startsWith(RESERVATION_PREFIX)
        ? params.src.slice(RESERVATION_PREFIX.length) : ''
      const lease = this.leases.get(id)
      if (lease === undefined || lease.owner !== owner || lease.attached || owner.isDestroyed()
        || params.partition !== lease.partition) {
        event.preventDefault()
        return
      }
      lease.attached = true
      pending.push(id)
      // Discard the entire renderer-controlled preference bag, including preload,
      // session and additionalArguments. Only this policy may reach Chromium.
      for (const key of Object.keys(preferences)) Reflect.deleteProperty(preferences, key)
      Object.assign(preferences, {
        partition: lease.partition,
        nodeIntegration: false, nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false,
        contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false,
        webviewTag: false, plugins: false, navigateOnDragDrop: false, disableDialogs: true,
        devTools: false, disablePopups: false
      })
      Reflect.deleteProperty(params, 'preload')
      Reflect.deleteProperty(params, 'webpreferences')
      params.httpreferrer = ''
    })
    owner.on('did-attach-webview', (_event, guest) => {
      const id = pending.shift()
      const lease = id === undefined ? undefined : this.leases.get(id)
      if (id === undefined || lease === undefined || lease.owner !== owner || lease.guest !== undefined
        || guest.session !== session.fromPartition(lease.partition)) {
        guest.close({ waitForBeforeUnload: false })
        return
      }
      lease.guest = guest
      const reservation = RESERVATION_PREFIX + id
      const active = (): boolean => this.leases.get(id) === lease && !owner.isDestroyed()
      const navigationAllowed = (url: string, mainFrame: boolean): boolean => active()
        && (lease.ready ? this.allowedNavigation(url) : mainFrame && url === reservation)
      const release = (): void => {
        void this.release(owner, id).catch((error: unknown) => console.error('sidebar browser: cleanup failed', error))
      }
      guest.once('dom-ready', () => {
        if (!active() || guest.getURL() !== reservation || guest.mainFrame.url !== reservation) {
          release()
          return
        }
        lease.ready = true
        if (attachInput !== undefined && lease.releaseInput === undefined) lease.releaseInput = attachInput(guest, id)
      })
      guest.once('destroyed', () => { if (this.leases.get(id) === lease) this.leases.delete(id) })
      guest.once('render-process-gone', release)
      guest.setWindowOpenHandler(({ url, postBody }) => {
        if (active() && lease.ready && postBody === undefined && this.allowedNavigation(url)) {
          owner.send(SIDEBAR_BROWSER_IPC.openRequested, { lease: id, url: new URL(url).href })
        }
        return { action: 'deny' }
      })
      guest.on('will-navigate', (event, url) => {
        if (!navigationAllowed(url, true)) event.preventDefault()
      })
      guest.on('will-frame-navigate', (event) => {
        if (!navigationAllowed(event.url, event.isMainFrame)) event.preventDefault()
      })
      guest.on('will-redirect', (event, url, _inPlace, mainFrame) => {
        if (!navigationAllowed(url, mainFrame)) event.preventDefault()
      })
      // loadURL initiated in the renderer does not emit will-navigate. Check the
      // first main-frame navigation as well, and revoke on a substituted document.
      guest.on('did-start-navigation', (_event, url, _inPlace, mainFrame) => {
        if (mainFrame && !navigationAllowed(url, true)) release()
      })
      guest.on('will-attach-webview', (event) => event.preventDefault())
      guest.on('login', (event, _details, _authInfo, callback) => { event.preventDefault(); callback() })
    })
    const releaseAll = (): void => {
      pending.length = 0
      for (const [id, lease] of this.leases) {
        if (lease.owner === owner) {
          void this.release(owner, id).catch((error: unknown) => console.error('sidebar browser: owner cleanup failed', error))
        }
      }
    }
    owner.on('did-start-navigation', (_event, _url, inPlace, mainFrame) => {
      if (mainFrame && !inPlace) releaseAll()
    })
    owner.on('render-process-gone', releaseAll)
    owner.once('destroyed', releaseAll)
    window.once('closed', releaseAll)
  }

  private configureSession(browserSession: Session): void {
    browserSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    browserSession.setPermissionCheckHandler(() => false)
    browserSession.setDevicePermissionHandler(() => false)
    browserSession.setDisplayMediaRequestHandler((_request, callback) => callback({}))
    browserSession.on('will-download', (event) => event.preventDefault())
    browserSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !this.allowedRequest(details.url) })
    })
  }

  private allowedRequest(value: string): boolean {
    const url = this.parseUrl(value)
    if (url === undefined) return false
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
      return url.username === '' && url.password === '' && !this.isApplicationHost(url)
    }
    // Inert/internal page resources are useful, but never let a blob bypass the
    // application-origin check. Top-level navigation still permits only HTTP(S).
    if (url.protocol === 'blob:') return this.allowedNavigation(url.pathname)
    return url.protocol === 'data:' || value === 'about:blank' || value.startsWith(RESERVATION_PREFIX)
  }

  private allowedNavigation(value: string): boolean {
    const url = this.parseUrl(value)
    return url !== undefined && ['http:', 'https:'].includes(url.protocol)
      && url.username === '' && url.password === '' && !this.isApplicationHost(url)
  }

  private parseUrl(value: string): URL | undefined {
    try { return new URL(value) }
    catch { return undefined }
  }

  private isApplicationHost(url: URL): boolean {
    const value = this.hostUrl()
    const host = value === undefined ? undefined : this.parseUrl(value)
    // A backend transition must fail closed rather than expose its next endpoint.
    if (host === undefined) return true
    const port = (address: URL): string => address.port || (['https:', 'wss:'].includes(address.protocol) ? '443' : '80')
    // The runtime owns a random high port. Reserve it across hostnames so DNS/hosts
    // aliases resolving to loopback cannot bypass the backend boundary.
    return port(url) === port(host)
  }
}
