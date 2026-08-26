import { describe, expect, it } from 'vitest'
import { LocalSearchBridge } from '../src/main/search/local-search-bridge'

async function postSearch(
  endpoint: { url: string; token: string },
  body: unknown,
  token = endpoint.token,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${endpoint.url}/search`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body),
    ...init
  })
}

describe('LocalSearchBridge', () => {
  it('binds to a random loopback port and keeps the random token out of the URL', async () => {
    const bridge = new LocalSearchBridge({
      search: async () => ({ sources: [], truncated: false })
    })
    const endpoint = await bridge.start()
    try {
      const parsed = new URL(endpoint.url)
      expect(parsed.hostname).toBe('127.0.0.1')
      expect(Number(parsed.port)).toBeGreaterThan(0)
      expect(endpoint.token).toMatch(/^[a-f0-9]{64}$/u)
      expect(endpoint.url).not.toContain(endpoint.token)
    } finally {
      await bridge.stop()
    }
  })

  it('rejects requests without the exact bearer token', async () => {
    const bridge = new LocalSearchBridge({
      search: async () => ({ sources: [], truncated: false })
    })
    const endpoint = await bridge.start()
    try {
      expect((await postSearch(endpoint, { query: 'test' }, 'wrong-token')).status).toBe(401)
      expect(
        (
          await fetch(`${endpoint.url}/search`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query: 'test' })
          })
        ).status
      ).toBe(401)
    } finally {
      await bridge.stop()
    }
  })

  it('accepts only POST JSON on the search route', async () => {
    const bridge = new LocalSearchBridge({
      search: async () => ({ sources: [], truncated: false })
    })
    const endpoint = await bridge.start()
    try {
      expect(
        (
          await fetch(`${endpoint.url}/search`, {
            headers: { authorization: `Bearer ${endpoint.token}` }
          })
        ).status
      ).toBe(405)
      expect(
        (
          await fetch(`${endpoint.url}/search`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${endpoint.token}`,
              'content-type': 'text/plain'
            },
            body: 'test'
          })
        ).status
      ).toBe(415)
      expect(
        (
          await fetch(`${endpoint.url}/other`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${endpoint.token}`,
              'content-type': 'application/json'
            },
            body: '{}'
          })
        ).status
      ).toBe(404)
    } finally {
      await bridge.stop()
    }
  })

  it('validates a bounded query and clamps the result count before searching', async () => {
    const calls: Array<{ query: string; maxResults: number }> = []
    const bridge = new LocalSearchBridge({
      search: async (query, maxResults) => {
        calls.push({ query, maxResults })
        return {
          sources: [{ url: 'https://example.com/result', title: 'Result' }],
          truncated: false
        }
      }
    })
    const endpoint = await bridge.start()
    try {
      expect((await postSearch(endpoint, { query: '  quarterly results  ', maxResults: 99 })).status).toBe(200)
      expect(calls).toEqual([{ query: 'quarterly results', maxResults: 8 }])
      expect((await postSearch(endpoint, { query: '' })).status).toBe(400)
      expect((await postSearch(endpoint, { query: 'x'.repeat(513) })).status).toBe(400)
      expect((await postSearch(endpoint, { query: 'x', maxResults: 0 })).status).toBe(400)
    } finally {
      await bridge.stop()
    }
  })

  it('rejects bodies larger than 16 KiB', async () => {
    const bridge = new LocalSearchBridge({
      search: async () => ({ sources: [], truncated: false })
    })
    const endpoint = await bridge.start()
    try {
      const response = await fetch(`${endpoint.url}/search`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${endpoint.token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ query: 'x', padding: 'y'.repeat(17 * 1024) })
      })
      expect(response.status).toBe(413)
    } finally {
      await bridge.stop()
    }
  })

  it('aborts the in-flight browser operation when the client disconnects', async () => {
    let searchStarted!: () => void
    const started = new Promise<void>((resolve) => {
      searchStarted = resolve
    })
    let searchAborted!: () => void
    const aborted = new Promise<void>((resolve) => {
      searchAborted = resolve
    })
    const bridge = new LocalSearchBridge({
      search: async (_query, _maxResults, signal) => {
        searchStarted()
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              searchAborted()
              reject(new DOMException('aborted', 'AbortError'))
            },
            { once: true }
          )
        })
      }
    })
    const endpoint = await bridge.start()
    const controller = new AbortController()
    try {
      const request = postSearch(endpoint, { query: 'slow query' }, endpoint.token, {
        signal: controller.signal
      })
      await started
      controller.abort()
      await expect(request).rejects.toMatchObject({ name: 'AbortError' })
      await aborted
    } finally {
      await bridge.stop()
    }
  })

  it('closes the loopback listener on stop', async () => {
    const bridge = new LocalSearchBridge({
      search: async () => ({ sources: [], truncated: false })
    })
    const endpoint = await bridge.start()
    await bridge.stop()

    await expect(postSearch(endpoint, { query: 'test' })).rejects.toBeInstanceOf(TypeError)
  })
})
