import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'

// jsdom is an existing runtime test dependency without bundled declarations.
// Keep the adapter limited to the browser APIs this harness exercises.
type TestDom = { window: Window & typeof globalThis }
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => TestDom }
import type { UpdateStatus } from '../src/shared/contracts'

const ipc = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, payload: unknown) => void>(),
  invoke: vi.fn<(channel: string, ...args: unknown[]) => Promise<unknown>>()
}))
vi.mock('electron', () => ({ ipcRenderer: {
  on: (channel: string, listener: (event: unknown, payload: unknown) => void) => ipc.handlers.set(channel, listener),
  removeListener: (channel: string) => ipc.handlers.delete(channel),
  invoke: ipc.invoke
} }))

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected test UI node')
  return value
}

let dom: TestDom | undefined
async function mount(initial: Promise<UpdateStatus>) {
  vi.resetModules()
  ipc.handlers.clear()
  ipc.invoke.mockReset()
  ipc.invoke.mockImplementation(channel => channel === 'updates:status' ? initial : Promise.resolve())
  dom = new JSDOM('<button id="origin">Original focus</button>')
  const roots = new Map<Element, ShadowRoot>()
  const original = dom.window.Element.prototype.attachShadow
  vi.spyOn(dom.window.Element.prototype, 'attachShadow').mockImplementation(function (this: Element, init: ShadowRootInit) {
    const shadow = original.call(this, init)
    roots.set(this, shadow)
    return shadow
  })
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('document', dom.window.document)
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement)
  vi.stubGlobal('ShadowRoot', dom.window.ShadowRoot)
  const module = await import('../src/preload/desktop-update-ui')
  module.mountDesktopUpdateUi()
  await Promise.resolve()
  const host = required(document.getElementById('dsh-desktop-update-root'))
  const about = required(document.getElementById('dsh-desktop-about-root'))
  const shadow = required(roots.get(host))
  const aboutShadow = required(roots.get(about))
  return {
    host, shadow, aboutShadow,
    emit: (status: UpdateStatus) => ipc.handlers.get('updates:status-changed')?.({}, status),
    showAbout: () => ipc.handlers.get('desktop:show-about')?.({}, { desktopVersion: '1.0.0', harnessVersion: '2.0.0', locale: 'zh' })
  }
}
afterEach(() => {
  dom?.window.dispatchEvent(new dom.window.Event('unload'))
  dom?.window.close()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
const status = (phase: UpdateStatus['phase'], extra: Partial<UpdateStatus> = {}): UpdateStatus => ({ phase, currentVersion: '1.0.0', manual: true, presentationId: 7, ...extra })

describe('desktop update presentation at the IPC boundary', () => {
  it.each(['up-to-date', 'error', 'unsupported', 'checking'] as const)('does not replay historical manual %s snapshots or same-request events', async phase => {
    const ui = await mount(Promise.resolve(status(phase)))
    expect(ui.host.style.display).toBe('none')
    ui.emit(status(phase))
    expect(ui.host.style.display).toBe('none')
    ui.emit(status('checking', { presentationId: 8 }))
    expect(ui.shadow.querySelector('[role="dialog"]')).not.toBeNull()
    ui.emit(status('up-to-date', { presentationId: 8 }))
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('latest version')
    ui.shadow.querySelector<HTMLButtonElement>('.confirm')?.click()
    expect(ui.host.style.display).toBe('none')
    ui.emit(status('up-to-date', { presentationId: 8 }))
    expect(ui.host.style.display).toBe('none')
  })

  it.each(['startup', 'runtime'] as const)('uses a corner notification for automatic %s releases and stays silent without one', async source => {
    const ui = await mount(Promise.resolve(status('up-to-date', { manual: false, source })))
    expect(ui.host.style.display).toBe('none')
    ui.emit(status('available', { manual: false, source, availableVersion: '1.1.0' }))
    expect(ui.shadow.querySelector('[role="status"]')).not.toBeNull()
    expect(ui.shadow.querySelector('[role="dialog"]')).toBeNull()
    expect(ui.host.style.right).toBe('20px')
    expect(ui.host.style.bottom).toBe('20px')
    ui.shadow.querySelector<HTMLButtonElement>('.details')?.click()
    expect(ui.shadow.querySelector('[role="dialog"]')).not.toBeNull()
    ui.emit(status('downloading', { manual: false, source, availableVersion: '1.1.0', percent: 25 }))
    expect(ui.shadow.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it.each(['available', 'downloading', 'downloaded'] as const)('retains a historical manual %s update as a corner notification across same-ID progress', async phase => {
    const ui = await mount(Promise.resolve(status(phase, { availableVersion: '1.1.0', percent: 25 })))
    expect(ui.shadow.querySelector('[role="status"]')).not.toBeNull()
    ui.emit(status('downloading', { availableVersion: '1.1.0', percent: 75 }))
    expect(ui.shadow.querySelector('[role="dialog"]')).toBeNull()
    expect(ui.shadow.textContent).toContain('75%')
    ui.emit(status('error', { message: 'Old download failed' }))
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Old download failed')
    expect(Array.from(ui.shadow.querySelectorAll('button')).some(button => button.textContent === 'Retry')).toBe(true)
  })

  it.each(['available', 'up-to-date'] as const)('does not carry an open manual dialog into a fresh automatic %s result', async phase => {
    const ui = await mount(Promise.resolve(status('idle', { manual: false })))
    ui.emit(status('up-to-date', { presentationId: 10 }))
    expect(ui.shadow.querySelector('[role="dialog"]')).not.toBeNull()
    ui.emit(status('checking', { manual: false, source: 'runtime', presentationId: 10 }))
    expect(ui.host.style.display).toBe('none')
    ui.emit(status(phase, { manual: false, source: 'runtime', presentationId: 10, ...(phase === 'available' ? { availableVersion: '1.1.0' } : {}) }))
    expect(ui.shadow.querySelector('[role="dialog"]')).toBeNull()
    if (phase === 'available') {
      expect(ui.shadow.querySelector('[role="status"]')).not.toBeNull()
      expect(ui.host.style.right).toBe('20px')
    } else expect(ui.host.style.display).toBe('none')
  })

  it('does not let a late initial snapshot overwrite a live manual request', async () => {
    let resolve: (value: UpdateStatus) => void = () => { throw new Error('Snapshot promise not initialized') }
    const initial = new Promise<UpdateStatus>(done => { resolve = done })
    const ui = await mount(initial)
    ui.emit(status('checking', { presentationId: 9 }))
    resolve(status('up-to-date'))
    await initial
    await Promise.resolve()
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Checking for updates')
    expect(ui.host.dataset.updatePhase).toBe('checking')
  })

  it('reports a main-process download error even when the download invoke resolves, and allows a real retry sequence', async () => {
    const ui = await mount(Promise.resolve(status('idle', { manual: false })))
    const failure = status('error', { manual: false, source: 'startup', message: 'Download connection interrupted' })
    ipc.invoke.mockImplementation(async channel => {
      if (channel === 'updates:download') {
        ui.emit(status('downloading', { manual: false, source: 'startup', availableVersion: '1.1.0', percent: 15 }))
        ui.emit(failure)
        return failure
      }
      if (channel === 'updates:check') {
        ui.emit(status('checking', { presentationId: 8 }))
        ui.emit(status('available', { presentationId: 8, availableVersion: '1.1.0' }))
      }
      return undefined
    })
    ui.emit(status('available', { manual: false, source: 'startup', availableVersion: '1.1.0' }))
    expect(ui.shadow.querySelector('[role="dialog"]')).toBeNull()
    Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Update')?.click()
    await Promise.resolve()
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Download connection interrupted')
    const retry = Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Retry')
    expect(retry).toBeDefined()
    retry?.click()
    expect(ipc.invoke).toHaveBeenCalledWith('updates:check')
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('New version')
    Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Update')?.click()
    await Promise.resolve()
    expect(ipc.invoke.mock.calls.filter(([channel]) => channel === 'updates:download')).toHaveLength(2)
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Download connection interrupted')
  })

  it('does not suppress a new download failure with an old dismissed error, or replay the new error after closing it', async () => {
    const ui = await mount(Promise.resolve(status('idle', { manual: false })))
    ui.emit(status('error', { message: 'Previous manual failure' }))
    ui.shadow.querySelector<HTMLButtonElement>('.confirm:last-child')?.click()
    expect(ui.host.style.display).toBe('none')
    const failure = status('error', { manual: false, source: 'runtime', message: 'New automatic download failed' })
    ipc.invoke.mockImplementation(async () => {
      ui.emit(status('downloading', { manual: false, source: 'runtime', availableVersion: '1.1.0', percent: 25 }))
      ui.emit(failure)
      return failure
    })
    ui.emit(status('checking', { manual: false, source: 'runtime' }))
    ui.emit(status('available', { manual: false, source: 'runtime', availableVersion: '1.1.0' }))
    Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Update')?.click()
    await Promise.resolve()
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('New automatic download failed')
    ui.shadow.querySelector<HTMLButtonElement>('.confirm:last-child')?.click()
    ui.emit(failure)
    expect(ui.host.style.display).toBe('none')
  })

  it('surfaces a fresh failure after historical manual download progress was dismissed', async () => {
    const ui = await mount(Promise.resolve(status('downloading', { availableVersion: '1.1.0', percent: 25 })))
    Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Ignore')?.click()
    expect(ui.host.style.display).toBe('none')
    ui.emit(status('error', { message: 'Restored download failed' }))
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Restored download failed')
    expect(Array.from(ui.shadow.querySelectorAll('button')).some(button => button.textContent === 'Retry')).toBe(true)
  })

  it('keeps live manual errors and explicit retry centered', async () => {
    const ui = await mount(Promise.resolve(status('idle', { manual: false })))
    ui.emit(status('error', { presentationId: 10, message: 'Manual check failed' }))
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Manual check failed')
    Array.from(ui.shadow.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Retry')?.click()
    expect(ipc.invoke).toHaveBeenCalledWith('updates:check')
    ui.emit(status('checking', { presentationId: 11 }))
    expect(ui.shadow.querySelector('[role="dialog"]')?.textContent).toContain('Checking for updates')
  })

  it('focuses the About container initially and preserves visible keyboard controls', async () => {
    const ui = await mount(Promise.resolve(status('idle', { manual: false })))
    document.getElementById('origin')?.focus()
    ui.showAbout()
    const card = required(ui.aboutShadow.querySelector<HTMLElement>('.about-card'))
    expect(card.tabIndex).toBe(-1)
    expect(ui.aboutShadow.activeElement).toBe(card)
    const switcher = required(card.querySelector<HTMLButtonElement>('.version-switch'))
    const confirm = required(card.querySelector<HTMLButtonElement>('.confirm'))
    expect(switcher.tabIndex).toBe(0)
    expect(confirm.tabIndex).toBe(0)
    confirm.focus()
    expect(ui.aboutShadow.activeElement).toBe(confirm)
    expect(ui.aboutShadow.querySelector('style')?.textContent).toContain('button:focus-visible { outline:2px')
    confirm.click()
    expect(document.activeElement?.id).toBe('origin')
  })
})
