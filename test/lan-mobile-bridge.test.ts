import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest, type IncomingMessage } from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import type { Duplex } from 'node:stream'
import {
  isInternetTunnelHost,
  isPrivateAddress,
  LanMobileBridge,
  normalizeRemoteAddress
} from '../src/main/mobile/lan-mobile-bridge'

const bridges: LanMobileBridge[] = []
const servers: ReturnType<typeof createServer>[] = []
interface TestWebSocket {
  send(data: string): void
}
interface TestWebSocketServer {
  handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    callback: (client: TestWebSocket) => void
  ): void
  close(callback: (error?: Error) => void): void
}
const WebSocketServer = createRequire(import.meta.url)('ws').WebSocketServer as new (options: {
  noServer: boolean
}) => TestWebSocketServer
const webSocketServers: TestWebSocketServer[] = []

afterEach(async () => {
  await Promise.all(bridges.splice(0).map((bridge) => bridge.stop()))
  await Promise.all(
    webSocketServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        )
    )
  )
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))
  )
})

describe('LAN mobile bridge address policy', () => {
  it('allows loopback and RFC1918 addresses', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true)
    expect(isPrivateAddress('10.1.2.3')).toBe(true)
    expect(isPrivateAddress('172.16.0.1')).toBe(true)
    expect(isPrivateAddress('172.31.255.1')).toBe(true)
    expect(isPrivateAddress('192.168.1.10')).toBe(true)
  })

  it('rejects public addresses and out-of-range 172 networks', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('172.15.0.1')).toBe(false)
    expect(isPrivateAddress('172.32.0.1')).toBe(false)
  })

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    expect(normalizeRemoteAddress('::ffff:192.168.1.4')).toBe('192.168.1.4')
  })

  it('recognizes Cloudflare and Pinggy public tunnel hosts', () => {
    expect(isInternetTunnelHost('mobile.trycloudflare.com')).toBe(true)
    expect(isInternetTunnelHost('api.trycloudflare.com')).toBe(false)
    expect(isInternetTunnelHost('mobile.a.pinggy.link')).toBe(true)
    expect(isInternetTunnelHost('mobile.run.pinggy-free.link')).toBe(true)
    expect(isInternetTunnelHost('mobile.a.free.pinggy.online')).toBe(true)
    expect(isInternetTunnelHost('free.pinggy.io')).toBe(false)
  })
})

