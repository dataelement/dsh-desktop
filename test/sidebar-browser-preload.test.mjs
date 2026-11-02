import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSidebarBrowserBridge } from '../src/preload/sidebar-browser'
import { SIDEBAR_BROWSER_IPC } from '../src/shared/sidebar-browser'
const ipc = vi.hoisted(() => ({ on: vi.fn(), removeListener: vi.fn(), invoke: vi.fn() }))
vi.mock('electron', () => ({ ipcRenderer: ipc }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('sidebar browser preload transport', () => {
  it('only exposes named lease operations and routes popup events by lease with cleanup', async () => {
    const onUnload = vi.fn()
    vi.stubGlobal('window', { addEventListener: onUnload })
    ipc.invoke.mockResolvedValue({ lease: 'lease-a', partition: 'isolated-a' })
    const bridge = createSidebarBrowserBridge()
    expect(Object.keys(bridge).sort()).toEqual(['acquire', 'onOpenRequested', 'release'])
    expect(await bridge.acquire('workspace-a')).toEqual({ lease: 'lease-a', partition: 'isolated-a' })
    expect(ipc.invoke).toHaveBeenCalledWith(SIDEBAR_BROWSER_IPC.acquire, 'workspace-a')
    const receive = ipc.on.mock.calls[0][1]
    const first = vi.fn()
    const second = vi.fn()
    const stop = bridge.onOpenRequested('lease-a', first)
    bridge.onOpenRequested('lease-b', second)
    for (const value of [null, {}, { lease: 7, url: 'https://example.com/' }]) receive({}, value)
    expect(first).not.toHaveBeenCalled()
    receive({}, { lease: 'lease-a', url: 'https://www.baidu.com/' })
    expect(first).toHaveBeenCalledExactlyOnceWith('https://www.baidu.com/')
    expect(second).not.toHaveBeenCalled()
    stop()
    receive({}, { lease: 'lease-a', url: 'https://example.com/' })
    expect(first).toHaveBeenCalledTimes(1)
    await bridge.release('lease-b')
    expect(ipc.invoke).toHaveBeenCalledWith(SIDEBAR_BROWSER_IPC.release, 'lease-b')
    receive({}, { lease: 'lease-b', url: 'https://example.com/' })
    expect(second).not.toHaveBeenCalled()
    expect(onUnload.mock.calls[0][0]).toBe('unload')
    onUnload.mock.calls[0][1]()
    expect(ipc.removeListener).toHaveBeenCalledWith(SIDEBAR_BROWSER_IPC.openRequested, receive)
  })
})
