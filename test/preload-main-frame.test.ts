import { Window } from 'happy-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronFakes = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(async () => ({
    phase: 'idle',
    currentVersion: '0.7.3',
    manual: false
  })),
  on: vi.fn(),
  sendSync: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: electronFakes.exposeInMainWorld },
  ipcRenderer: {
    invoke: electronFakes.invoke,
    on: electronFakes.on,
    sendSync: electronFakes.sendSync
  },
  webUtils: { getPathForFile: () => '/tmp/preview.html' }
}))

const originalIsMainFrame = Object.getOwnPropertyDescriptor(process, 'isMainFrame')
let browserWindow: Window

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  browserWindow = new Window({ url: 'http://127.0.0.1:4310/' })
  browserWindow.document.body.innerHTML = '<footer data-dsh-sidebar-footer></footer>'
  vi.stubGlobal('window', browserWindow)
  vi.stubGlobal('document', browserWindow.document)
  vi.stubGlobal('navigator', browserWindow.navigator)
  vi.stubGlobal('MutationObserver', browserWindow.MutationObserver)
  vi.stubGlobal('File', browserWindow.File)
  Object.defineProperty(process, 'isMainFrame', {
    configurable: true,
    value: false
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalIsMainFrame) {
    Object.defineProperty(process, 'isMainFrame', originalIsMainFrame)
  } else {
    Reflect.deleteProperty(process, 'isMainFrame')
  }
})

describe('preload frame boundary', () => {
  it('does not expose application bridges or mount application UI in a child frame', async () => {
    await import('../src/preload/index')
    browserWindow.document.dispatchEvent(new browserWindow.Event('DOMContentLoaded'))
    await Promise.resolve()

    expect(electronFakes.exposeInMainWorld).not.toHaveBeenCalled()
    expect(electronFakes.on).not.toHaveBeenCalled()
    expect(electronFakes.invoke).not.toHaveBeenCalled()
    expect(electronFakes.sendSync).not.toHaveBeenCalled()
    expect(browserWindow.document.querySelector('#sherlock-sidebar-update-button')).toBeNull()
    expect(browserWindow.document.querySelector('#sherlock-developer-mode-style')).toBeNull()
  })
})
