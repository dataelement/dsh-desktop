import { describe, expect, it } from 'vitest'
import { isTrustedMainWindowEvent } from '../src/main/ipc-trust'

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
})
