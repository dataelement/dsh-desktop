import { beforeEach, describe, expect, it, vi } from 'vitest'
import { presentMobilePairing } from '../../src/main/shell/mobile-window'

const native = vi.hoisted(() => {
  const windows: Array<{
    destroyed: boolean
    loadURL: ReturnType<typeof vi.fn>
    show: ReturnType<typeof vi.fn>
    focus: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn<() => void>>
    isDestroyed: () => boolean
  }> = []
  return { windows, events: [] as string[], load: async () => {}, notice: vi.fn(async () => ({ response: 0 })) }
})
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(function () {
    const window = {
      destroyed: false,
      loadURL: vi.fn(async () => { native.events.push('load'); await native.load() }),
      show: vi.fn(() => { native.events.push('show') }),
      focus: vi.fn(),
      destroy: vi.fn(() => { window.destroyed = true }),
      isDestroyed: () => window.destroyed
    }
    native.windows.push(window)
    return window
  }),
  dialog: { showMessageBox: native.notice }, nativeTheme: { shouldUseDarkColors: false }
}))
vi.mock('../../src/main/security', () => ({ secureWindow: vi.fn() }))

function deferred() {
  let resolve: () => void = () => {}
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
function bridge(snapshot: { desktopUrl?: string; pairingUrl?: string; tunnelActive?: boolean; connected?: boolean } = { desktopUrl: 'http://127.0.0.1:43128/desktop', pairingUrl: 'http://192.168.1.8/pair' }) {
  return {
    start: vi.fn(async () => snapshot),
    stop: vi.fn(async () => {}),
    createDesktopUrl: vi.fn(() => 'http://127.0.0.1:43128/desktop?k=bootstrap'),
    toggleTunnel: vi.fn(async (_enable: boolean) => { native.events.push('tunnel'); return snapshot })
  }
}
type Bridge = Parameters<typeof presentMobilePairing>[0]['bridge']
const options = (value: ReturnType<typeof bridge>) => ({ bridge: value as unknown as Bridge, locale: 'en' as const, hostReady: true })

beforeEach(() => {
  vi.clearAllMocks()
  native.windows.length = 0
  native.events.length = 0
  native.load = async () => {}
})
describe('formal shell mobile window', () => {
  it.each([true, false])('shows the page before a pending tunnel with LAN available=%s', async hasLan => {
    const value = bridge()
    if (!hasLan) value.start.mockResolvedValue({ desktopUrl: 'http://127.0.0.1:43128/desktop' })
    const tunnel = deferred()
    value.toggleTunnel.mockImplementation(async () => { native.events.push('tunnel'); await tunnel.promise; return await value.start() })
    const window = await presentMobilePairing(options(value))
    expect(window).toBe(native.windows[0])
    expect(native.events).toEqual(['show', 'tunnel', 'load'])
    expect(value.toggleTunnel).toHaveBeenCalledWith(true)
    const { BrowserWindow } = await import('electron')
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ width: 500, height: 640, minWidth: 380, minHeight: 540,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } }))
    tunnel.resolve()
  })

  it('reuses an existing window without rotating its bootstrap URL or connection mode', async () => {
    const value = bridge()
    const first = await presentMobilePairing(options(value))
    vi.clearAllMocks()
    expect(await presentMobilePairing({ ...options(value), current: first, hostReady: false })).toBe(first)
    expect(value.start).not.toHaveBeenCalled()
    expect(value.createDesktopUrl).not.toHaveBeenCalled()
    expect(value.toggleTunnel).not.toHaveBeenCalled()
    expect(native.windows).toHaveLength(1)
    expect(native.windows[0]?.show).toHaveBeenCalledOnce()
  })

  it('coalesces concurrent opens while the local page is loading', async () => {
    const value = bridge()
    const load = deferred()
    native.load = () => load.promise
    const first = presentMobilePairing(options(value))
    const second = presentMobilePairing(options(value))
    load.resolve()
    expect(await first).toBe(await second)
    expect(native.windows).toHaveLength(1)
    expect(value.createDesktopUrl).toHaveBeenCalledOnce()
    expect(value.toggleTunnel).toHaveBeenCalledOnce()
  })

  it('does not show a window again after it was closed during load', async () => {
    const value = bridge()
    native.load = async () => { native.windows[0]?.destroy() }
    expect(await presentMobilePairing(options(value))).toBeUndefined()
    expect(native.windows[0]?.show).toHaveBeenCalledOnce()
  })

  it('destroys a failed page and allows retry', async () => {
    const value = bridge()
    native.load = async () => { throw new Error('page failed') }
    await expect(presentMobilePairing(options(value))).rejects.toThrow('page failed')
    expect(native.windows[0]?.destroy).toHaveBeenCalledOnce()
    native.load = async () => {}
    expect(await presentMobilePairing(options(value))).toBe(native.windows[1])
  })

  it('handles unexpected tunnel rejection without losing the window', async () => {
    const value = bridge()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    value.toggleTunnel.mockRejectedValue(new Error('tunnel failed'))
    const window = await presentMobilePairing(options(value))
    await Promise.resolve()
    expect(window).toBe(native.windows[0])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[mobile-pairing]'), expect.any(Error))
    log.mockRestore()
  })
})
