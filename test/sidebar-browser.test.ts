import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { session, type BrowserWindow, type Session, type WebContents } from 'electron'
import { SidebarBrowserGuests } from '../src/main/sidebar-browser'
import { SIDEBAR_BROWSER_IPC } from '../src/shared/sidebar-browser'

vi.mock('electron', () => ({ session: { fromPartition: vi.fn() } }))

type RequestHandler = (details: { url: string }, callback: (result: { cancel?: boolean }) => void) => void
function fakeSession() {
  return Object.assign(new EventEmitter(), {
    setPermissionRequestHandler: vi.fn<(handler: (contents: unknown, permission: string, callback: (allowed: boolean) => void) => void) => void>(),
    setPermissionCheckHandler: vi.fn<(handler: () => boolean) => void>(),
    setDevicePermissionHandler: vi.fn<(handler: () => boolean) => void>(),
    setDisplayMediaRequestHandler: vi.fn<(handler: (request: unknown, callback: (streams: object) => void) => void) => void>(),
    webRequest: { onBeforeRequest: vi.fn<(handler: RequestHandler) => void>() }
  })
}

// Electron objects have hundreds of unrelated methods. Assert only after the
// mock has satisfied a typed subset, keeping casts at this test adapter boundary.
function asSession(value: ReturnType<typeof fakeSession>): Session {
  const surface: Pick<Session, 'setPermissionCheckHandler' | 'setDevicePermissionHandler'> = value
  return surface as Session
}

class Contents extends EventEmitter {
  url = ''
  mainFrame = { url: '' }
  destroyed = false
  session: Session
  open: (details: { url: string, postBody?: object }) => { action: string } = () => ({ action: 'deny' })
  send = vi.fn()
  close = vi.fn(() => { this.destroyed = true; this.emit('destroyed') })
  constructor(browserSession: Session) { super(); this.session = browserSession }
  isDestroyed(): boolean { return this.destroyed }
  getURL(): string { return this.url }
  setWindowOpenHandler(handler: typeof this.open): void { this.open = handler }
  // These mocks deliberately expose only the Electron surface used by the policy.
  electron(): WebContents {
    const surface: Pick<WebContents, 'close' | 'send' | 'getURL' | 'isDestroyed'> = this
    return surface as WebContents
  }
}

function event(extra: object = {}) { return { preventDefault: vi.fn(), ...extra } }
function windowFor(owner: Contents) {
  const window = Object.assign(new EventEmitter(), { webContents: owner.electron() })
  return { window, electron: window as BrowserWindow }
}

let partitions: Map<string, ReturnType<typeof fakeSession>>
let manager: SidebarBrowserGuests
let owner: Contents
let ownerWindow: ReturnType<typeof windowFor>
let host: string | undefined
beforeEach(() => {
  vi.clearAllMocks()
  partitions = new Map()
  vi.mocked(session.fromPartition).mockImplementation((partition) => {
    let browserSession = partitions.get(partition)
    if (browserSession === undefined) { browserSession = fakeSession(); partitions.set(partition, browserSession) }
    return asSession(browserSession)
  })
  host = 'http://127.0.0.1:43127'
  manager = new SidebarBrowserGuests(() => host)
  owner = new Contents(asSession(fakeSession()))
  ownerWindow = windowFor(owner)
  manager.bind(ownerWindow.electron)
})
afterEach(() => vi.useRealTimers())

