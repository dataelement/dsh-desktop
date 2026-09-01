import { describe, expect, it, vi } from 'vitest'
import {
  ResearchLinkFrameRegistry,
  normalizeResearchLinkUrl,
  registerResearchLinkFrameHandlers
} from '../src/main/state/research-link-frame'
import { createResearchLinkFrameBridge } from '../src/preload/research-link-frame'

describe('research link frame authorization', () => {
  it('canonicalizes only bounded credential-free HTTP URLs', () => {
    expect(normalizeResearchLinkUrl(' HTTPS://Example.com:443/report#part '))
      .toBe('https://example.com/report#part')
    expect(normalizeResearchLinkUrl('http://Example.com:80/path'))
      .toBe('http://example.com/path')
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,hello',
      'file:///tmp/report.html',
      'https://user:pass@example.com/',
      '',
      `https://example.com/${'x'.repeat(8_192)}`
    ]) {
      expect(normalizeResearchLinkUrl(value), value).toBeNull()
    }
  })

  it('allows only active node URLs and same-origin redirects until the last owner releases', () => {
    const registry = new ResearchLinkFrameRegistry()
    expect(registry.authorize({
      sessionId: 'session-1', nodeId: 'node-1', url: 'https://example.com/report'
    })).toEqual({ url: 'https://example.com/report' })
    registry.authorize({
      sessionId: 'session-1', nodeId: 'node-2', url: 'https://example.com/other'
    })

    expect(registry.allows('https://example.com/report')).toBe(true)
    expect(registry.allows('https://example.com/redirected')).toBe(true)
    expect(registry.allows('https://other.example.com/report')).toBe(false)
    expect(registry.release({ sessionId: 'session-1', nodeId: 'node-1' })).toBe(true)
    expect(registry.allows('https://example.com/report')).toBe(true)
    expect(registry.release({ sessionId: 'session-1', nodeId: 'node-2' })).toBe(true)
    expect(registry.allows('https://example.com/report')).toBe(false)
  })

  it('releases exactly one session and rejects malformed identities', () => {
    const registry = new ResearchLinkFrameRegistry()
    registry.authorize({ sessionId: 'session-a', nodeId: 'node-1', url: 'https://a.example/' })
    registry.authorize({ sessionId: 'session-a', nodeId: 'node-2', url: 'https://b.example/' })
    registry.authorize({ sessionId: 'session-b', nodeId: 'node-3', url: 'https://c.example/' })

    expect(registry.releaseSession('session-a')).toBe(2)
    expect(registry.allows('https://a.example/')).toBe(false)
    expect(registry.allows('https://c.example/')).toBe(true)
    expect(() => registry.authorize({ sessionId: '', nodeId: 'node', url: 'https://a.example/' }))
      .toThrow('Research link frame identity is invalid.')
    expect(() => registry.release({ sessionId: 'session-b', nodeId: '' }))
      .toThrow('Research link frame identity is invalid.')
  })

  it('exposes a frozen preload bridge with exact IPC channels', async () => {
    const invoke = vi.fn(async () => ({ ok: true }))
    const bridge = createResearchLinkFrameBridge(invoke)
    expect(Object.isFrozen(bridge)).toBe(true)

    await bridge.authorize({ sessionId: 's1', nodeId: 'n1', url: 'https://example.com/' })
    await bridge.release({ sessionId: 's1', nodeId: 'n1' })
    await bridge.releaseSession('s1')

    expect(invoke.mock.calls).toEqual([
      ['research:link-frame:authorize', {
        sessionId: 's1', nodeId: 'n1', url: 'https://example.com/'
      }],
      ['research:link-frame:release', { sessionId: 's1', nodeId: 'n1' }],
      ['research:link-frame:release-session', { sessionId: 's1' }]
    ])
  })

  it('registers handlers that accept only the trusted main frame', async () => {
    const handlers = new Map<string, (event: any, value: unknown) => unknown>()
    const ipcMain = {
      removeHandler: vi.fn((channel: string) => handlers.delete(channel)),
      handle: vi.fn((channel: string, handler: (event: any, value: unknown) => unknown) => {
        handlers.set(channel, handler)
      })
    }
    const mainFrame = { processId: 7, routingId: 41 }
    const webContents = { mainFrame }
    const window = { isDestroyed: () => false, webContents }
    const registry = new ResearchLinkFrameRegistry()
    registerResearchLinkFrameHandlers({
      ipcMain,
      getMainWindow: () => window,
      registry
    })

    const authorize = handlers.get('research:link-frame:authorize')
    expect(authorize).toBeTypeOf('function')
    const payload = { sessionId: 's1', nodeId: 'n1', url: 'https://example.com/' }
    expect(() => authorize?.({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }, payload)).toThrow('main Sherlock window')
    await expect(Promise.resolve(authorize?.({
      sender: webContents,
      senderFrame: { ...mainFrame }
    }, payload))).resolves.toEqual({ url: 'https://example.com/' })
    expect(registry.allows('https://example.com/next')).toBe(true)
  })
})
