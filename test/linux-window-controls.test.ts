// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { mountLinuxWindowChrome } from '../src/preload/linux-window-chrome'

const CONTROLS_ID = 'dsh-desktop-linux-window-controls'

type Listener = (event: unknown, value: unknown) => void

interface FakeIpc {
  invoked: string[]
  emit: (channel: string, value: unknown) => void
  listenerCount: (channel: string) => number
  ipcRenderer: {
    invoke: (channel: string) => Promise<unknown>
    on: (channel: string, listener: Listener) => void
    removeListener: (channel: string, listener: Listener) => void
  }
}

function fakeIpc(): FakeIpc {
  const invoked: string[] = []
  const listeners = new Map<string, Set<Listener>>()
  return {
    invoked,
    listenerCount: (channel) => listeners.get(channel)?.size ?? 0,
    emit: (channel, value) => {
      for (const listener of listeners.get(channel) ?? []) listener(undefined, value)
    },
    ipcRenderer: {
      invoke: (channel: string) => {
        invoked.push(channel)
        return Promise.resolve({ ok: true, maximized: false })
      },
      on: (channel, listener) => {
        const set = listeners.get(channel) ?? new Set()
        set.add(listener)
        listeners.set(channel, set)
      },
      removeListener: (channel, listener) => {
        listeners.get(channel)?.delete(listener)
      }
    }
  }
}

function mount(lang = 'en-US'): { doc: Document; ipc: FakeIpc; dispose: () => void } {
  const doc = document.implementation.createHTMLDocument()
  doc.documentElement.lang = lang
  const ipc = fakeIpc()
  const dispose = mountLinuxWindowChrome({ document: doc, ipcRenderer: ipc.ipcRenderer })
  return { doc, ipc, dispose }
}

function buttons(doc: Document): HTMLButtonElement[] {
  return [...doc.querySelectorAll<HTMLButtonElement>(`#${CONTROLS_ID} button`)]
}

it('draws the window controls the native frame used to provide', () => {
  const { doc, dispose } = mount()
  const cluster = doc.getElementById(CONTROLS_ID)
  expect(cluster).not.toBeNull()
  expect(cluster?.getAttribute('role')).toBe('group')
  expect(buttons(doc).map((button) => button.getAttribute('aria-label'))).toEqual([
    'Minimize',
    'Maximize',
    'Close'
  ])
  dispose()
})

it('drives the window over the dedicated channels', async () => {
  const { doc, ipc, dispose } = mount()
  const [minimize, maximize, close] = buttons(doc)
  minimize?.click()
  maximize?.click()
  close?.click()
  // The initial get-state is the first call the mount makes.
  expect(ipc.invoked).toEqual([
    'desktop-window:get-state',
    'desktop-window:minimize',
    'desktop-window:toggle-maximize',
    'desktop-window:close'
  ])
  dispose()
})

it('follows a maximize the renderer did not initiate', async () => {
  const { doc, ipc, dispose } = mount()
  await Promise.resolve()
  expect(buttons(doc)[1]?.getAttribute('aria-label')).toBe('Maximize')

  ipc.emit('desktop-window:state-changed', { maximized: true })
  expect(buttons(doc)[1]?.getAttribute('aria-label')).toBe('Restore')

  ipc.emit('desktop-window:state-changed', { maximized: false })
  expect(buttons(doc)[1]?.getAttribute('aria-label')).toBe('Maximize')
  dispose()
})

it('reads the initial state once and stops listening on dispose', async () => {
  const { ipc, dispose } = mount()
  expect(ipc.listenerCount('desktop-window:state-changed')).toBe(1)
  await Promise.resolve()
  expect(ipc.invoked.filter((channel) => channel === 'desktop-window:get-state')).toHaveLength(1)
  dispose()
  expect(ipc.listenerCount('desktop-window:state-changed')).toBe(0)
})

it('mounts one cluster however often the UI is initialized', () => {
  const doc = document.implementation.createHTMLDocument()
  const ipc = fakeIpc()
  mountLinuxWindowChrome({ document: doc, ipcRenderer: ipc.ipcRenderer })
  mountLinuxWindowChrome({ document: doc, ipcRenderer: ipc.ipcRenderer })
  expect(doc.querySelectorAll(`#${CONTROLS_ID}`)).toHaveLength(1)
  expect(buttons(doc)).toHaveLength(3)
  expect(doc.querySelectorAll('style')).toHaveLength(1)
})

it('labels the controls in the page language', () => {
  const { doc, dispose } = mount('zh-CN')
  expect(doc.getElementById(CONTROLS_ID)?.getAttribute('aria-label')).toBe('窗口控制')
  expect(buttons(doc).map((button) => button.getAttribute('aria-label'))).toEqual([
    '最小化',
    '最大化',
    '关闭'
  ])
  dispose()
})

it('removes the cluster on dispose', () => {
  const { doc, dispose } = mount()
  dispose()
  expect(doc.getElementById(CONTROLS_ID)).toBeNull()
})

describe('main process plumbing', () => {
  it('creates a frameless window on Linux', async () => {
    const source = await readFile('src/main/index.ts', 'utf8')
    expect(source).toContain("...(process.platform === 'linux' ? { frame: false } : {}),")
    // The macOS and Windows chrome stays exactly as it was.
    expect(source).toContain("titleBarStyle: 'hiddenInset' as const")
    expect(source).toContain("titleBarStyle: 'hidden' as const")
  })

  it('registers every control channel behind the main-window trust check', async () => {
    const source = await readFile('src/main/index.ts', 'utf8')
    for (const channel of ['minimize', 'toggle-maximize', 'close', 'get-state']) {
      expect(source, channel).toContain(`ipcMain.handle('desktop-window:${channel}'`)
    }
    const handlers = source.match(/ipcMain\.handle\('desktop-window:[a-z-]+', \(event\) => \{\n\s+assertTrustedMainWindowEvent\(event\)/gu)
    expect(handlers).toHaveLength(4)
  })

  it('pushes maximize state for changes the renderer did not make', async () => {
    const source = await readFile('src/main/index.ts', 'utf8')
    for (const event of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) {
      expect(source, event).toContain(`window.on('${event}', syncWindowState)`)
    }
    expect(source).toContain("window.webContents.send('desktop-window:state-changed'")
  })
})

describe('page hooks', () => {
  it('turns the header bands into the window drag region and clears them of it', async () => {
    const style = (await readFile('src/preload/linux-window-chrome.ts', 'utf8')).replace(/\s+/g, ' ')
    // Upstream marks the bands; the drag region and the reserved room are ours.
    expect(style).toContain('[data-window-drag] { -webkit-app-region: drag;')
    expect(style).toContain('padding-right: ${BAND_CLEARANCE}px !important;')
    expect(style).toContain('[data-window-drag] [role="button"],')
    expect(style).toContain('[data-dsh-no-drag] {')
  })

  it('is the only thing that answers a double-click on the drag band', async () => {
    const source = await readFile('src/preload/linux-window-chrome.ts', 'utf8')
    expect(source).toContain("doc.addEventListener('dblclick', onDoubleClick)")
    expect(source).toContain("run('desktop-window:toggle-maximize')")
  })
})