function reserve(workspace = 'workspace-a', contents = owner) { return manager.acquire(contents.electron(), workspace) }
function attach(reservation = reserve(), contents = owner, ready = true) {
  const params = { src: 'about:blank#' + reservation.lease, partition: reservation.partition }
  const approval = event()
  contents.emit('will-attach-webview', approval, {}, params)
  expect(approval.preventDefault).not.toHaveBeenCalled()
  const guest = new Contents(session.fromPartition(reservation.partition))
  guest.url = params.src
  guest.mainFrame.url = params.src
  contents.emit('did-attach-webview', event(), guest.electron())
  if (ready) guest.emit('dom-ready')
  return { guest, reservation }
}
function request(url: string, partition: string): boolean | undefined {
  const handler = partitions.get(partition)?.webRequest.onBeforeRequest.mock.calls[0]?.[0]
  expect(handler).toBeTypeOf('function')
  const callback = vi.fn()
  handler?.({ url }, callback)
  return callback.mock.calls[0]?.[0]?.cancel
}

describe('SidebarBrowserGuests reservations and isolation', () => {
  it('isolates workspaces and retains ephemeral workspace storage across lease release', async () => {
    const first = reserve()
    const second = reserve()
    expect(first.partition).toBe(second.partition)
    expect(first.lease).not.toBe(second.lease)
    expect(reserve('workspace-b').partition).not.toBe(first.partition)
    expect(first.partition).not.toContain('persist:')
    await manager.release(owner.electron(), first.lease)
    expect(reserve().partition).toBe(first.partition)
    expect(partitions.size).toBe(2)
  })

  it('validates workspace and bound living owners', () => {
    for (const workspace of [undefined, 1, {}, '', '  ', 'x'.repeat(4097)]) {
      expect(() => manager.acquire(owner.electron(), workspace)).toThrow('workspace')
    }
    const foreign = new Contents(owner.session)
    expect(() => reserve('workspace-a', foreign)).toThrow('owner')
    owner.destroyed = true
    expect(() => reserve()).toThrow('owner')
  })

  it('rejects foreign windows, incorrect partitions, arbitrary src, and replay', async () => {
    const reservation = reserve()
    const other = new Contents(owner.session)
    manager.bind(windowFor(other).electron)
    await expect(manager.release(other.electron(), reservation.lease)).rejects.toThrow('another window')
    await expect(manager.release(owner.electron(), {})).rejects.toThrow('invalid guest lease')
    for (const [contents, src, partition] of [
      [other, 'about:blank#' + reservation.lease, reservation.partition],
      [owner, 'about:blank#' + reservation.lease, 'default'],
      [owner, 'https://example.com/#' + reservation.lease, reservation.partition],
      [owner, 'about:blank#unknown', reservation.partition]
    ] as const) {
      const blocked = event()
      contents.emit('will-attach-webview', blocked, {}, { src, partition })
      expect(blocked.preventDefault).toHaveBeenCalledOnce()
    }
    attach(reservation)
    const replay = event()
    owner.emit('will-attach-webview', replay, {}, { src: 'about:blank#' + reservation.lease, partition: reservation.partition })
    expect(replay.preventDefault).toHaveBeenCalledOnce()
    await manager.release(owner.electron(), reservation.lease)
    const released = event()
    owner.emit('will-attach-webview', released, {}, { src: 'about:blank#' + reservation.lease, partition: reservation.partition })
    expect(released.preventDefault).toHaveBeenCalledOnce()
  })

  it('replaces every injected preference and removes preload and referrer params', () => {
    const reservation = reserve()
    const preferences: Record<string, unknown> = {
      preload: '/malicious.cjs', preloadURL: 'file:///malicious.cjs', nodeIntegration: true,
      contextIsolation: false, sandbox: false, webSecurity: false, session: owner.session,
      additionalArguments: ['--evil'], experimentalFeatures: true, arbitrary: true, disablePopups: true
    }
    const params = { src: 'about:blank#' + reservation.lease, partition: reservation.partition,
      preload: 'file:///malicious.cjs', webpreferences: 'nodeIntegration=yes', httpreferrer: 'http://127.0.0.1:43127' }
    const approval = event()
    owner.emit('will-attach-webview', approval, preferences, params)
    expect(approval.preventDefault).not.toHaveBeenCalled()
    expect(preferences).toEqual({ partition: reservation.partition, nodeIntegration: false,
      nodeIntegrationInWorker: false, nodeIntegrationInSubFrames: false, contextIsolation: true,
      sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      plugins: false, navigateOnDragDrop: false, disableDialogs: true, devTools: false, disablePopups: false })
    expect(params).not.toHaveProperty('preload')
    expect(params).not.toHaveProperty('webpreferences')
    expect(params.httpreferrer).toBe('')
  })

  it('rejects an unsolicited guest and a guest using a different session', () => {
    const unsolicited = new Contents(owner.session)
    owner.emit('did-attach-webview', event(), unsolicited.electron())
    expect(unsolicited.close).toHaveBeenCalledOnce()
    const reservation = reserve()
    owner.emit('will-attach-webview', event(), {}, { src: 'about:blank#' + reservation.lease, partition: reservation.partition })
    const wrongSession = new Contents(owner.session)
    owner.emit('did-attach-webview', event(), wrongSession.electron())
    expect(wrongSession.close).toHaveBeenCalledOnce()
  })

  it.each(['url', 'mainFrame', 'navigation'] as const)('requires the initial main-frame reservation (%s)', (attack) => {
    const { guest } = attach(reserve(), owner, false)
    expect(guest.open({ url: 'https://example.com' })).toEqual({ action: 'deny' })
    expect(owner.send).not.toHaveBeenCalled()
    if (attack === 'url') guest.url = 'https://example.com'
    if (attack === 'mainFrame') guest.mainFrame.url = 'https://example.com'
    if (attack === 'navigation') guest.emit('did-start-navigation', event(), 'https://example.com', false, true)
    else guest.emit('dom-ready')
    expect(guest.close).toHaveBeenCalledOnce()
  })
})

