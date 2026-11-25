import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, it, vi } from 'vitest'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
import type { MobileProductTransport } from '../src/main/mobile/product-extension'

it('requires both the private channel capability and current product authorization before dispatch', async () => {
  let transport: MobileProductTransport | undefined
  let allowed = true
  const detached = vi.fn(async () => {})
  const rpc = vi.fn(async () => ({ ok: true, value: 'product response' }))
  const bridge = new LanMobileBridge({ harnessUrl: () => undefined, product: {
    authorizeRemote: headers => allowed && headers['x-product-account'] === 'current',
    attach: value => { transport = value; return detached }, rpc
  } })
  try {
    const snapshot = await bridge.start()
    if (!transport) throw new Error('Product was not attached')
    const base = `http://127.0.0.1:${snapshot.port}`
    const headers = { 'x-dsh-mobile-channel': 'remote', 'x-dsh-mobile-channel-token': transport.channelToken(), 'x-product-account': 'current' }
    const call = (extra = {}) => fetch(base + '/api/v1/rpc', { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify({ method: 'product.read' }) })
    expect((await call({ 'x-dsh-mobile-channel-token': 'wrong' })).status).toBe(401)
    expect((await call({ 'x-product-account': 'other' })).status).toBe(401)
    expect(rpc).not.toHaveBeenCalled()
    expect(await (await call()).json()).toEqual({ ok: true, value: 'product response' })
    expect(rpc).toHaveBeenCalledTimes(1)
    allowed = false
    expect((await call()).status).toBe(401)
    expect((await fetch(base + '/api/rpc', { method: 'POST', body: '{}' })).status).toBe(401)
    await bridge.stop()
    await bridge.stop()
    expect(detached).toHaveBeenCalledTimes(1)
  } finally { await bridge.stop() }
})

it('keeps Host requests authenticated and rejects cross-origin forwarding', async () => {
  const received: Array<{ url?: string; cookie?: string }> = []
  const host = createServer((request, response) => {
    received.push({ url: request.url, cookie: request.headers.cookie })
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ ok: true }))
  })
  await new Promise<void>(resolve => host.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(host.address() as AddressInfo).port}`
  let transport: MobileProductTransport | undefined
  const bridge = new LanMobileBridge({ harnessUrl: () => origin, harnessCookie: () => 'session=fixture', product: {
    authorizeRemote: () => false, attach: value => { transport = value }
  } })
  try {
    await bridge.start()
    if (!transport) throw new Error('Product was not attached')
    expect((await transport.request('/api/product', { method: 'GET' })).status).toBe(200)
    expect(received).toEqual([{ url: '/api/product', cookie: 'session=fixture' }])
    await expect(transport.request('https://outside.invalid/', {})).rejects.toThrow('Host origin')
    expect(received).toHaveLength(1)
  } finally { await bridge.stop(); await new Promise<void>(resolve => host.close(() => resolve())) }
})
