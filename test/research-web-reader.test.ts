import { describe, expect, it, vi } from 'vitest'
import {
  isResearchWechatArticleUrl,
  readResearchWechatArticle,
  registerResearchWebReaderHandlers,
  type ResearchWebReaderDependencies
} from '../src/main/state/research-web-reader'
import { ResearchLinkFrameRegistry } from '../src/main/state/research-link-frame'
import { createResearchWebReaderBridge } from '../src/preload/research-web-reader'

function fixtureDependencies(
  fetch: ResearchWebReaderDependencies['fetch']
): ResearchWebReaderDependencies {
  return {
    fetch,
    createTimeoutSignal: () => new AbortController().signal
  }
}

function htmlResponse(html: string, init: ResponseInit = {}): Response {
  return new Response(html, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...Object.fromEntries(new Headers(init.headers).entries())
    }
  })
}

describe('Research WeChat article reader', () => {
  it('accepts only public HTTPS mp.weixin.qq.com article paths', () => {
    expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com/s/abc')).toBe(true)
    expect(isResearchWechatArticleUrl('https://mp.weixin.qq.com/s?__biz=abc')).toBe(true)

    for (const url of [
      'http://mp.weixin.qq.com/s/abc',
      'https://mp.weixin.qq.com/cgi-bin/home',
      'https://mp.weixin.qq.com.evil.example/s/abc',
      'https://user:pass@mp.weixin.qq.com/s/abc',
      'file:///tmp/article.html'
    ]) {
      expect(isResearchWechatArticleUrl(url), url).toBe(false)
    }
  })

  it('extracts bounded metadata and sanitizes the responsive article body', async () => {
    const fetch = vi.fn(async () => htmlResponse(`<!doctype html><html><head>
      <meta property="og:title" content=" 英伟达豪掷70亿，下场做开放大模型了 ">
      <meta property="og:description" content=" 公开文章描述 ">
    </head><body>
      <span id="js_name">科技作者</span><em id="publish_time">2026年9月1日</em>
      <div id="js_content">
        <p onclick="steal()">正文<strong>重点</strong></p>
        <img data-src="https://mmbiz.qpic.cn/a.png" onerror="steal()">
        <a href="javascript:steal()">坏链接</a>
        <script>steal()</script><iframe src="https://evil.example"></iframe>
      </div>
    </body></html>`))

    const result = await readResearchWechatArticle(
      { url: 'https://mp.weixin.qq.com/s/article-id' },
      fixtureDependencies(fetch)
    )

    expect(result).toMatchObject({
      status: 'ready',
      url: 'https://mp.weixin.qq.com/s/article-id',
      title: '英伟达豪掷70亿，下场做开放大模型了',
      description: '公开文章描述',
      author: '科技作者',
      publishTime: '2026年9月1日'
    })
    if (result.status !== 'ready') return
    expect(result.bodyHtml).toContain('<p>正文<strong>重点</strong></p>')
    expect(result.bodyHtml).toContain('src="https://mmbiz.qpic.cn/a.png"')
    expect(result.bodyHtml).not.toMatch(/script|iframe|onclick|onerror|javascript:/i)
    expect(fetch).toHaveBeenCalledWith(
      'https://mp.weixin.qq.com/s/article-id',
      expect.objectContaining({
        redirect: 'manual',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      })
    )
  })

  it('fails closed when a redirect leaves the public WeChat article allowlist', async () => {
    const fetch = vi.fn(async () => htmlResponse('', {
      status: 302,
      headers: { location: 'https://evil.example/article' }
    }))

    await expect(readResearchWechatArticle(
      { url: 'https://mp.weixin.qq.com/s/article-id' },
      fixtureDependencies(fetch)
    )).resolves.toEqual({ status: 'unavailable', reason: 'response' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects oversized, non-HTML, and bodyless responses', async () => {
    const cases: Array<{
      response: Response
      reason: 'too-large' | 'response' | 'content'
    }> = [
      {
        response: htmlResponse('<div id="js_content">too large</div>', {
          headers: { 'content-length': String(6 * 1024 * 1024 + 1) }
        }),
        reason: 'too-large'
      },
      {
        response: new Response('plain', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        }),
        reason: 'response'
      },
      {
        response: htmlResponse('<html><body>missing article</body></html>'),
        reason: 'content'
      }
    ]

    for (const { response, reason } of cases) {
      const result = await readResearchWechatArticle(
        { url: 'https://mp.weixin.qq.com/s/article-id' },
        fixtureDependencies(vi.fn(async () => response.clone()))
      )
      expect(result).toEqual({ status: 'unavailable', reason })
    }
  })

  it('distinguishes timeouts from ordinary network failures', async () => {
    const aborted = new AbortController()
    aborted.abort()
    const timeout = fixtureDependencies(vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    }))
    timeout.createTimeoutSignal = () => aborted.signal

    await expect(readResearchWechatArticle(
      { url: 'https://mp.weixin.qq.com/s/article-id' },
      timeout
    )).resolves.toEqual({ status: 'unavailable', reason: 'timeout' })

    await expect(readResearchWechatArticle(
      { url: 'https://mp.weixin.qq.com/s/article-id' },
      fixtureDependencies(vi.fn(async () => { throw new Error('offline') }))
    )).resolves.toEqual({ status: 'unavailable', reason: 'network' })
  })

  it('exposes a frozen preload bridge with one exact IPC channel', async () => {
    const invoke = vi.fn(async () => ({ status: 'unavailable', reason: 'content' }))
    const bridge = createResearchWebReaderBridge(invoke)
    expect(Object.isFrozen(bridge)).toBe(true)

    await bridge.read({
      sessionId: 'session-1', nodeId: 'node-1',
      url: 'https://mp.weixin.qq.com/s/article-id'
    })

    expect(invoke).toHaveBeenCalledWith('research:web-reader:read', {
      sessionId: 'session-1', nodeId: 'node-1',
      url: 'https://mp.weixin.qq.com/s/article-id'
    })
  })

  it('uses the injected Chromium fetch dependency at the trusted IPC boundary', async () => {
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
    const registry = new ResearchLinkFrameRegistry(() => 'd'.repeat(32))
    const url = 'https://mp.weixin.qq.com/s/8KsqPVeAfMMev43BXwvCFA'
    registry.authorize({ sessionId: 'session-1', nodeId: 'node-1', url })
    const chromiumFetch = vi.fn(async () => htmlResponse(`<!doctype html><html><head>
      <meta property="og:title" content="英伟达豪掷70亿，下场做开放大模型了">
    </head><body><div id="js_content"><p>文章正文</p></div></body></html>`))
    const defaultFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Node certificate chain rejected')
    )
    try {
      registerResearchWebReaderHandlers({
        ipcMain,
        getMainWindow: () => window,
        registry,
        dependencies: fixtureDependencies(chromiumFetch)
      })

      const read = handlers.get('research:web-reader:read')
      await expect(Promise.resolve(read?.({
        sender: webContents,
        senderFrame: { ...mainFrame }
      }, { sessionId: 'session-1', nodeId: 'node-1', url }))).resolves.toMatchObject({
        status: 'ready',
        title: '英伟达豪掷70亿，下场做开放大模型了'
      })
      expect(chromiumFetch).toHaveBeenCalledTimes(1)
    } finally {
      defaultFetch.mockRestore()
    }
  })

  it('allows only the trusted main frame to read the currently authorized article URL', async () => {
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
    const registry = new ResearchLinkFrameRegistry(() => 'c'.repeat(32))
    registry.authorize({
      sessionId: 'session-1', nodeId: 'node-1',
      url: 'https://mp.weixin.qq.com/s/article-id'
    })
    const readArticle = vi.fn(async () => ({
      status: 'ready' as const,
      url: 'https://mp.weixin.qq.com/s/article-id',
      title: '文章标题',
      bodyHtml: '<p>正文</p>'
    }))
    registerResearchWebReaderHandlers({
      ipcMain,
      getMainWindow: () => window,
      registry,
      readArticle
    })

    const read = handlers.get('research:web-reader:read')
    const payload = {
      sessionId: 'session-1', nodeId: 'node-1',
      url: 'https://mp.weixin.qq.com/s/article-id'
    }
    expect(() => read?.({
      sender: webContents,
      senderFrame: { processId: 7, routingId: 42 }
    }, payload)).toThrow('main Sherlock window')
    await expect(Promise.resolve(read?.({
      sender: webContents,
      senderFrame: { ...mainFrame }
    }, payload))).resolves.toMatchObject({ status: 'ready', title: '文章标题' })
    expect(readArticle).toHaveBeenCalledWith({ url: payload.url })

    await expect(Promise.resolve(read?.({
      sender: webContents,
      senderFrame: { ...mainFrame }
    }, { ...payload, url: 'https://mp.weixin.qq.com/s/other' }))).resolves.toEqual({
      status: 'unavailable', reason: 'unsupported'
    })
    expect(readArticle).toHaveBeenCalledTimes(1)
  })
})