describe('SidebarBrowserGuests network and capability boundaries', () => {
  it('denies every permission, device, screen capture, download, nested guest and login', () => {
    const { guest, reservation } = attach()
    const browserSession = partitions.get(reservation.partition)
    const callback = vi.fn()
    browserSession?.setPermissionRequestHandler.mock.calls[0]?.[0](guest, 'media', callback)
    expect(callback).toHaveBeenCalledWith(false)
    expect(browserSession?.setPermissionCheckHandler.mock.calls[0]?.[0]()).toBe(false)
    expect(browserSession?.setDevicePermissionHandler.mock.calls[0]?.[0]()).toBe(false)
    browserSession?.setDisplayMediaRequestHandler.mock.calls[0]?.[0]({}, callback)
    expect(callback).toHaveBeenCalledWith({})
    const download = event()
    browserSession?.emit('will-download', download)
    expect(download.preventDefault).toHaveBeenCalledOnce()
    const nested = event()
    guest.emit('will-attach-webview', nested)
    expect(nested.preventDefault).toHaveBeenCalledOnce()
    const login = event()
    guest.emit('login', login, {}, {}, callback)
    expect(login.preventDefault).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenLastCalledWith()
  })

  it.each([
    'http://127.0.0.1:43127/api', 'ws://localhost:43127/socket', 'wss://[::1]:43127/socket',
    'http://localhost.:43127/api', 'http://sub.localhost:43127/', 'http://127.2.3.4:43127/',
    'http://2130706433:43127/', 'http://[::ffff:127.0.0.1]:43127/', 'http://0.0.0.0:43127/',
    'http://127.0.0.1.nip.io:43127/', 'ws://hosts-alias.example:43127/socket',
    'file:///tmp/secret', 'dsh-desktop://harness/', 'javascript:alert(1)', 'invalid-url',
    'http://user:password@example.com/', 'blob:http://localhost:43127/id'
  ])('blocks requests including subresources and WebSockets: %s', (url) => {
    const reservation = reserve()
    expect(request(url, reservation.partition)).toBe(true)
  })

  it('allows external resources, applies changing host and effective ports, fails closed without host', () => {
    const reservation = reserve()
    for (const url of ['https://example.com/', 'wss://example.com/socket', 'http://127.0.0.1:12345/',
      'data:image/png;base64,AA', 'blob:https://example.com/id', 'about:blank#' + reservation.lease]) {
      expect(request(url, reservation.partition)).toBe(false)
    }
    host = 'https://backend.example'
    expect(request('wss://backend.example/socket', reservation.partition)).toBe(true)
    expect(request('https://localhost/', reservation.partition)).toBe(true)
    host = undefined
    expect(request('https://example.com/', reservation.partition)).toBe(true)
    host = 'malformed'
    expect(request('https://example.com/', reservation.partition)).toBe(true)
  })

  it.each([true, false])('checks navigation and redirects for mainFrame=%s', (mainFrame) => {
    const { guest } = attach()
    for (const url of ['http://localhost:43127/', 'file:///tmp/a', 'dsh-desktop://harness/',
      'about:blank#replay', 'data:text/html,hello', 'ws://example.com/socket']) {
      const navigation = event({ url, isMainFrame: mainFrame })
      guest.emit('will-frame-navigate', navigation)
      expect(navigation.preventDefault).toHaveBeenCalledOnce()
      const redirect = event()
      guest.emit('will-redirect', redirect, url, false, mainFrame)
      expect(redirect.preventDefault).toHaveBeenCalledOnce()
    }
    const external = event({ url: 'https://example.com/', isMainFrame: mainFrame })
    guest.emit('will-frame-navigate', external)
    expect(external.preventDefault).not.toHaveBeenCalled()
  })

  it('always denies native popups and forwards only safe GET URLs on the owning lease', async () => {
    const { guest, reservation } = attach()
    for (const details of [{ url: 'http://localhost:43127/' }, { url: 'file:///secret' },
      { url: 'https://example.com', postBody: {} }]) {
      expect(guest.open(details)).toEqual({ action: 'deny' })
    }
    expect(owner.send).not.toHaveBeenCalled()
    expect(guest.open({ url: 'https://example.com' })).toEqual({ action: 'deny' })
    expect(owner.send).toHaveBeenCalledExactlyOnceWith(SIDEBAR_BROWSER_IPC.openRequested,
      { lease: reservation.lease, url: 'https://example.com/' })
    await manager.release(owner.electron(), reservation.lease)
    guest.open({ url: 'https://example.org' })
    expect(owner.send).toHaveBeenCalledOnce()
  })
})