describe('LAN mobile bridge pairing surface', () => {
  it('serves the desktop pairing page only on loopback', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    expect(snapshot.desktopUrl).toBeTruthy()
    const response = await fetch(snapshot.desktopUrl!)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Connect a mobile device')
  })

  it('offers a reconnect page without exposing mobile APIs before approval', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const response = await fetch(`http://127.0.0.1:${snapshot.port}/`)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Reconnect')
    const blocked = await fetch(`http://127.0.0.1:${snapshot.port}/api/status`)
    expect(blocked.status).toBe(401)
  })

  it('migrates a stale WiFi reconnect into the active internet entry point', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    let tunnelStopped = false
    Object.assign(bridge as unknown as Record<string, unknown>, {
      tunnelActive: true,
      tunnelInstance: {
        url: 'https://active-mobile.trycloudflare.com',
        process: {},
        stop: async () => {
          tunnelStopped = true
        }
      }
    })

    const lanReconnect = await fetch(`http://127.0.0.1:${snapshot.port}/reconnect`, {
      redirect: 'manual'
    })
    expect(lanReconnect.status).toBe(302)
    expect(lanReconnect.headers.get('location')).toBe(
      'https://active-mobile.trycloudflare.com/reconnect'
    )

    const lanRetry = await fetch(`http://127.0.0.1:${snapshot.port}/pair/retry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: `http://127.0.0.1:${snapshot.port}`
      },
      body: '{}'
    })
    expect(await lanRetry.json()).toEqual({
      redirectUrl: 'https://active-mobile.trycloudflare.com/reconnect'
    })

    const tunnelReconnect = await fetch(`http://127.0.0.1:${snapshot.port}/reconnect`, {
      headers: {
        host: 'active-mobile.trycloudflare.com',
        'cf-connecting-ip': '203.0.113.8',
        'cf-ray': 'test-ray'
      }
    })
    expect(tunnelReconnect.status).toBe(200)
    expect(await tunnelReconnect.text()).toContain('Approve this phone')
    const pending = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/pending`)
    expect(await pending.json()).toMatchObject({
      remoteAddress: '203.0.113.8',
      mode: 'tunnel'
    })
    expect(tunnelStopped).toBe(false)
  })

  it('treats Pinggy forwarding headers as an internet tunnel request', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    Object.assign(bridge as unknown as Record<string, unknown>, {
      tunnelActive: true,
      tunnelInstance: {
        provider: 'pinggy',
        url: 'https://active-mobile.a.pinggy.link',
        process: {},
        stop: async () => undefined
      }
    })

    const reconnectStatus = await requestStatus(snapshot.port!, '/reconnect', {
      host: 'active-mobile.a.pinggy.link',
      'x-forwarded-for': '203.0.113.18',
      'x-forwarded-proto': 'https'
    })
    expect(reconnectStatus).toBe(200)
    const pending = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/pending`)
    expect(await pending.json()).toMatchObject({
      remoteAddress: '203.0.113.18',
      mode: 'tunnel'
    })
  })

  it('keeps the active internet tunnel available after desktop disconnect', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    let tunnelStopped = false
    Object.assign(bridge as unknown as Record<string, unknown>, {
      tunnelActive: true,
      tunnelInstance: {
        url: 'https://active-mobile.trycloudflare.com',
        process: {},
        stop: async () => {
          tunnelStopped = true
        }
      }
    })

    const disconnected = await fetch(
      `http://127.0.0.1:${snapshot.port}/desktop/disconnect`,
      { method: 'POST' }
    )
    expect(disconnected.status).toBe(200)
    expect(bridge.snapshot().tunnelActive).toBe(true)
    expect(tunnelStopped).toBe(false)

    const reconnectPage = await fetch(`http://127.0.0.1:${snapshot.port}/disconnected`, {
      headers: {
        host: 'active-mobile.trycloudflare.com',
        'cf-connecting-ip': '203.0.113.8',
        'cf-ray': 'test-ray'
      }
    })
    expect(reconnectPage.status).toBe(200)
    const reconnectHtml = await reconnectPage.text()
    expect(reconnectHtml).toContain('Reconnect')
    expect(reconnectHtml).not.toContain('same Wi-Fi')
  })

  it('retries an expired approval inside the same Home Screen browser context', async () => {
    let reconnectRequests = 0
    let now = Date.now()
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999',
      now: () => now,
      onReconnectRequested: () => {
        reconnectRequests += 1
      }
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const reconnect = await fetch(`http://127.0.0.1:${snapshot.port}/reconnect`)
    const reconnectHtml = await reconnect.text()
    let pairingId = /let id="([^"]+)"/.exec(reconnectHtml)?.[1]
    expect(pairingId).toBeTruthy()
    expect(reconnectHtml).toContain('Approve this phone')
    expect(reconnectRequests).toBe(1)

    now += 5 * 60 * 1000 + 1
    const expired = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`
    )
    expect(await expired.json()).toEqual({ expired: true })
    const retried = await fetch(`http://127.0.0.1:${snapshot.port}/pair/retry`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: `http://127.0.0.1:${snapshot.port}`
      },
      body: '{}'
    })
    const retriedPairing = (await retried.json()) as { id: string }
    expect(retriedPairing.id).toBeTruthy()
    expect(retriedPairing.id).not.toBe(pairingId)
    expect(reconnectRequests).toBe(2)
    pairingId = retriedPairing.id

    // Opening the desktop approval window starts the bridge again. That must
    // not rotate away the pending request the phone is already polling.
    const reopened = await bridge.start()
    expect(reopened.port).toBe(snapshot.port)
    const pending = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/pending`)
    expect(await pending.json()).toMatchObject({ id: pairingId })
    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pairingId, approved: true })
    })
    const approved = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`
    )
    expect(await approved.clone().json()).toEqual({ approved: true })
    const cookie = approved.headers.get('set-cookie')!.split(';', 1)[0]!
    const mobile = await fetch(`http://127.0.0.1:${snapshot.port}/`, {
      headers: { cookie }
    })
    expect(mobile.status).toBe(200)
    expect(await mobile.text()).toContain('DSH Mobile')
  })

  it('requires approval, then forwards only allowlisted RPC methods', async () => {
    const harness = createServer(async (request, response) => {
      if (request.method === 'GET' && request.url === '/api/remote.mux') {
        response.statusCode = 404
        response.end()
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { rpcId: string }
      response.setHeader('content-type', 'application/json')
      response.end(
        JSON.stringify({
          type: 'server-response',
          rpcId: envelope.rpcId,
          result: { ok: true, value: { items: [], archivedSessionIds: [] } }
        })
      )
    })
    const pairingMux = new WebSocketServer({ noServer: true })
    webSocketServers.push(pairingMux)
    harness.on('upgrade', (request, socket, head) => {
      if (request.url !== '/api/remote.mux') return socket.destroy()
      pairingMux.handleUpgrade(request, socket, head, (client) => {
        client.send(JSON.stringify({
          type: 'item',
          streamId: 'mobile-workspaces',
          value: { type: 'baseline', value: { items: [], archivedSessionIds: [] } }
        }))
      })
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const token = new URL(snapshot.pairingUrl!).searchParams.get('token')
    const pairingPage = await fetch(`http://127.0.0.1:${snapshot.port}/pair?token=${token}`)
    const pairingHtml = await pairingPage.text()
    const pairingId = /let id="([^"]+)"/.exec(pairingHtml)?.[1]
    expect(pairingId).toBeTruthy()
    const pending = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/pending`)
    expect(await pending.json()).toMatchObject({ id: pairingId, remoteAddress: '127.0.0.1' })
    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pairingId, approved: true })
    })
    const paired = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`,
      { redirect: 'manual' }
    )
    expect(await paired.clone().json()).toEqual({ approved: true })
    const cookie = paired.headers.get('set-cookie')!.split(';', 1)[0]!

    const rescanned = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair?token=${token}`,
      { headers: { cookie }, redirect: 'manual' }
    )
    expect(rescanned.status).toBe(302)
    expect(rescanned.headers.get('location')).toBe('/')

    const forwarded = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'session.list', payload: {} })
    })
    expect(forwarded.status).toBe(200)
    expect(await forwarded.json()).toMatchObject({ ok: true, value: { items: [] } })

    // The Host serves workspaces only as a stream now, so this answer comes
    // from the `workspace/follow` baseline the carrier retained rather than
    // from a unary call.
    const workspaces = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'workspace.list', payload: {} })
    })
    expect(workspaces.status).toBe(200)
    expect(await workspaces.json()).toMatchObject({
      ok: true,
      value: { items: [], archivedSessionIds: [] }
    })

    const presetList = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'agentPreset.list', payload: {} })
    })
    expect(presetList.status).toBe(200)

    for (const [method, payload] of [
      ['agentPreset.select', { sessionId: 'session-1', agentPreset: 'standard' }],
      ['session.models', { sessionId: 'session-1' }],
      [
        'session.selectModel',
        { sessionId: 'session-1', provider: 'provider-1', model: 'model-1' }
      ]
    ] as const) {
      const response = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ method, payload })
      })
      expect(response.status, method).toBe(200)
    }

    const sameBridge = await bridge.start()
    expect(sameBridge.port).toBe(snapshot.port)
    const stillAuthorized = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'session.list', payload: {} })
    })
    expect(stillAuthorized.status).toBe(200)

    const status = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/status`)
    expect(await status.json()).toEqual({ connected: true })
    const managementPage = await fetch(`http://127.0.0.1:${snapshot.port}/desktop`)
    expect(await managementPage.text()).toContain('Manage phone connection')
    const blockedModeSwitch = await fetch(
      `http://127.0.0.1:${snapshot.port}/desktop/tunnel/toggle`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enable: true })
      }
    )
    expect(blockedModeSwitch.status).toBe(409)
    expect(await blockedModeSwitch.json()).toEqual({
      ok: false,
      error: 'Disconnect the phone before switching connection modes.'
    })
    const mobileStatus = await fetch(`http://127.0.0.1:${snapshot.port}/api/status`, {
      headers: { cookie }
    })
    expect(mobileStatus.status).toBe(200)
    expect(await mobileStatus.json()).toEqual({ connected: true })
    const samePhoneHomeScreen = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`
    )
    expect(samePhoneHomeScreen.status).toBe(200)
    expect(await samePhoneHomeScreen.json()).toEqual({ connected: true })

    const blocked = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'host.openPath', payload: { path: '/tmp/secret' } })
    })
    expect(blocked.status).toBe(403)

    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/disconnect`, { method: 'POST' })
    const disconnected = await fetch(`http://127.0.0.1:${snapshot.port}/api/rpc`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ method: 'workspace.list', payload: {} })
    })
    expect(disconnected.status).toBe(401)
    const disconnectedStatus = await fetch(`http://127.0.0.1:${snapshot.port}/api/status`, {
      headers: { cookie }
    })
    expect(disconnectedStatus.status).toBe(401)
    const disconnectedHomeScreen = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`
    )
    expect(disconnectedHomeScreen.status).toBe(401)
    const legacyHomeScreenCookie = `dsh_mobile=${'a'.repeat(43)}`
    const unknownHomeScreenBeforeApproval = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`,
      { headers: { cookie: legacyHomeScreenCookie } }
    )
    expect(unknownHomeScreenBeforeApproval.status).toBe(401)

    const reconnectSnapshot = bridge.snapshot()
    const reconnectToken = new URL(reconnectSnapshot.pairingUrl!).searchParams.get('token')
    const reconnectPage = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair?token=${reconnectToken}`
    )
    const reconnectHtml = await reconnectPage.text()
    const reconnectId = /let id="([^"]+)"/.exec(reconnectHtml)?.[1]
    expect(reconnectId).toBeTruthy()
    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: reconnectId, approved: true })
    })
    const reapproved = await fetch(
      `http://127.0.0.1:${snapshot.port}/pair/status?id=${reconnectId}`
    )
    expect(await reapproved.clone().json()).toEqual({ approved: true })
    const newCookie = reapproved.headers.get('set-cookie')!.split(';', 1)[0]!

    const restoredHomeScreen = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`,
      { headers: { cookie } }
    )
    expect(restoredHomeScreen.status).toBe(200)
    expect(await restoredHomeScreen.json()).toEqual({ connected: true })
    const newlyPairedSafari = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`,
      { headers: { cookie: newCookie } }
    )
    expect(newlyPairedSafari.status).toBe(200)
    const homeScreenWithoutSharedCookies = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`
    )
    expect(homeScreenWithoutSharedCookies.status).toBe(200)
    const restoredLegacyHomeScreen = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`,
      { headers: { cookie: legacyHomeScreenCookie } }
    )
    expect(restoredLegacyHomeScreen.status).toBe(200)
    const lateHomeScreenCookie = `dsh_mobile=${'b'.repeat(43)}`
    const restoredAfterSafariPaired = await fetch(
      `http://127.0.0.1:${snapshot.port}/api/status`,
      { headers: { cookie: lateHomeScreenCookie } }
    )
    expect(restoredAfterSafariPaired.status).toBe(200)
  })

  it('adapts Harness 0.1.2 history records to the stable mobile page contract', async () => {
    let pageRequest: unknown
    const projections = {
      asOfSeq: 7,
      values: {
        todos: [{ content: 'Restore mobile history', status: 'in_progress' }]
      }
    }
    const records = [
      {
        type: 'event',
        event: { type: 'user/message', time: 1, content: [{ type: 'text', text: 'hello' }] }
      }
    ]
    const harness = createServer(async (request, response) => {
      if (request.method !== 'POST') {
        response.statusCode = 404
        response.end()
        return
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
        rpcId: string
        method: string
        payload: { args: unknown }
      }
      const value = envelope.method === 'session/list'
        ? {
            items: [
              {
                sessionId: 'session-1',
                updatedAt: 1,
                running: false,
                blank: false,
                projections
              }
            ]
          }
        : { records, hasMore: false }
      if (envelope.method === 'session/page') pageRequest = envelope.payload.args
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({
        type: 'server-response',
        rpcId: envelope.rpcId,
        result: { ok: true, value }
      }))
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const { port, cookie } = await pairBridge(bridge)

    const history = await mobileRpc(port, cookie, 'session.history', {
      sessionId: 'session-1',
      maxMessages: 100
    })

    expect(history.status).toBe(200)
    expect(await history.json()).toEqual({
      ok: true,
      value: { events: records, projections, hasMore: false }
    })
    expect(pageRequest).toEqual({
      request: {
        address: { kind: 'session', sessionId: 'session-1' },
        throughSeq: 7,
        maxMessages: 100
      }
    })
  })

  it('streams native session follow snapshots and events to an authorized phone', async () => {
    let sessionOpen: unknown
    const harness = createServer((_request, response) => {
      response.statusCode = 404
      response.end()
    })
    const muxServer = new WebSocketServer({ noServer: true })
    webSocketServers.push(muxServer)
    harness.on('upgrade', (request, socket, head) => {
      if (request.url !== '/api/remote.mux') return socket.destroy()
      muxServer.handleUpgrade(request, socket, head, (client) => {
        const peer = client as TestWebSocket & {
          on(event: 'message', listener: (data: Buffer) => void): void
        }
        peer.on('message', (data) => {
          const opened = JSON.parse(data.toString('utf8')) as {
            streamId: string
            endpoint: string
            payload: unknown
          }
          if (opened.endpoint !== 'session/follow') return
          sessionOpen = opened.payload
          peer.send(JSON.stringify({
            type: 'item',
            streamId: opened.streamId,
            value: {
              type: 'snapshot',
              cursor: 2,
              records: [{ type: 'event', event: { type: 'user/message', seq: 2 } }],
              hasMore: false,
              projections: { asOfSeq: 2, values: {} }
            }
          }))
          peer.send(JSON.stringify({
            type: 'item',
            streamId: opened.streamId,
            value: { type: 'event', event: { type: 'assistant/chunk', seq: 3 } }
          }))
        })
      })
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const { port, cookie } = await pairBridge(bridge)
    const abort = new AbortController()
    const response = await fetch(
      `http://127.0.0.1:${port}/api/session/stream?sessionId=session-1`,
      { headers: { cookie }, signal: abort.signal }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let body = ''
    await waitFor(async () => {
      const chunk = await reader.read()
      body += decoder.decode(chunk.value, { stream: true })
      return body.includes('event: snapshot') && body.includes('event: event')
    })
    abort.abort()
    expect(body).toContain('"type":"snapshot"')
    expect(body).toContain('"type":"assistant/chunk"')
    expect(sessionOpen).toEqual({
      args: {
        request: {
          address: { kind: 'session', sessionId: 'session-1' },
          maxMessages: 100
        }
      }
    })
  })
})

describe('LAN mobile bridge user questions', () => {
  it('replays pending questions and forwards the desktop answer protocol', async () => {
    const responses: unknown[] = []
    const muxClients: TestWebSocket[] = []
    const harness = createServer(async (request, response) => {
      if (request.method === 'GET' && request.url === '/api/remote.mux') {
        response.statusCode = 426
        response.end()
        return
      }
      if (request.method === 'POST' && request.url === '/api/$events/result') {
        const chunks: Buffer[] = []
        for await (const chunk of request) chunks.push(Buffer.from(chunk))
        const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { rpcId: string }
        responses.push(envelope)
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({
          type: 'server-response',
          rpcId: envelope.rpcId,
          result: { ok: true, value: { accepted: true } }
        }))
        return
      }
      response.statusCode = 404
      response.end()
    })
    const muxServer = new WebSocketServer({ noServer: true })
    webSocketServers.push(muxServer)
    harness.on('upgrade', (request, socket, head) => {
      if (request.url !== '/api/remote.mux') return socket.destroy()
      muxServer.handleUpgrade(request, socket, head, (client) => {
        muxClients.push(client)
        // The carrier names the generation before anything else; the bridge
        // quotes that clientId when it settles an event.
        client.send(JSON.stringify({
          type: 'item',
          streamId: 'mobile-events',
          value: { type: 'ready', clientId: 'client-1', host: { home: '/home/test' } }
        }))
        client.send(JSON.stringify({
          type: 'item',
          streamId: 'mobile-workspaces',
          value: { type: 'baseline', value: { items: [], archivedSessionIds: [] } }
        }))
        client.send(
          JSON.stringify({
            type: 'item',
            streamId: 'mobile-events',
            value: {
              type: 'waterfall',
              event: 'user-questions/request',
              eventId: 'question-rpc-1',
              agentId: 'session-1',
              request: {
              questions: [
                {
                  id: 'domain',
                  header: '领域确认',
                  question: '你说的持续学习指哪个领域？',
                  options: [
                    {
                      label: '机器学习中的 Continual Learning (推荐)',
                      description: '终身学习与抗灾难性遗忘'
                    },
                    { label: '教育学中的持续学习' }
                  ]
                }
              ]
              }
            }
          })
        )
      })
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const { port, cookie } = await pairBridge(bridge)

    const pending = await waitForRpcValue(port, cookie, 'interaction.pending', {
      sessionId: 'session-1'
    })
    expect(pending).toMatchObject({
      rpcId: 'question-rpc-1',
      sessionId: 'session-1',
      questions: [
        {
          id: 'domain',
          header: '领域确认',
          question: '你说的持续学习指哪个领域？'
        }
      ]
    })

    const answer = await mobileRpc(port, cookie, 'interaction.answer', {
      rpcId: 'question-rpc-1',
      sessionId: 'session-1',
      answers: [
        {
          id: 'domain',
          selected: ['机器学习中的 Continual Learning (推荐)']
        }
      ]
    })
    expect(answer.status).toBe(200)
    expect(answer.status).toBe(200)
    expect(responses).toEqual([
      {
        type: 'client-request',
        rpcId: expect.any(String),
        method: '$events/result',
        payload: {
          args: {
            clientId: 'client-1',
            eventId: 'question-rpc-1',
            outcome: {
              kind: 'result',
              value: {
                answers: [
                  {
                    id: 'domain',
                    selected: ['机器学习中的 Continual Learning (推荐)']
                  }
                ]
              }
            }
          }
        }
      }
    ])

    // Settling the event is the end of it. The old mux broadcast a separate
    // `question/resolved` that kept the Harness authoritative over when a
    // question cleared; the Gateway sends nothing after a result, so a
    // question that stayed pending here would never clear.
    await waitFor(async () => {
      const response = await mobileRpc(port, cookie, 'interaction.pending', {
        sessionId: 'session-1'
      })
      return (await response.json()).value === null
    })
  })

  it('opens the mux downlink only while a phone is attached', async () => {
    let upgrades = 0
    const harness = createServer((_request, response) => {
      response.statusCode = 404
      response.end()
    })
    const muxServer = new WebSocketServer({ noServer: true })
    webSocketServers.push(muxServer)
    harness.on('upgrade', (request, socket, head) => {
      if (request.url !== '/api/remote.mux') return socket.destroy()
      upgrades += 1
      muxServer.handleUpgrade(request, socket, head, () => undefined)
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const connectionEvents: boolean[] = []
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`,
      onConnectedChange: (connected) => connectionEvents.push(connected)
    })
    bridges.push(bridge)

    // A desktop that never pairs a phone has no consumer for the downlink, so
    // it must not sit there reconnecting to it for the life of the process.
    await bridge.start()
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(upgrades).toBe(0)
    expect(connectionEvents).toEqual([])

    await pairBridge(bridge)
    await waitFor(async () => upgrades > 0)
    expect(connectionEvents).toEqual([true])

    await bridge.stop()
    expect(connectionEvents).toEqual([true, false])
  })

  it('rejects answers that were not offered by the pending question', async () => {
    const responses: unknown[] = []
    const harness = createServer(async (request, response) => {
      if (request.method === 'GET' && request.url === '/api/remote.mux') {
        response.statusCode = 426
        response.end()
        return
      }
      if (request.method === 'POST' && request.url === '/api/$events/result') {
        const chunks: Buffer[] = []
        for await (const chunk of request) chunks.push(Buffer.from(chunk))
        const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { rpcId: string }
        responses.push(envelope)
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({
          type: 'server-response',
          rpcId: envelope.rpcId,
          result: { ok: true, value: { accepted: true } }
        }))
        return
      }
      response.statusCode = 404
      response.end()
    })
    const muxServer = new WebSocketServer({ noServer: true })
    webSocketServers.push(muxServer)
    harness.on('upgrade', (request, socket, head) => {
      if (request.url !== '/api/remote.mux') return socket.destroy()
      muxServer.handleUpgrade(request, socket, head, (client) => {
        client.send(JSON.stringify({
          type: 'item',
          streamId: 'mobile-events',
          value: { type: 'ready', clientId: 'client-2', host: { home: '/home/test' } }
        }))
        client.send(
          JSON.stringify({
            type: 'item',
            streamId: 'mobile-events',
            value: {
              type: 'waterfall',
              event: 'user-questions/request',
              eventId: 'question-rpc-2',
              agentId: 'session-2',
              request: {
                questions: [{ id: 'choice', question: '选择一个', options: [{ label: 'A' }] }]
              }
            }
          })
        )
      })
    })
    servers.push(harness)
    await new Promise<void>((resolve) => harness.listen(0, '127.0.0.1', resolve))
    const harnessPort = (harness.address() as AddressInfo).port
    const bridge = new LanMobileBridge({
      harnessUrl: () => `http://127.0.0.1:${harnessPort}`
    })
    bridges.push(bridge)
    const { port, cookie } = await pairBridge(bridge)
    await waitForRpcValue(port, cookie, 'interaction.pending', { sessionId: 'session-2' })
    const answer = await mobileRpc(port, cookie, 'interaction.answer', {
      rpcId: 'question-rpc-2',
      sessionId: 'session-2',
      answers: [{ id: 'choice', selected: ['B'] }]
    })
    expect(answer.status).toBe(500)
    expect(await answer.json()).toMatchObject({ ok: false, error: 'Answer contains an unknown option.' })

    const cancel = await mobileRpc(port, cookie, 'interaction.cancel', {
      rpcId: 'question-rpc-2',
      sessionId: 'session-2'
    })
    expect(cancel.status).toBe(200)
    expect(responses).toEqual([
      {
        type: 'client-request',
        rpcId: expect.any(String),
        method: '$events/result',
        payload: {
          args: {
            clientId: 'client-2',
            eventId: 'question-rpc-2',
            outcome: {
              kind: 'rejected',
              error: {
                name: 'Error',
                code: 'cancelled',
                message: 'the user closed this question request'
              }
            }
          }
        }
      }
    ])
  })
})

async function pairBridge(bridge: LanMobileBridge): Promise<{ port: number; cookie: string }> {
  const snapshot = await bridge.start()
  const token = new URL(snapshot.pairingUrl!).searchParams.get('token')
  const pairingPage = await fetch(`http://127.0.0.1:${snapshot.port}/pair?token=${token}`)
  const pairingId = /let id="([^"]+)"/.exec(await pairingPage.text())?.[1]
  await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: pairingId, approved: true })
  })
  const paired = await fetch(
    `http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`,
    { redirect: 'manual' }
  )
  return {
    port: snapshot.port!,
    cookie: paired.headers.get('set-cookie')!.split(';', 1)[0]!
  }
}

