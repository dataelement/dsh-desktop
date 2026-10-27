import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
const browserDOM = (html, options) =>
  new JSDOM(html, { ...options, virtualConsole: new VirtualConsole() })
import { webLink, routeWebLinks, createLinkOpener } from '../src/links.mjs'
const drain = () => new Promise((r) => setImmediate(r))
test('网页链接支持 HTTP(S)，保留站内导航、下载与非网页协议', async () => {
  const dom = browserDOM(
      '<a id="web" href="https://example.com/docs"><span>网页</span></a><a id="local" href="http://localhost:3000/">本地网页</a><a id="same" href="/#settings">站内</a><a id="mail" href="mailto:a@example.com">邮件</a><a id="file" href="https://example.com/a.zip" download>下载</a>',
      { url: 'http://127.0.0.1:43129/' },
    ),
    calls = []
  const doc = dom.window.document,
    dispose = routeWebLinks({
      document: doc,
      origin: dom.window.location.origin,
      sessionId: () => 's',
      open: async (...a) => calls.push(a),
      onError: () => assert.fail(),
    })
  const dispatch = (id, button = 0, extras = {}) => {
    const e = new dom.window.MouseEvent(button === 1 ? 'auxclick' : 'click', {
      bubbles: true,
      cancelable: true,
      button,
      ...extras,
    })
    doc.querySelector(id).dispatchEvent(e)
    return e.defaultPrevented
  }
  assert.equal(dispatch('#web span'), true)
  assert.equal(dispatch('#local', 1), true)
  for (const id of ['same', 'mail', 'file'])
    assert.equal(dispatch('#' + id), false)
  await drain()
  assert.deepEqual(calls, [
    ['s', 'https://example.com/docs'],
    ['s', 'http://localhost:3000/'],
  ])
  dispose()
  dom.window.close()
})
test('键盘点击和组合点击仍使用内部网页，显式外部链接及无会话不接管', async () => {
  const dom = browserDOM(
    '<a id="a" href="https://example.com">网站</a><a id="b" data-browser-external="true" href="https://example.com">外部</a>',
    { url: 'http://127.0.0.1:43129/' },
  )
  let sid = 's',
    calls = 0
  const doc = dom.window.document
  const dispose = routeWebLinks({
    document: doc,
    origin: dom.window.location.origin,
    sessionId: () => sid,
    open: async () => calls++,
    onError: () => assert.fail(),
  })
  for (const mods of [{}, { ctrlKey: true }, { metaKey: true }]) {
    const e = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...mods,
    })
    doc.querySelector('#a').dispatchEvent(e)
    assert.equal(e.defaultPrevented, true)
  }
  const external = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  })
  doc.querySelector('#b').dispatchEvent(external)
  assert.equal(external.defaultPrevented, false)
  sid = null
  const noSession = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  })
  doc.querySelector('#a').dispatchEvent(noSession)
  assert.equal(noSession.defaultPrevented, false)
  await drain()
  assert.equal(calls, 3)
  dispose()
  dom.window.close()
})
test('链接请求失败给出错误，不自动跳往外部浏览器；卸载会撤销监听', async () => {
  const dom = browserDOM('<a href="https://example.com">网站</a>', {
      url: 'http://127.0.0.1:43129/',
    }),
    errors = []
  const doc = dom.window.document
  const dispose = routeWebLinks({
    document: doc,
    origin: dom.window.location.origin,
    sessionId: () => 's',
    open: async () => {
      throw Error('打开失败')
    },
    onError: (e, sid) => errors.push([e.message, sid]),
  })
  doc
    .querySelector('a')
    .dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }),
    )
  await drain()
  assert.deepEqual(errors, [['打开失败', 's']])
  dispose()
  const e = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  })
  doc.querySelector('a').dispatchEvent(e)
  assert.equal(e.defaultPrevented, false)
  dom.window.close()
})
test('并发点击同一链接只创建一个网页，后续点击切回已有页面', async () => {
  const state = { tabs: [], active: null },
    shown = []
  let creates = 0,
    loads = 0
  const open = createLinkOpener({
    load: async () => loads++,
    read: () => state,
    create: async (sid, url) => {
      creates++
      const t = { id: 'page', url }
      state.tabs.push(t)
      state.active = t.id
      return state
    },
    select: async (sid, id) => {
      state.active = id
      return state
    },
    show: (...a) => shown.push(a),
  })
  await Promise.all([
    open('s', 'https://example.com'),
    open('s', 'https://example.com/'),
  ])
  assert.equal(creates, 1)
  assert.equal(loads, 2)
  assert.deepEqual(
    shown.map((a) => a.slice(0, 2)),
    [
      ['s', 'page'],
      ['s', 'page'],
    ],
  )
})
test('链接打开保留替换入口参数，失败不堵住后续链接；拒绝凭据和脚本 URL', async () => {
  let count = 0
  const shown = []
  const open = createLinkOpener({
    load: async () => {},
    read: () => ({ tabs: [] }),
    create: async () => {
      if (++count === 1) throw Error('断网')
      return { active: 'new' }
    },
    show: (...args) => shown.push(args),
  })
  await assert.rejects(open('s', 'https://example.com'), /断网/)
  await open('s', 'http://localhost:3000/', { replaceTab: 'launcher' })
  assert.deepEqual(shown[0], ['s', 'new', { replaceTab: 'launcher' }])
  for (const url of [
    'javascript:alert(1)',
    'file:///tmp/a',
    'https://user:pass@example.com',
  ]) {
    assert.equal(webLink(url), null)
    await assert.rejects(open('s', url), /HTTP/)
  }
})