describe('SidebarBrowserGuests cleanup', () => {
  it('gives the shell the guest after the reservation document is ready', async () => {
    const names: string[] = []
    const releaseInput = vi.fn()
    const local = new SidebarBrowserGuests(() => host)
    const localOwner = new Contents(asSession(fakeSession()))
    local.bind(windowFor(localOwner).electron, (_guest, name) => {
      names.push(name)
      return releaseInput
    })
    const reservation = local.acquire(localOwner.electron(), 'workspace-a')
    const params = { src: 'about:blank#' + reservation.lease, partition: reservation.partition }
    localOwner.emit('will-attach-webview', event(), {}, params)
    const guest = new Contents(session.fromPartition(reservation.partition))
    guest.url = params.src
    guest.mainFrame.url = params.src
    localOwner.emit('did-attach-webview', event(), guest.electron())
    expect(names).toEqual([])
    guest.emit('dom-ready')
    expect(names).toEqual([reservation.lease])
    await local.release(localOwner.electron(), reservation.lease)
    expect(releaseInput).toHaveBeenCalledOnce()
  })

  it('closes without beforeunload, handles already released/destroyed guests, and binds once', async () => {
    manager.bind(ownerWindow.electron)
    expect(owner.listenerCount('will-attach-webview')).toBe(1)
    const { guest, reservation } = attach()
    await manager.release(owner.electron(), reservation.lease)
    expect(guest.close).toHaveBeenCalledExactlyOnceWith({ waitForBeforeUnload: false })
    await manager.release(owner.electron(), reservation.lease)
    const second = attach()
    second.guest.destroyed = true
    second.guest.emit('destroyed')
    await manager.release(owner.electron(), second.reservation.lease)
    expect(second.guest.close).not.toHaveBeenCalled()
  })

  it('revokes reservations released before attach or before the initial document is ready', async () => {
    const pending = reserve()
    owner.emit('will-attach-webview', event(), {}, { src: 'about:blank#' + pending.lease, partition: pending.partition })
    await manager.release(owner.electron(), pending.lease)
    const late = new Contents(session.fromPartition(pending.partition))
    owner.emit('did-attach-webview', event(), late.electron())
    expect(late.close).toHaveBeenCalledOnce()
    const { guest, reservation } = attach(reserve(), owner, false)
    await manager.release(owner.electron(), reservation.lease)
    expect(guest.close).toHaveBeenCalledOnce()
    guest.emit('dom-ready')
    guest.open({ url: 'https://example.com' })
    expect(owner.send).not.toHaveBeenCalled()
  })

  it('does not close a different window sharing the workspace partition', () => {
    const other = new Contents(owner.session)
    manager.bind(windowFor(other).electron)
    const first = attach()
    const second = attach(reserve('workspace-a', other), other)
    expect(first.reservation.partition).toBe(second.reservation.partition)
    ownerWindow.window.emit('closed')
    expect(first.guest.close).toHaveBeenCalledOnce()
    expect(second.guest.close).not.toHaveBeenCalled()
    second.guest.open({ url: 'https://example.com' })
    expect(other.send).toHaveBeenCalledOnce()
  })

  it('bounds a stuck close and removes its completion listener', async () => {
    vi.useFakeTimers()
    const { guest, reservation } = attach()
    guest.close.mockImplementation(() => undefined)
    const before = guest.listenerCount('destroyed')
    const closing = manager.release(owner.electron(), reservation.lease)
    const rejection = expect(closing).rejects.toThrow('deadline exceeded')
    await vi.advanceTimersByTimeAsync(1000)
    await rejection
    expect(guest.listenerCount('destroyed')).toBe(before)
    guest.open({ url: 'https://example.com' })
    expect(owner.send).not.toHaveBeenCalled()
  })

  it('propagates synchronous close errors with no dangling timeout', async () => {
    vi.useFakeTimers()
    const { guest, reservation } = attach()
    guest.close.mockImplementation(() => { throw new Error('close failed') })
    await expect(manager.release(owner.electron(), reservation.lease)).rejects.toThrow('close failed')
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['navigation', 'crash', 'destroyed', 'closed'] as const)('revokes attached and pending guests on owner %s', (signal) => {
    const { guest } = attach()
    const pending = reserve()
    if (signal === 'navigation') owner.emit('did-start-navigation', event(), 'https://new.example', false, true)
    if (signal === 'crash') owner.emit('render-process-gone')
    if (signal === 'destroyed') owner.emit('destroyed')
    if (signal === 'closed') ownerWindow.window.emit('closed')
    expect(guest.close).toHaveBeenCalledOnce()
    const replay = event()
    owner.emit('will-attach-webview', replay, {}, { src: 'about:blank#' + pending.lease, partition: pending.partition })
    expect(replay.preventDefault).toHaveBeenCalledOnce()
  })

  it('keeps leases during in-place/subframe owner navigation and releases a crashed guest', () => {
    const { guest } = attach()
    owner.emit('did-start-navigation', event(), 'https://example.com/#route', true, true)
    owner.emit('did-start-navigation', event(), 'https://example.com/frame', false, false)
    expect(guest.close).not.toHaveBeenCalled()
    guest.emit('render-process-gone')
    expect(guest.close).toHaveBeenCalledOnce()
  })
})