function requestStatus(
  port: number,
  path: string,
  headers: Record<string, string>
): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, path, headers },
      (response) => {
        response.resume()
        response.once('end', () => resolve(response.statusCode))
      }
    )
    request.once('error', reject)
    request.end()
  })
}

function mobileRpc(
  port: number,
  cookie: string,
  method: string,
  payload: unknown
): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/api/rpc`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ method, payload })
  })
}

async function waitForRpcValue(
  port: number,
  cookie: string,
  method: string,
  payload: unknown
): Promise<unknown> {
  let value: unknown = null
  await waitFor(async () => {
    const response = await mobileRpc(port, cookie, method, payload)
    value = (await response.json()).value
    return value !== null
  })
  return value
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 2_000): Promise<void> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('Timed out waiting for condition.')
}
describe('snapshot keeps tunnel state after the pairing token is consumed', () => {
  it('reports an active tunnel through status and toggle endpoints once the token is consumed', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()

    // Simulate the post-approval state: the single-use pairing token is gone,
    // no phone session is active, but a tunnel keeps running.
    Object.assign(bridge as unknown as Record<string, unknown>, {
      pairingToken: undefined,
      pairingExpiresAt: undefined,
      tunnelActive: true,
      tunnelInstance: {
        url: 'https://post-pair.trycloudflare.com',
        process: {},
        stop: async () => undefined
      }
    })

    const status = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/tunnel/status`)
    const statusJson = await status.json()
    expect(statusJson.active).toBe(true)
    expect(statusJson.url).toBe('https://post-pair.trycloudflare.com')

    const toggle = await fetch(`http://127.0.0.1:${snapshot.port}/desktop/tunnel/toggle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: `http://127.0.0.1:${snapshot.port}` },
      body: JSON.stringify({ enable: true })
    })
    expect(toggle.status).toBe(200)
    const toggleJson = await toggle.json()
    expect(toggleJson.ok).toBe(true)
    expect(toggleJson.active).toBe(true)
    expect(toggleJson.url).toBe('https://post-pair.trycloudflare.com')
  })

  it('serves the desktop page with a fresh pairing token after approval or expiry', async () => {
    let now = Date.now()
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999',
      now: () => now
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const before = await fetch(snapshot.desktopUrl!)
    expect(before.status).toBe(200)

    // Consume the token by approving a phone pairing.
    const reconnect = await fetch(`http://127.0.0.1:${snapshot.port}/reconnect`)
    const pairingId = /let id="([^"]+)"/.exec(await reconnect.text())?.[1]
    await fetch(`http://127.0.0.1:${snapshot.port}/desktop/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pairingId, approved: true })
    })
    await fetch(`http://127.0.0.1:${snapshot.port}/pair/status?id=${pairingId}`)

    const afterApproval = await fetch(snapshot.desktopUrl!)
    expect(afterApproval.status).toBe(200)
    const html = await afterApproval.text()
    expect(html).toContain('/pair?token=')

    // Let the (rotated) token expire: the desktop page must rotate again
    // instead of rendering a dead QR code.
    now += 5 * 60 * 1000 + 1
    const afterExpiry = await fetch(snapshot.desktopUrl!)
    expect(afterExpiry.status).toBe(200)
    const fresh = await bridge.snapshot()
    expect(fresh.pairingUrl).toBeTruthy()
    expect(fresh.expiresAt!).toBeGreaterThan(now)
  })
})

