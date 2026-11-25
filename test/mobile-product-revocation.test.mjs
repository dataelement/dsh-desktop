import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { expect, it } from 'vitest'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
it.each(['frame', 'idle', 'authorization-error'])('closes remote streams after account revocation: %s', async scenario => {
  const host = createServer((_req, res) => { res.writeHead(404); res.end() })
  const ws = new WebSocketServer({ server: host })
  let sendFrame, transport, allowed = true
  let openedResolve
  const opened = new Promise(resolve => { openedResolve = resolve })
  ws.on('connection', socket => socket.on('message', bytes => {
    const frame = JSON.parse(String(bytes))
    if (frame.endpoint === 'session/follow') {
      sendFrame = (secret = 'AFTER_REVOKE') => socket.send(JSON.stringify({ type: 'item', streamId: frame.streamId, value: { type: 'event', secret } }))
      openedResolve()
    }
  }))
  await new Promise(resolve => host.listen(0, '127.0.0.1', resolve))
  const bridge = new LanMobileBridge({ harnessUrl: () => `http://127.0.0.1:${host.address().port}`, harnessCookie: () => 'fixture=1', product: {
    authorizeRemote: () => {
      if (!allowed && scenario === 'authorization-error') throw new Error('account unavailable')
      return allowed
    }, attach: value => { transport = value }
  } })
  const abort = new AbortController()
  try {
    const { port } = await bridge.start()
    const base = `http://127.0.0.1:${port}`
    const headers = { 'x-dsh-mobile-channel': 'remote', 'x-dsh-mobile-channel-token': transport.channelToken() }
    const response = await fetch(base + '/api/v1/session/stream?sessionId=s', { headers, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) })
    const reader = response.body.getReader()
    await reader.read()
    await opened
    sendFrame('AUTHORIZED')
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('AUTHORIZED')
    allowed = false
    if (scenario !== 'idle') sendFrame()
    expect(await reader.read()).toEqual({ done: true, value: undefined })
    expect((await fetch(base + '/api/v1/status', { headers })).status).toBe(401)
  } finally {
    abort.abort()
    await bridge.stop()
    for (const client of ws.clients) client.terminate()
    await new Promise(resolve => ws.close(resolve))
    await new Promise(resolve => host.close(resolve))
  }
})
