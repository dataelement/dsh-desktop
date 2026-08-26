import { describe, expect, it } from 'vitest'
import {
  BrowserSearchController,
  browserSearchWindowOptions,
  configureBrowserSearchSecurity,
  type BrowserSearchWindow
} from '../src/main/search/browser-search-controller'

type PageState = { url: string; title: string; text: string }

class FakeSearchWindow implements BrowserSearchWindow {
  readonly loaded: string[] = []
  readonly webContents: BrowserSearchWindow['webContents']
  visible = false
  destroyed = false
  stopped = false
  title = ''
  activeLoads = 0
  maxActiveLoads = 0
  currentUrl = ''
  pageStates: PageState[] = []
  results = new Map<string, unknown[]>()
  loadBarrier?: Promise<void>

  constructor() {
    this.webContents = {
      executeJavaScript: async (script) => {
        if (script.includes('document.body?.innerText')) {
          return (
            this.pageStates.shift() ?? {
              url: this.currentUrl,
              title: 'Search results',
              text: 'ordinary results'
            }
          )
        }
        const engine = this.currentUrl.includes('bing.com') ? 'bing' : 'duckduckgo'
        return this.results.get(engine) ?? []
      },
      getURL: () => this.currentUrl,
      stop: () => {
        if (this.destroyed) throw new Error('Object has been destroyed')
        this.stopped = true
      }
    }
  }

  async loadURL(url: string): Promise<void> {
    this.loaded.push(url)
    this.currentUrl = url
    this.activeLoads += 1
    this.maxActiveLoads = Math.max(this.maxActiveLoads, this.activeLoads)
    await this.loadBarrier
    this.activeLoads -= 1
  }

  show(): void {
    this.visible = true
  }

  hide(): void {
    this.visible = false
  }