describe('pairing token boundary and desktop origin hardening', () => {
  it('treats now === expiresAt as still valid and does not rotate', async () => {
    let now = Date.now()
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999',
      now: () => now
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const tokenBefore = snapshot.pairingUrl

    now = snapshot.expiresAt!
    const atBoundary = bridge.snapshot()
    expect(atBoundary.pairingUrl).toBeTruthy()
    expect(atBoundary.expiresAt).toBe(now)
    // /desktop must not rotate at exactly the expiry instant.
    const page = await fetch(snapshot.desktopUrl!)
    expect(page.status).toBe(200)
    const rotated = bridge.snapshot()
    expect(rotated.pairingUrl).toBe(tokenBefore)
  })

  it('rejects cross-site browser requests to desktop endpoints', async () => {
    const bridge = new LanMobileBridge({
      harnessUrl: () => 'http://127.0.0.1:9999'
    })
    bridges.push(bridge)
    const snapshot = await bridge.start()
    const base = `http://127.0.0.1:${snapshot.port}`
    const origin = `http://127.0.0.1:${snapshot.port}`

    const crossSiteGet = await fetch(`${base}/desktop`, {
      headers: { 'sec-fetch-site': 'cross-site' }
    })
    expect(crossSiteGet.status).toBe(500)
    expect(await crossSiteGet.text()).toContain('Cross-site request rejected')

    const crossOriginPost = await fetch(`${base}/desktop/disconnect`, {
      method: 'POST',
      headers: { origin: 'https://evil.example.com' }
    })
    expect(crossOriginPost.status).toBe(500)

    // Same-origin and no-header requests keep working (local tooling, tests).
    const sameOrigin = await fetch(`${base}/desktop`, {
      headers: { 'sec-fetch-site': 'same-origin', origin }
    })
    expect(sameOrigin.status).toBe(200)
    const noHeaders = await fetch(`${base}/desktop`)
    expect(noHeaders.status).toBe(200)
  })
})
