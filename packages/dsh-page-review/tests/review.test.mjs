import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildPacket, acceptedVersions, deliverPacket } from '../src/packet.mjs'
import { ReviewEngine, normalizeURL, sessionKey } from '../src/engine.mjs'
import { inspectPoint } from '../src/inspect.mjs'
import { trusted } from '../src/host.mjs'
import { JSDOM } from 'jsdom'
const sid = 'review-test-session'
const note = {
  id: 'a',
  sessionId: sid,
  captureId: 'image-a',
  comment: '让按钮和输入框左对齐',
  updatedAt: 'v1',
}
const capture = {
  sessionId: sid,
  data: Buffer.from([255, 216, 255, 217]).toString('base64'),
  width: 960,
  height: 600,
  url: 'http://localhost:3000/login',
  createdAt: '2026-10-20T00:00:00Z',
  element: {
    tag: 'button',
    text: '登录',
    selector: '#login',
    matches: 1,
    html: '<button id="login">登录</button>',
  },
  rect: { x: 40, y: 80, width: 100, height: 30 },
  scroll: { x: 0, y: 0 },
}
test('模型输入同时包含真实图片块、元素定位、批注和截图时间，编号一致', () => {
  const p = buildPacket([note], () => capture)
  assert.equal(p.images.length, 1)
  assert.equal(p.images[0].type, 'image')
  assert.equal(p.images[0].mediaType, 'image/jpeg')
  assert.equal(p.images[0].data, capture.data)
  assert.match(p.text, /#login/)
  assert.match(p.text, /让按钮和输入框左对齐/)
  assert.match(p.text, /网页批注-1.jpg/)
  assert.match(p.text, /2026-10-20/)
  assert.match(p.text, /不可信引用资料/)
})
test('缺失截图或跨会话截图必须阻止发送，不能降级成仅文本', () => {
  assert.throws(() => buildPacket([note], () => null), /截图缺失/)
  assert.throws(
    () => buildPacket([note], () => ({ ...capture, sessionId: 'another' })),
    /截图缺失/,
  )
})
test('失败重试沿用同一个 requestId，明确回执后才成功', async () => {
  let creates = 0,
    calls = 0,
    received
  const attempt = {}
  const session = {
    beginSubmission: () => {
      creates++
      return { requestId: 'same-request' }
    },
    prompt: async (...args) => {
      calls++
      received = args
      if (calls === 1) throw Error('网络断开')
      return { ok: true, value: { accepted: true } }
    },
  }
  const p = buildPacket([note], () => capture)
  await assert.rejects(() => deliverPacket(session, p, attempt), /网络断开/)
  await deliverPacket(session, p, attempt)
  assert.equal(creates, 1)
  assert.equal(received[3], 'same-request')
  assert.equal(received[0][1].type, 'image')
  assert.equal(received[0][1].data, capture.data)
  await assert.rejects(
    () =>
      deliverPacket(
        {
          ...session,
          prompt: async () => ({ ok: true, value: { accepted: false } }),
        },
        p,
        {},
      ),
    (error) =>
      error.admissionRejected === true && /未确认接收/.test(error.message),
  )
})
test('发送中的编辑不会被迟到的回执清空', () => {
  const versions = [{ id: 'a', updatedAt: 'v1', comment: note.comment }]
  assert.equal(acceptedVersions([note], versions).length, 0)
  assert.equal(
    acceptedVersions(
      [{ ...note, comment: '新增要求', updatedAt: 'v2' }],
      versions,
    ).length,
    1,
  )
})
test('浏览器仅接受 HTTP(S)，拒绝宿主自身和凭据 URL', () => {
  assert.equal(normalizeURL('8016'), 'http://127.0.0.1:8016/')
  assert.equal(normalizeURL('localhost:3000'), 'http://localhost:3000/')
  assert.throws(() => normalizeURL('http://user:pass@localhost:3000'), /凭据/)
  assert.throws(
    () => normalizeURL('http://localhost:3000', 'http://localhost:3000'),
    /DSH/,
  )
  for (const key of ['../../secret', '.', '..'])
    assert.throws(() => sessionKey(key))
  assert.throws(() => normalizeURL('javascript:alert(1)'))
  assert.throws(() => normalizeURL('ftp://example.com'), /HTTP/)
})
test('变更路由只接受同源回环请求', () => {
  const req = {
    method: 'POST',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:43129', origin: 'http://127.0.0.1:43129' },
  }
  assert.equal(trusted(req), true)
  assert.equal(
    trusted({
      ...req,
      headers: { ...req.headers, origin: 'https://evil.example' },
    }),
    false,
  )
  assert.equal(
    trusted({ ...req, socket: { remoteAddress: '192.168.1.2' } }),
    false,
  )
  assert.equal(trusted({ ...req, headers: { host: '127.0.0.1:43129' } }), false)
})
test('选择器唯一命中且 DOM 引用不包含输入框密码', () => {
  const dom = new JSDOM(
    '<button>重复</button><button data-testid="save">保存</button><input id="password" type="password" value="secret">',
    { url: 'http://localhost:3000' },
  )
  const w = dom.window
  w.CSS = { escape: (s) => s }
  w.document.elementFromPoint = () =>
    w.document.querySelector('button[data-testid]')
  const fn = new Function(
    'document',
    'CSS',
    'getComputedStyle',
    'innerWidth',
    'scrollX',
    'scrollY',
    'location',
    `return (${inspectPoint.toString()})(1,1)`,
  )
  const result = fn(
    w.document,
    w.CSS,
    w.getComputedStyle,
    960,
    0,
    0,
    w.location,
  )
  assert.equal(result.element.matches, 1)
  assert.match(result.element.selector, /data-testid/)
  w.document.elementFromPoint = () => w.document.querySelector('input')
  const input = fn(w.document, w.CSS, w.getComputedStyle, 960, 0, 0, w.location)
  assert.doesNotMatch(input.element.html, /secret/)
  dom.window.close()
})
test('发送确认与草稿跨重启保留，重复回执不清空新批注', async () => {
  const root = await mkdtemp(join(tmpdir(), 'page-review-test-'))
  try {
    const engine = new ReviewEngine(root),
      s = await engine.session(sid)
    s.notes = [note]
    s.prepared.batch = {
      versions: [{ id: 'a', updatedAt: 'v1', comment: note.comment }],
    }
    await engine.save(s)
    const reopened = new ReviewEngine(root),
      s2 = await reopened.session(sid)
    assert.equal(s2.notes[0].comment, note.comment)
    // Valid delivery UUID, matching production path validation.
    const id = '00000000-0000-4000-8000-000000000001'
    s2.prepared[id] = s2.prepared.batch
    delete s2.prepared.batch
    await reopened.acknowledge(s2, id)
    assert.equal(s2.notes.length, 0)
    s2.notes.push({ ...note, id: 'b' })
    await reopened.acknowledge(s2, id)
    assert.equal(s2.notes.length, 1)
    assert.equal(s2.history.length, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
test('打开失败保留用户网址，重试成功后清除错误，不保存 Chrome 内部错误地址', async () => {
  const engine = new ReviewEngine('/unused')
  const s = {
    tabs: [],
    notes: [],
    history: [],
    visits: [],
    clients: new Map(),
  }
  const t = { id: 'tab', url: 'https://example.com/' }
  let actual = 'chrome-error://chromewebdata/'
  const p = {
    goto: async () => {
      throw Error('net::ERR_NAME_NOT_RESOLVED at https://example.com/')
    },
    url: () => actual,
    title: async () => '无法访问此网站',
  }
  await engine.load(t, p, t.url)
  await engine.metadata(s, t, p)
  assert.equal(t.url, 'https://example.com/')
  assert.match(t.error, /ERR_NAME_NOT_RESOLVED/)
  assert.equal(s.visits.length, 0)
  actual = 'https://example.com/docs'
  p.goto = async () => {}
  p.title = async () => 'Example Docs'
  await engine.load(t, p, actual)
  await engine.metadata(s, t, p)
  assert.equal(t.error, '')
  assert.equal(t.url, actual)
  assert.equal(s.visits[0].title, 'Example Docs')
})
test('旧版本保存的错误标签页恢复成可搜索的新标签页，批注仍保留', async () => {
  const root = await mkdtemp(join(tmpdir(), 'browser-migrate-'))
  try {
    const engine = new ReviewEngine(root),
      s = await engine.session(sid)
    s.tabs = [
      { id: 'legacy', url: 'chrome-error://chromewebdata/', title: '百度' },
    ]
    s.active = 'legacy'
    s.notes = [note]
    await engine.save(s)
    const reopened = new ReviewEngine(root),
      s2 = await reopened.session(sid)
    assert.equal(s2.tabs[0].url, 'about:blank')
    assert.equal(s2.tabs[0].title, '新标签页')
    assert.equal(s2.notes[0].comment, note.comment)
    assert.deepEqual(s2.visits, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
