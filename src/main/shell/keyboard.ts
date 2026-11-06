/** Product-window shortcut preferences and native key delivery. */
import { ipcMain, type Input, type IpcMainInvokeEvent } from 'electron'
import {
  bindingKey,
  effectiveShortcuts,
  parseShortcutDefinitions,
  parseShortcutEdit,
  presentBinding,
  type NormalizedBinding,
  type ShortcutConfigSnapshot,
  type ShortcutDefinition,
  type ShortcutPlatform,
  type ShortcutRevision
} from '@deepseek-ai/dsh-client-shortcuts/protocol'
import { DESKTOP_IPC, assertDesktopSender } from './window/ipc'
import type { DesktopMenuItem } from './enterprise-menu'
import { desktopKeybindings } from './keybindings'

interface ShortcutFrame {
  readonly url: string
  readonly name: string
  readonly parent: ShortcutFrame | null
}

interface ShortcutContents {
  mainFrame: ShortcutFrame
  focusedFrame: ShortcutFrame | null
  isDestroyed(): boolean
  setIgnoreMenuShortcuts(ignore: boolean): void
  send(channel: string, payload: unknown): void
  focus(): void
  isFocused?(): boolean
  sendInputEvent(event: { type: 'keyDown' | 'keyUp', keyCode: string, modifiers: Array<'control'> }): void
  on(event: 'did-start-navigation', listener: (details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>) => void): void
  on(event: 'before-input-event', listener: (event: Electron.Event, input: Input) => void): void
  on(event: 'blur', listener: () => void): void
  once(event: 'destroyed', listener: () => void): void
  off(event: 'did-start-navigation', listener: (details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>) => void): void
  off(event: 'before-input-event', listener: (event: Electron.Event, input: Input) => void): void
  off(event: 'blur', listener: () => void): void
  off(event: 'destroyed', listener: () => void): void
}

interface ShortcutWindow {
  webContents: ShortcutContents
  isDestroyed(): boolean
  isFocused(): boolean
  isEnabled(): boolean
  close(): void
  on(event: 'blur' | 'closed', listener: () => void): void
  off(event: 'blur' | 'closed', listener: () => void): void
}

export interface DesktopShortcutController {
  fileMenu(labels: { fileMenu: string, closePage: string }): DesktopMenuItem
  sendEditingKey(keyCode: string, modifiers: Array<'control'>): void
  attach(window: ShortcutWindow): void
  attachGuest(window: ShortcutWindow, guest: ShortcutContents, name: string): () => void
  dispose(): void
}

/**
 * Install configuration handlers and attach the product window's input lifecycle.
 * The mandatory-update overlay is not part of this shell.
 */
