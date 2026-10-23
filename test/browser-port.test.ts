import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { listenOnBrowserPort } from '../src/main/browser-port'

class AssignedPorts extends EventEmitter {
  closed = 0
  listens = 0
  constructor(private readonly ports: number[]) { super() }
  listen(_options: { host: string; port: number }, callback: () => void): void { this.listens++; callback() }
  address() { return { address: '127.0.0.1', family: 'IPv4', port: this.ports[Math.min(this.listens - 1, this.ports.length - 1)] ?? 0 } }
  close(callback: (error?: Error) => void): void { this.closed++; callback() }
}

describe('browser-accessible TCP listeners', () => {
  it('releases blocked ephemeral ports and keeps the usable listener open', async () => {
    const server = new AssignedPorts([6667, 10080, 43129])
    expect(await listenOnBrowserPort(server, '127.0.0.1')).toBe(43129)
    expect(server.closed).toBe(2)
    expect(server.listenerCount('error')).toBe(0)
  })
  it('rejects an explicitly blocked port before opening a listener', async () => {
    const server = new AssignedPorts([6667])
    await expect(listenOnBrowserPort(server, '127.0.0.1', 6667)).rejects.toThrow('blocked by browsers')
    expect(server.listens).toBe(0)
  })
  it('bounds retries and closes every rejected listener', async () => {
    const server = new AssignedPorts([6667])
    await expect(listenOnBrowserPort(server, '127.0.0.1')).rejects.toThrow('after 20 attempts')
    expect(server.closed).toBe(20)
    expect(server.listenerCount('error')).toBe(0)
  })
  it.each(['event', 'throw'])('preserves a %s bind failure and removes its temporary listener', async failure => {
    const server = new AssignedPorts([43129])
    const error = new Error('address unavailable')
    vi.spyOn(server, 'listen').mockImplementation(() => {
      if (failure === 'throw') throw error
      server.emit('error', error)
    })
    await expect(listenOnBrowserPort(server, '127.0.0.1')).rejects.toBe(error)
    expect(server.listenerCount('error')).toBe(0)
  })
  it('reports close failures instead of retrying an unreleased blocked listener', async () => {
    const server = new AssignedPorts([6667])
    const error = new Error('close failed')
    vi.spyOn(server, 'close').mockImplementation(callback => callback(error))
    await expect(listenOnBrowserPort(server, '127.0.0.1')).rejects.toBe(error)
    expect(server.listens).toBe(1)
  })
  it('serves a real Fetch request on its selected port', async () => {
    const server = createServer((_request, response) => response.end('reachable'))
    try {
      const port = await listenOnBrowserPort(server, '127.0.0.1')
      expect(await (await fetch(`http://127.0.0.1:${port}`)).text()).toBe('reachable')
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
