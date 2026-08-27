import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  assertTrustedMainWindowEvent,
  isTrustedMainWindowEvent
} from '../src/main/ipc-trust'

function trustedFixture() {
  const webContents = { mainFrame: { processId: 7, routingId: 41 } }
  const window = {
    isDestroyed: () => false,
    webContents
  }
  return { webContents, window }
}

describe('main-window IPC trust', () => {
  it('accepts a new WebFrameMain wrapper for the same routed main frame', () => {
    const { webContents, window } = trustedFixture()

    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 41 }
    }, window)).toBe(true)
  })

  it('rejects subframes, other webContents, missing frames, and destroyed windows', () => {
    const { webContents, window } = trustedFixture()

    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: {},
      senderFrame: { processId: 7, routingId: 41 }
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: null
    }, window)).toBe(false)
    expect(isTrustedMainWindowEvent({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 41 }
    }, {
      ...window,
      isDestroyed: () => true
    })).toBe(false)
  })

  it('prevents a child frame from reaching a privileged handler', () => {
    const { webContents, window } = trustedFixture()
    const childEvent = {
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }

    expect(() => assertTrustedMainWindowEvent(childEvent, window)).toThrow(
      'main Sherlock window'
    )
  })

  it('applies the centralized frame assertion to privileged main-process handlers', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')
    const guardedChannels = [
      'harness:restart',
      'harness:show-log',
      'directory-picker:open',
      'filesystem:show-item-in-folder',
      'research:files-available',
      'research:canvas-storage:get',
      'research:canvas-storage:set'
    ]

    for (const channel of guardedChannels) {
      const registrationMethod = channel.startsWith('research:canvas-storage:')
        ? 'ipcMain.on'
        : 'ipcMain.handle'
      const registration = main.indexOf(`${registrationMethod}('${channel}'`)
      expect(registration, channel).toBeGreaterThanOrEqual(0)
      const nextRegistration = main.indexOf('\n  ipcMain.', registration + channel.length)
      const handlerSource = main.slice(
        registration,
        nextRegistration < 0 ? main.length : nextRegistration
      )
      expect(handlerSource, channel).toContain('assertTrustedMainWindowEvent(event, mainWindow)')
    }
  })
})
