import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ipc = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
  return {
    handlers,
    handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    },
    removeHandler: (channel: string) => { handlers.delete(channel) }
  }
})

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle, removeHandler: ipc.removeHandler } }))

import { DESKTOP_IPC } from '../../src/main/shell/window/ipc'
import { installDesktopShortcuts } from '../../src/main/shell/keyboard'
import { applyDesktopPlatform } from '../../src/preload/desktop-platform'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('desktop shortcuts', () => {
  it('saves a binding and delivers the matching key to the product page', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'dsh-shortcuts-'))
    temporary.push(userData)
    const frame = { url: 'dsh-app://app/', name: '', parent: null }
    const contents = Object.assign(new EventEmitter(), {
      mainFrame: frame,
      focusedFrame: frame,
      isDestroyed: () => false,
      setIgnoreMenuShortcuts: vi.fn(),
      send: vi.fn(),
      focus: vi.fn(),
      sendInputEvent: vi.fn()
    })
    const window = Object.assign(new EventEmitter(), {
      webContents: contents,
      isDestroyed: () => false,
      isFocused: () => true,
      isEnabled: () => true,
      close: vi.fn()
    })
    const updateMenu = vi.fn()
    const shortcuts = installDesktopShortcuts(() => window, userData, 'macos', updateMenu)
    shortcuts.attach(window)
    const call = async (channel: string, ...args: unknown[]) => {
      const handler = ipc.handlers.get(channel)
      if (handler === undefined) throw new Error(`missing ${channel}`)
      return handler({ sender: contents, senderFrame: frame }, ...args)
    }
    const definitions = [{
      id: 'sidebar.left.toggle',
      defaults: {
        'desktop:macos': { code: 'KeyB', modifiers: ['primary'] },
        'desktop:windows': { code: 'KeyB', modifiers: ['primary'] },
        'desktop:linux': { code: 'KeyB', modifiers: ['primary'] }
      }
    }, {
      id: 'page.close',
      defaults: {
        'desktop:macos': { code: 'KeyW', modifiers: ['primary'] },
        'desktop:windows': { code: 'KeyW', modifiers: ['primary'] },
        'desktop:linux': { code: 'KeyW', modifiers: ['primary'] }
      }
    }]
    const initial = await call(DESKTOP_IPC.shortcutsGet, definitions) as { status?: string, revision?: string }
    expect(initial.status).toBe('ready')
    expect(shortcuts.fileMenu({ fileMenu: '文件', closePage: '关闭页面或窗口' }).submenu?.[0]?.enabled).toBe(true)
    const prevented = vi.fn()
    contents.emit('before-input-event', { preventDefault: prevented, defaultPrevented: false }, {
      type: 'keyDown', code: 'KeyB', key: 'b', modifiers: [], meta: true, control: false, alt: false, shift: false,
      isComposing: false, isAutoRepeat: false
    })
    expect(prevented).toHaveBeenCalled()
    expect(contents.send).toHaveBeenCalledWith(DESKTOP_IPC.shortcutsInput, expect.objectContaining({
      kind: 'keyboard', code: 'KeyB', meta: true
    }))
    const saved = await call(DESKTOP_IPC.shortcutsEdit, {
      type: 'set', id: 'sidebar.left.toggle', binding: { code: 'KeyJ', modifiers: ['primary'] }
    }, initial.revision) as { status?: string }
    expect(saved.status).toBe('saved')
    const stored = await readFile(join(userData, 'keybindings.json'), 'utf8')
    expect(stored).toContain('KeyJ')
    expect(stored).not.toContain('token')
    shortcuts.dispose()
    expect(ipc.handlers.has(DESKTOP_IPC.shortcutsGet)).toBe(false)
  })

  it('marks the new shell document for native shortcuts', () => {
    const root: { dataset: { platform?: string, dshDesktopWebShortcuts?: string } } = {
      dataset: { dshDesktopWebShortcuts: 'true' }
    }
    applyDesktopPlatform(root, 'darwin')
    expect(root.dataset.platform).toBe('darwin')
    expect(root.dataset.dshDesktopWebShortcuts).toBeUndefined()
  })
})