export function installDesktopShortcuts(
  getWindow: () => ShortcutWindow | undefined,
  userData: string,
  platform: ShortcutPlatform,
  updateMenu: () => void
): DesktopShortcutController {
  let definitions: readonly ShortcutDefinition[] = []
  let recording = false
  let revision: ShortcutRevision | undefined
  let closeBinding: NormalizedBinding | null = null
  let editingInput: ShortcutContents | undefined
  const scopedDesktop = platform === 'windows' || platform === 'macos'
  const disposers = new Set<() => void>()
  const closeAccelerator = (): string | undefined => presentBinding(closeBinding, platform).aria
    ?.replace('Meta+', 'Command+').replace(/Arrow(Up|Down|Left|Right)$/u, '$1')
  const sendMenuClose = (): void => {
    const window = getWindow()
    if (window === undefined || window.isDestroyed() || !window.isFocused() || !window.isEnabled()
      || revision === undefined || recording) return
    window.webContents.send(DESKTOP_IPC.shortcutsInput, { kind: 'menu', commandId: 'page.close', revision })
  }
  let keys = new Set<string>()
  const publish = (snapshot: ShortcutConfigSnapshot): void => {
    const wasEnabled = revision !== undefined
    const previousAccelerator = closeAccelerator()
    revision = definitions.length === 0 || snapshot.status === 'loading' ? undefined : snapshot.revision
    const rows = snapshot.status === 'loading' ? [] : effectiveShortcuts(definitions, snapshot.document, 'desktop', platform)
    keys = new Set(rows.flatMap(row => row.binding !== null && row.issue === null && row.conflicts.length === 0
      ? [bindingKey(row.binding)] : []))
    const close = rows.find(row => row.id === 'page.close')
    closeBinding = close?.issue === null && close.conflicts.length === 0 ? close.binding : null
    if (wasEnabled !== (revision !== undefined) || previousAccelerator !== closeAccelerator()) updateMenu()
    const window = getWindow()
    if (window !== undefined && !window.isDestroyed() && window.webContents.mainFrame.url.startsWith('dsh-app://app/')) {
      window.webContents.send(DESKTOP_IPC.shortcutsChanged, snapshot)
    }
  }
  const persistence = desktopKeybindings(userData, platform, publish)
  const assertSender = (event: IpcMainInvokeEvent): ShortcutWindow => {
    const window = getWindow()
    if (window === undefined || window.isDestroyed() || event.sender !== window.webContents
      || event.senderFrame !== window.webContents.mainFrame) throw new Error('desktop shortcuts: rejected sender')
    assertDesktopSender(event, ['app'])
    return window
  }
  ipcMain.handle(DESKTOP_IPC.shortcutsGet, async (event, input: unknown) => {
    assertSender(event)
    definitions = parseShortcutDefinitions(input)
    persistence.setDefinitions(definitions)
    return persistence.readCurrent()
  })
  ipcMain.handle(DESKTOP_IPC.shortcutsEdit, async (event, input: unknown, expectedRevision: unknown) => {
    assertSender(event)
    return persistence.edit(parseShortcutEdit(input), shortcutRevision(expectedRevision))
  })
  ipcMain.handle(DESKTOP_IPC.shortcutsRecording, (event, active: unknown) => {
    const window = assertSender(event)
    if (typeof active !== 'boolean') throw new Error('desktop shortcuts: invalid recording state')
    recording = active
    window.webContents.setIgnoreMenuShortcuts(active)
  })
  ipcMain.handle(DESKTOP_IPC.shortcutsCloseWindow, (event, expected: unknown) => {
    const window = assertSender(event)
    if (expected !== revision || revision === undefined || recording || !window.isFocused() || !window.isEnabled()) return
    window.close()
  })

  function attachInput(window: ShortcutWindow, contents: ShortcutContents, guestName?: string): () => void {
    let deadKey = false
    const held = new Set<string>()
    const consumed = new Map<string, 'press' | 'repeat'>()
    let inputFrame: ShortcutFrame | null = null
    let inputRevision: ShortcutRevision | undefined
    const resetInput = (): void => {
      deadKey = false
      held.clear()
      consumed.clear()
      inputFrame = null
      inputRevision = undefined
      if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(false)
    }
    const clear = (): void => {
      resetInput()
      if (guestName !== undefined) return
      definitions = []
      keys.clear()
      recording = false
      persistence.setDefinitions(null)
    }
    const navigation = (details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>): void => {
      if (details.isMainFrame && !details.isSameDocument) clear()
    }
    const beforeInput = (event: Electron.Event, input: Input): void => {
      if (event.defaultPrevented) {
        resetInput()
        return
      }
      if (editingInput === contents) {
        held.clear()
        consumed.clear()
        contents.setIgnoreMenuShortcuts(true)
        return
      }
      if (window !== getWindow() || !window.isFocused() || !window.isEnabled() || revision === undefined
        || (guestName !== undefined && contents.isFocused?.() !== true)) {
        contents.setIgnoreMenuShortcuts(false)
        held.clear()
        consumed.clear()
        return
      }
      const modifiers = (['control', 'alt', 'shift', 'meta'] as const).filter(modifier => input[modifier])
      const key = bindingKey({ code: input.code, modifiers })
      const match = keys.has(key)
      const menuMatch = closeBinding !== null && closeBinding.secondCode === undefined && modifiers.join('+') === closeBinding.modifiers.join('+')
        && input.key.toUpperCase() === (closeBinding.code.startsWith('Key') ? closeBinding.code.slice(3) : input.code === closeBinding.code ? input.key.toUpperCase() : '')
      contents.setIgnoreMenuShortcuts(recording || match || menuMatch)
      const frame = contents.focusedFrame
      const composing = input.isComposing || input.key === 'Dead' || deadKey || input.modifiers.includes('altgr')
      if (input.type === 'keyDown') deadKey = input.key === 'Dead'
      if (recording || composing || frame === null) {
        held.clear()
        consumed.clear()
        return
      }
      let binding: NormalizedBinding = { code: input.code, modifiers }
      let priority = false
      if (scopedDesktop) {
        if (frame !== inputFrame || inputRevision !== revision) {
          held.clear()
          inputFrame = frame
          inputRevision = revision
        }
        const modifierKey = /^(Control|Alt|Shift|Meta)(Left|Right)$/u.test(input.code)
        if (input.type === 'keyUp') {
          if (consumed.get(input.code) === 'press') event.preventDefault()
          consumed.delete(input.code)
          held.delete(input.code)
          if (modifierKey) held.clear()
          return
        }
        if (!input.isAutoRepeat) consumed.delete(input.code)
        if (modifierKey) {
          held.clear()
          return
        }
        if (input.isAutoRepeat && consumed.has(input.code) && !match) {
          event.preventDefault()
          return
        }
        if (input.isAutoRepeat && !held.has(input.code) && !match) return
        held.add(input.code)
        const codes: [string, ...string[]] = [input.code, ...[...held].filter(value => value !== input.code)]
        codes.sort()
        const pair = { code: codes[0], ...(codes[1] === undefined ? {} : { secondCode: codes[1] }), modifiers }
        priority = keys.has(key)
        if (codes.length === 2 && codes[0] !== undefined && keys.has(bindingKey(pair))) {
          binding = pair
          priority = true
        }
      }
      const main = guestName === undefined && frame === contents.mainFrame
      if (!priority && (main || !match)) return
      event.preventDefault()
      if (input.type !== 'keyDown') return
      if (scopedDesktop) {
        if (!input.isAutoRepeat) {
          if (binding.secondCode !== undefined) {
            consumed.set(binding.code, 'repeat')
            consumed.set(binding.secondCode, 'repeat')
          }
          consumed.set(input.code, 'press')
        }
        held.clear()
      }
      let embedding = frame
      while (guestName === undefined && !main && embedding.parent !== null && embedding.parent !== contents.mainFrame) {
        embedding = embedding.parent
      }
      window.webContents.send(DESKTOP_IPC.shortcutsInput, {
        kind: guestName === undefined ? (main ? 'keyboard' : 'iframe') : 'webview',
        revision,
        frameName: guestName ?? (main ? '' : embedding.name),
        code: binding.code,
        ...(binding.secondCode === undefined ? {} : { secondCode: binding.secondCode }),
        repeat: input.isAutoRepeat,
        control: input.control,
        alt: input.alt,
        shift: input.shift,
        meta: input.meta
      })
    }
    const dispose = (): void => {
      contents.off('did-start-navigation', navigation)
      contents.off('before-input-event', beforeInput)
      contents.off('blur', resetInput)
      contents.off('destroyed', dispose)
      if (guestName === undefined) {
        window.off('blur', resetInput)
        window.off('closed', closed)
      }
      disposers.delete(dispose)
      if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(false)
    }
    const closed = (): void => {
      clear()
      dispose()
    }
    contents.on('did-start-navigation', navigation)
    contents.on('before-input-event', beforeInput)
    contents.on('blur', resetInput)
    contents.once('destroyed', dispose)
    if (guestName === undefined) {
      window.on('closed', closed)
      window.on('blur', resetInput)
    }
    disposers.add(dispose)
    return dispose
  }

  return {
    sendEditingKey(keyCode, modifiers) {
      const window = getWindow()
      if (window === undefined || window.isDestroyed()) return
      const contents = window.webContents
      contents.focus()
      const previous = editingInput
      editingInput = contents
      try {
        contents.sendInputEvent({ type: 'keyDown', keyCode, modifiers })
        contents.sendInputEvent({ type: 'keyUp', keyCode, modifiers })
      } finally {
        editingInput = previous
        if (!contents.isDestroyed()) contents.setIgnoreMenuShortcuts(recording)
      }
    },
    fileMenu(labels) {
      const accelerator = closeAccelerator()
      return {
        label: labels.fileMenu,
        submenu: [{
          id: 'dsh-page-close',
          label: labels.closePage,
          enabled: revision !== undefined,
          ...(accelerator === undefined ? {} : { accelerator }),
          click: sendMenuClose
        }]
      }
    },
    attach(window) {
      attachInput(window, window.webContents)
    },
    attachGuest(window, guest, name) {
      return attachInput(window, guest, name)
    },
    dispose() {
      for (const dispose of disposers) dispose()
      persistence.dispose()
      for (const channel of [
        DESKTOP_IPC.shortcutsGet,
        DESKTOP_IPC.shortcutsEdit,
        DESKTOP_IPC.shortcutsRecording,
        DESKTOP_IPC.shortcutsCloseWindow
      ]) ipcMain.removeHandler(channel)
    }
  }
}

/** The protocol brands the accepted revision string. Callers already require a string. */
function shortcutRevision(value: unknown): ShortcutRevision {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) {
    throw new Error('desktop shortcuts: invalid revision')
  }
  return value as ShortcutRevision
}