  setTitle(title: string): void {
    this.title = title
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  destroy(): void {
    this.destroyed = true
  }
}

describe('BrowserSearchController', () => {
  it('requests a hidden sandboxed window in a non-persistent partition', () => {
    expect(browserSearchWindowOptions()).toMatchObject({
      show: false,
      title: 'Sherlock Web Search',
      webPreferences: {
        partition: 'sherlock-web-search',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    })
    expect(browserSearchWindowOptions().webPreferences?.preload).toBeUndefined()
  })

  it('denies permissions, popups, downloads, and audio in the search session', async () => {
    let permissionDecision: ((allowed: boolean) => void) | undefined
    let permissionCheck: (() => boolean) | undefined
    let downloadHandler: ((event: { preventDefault(): void }) => void) | undefined
    let popupHandler: (() => { action: string }) | undefined
    let audioMuted = false
    const searchSession = {
      setPermissionRequestHandler: (
        handler: (_webContents: unknown, _permission: string, decide: (allowed: boolean) => void) => void
      ) => {
        handler(undefined, 'geolocation', (allowed) => {
          permissionDecision?.(allowed)
        })
      },
      setPermissionCheckHandler: (handler: () => boolean) => {
        permissionCheck = handler
      },
      on: (_event: 'will-download', handler: (event: { preventDefault(): void }) => void) => {
        downloadHandler = handler
      }
    }
    const window = {
      webContents: {
        setWindowOpenHandler: (handler: () => { action: string }) => {
          popupHandler = handler
        },
        setAudioMuted: (muted: boolean) => {
          audioMuted = muted
        }
      }
    }
    const permissionResult = new Promise<boolean>((resolve) => {
      permissionDecision = resolve
    })

    configureBrowserSearchSecurity(window, searchSession)

    let downloadPrevented = false
    downloadHandler?.({ preventDefault: () => (downloadPrevented = true) })
    await expect(permissionResult).resolves.toBe(false)
    expect(permissionCheck?.()).toBe(false)
    expect(popupHandler?.()).toEqual({ action: 'deny' })
    expect(downloadPrevented).toBe(true)
    expect(audioMuted).toBe(true)
  })

  it('tries the secondary engine when the first page has no usable sources', async () => {
    const window = new FakeSearchWindow()
    window.results.set('duckduckgo', [])
    window.results.set('bing', [
      { title: 'Bing result', url: 'https://example.com/result', snippet: 'summary' }
    ])
    const controller = new BrowserSearchController({ createWindow: () => window })

    await expect(controller.search('latest earnings', 5)).resolves.toEqual({
      sources: [
        { title: 'Bing result', url: 'https://example.com/result', snippet: 'summary' }
      ],
      truncated: false
    })
    expect(window.loaded).toEqual([
      'https://html.duckduckgo.com/html/?q=latest+earnings',
      'https://www.bing.com/search?q=latest+earnings'
    ])
  })

  it('stops a stalled navigation and tries the secondary engine', async () => {
    const window = new FakeSearchWindow()
    const normalLoad = window.loadURL.bind(window)
    let firstLoad = true
    window.loadURL = async (url: string) => {
      if (firstLoad) {
        firstLoad = false
        window.loaded.push(url)
        window.currentUrl = url
        await new Promise<void>(() => undefined)
      }
      await normalLoad(url)
    }
    window.results.set('bing', [
      { title: 'Fallback result', url: 'https://example.com/fallback', snippet: 'summary' }
    ])
    const controller = new BrowserSearchController({
      createWindow: () => window,
      navigationTimeoutMs: 5
    })

    await expect(controller.search('stalled first engine', 5)).resolves.toEqual({
      sources: [
        {
          title: 'Fallback result',
          url: 'https://example.com/fallback',
          snippet: 'summary'
        }
      ],
      truncated: false
    })
    expect(window.stopped).toBe(true)
    expect(window.loaded).toEqual([
      'https://html.duckduckgo.com/html/?q=stalled+first+engine',
      'https://www.bing.com/search?q=stalled+first+engine'
    ])
  })

  it('shows the isolated window only while human verification is required', async () => {
    const window = new FakeSearchWindow()
    window.pageStates = [
      {
        url: 'https://www.bing.com/turing/captcha/challenge',
        title: 'Human Verification',
        text: 'verify you are a human'
      },
      {
        url: 'https://www.bing.com/search?q=%E8%8B%B9%E6%9E%9C',
        title: '苹果 - Search',
        text: 'ordinary results'
      }
    ]
    window.results.set('bing', [
      { title: 'Result', url: 'https://example.cn/result', snippet: 'summary' }
    ])
    const visibility: boolean[] = []
    const controller = new BrowserSearchController({
      createWindow: () => window,
      sleep: async () => {
        visibility.push(window.visible)
      }
    })

    await controller.search('苹果', 5)

    expect(visibility).toEqual([true])
    expect(window.title).toBe('完成搜索验证')
    expect(window.visible).toBe(false)
  })

  it('stops before navigation when the caller is already aborted', async () => {
    const window = new FakeSearchWindow()
    const controller = new BrowserSearchController({ createWindow: () => window })
    const abort = new AbortController()
    abort.abort(new Error('cancelled'))

    await expect(controller.search('cancel me', 5, abort.signal)).rejects.toMatchObject({
      name: 'AbortError'
    })
    expect(window.loaded).toEqual([])
  })

  it('serializes concurrent searches through one browser session', async () => {
    const window = new FakeSearchWindow()
    let releaseFirst!: () => void
    window.loadBarrier = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    window.results.set('duckduckgo', [
      { title: 'Result', url: 'https://example.com/result', snippet: 'summary' }
    ])
    const controller = new BrowserSearchController({ createWindow: () => window })

    const first = controller.search('first query', 5)
    const second = controller.search('second query', 5)
    await Promise.resolve()
    releaseFirst()
    await Promise.all([first, second])

    expect(window.maxActiveLoads).toBe(1)
    expect(window.loaded).toEqual([
      'https://html.duckduckgo.com/html/?q=first+query',
      'https://html.duckduckgo.com/html/?q=second+query'
    ])
  })

  it('destroys its isolated window when disposed', () => {
    const window = new FakeSearchWindow()
    const controller = new BrowserSearchController({ createWindow: () => window })
    controller.dispose()
    expect(window.destroyed).toBe(true)
  })

  it('can be disposed after its isolated window was already destroyed', () => {
    const window = new FakeSearchWindow()
    const controller = new BrowserSearchController({ createWindow: () => window })
    window.destroy()

    expect(() => controller.dispose()).not.toThrow()
  })

  it('recreates the isolated window after the main-window lifecycle destroys it', async () => {
    const firstWindow = new FakeSearchWindow()
    const secondWindow = new FakeSearchWindow()
    for (const window of [firstWindow, secondWindow]) {
      window.results.set('duckduckgo', [
        { title: 'Result', url: 'https://example.com/result', snippet: 'summary' }
      ])
    }
    const windows = [firstWindow, secondWindow]
    const controller = new BrowserSearchController({
      createWindow: () => windows.shift()!
    })

    await controller.search('first', 5)
    firstWindow.destroy()
    await controller.search('second', 5)

    expect(secondWindow.loaded).toEqual([
      'https://html.duckduckgo.com/html/?q=second'
    ])
  })
})
