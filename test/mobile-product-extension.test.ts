import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, it, vi } from 'vitest'
import { LanMobileBridge } from '../src/main/mobile/lan-mobile-bridge'
import type { MobileProductExtension, MobileProductTransport } from '../src/main/mobile/product-extension'

it('resolves a product provider once per start and reuses that instance', async () => {
  let reads = 0
  let transport: MobileProductTransport | undefined
  let extension: MobileProductExtension & { rpc: ReturnType<typeof vi.fn> } | undefined
  const bridge = new LanMobileBridge({
    harnessUrl: () => undefined,
    product: () => {
      reads += 1
      const created = {
        authorizeRemote: () => true,
        attach: (value: MobileProductTransport) => { transport = value },
        rpc: vi.fn(async () => ({ ok: true, value: 'same' }))
      }
      extension = created
      return created
    }
  })
  expect(reads).toBe(0)
  try {
    const snapshot = await bridge.start()
    if (!transport || !extension) throw new Error('Product was not attached')
    const response = await fetch(`http://127.0.0.1:${snapshot.port}/api/v1/rpc`, {
      method: 'POST',
      headers: {
        'x-dsh-mobile-channel': 'remote',
        'x-dsh-mobile-channel-token': transport.channelToken(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({ method: 'product.read' })
    })
    expect(response.status).toBe(200)
    expect(reads).toBe(1)
    expect(extension.rpc).toHaveBeenCalledTimes(1)
  } finally { await bridge.stop() }
})

it('reads the product provider again after the bridge restarts', async () => {
  let reads = 0
  const detached = vi.fn(async () => {})
  const bridge = new LanMobileBridge({
    harnessUrl: () => undefined,
    product: () => {
      reads += 1
      return { authorizeRemote: () => false, attach: () => detached }
    }
  })
  try {
    await bridge.start()
    expect(reads).toBe(1)
    await bridge.stop()
    expect(detached).toHaveBeenCalledTimes(1)
    await bridge.start()
    expect(reads).toBe(2)
  } finally { await bridge.stop() }
})

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
