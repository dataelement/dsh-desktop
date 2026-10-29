import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'
const electron = vi.hoisted(() => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { invoke: vi.fn(), sendSync: vi.fn(), send: vi.fn() }
}))
vi.mock('electron', () => electron)
import { installHarnessBootBridge } from '../src/preload/harness-boot'
import { setupDesktopStoragePersistence } from '../src/preload/desktop-storage'
import { isHarnessShellUrl } from '../src/shared/harness-boot'
import { canGrantWindowPermission } from '../src/main/security-policy'

let dom
let mainFrameDescriptor
beforeEach(() => {
  vi.clearAllMocks()
  mainFrameDescriptor = Object.getOwnPropertyDescriptor(process, 'isMainFrame')
  Object.defineProperty(process, 'isMainFrame', { value: true, configurable: true })
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://storage-fixture.invalid/', runScripts: 'dangerously'
  })
  vi.stubGlobal('document', dom.window.document)
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('location', { href: 'dsh-desktop://harness/' })
})
afterEach(() => {
  dom.window.close()
  vi.unstubAllGlobals()
  if (mainFrameDescriptor) Object.defineProperty(process, 'isMainFrame', mainFrameDescriptor)
  else delete process.isMainFrame
})

describe('local Harness boot bridge', () => {
  it('refreshes Profile navigation changed while the shell waited, without writing stale data back', async () => {
    electron.ipcRenderer.sendSync.mockReturnValueOnce({ session: 'old-session' }).mockReturnValueOnce({ session: 'repair-session' })
    setupDesktopStoragePersistence()
    expect(dom.window.localStorage.getItem('session')).toBe('old-session')
    installHarnessBootBridge()
    const [name, bridge] = electron.contextBridge.exposeInMainWorld.mock.calls[0]
    expect(name).toBe('dshDesktopBoot')
    expect(Object.keys(bridge)).toEqual(['ready', 'failed'])
    const payload = { injections: [{ kind: 'global', name: '__DSH_BOOT__', value: {} }], streamBaseUrl: 'http://127.0.0.1:1234' }
    electron.ipcRenderer.invoke.mockResolvedValue(payload)
    await expect(bridge.ready()).resolves.toBe(payload)
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledWith('harness:boot')
    expect(dom.window.localStorage.getItem('session')).toBe('repair-session')
    expect(electron.ipcRenderer.send).not.toHaveBeenCalled()
  })
  it.each(['dsh-desktop://desktop/splash.html', 'https://example.com/', 'dsh-desktop://harness.evil/'])('does not expose backend boot to %s', href => {
    vi.stubGlobal('location', { href })
    installHarnessBootBridge()
    expect(electron.contextBridge.exposeInMainWorld).not.toHaveBeenCalled()
  })
  it('does not expose backend boot to subframes', () => {
    Object.defineProperty(process, 'isMainFrame', { value: false, configurable: true })
    installHarnessBootBridge()
    expect(electron.contextBridge.exposeInMainWorld).not.toHaveBeenCalled()
  })
  it('holds the startup cover before sending the original failure to main', async () => {
    const order = []
    installHarnessBootBridge(() => order.push('covered'))
    electron.ipcRenderer.invoke.mockImplementation(async (channel, message) => {
      order.push([channel, message])
      return { ok: true }
    })
    const bridge = electron.contextBridge.exposeInMainWorld.mock.calls[0][1]
    await bridge.failed('client-modules: test-package import failed')
    expect(order).toEqual(['covered', ['harness:boot-failed', 'client-modules: test-package import failed']])
  })
  it('reports bounded textual errors using the dedicated recovery channel', async () => {
    installHarnessBootBridge()
    const bridge = electron.contextBridge.exposeInMainWorld.mock.calls[0][1]
    electron.ipcRenderer.invoke.mockResolvedValue({ ok: true })
    await bridge.failed('x'.repeat(25000))
    expect(electron.ipcRenderer.invoke.mock.calls[0]).toEqual(['harness:boot-failed', 'x'.repeat(20000)])
    await expect(bridge.failed({ bad: true })).rejects.toThrow('message')
    expect(electron.ipcRenderer.invoke).toHaveBeenCalledTimes(1)
  })
  it('preserves backend failure and never refreshes storage after failed authentication', async () => {
    installHarnessBootBridge()
    const bridge = electron.contextBridge.exposeInMainWorld.mock.calls[0][1]
    electron.ipcRenderer.invoke.mockRejectedValue(new Error('backend unavailable'))
    await expect(bridge.ready()).rejects.toThrow('backend unavailable')
    expect(electron.ipcRenderer.sendSync).not.toHaveBeenCalled()
  })
})

describe('local shell origin boundary', () => {
  it('preserves notification and clipboard-write grants only for the Harness main frame', () => {
    for (const permission of ['notifications', 'clipboard-sanitized-write']) {
      expect(canGrantWindowPermission(permission, 'dsh-desktop://harness/', true)).toBe(true)
      expect(canGrantWindowPermission(permission, 'dsh-desktop://harness/', false)).toBe(false)
      expect(canGrantWindowPermission(permission, 'dsh-desktop://desktop/safe-mode.html', true)).toBe(false)
    }
    expect(canGrantWindowPermission('clipboard-read', 'dsh-desktop://harness/', true)).toBe(false)
    expect(isHarnessShellUrl('dsh-desktop://user:pass@harness/')).toBe(false)
    expect(isHarnessShellUrl('dsh-desktop://harness:1234/')).toBe(false)
  })
})
