import { describe, expect, it } from 'vitest'
import type { BrowserSearchWindow } from '../src/main/search/browser-search-controller'
import { startLocalSearchRuntime } from '../src/main/search/local-search-runtime'

function fakeWindow(): BrowserSearchWindow & { destroyed: boolean } {
  let url = ''
  const value = {
    destroyed: false,
    webContents: {
      executeJavaScript: async (script: string) =>
        script.includes('document.body?.innerText')
          ? { url, title: 'Search results', text: 'ordinary results' }
          : [{ title: 'Local result', url: 'https://example.com/local', snippet: 'summary' }],
      getURL: () => url,
      stop: () => undefined
    },
    loadURL: async (nextUrl: string) => {
      url = nextUrl
    },
    show: () => undefined,
    hide: () => undefined,
    setTitle: () => undefined,
    isDestroyed: () => value.destroyed,
    destroy: () => {
      value.destroyed = true
    }
  }
  return value
}

describe('local search main-process runtime', () => {
  it('serves browser results through its authenticated endpoint and disposes both resources', async () => {
    const window = fakeWindow()
    const runtime = await startLocalSearchRuntime({ createWindow: () => window })
    const response = await fetch(`${runtime.endpoint.url}/search`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${runtime.endpoint.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ query: 'local query', maxResults: 3 })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      sources: [
        { title: 'Local result', url: 'https://example.com/local', snippet: 'summary' }
      ],
      truncated: false
    })

    await runtime.stop()
    expect(window.destroyed).toBe(true)
    await expect(
      fetch(`${runtime.endpoint.url}/search`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${runtime.endpoint.token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ query: 'after stop' })
      })
    ).rejects.toBeInstanceOf(TypeError)
  })
})
