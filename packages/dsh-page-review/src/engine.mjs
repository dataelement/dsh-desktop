import { acquireProfileBrowser } from './browser.mjs'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { inspectPoint } from './inspect.mjs'
import { buildPacket, acceptedVersions } from './packet.mjs'
import { resolveAddress } from './address.mjs'
import { documentKind, fileResourceSession } from './document.mjs'

export const sessionKey = (value) => {
  if (
    typeof value !== 'string' ||
    value === '.' ||
    value === '..' ||
    !/^[a-zA-Z0-9_.-]{1,160}$/.test(value)
  )
    throw Error('请先打开一个有效对话')
  return value
}
export function normalizeURL(value, hostOrigin = '') {
  let s = String(value || '').trim()
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !/^https?:\/\//i.test(s))
    throw Error('只支持 HTTP(S) 网页')
  if (/^\d{2,5}$/.test(s)) s = 'http://127.0.0.1:' + s
  else if (!/^https?:\/\//i.test(s))
    s = (/^(localhost|127\.|\[::1\])/.test(s) ? 'http://' : 'https://') + s
  let u
  try {
    u = new URL(s)
  } catch {
    throw Error('请输入有效的网页地址')
  }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password)
    throw Error('只支持不带凭据的 HTTP(S) 网页')
  if (hostOrigin && u.origin === hostOrigin)
    throw Error('请打开需要评审的网页，而不是 DSH 自身')
  return u.href
}
const clamp = (n, min, max) =>
  Math.max(min, Math.min(max, Number.isFinite(Number(n)) ? Number(n) : min))
const uuid = (value) => {
  if (!/^[a-f0-9-]{36}$/.test(String(value))) throw Error('无效标识')
  return value
}
export class ReviewEngine {
  constructor(
    root,
    { browserExecutable, acquireBrowser = acquireProfileBrowser } = {},
  ) {
    this.root = root
    this.sessions = new Map()
    this.browserExecutable = browserExecutable
    this.acquireBrowser = acquireBrowser
    this.browser = null
    this.browserLease = null
    this.launching = null
    this.closed = false
  }
  async browserOf() {
    if (this.closed) throw Error('浏览器服务已关闭')
    if (this.browser?.connected) return this.browser
    if (!this.launching)
      this.launching = (async () => {
        const executablePath =
          this.browserExecutable ||
          [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome',
            process.env.PROGRAMFILES &&
              join(
                process.env.PROGRAMFILES,
                'Google/Chrome/Application/chrome.exe',
              ),
          ]
            .filter(Boolean)
            .find(existsSync)
        if (!executablePath)
          throw Error('未找到 Chrome 或 Edge，请先安装浏览器')
        await mkdir(this.root, { recursive: true })
        const lease = await this.acquireBrowser(
          join(this.root, 'browser-profile'),
          {
            executablePath,
            headless: true,
            defaultViewport: { width: 1100, height: 780 },
            args: ['--disable-background-timer-throttling'],
          },
        )
        if (this.closed) {
          await lease.release()
          throw Error('浏览器服务已关闭')
        }
        await this.browserLease?.release()
        this.browserLease = lease
        const b = lease.browser
        b.on('disconnected', () => {
          if (this.browser !== b) return
          this.browser = null
          for (const s of this.sessions.values()) {
            s.pages.clear()
            s.clients.clear()
          }
        })
        this.browser = b
        return b
      })().finally(() => (this.launching = null))
    return this.launching
  }
  async session(id) {
    id = sessionKey(id)
    if (this.sessions.has(id)) return this.sessions.get(id)
    const dir = join(this.root, 'sessions', id)
    await mkdir(join(dir, 'captures'), { recursive: true })
    let data
    try {
      data = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'))
    } catch {
      data = { tabs: [], active: null, notes: [], history: [], prepared: {} }
    }
    for (const t of data.tabs)
      if (!/^(https?:\/\/|about:blank$)/.test(t.url)) {
        t.url = /^https?:/.test(t.lastURL || '') ? t.lastURL : 'about:blank'
        t.title = t.url === 'about:blank' ? '新标签页' : t.title
        t.canGoBack = false
        t.canGoForward = false
      }
    const s = {
      ...data,
      visits: data.visits || [],
      id,
      dir,
      pages: new Map(),
      clients: new Map(),
      queue: Promise.resolve(),
    }
    // Only the winning initialization is published when two first requests race.
    if (this.sessions.has(id)) return this.sessions.get(id)
    this.sessions.set(id, s)
    return s
  }
  async save(s) {
    const { tabs, active, notes, history, prepared, visits } = s
    const file = join(s.dir, 'state.json'),
      tmp = file + '.' + randomUUID()
    await writeFile(
      tmp,
      JSON.stringify({ tabs, active, notes, history, prepared, visits }),
      { mode: 0o600 },
    )
    await rename(tmp, file)
  }
  state(s) {
    return {
      tabs: s.tabs,
      active: s.active,
      notes: s.notes,
      history: s.history.slice(-30),
      visits: s.visits,
    }
  }
  async run(id, fn) {
    const s = await this.session(id)
    const task = s.queue.catch(() => {}).then(() => fn(s))
    s.queue = task.catch(() => {})
    return task
  }
  tab(s, id = s.active) {
    const t = s.tabs.find((x) => x.id === id)
    if (!t) throw Error('请先打开网页')
    return t
  }
  async page(s, t) {
    let p = s.pages.get(t.id)
    if (p && !p.isClosed()) return p
    const b = await this.browserOf()
    p = await b.newPage()
    s.pages.set(t.id, p)
    p.setDefaultTimeout(15000)
    await p.setViewport({
      width: t.width || 1100,
      height: t.height || 780,
      deviceScaleFactor: 1,
    })
    p.on('dialog', (d) => d.dismiss().catch(() => {}))
    s.clients.set(t.id, await p.createCDPSession())
    this.watchPopups(s, t, p)
    if (t.url) await this.load(t, p, t.url)
    return p
  }
  async load(t, p, url) {
    t.url = url
    t.error = ''
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    } catch (e) {
      t.error =
        '无法打开网站：' +
        String(e.message)
          .replace(/ at https?:\/\/\S+$/, '')
          .slice(0, 200)
    }
  }
  watchPopups(s, parent, p) {
    p.on('popup', async (popup) => {
      try {
        if (popup.url() === 'about:blank')
          await popup
            .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 })
            .catch(() => {})
        await this.run(s.id, async (current) => {
          if (this.closed || popup.isClosed()) return
          if (current.tabs.length >= 12 || !/^https?:/.test(popup.url())) {
            await popup.close()
            return
          }
          const t = {
            id: randomUUID(),
            url: popup.url(),
            title: '新标签页',
            width: parent.width,
            height: parent.height,
          }
          await popup.setViewport({
            width: t.width,
            height: t.height,
            deviceScaleFactor: 1,
          })
          popup.on('dialog', (d) => d.dismiss().catch(() => {}))
          current.pages.set(t.id, popup)
          current.clients.set(t.id, await popup.createCDPSession())
          this.watchPopups(current, t, popup)
          current.tabs.push(t)
          current.active = t.id
          await this.metadata(current, t, popup)
          await this.save(current)
        })
      } catch {
        await popup.close().catch(() => {})
      }
    })
  }
  async metadata(s, t, p) {
    const previous = t.url,
      actual = p.url()
    if (/^(https?:\/\/|about:blank$)/.test(actual)) {
      t.url = actual
      if (/^https?:/.test(actual)) t.lastURL = actual
    }
    t.title =
      t.url === 'about:blank'
        ? '新标签页'
        : t.error
          ? '无法打开网站'
          : (await p.title()).slice(0, 100) || new URL(t.url).hostname
    const client = s.clients.get(t.id)
    if (client) {
      const h = await client.send('Page.getNavigationHistory')
      t.canGoBack = h.currentIndex > 0
      t.canGoForward = h.currentIndex < h.entries.length - 1
    }
    if (/^https?:/.test(t.url) && !t.error) {
      const entry = s.visits.find((v) => v.url === t.url)
      if (previous !== t.url || !entry) {
        s.visits = [
          { url: t.url, title: t.title, visitedAt: new Date().toISOString() },
          ...s.visits.filter((v) => v.url !== t.url),
        ].slice(0, 80)
      } else entry.title = t.title
    }
    return this.state(s)
  }
  async create(s, url, hostOrigin, searchEngine) {
    if (s.tabs.length >= 12) throw Error('最多打开 12 个标签页，请先关闭一个')
    const t = {
      id: randomUUID(),
      url: url ? resolveAddress(url, hostOrigin, searchEngine) : 'about:blank',
      title: '新标签页',
      width: 1100,
      height: 780,
      canGoBack: false,
      canGoForward: false,
    }
    s.tabs.push(t)
    s.active = t.id
    await this.save(s)
    try {
      const p = await this.page(s, t)
      await this.metadata(s, t, p)
      await this.save(s)
      return this.state(s)
    } catch (e) {
      throw Error('页面未能打开：' + e.message)
    }
  }
  async action(s, args, hostOrigin) {
    const kind = args.kind
    if (kind === 'create')
      return this.create(s, args.url, hostOrigin, args.searchEngine)
    if (kind === 'close') {
      const t = this.tab(s, args.tabId)
      await s.pages.get(t.id)?.close()
      s.pages.delete(t.id)
      s.clients.delete(t.id)
      s.tabs = s.tabs.filter((x) => x.id !== t.id)
      if (s.active === t.id) s.active = s.tabs.at(-1)?.id || null
      await this.save(s)
      return this.state(s)
    }
    const t = this.tab(s, args.tabId),
      p = await this.page(s, t)
    s.active = t.id
    const previousURL = t.url
    if (kind === 'navigate') {
      await this.load(
        t,
        p,
        resolveAddress(args.url, hostOrigin, args.searchEngine),
      )
    } else if (kind === 'back')
      await p.goBack({ waitUntil: 'domcontentloaded' })
    else if (kind === 'forward')
      await p.goForward({ waitUntil: 'domcontentloaded' })
    else if (kind === 'reload') await this.load(t, p, t.url)
    else if (kind === 'select') {
      s.active = t.id
    } else if (kind === 'viewport') {
      const w = Math.round(clamp(args.width, 360, 1920)),
        h = Math.round(clamp(args.height, 240, 1200))
      if (w !== t.width || h !== t.height) {
        t.width = w
        t.height = h
        await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
      }
    } else if (kind === 'click') {
      const modifiers = (args.modifiers || []).filter((k) =>
        ['Meta', 'Control', 'Shift', 'Alt'].includes(k),
      )
      try {
        for (const key of modifiers) await p.keyboard.down(key)
        await p.mouse.click(
          clamp(args.x, 0, t.width - 1),
          clamp(args.y, 0, t.height - 1),
          {
            clickCount: args.double ? 2 : 1,
            button: args.middle ? 'middle' : 'left',
          },
        )
      } finally {
        for (const key of modifiers.reverse()) await p.keyboard.up(key)
      }
    } else if (kind === 'drag') {
      await p.mouse.move(
        clamp(args.from?.x, 0, t.width - 1),
        clamp(args.from?.y, 0, t.height - 1),
      )
      await p.mouse.down()
      try {
        await p.mouse.move(
          clamp(args.x, 0, t.width - 1),
          clamp(args.y, 0, t.height - 1),
          { steps: 12 },
        )
      } finally {
        await p.mouse.up()
      }
    } else if (kind === 'copy') {
      const clipboard = await p.evaluate(() => {
        const el = document.activeElement
        if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
          if (el.type === 'password') return ''
          return el.value.slice(el.selectionStart || 0, el.selectionEnd || 0)
        }
        return window.getSelection()?.toString() || ''
      })
      return { ...this.state(s), clipboard }
    } else if (kind === 'wheel')
      await p.mouse.wheel({
        deltaX: clamp(args.dx, -1600, 1600),
        deltaY: clamp(args.dy, -1600, 1600),
      })
    else if (kind === 'text') {
      if (typeof args.text !== 'string' || args.text.length > 20000)
        throw Error('输入内容过长')
      await p.keyboard.insertText(args.text)
    } else if (kind === 'key') {
      const allowed = [
        'Enter',
        'Tab',
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Escape',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ]
      if (args.key === 'SelectAll') {
        await p.keyboard.down(
          process.platform === 'darwin' ? 'Meta' : 'Control',
        )
        await p.keyboard.press('KeyA')
        await p.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control')
      } else if (allowed.includes(args.key)) await p.keyboard.press(args.key)
      else throw Error('不支持此按键')
    } else throw Error('未知浏览器操作')
    await this.metadata(s, t, p)
    if (
      previousURL !== t.url ||
      !['click', 'wheel', 'text', 'key', 'drag'].includes(kind)
    )
      await this.save(s)
    return this.state(s)
  }
  async frame(s, tabId) {
    const t = this.tab(s, tabId),
      p = await this.page(s, t)
    const data = await p.screenshot({
      type: 'jpeg',
      quality: 82,
      encoding: 'base64',
    })
    const previousURL = t.url,
      previousTitle = t.title
    await this.metadata(s, t, p)
    if (previousURL !== t.url || previousTitle !== t.title) await this.save(s)
    const targets = s.notes
      .filter((n) => n.tabId === t.id && n.url === t.url)
      .map((n) => ({ id: n.id, selector: n.element.selector, rect: n.rect }))
    const geometry = await p.evaluate(
      (targets) => ({
        scroll: { x: scrollX, y: scrollY },
        marks: targets.flatMap((t) => {
          if (!t.selector) return []
          try {
            const nodes = document.querySelectorAll(t.selector)
            if (nodes.length !== 1) return []
            const r = nodes[0].getBoundingClientRect()
            return [
              { id: t.id, x: r.x, y: r.y, width: r.width, height: r.height },
            ]
          } catch {
            return []
          }
        }),
      }),
      targets,
    )
    return {
      data,
      width: t.width,
      height: t.height,
      tabId: t.id,
      url: t.url,
      title: t.title,
      ...geometry,
      browserState: { tabs: s.tabs, active: s.active, visits: s.visits },
    }
  }
  async hover(s, args) {
    const t = this.tab(s, args.tabId),
      p = await this.page(s, t)
    return p.evaluate(
      inspectPoint,
      clamp(args.x, 0, t.width - 1),
      clamp(args.y, 0, t.height - 1),
    )
  }
  async pick(s, args) {
    const t = this.tab(s, args.tabId),
      p = await this.page(s, t)
    if (args.frameURL && p.url() !== args.frameURL)
      throw Error('页面已跳转，请等待画面更新后重新选取')
    const x = clamp(args.x, 0, t.width - 1),
      y = clamp(args.y, 0, t.height - 1)
    let region
    if (args.region) {
      const r = args.region
      region = {
        x: clamp(r.x, 0, t.width - 1),
        y: clamp(r.y, 0, t.height - 1),
        width: clamp(r.width, 2, t.width),
        height: clamp(r.height, 2, t.height),
      }
      region.width = Math.min(region.width, t.width - region.x)
      region.height = Math.min(region.height, t.height - region.y)
    }
    const inspected = await p.evaluate(inspectPoint, x, y, region)
    const r = inspected.rect
    await p.evaluate((rect) => {
      document.querySelector('[data-page-review-capture]')?.remove()
      const layer = document.createElement('div')
      layer.setAttribute('data-page-review-capture', '')
      Object.assign(layer.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '2147483647',
        left: Math.max(0, rect.x) + 'px',
        top: Math.max(0, rect.y) + 'px',
        width: Math.max(2, rect.width) + 'px',
        height: Math.max(2, rect.height) + 'px',
        border: '3px solid #3973ee',
        background: 'rgba(57,115,238,.08)',
        boxSizing: 'border-box',
        borderRadius: '3px',
      })
      document.documentElement.append(layer)
    }, r)
    let data
    try {
      data = await p.screenshot({
        type: 'jpeg',
        quality: 88,
        encoding: 'base64',
      })
    } finally {
      await p
        .evaluate(() =>
          document.querySelector('[data-page-review-capture]')?.remove(),
        )
        .catch(() => {})
    }
    const capture = {
      ...inspected,
      id: randomUUID(),
      sessionId: s.id,
      tabId: t.id,
      width: t.width,
      height: t.height,
      createdAt: new Date().toISOString(),
    }
    await writeFile(
      join(s.dir, 'captures', capture.id + '.jpg'),
      Buffer.from(data, 'base64'),
      { mode: 0o600 },
    )
    await writeFile(
      join(s.dir, 'captures', capture.id + '.json'),
      JSON.stringify(capture),
      { mode: 0o600 },
    )
    return capture
  }
  async capture(s, id) {
    uuid(id)
    const c = JSON.parse(
      await readFile(join(s.dir, 'captures', id + '.json'), 'utf8'),
    )
    if (c.sessionId !== s.id) throw Error('截图不属于当前会话')
    return {
      ...c,
      data: (await readFile(join(s.dir, 'captures', id + '.jpg'))).toString(
        'base64',
      ),
    }
  }
  async documentCapture(s, args) {
    const d = args.document
    if (
      !d ||
      fileResourceSession(d.resourceAddress) !== s.id ||
      typeof d.path !== 'string' ||
      d.path.length > 4096 ||
      !documentKind(d.path)
    )
      throw Error('文件批注来源无效')
    const { width, height, rect, element } = args
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 2400 ||
      height > 1800 ||
      !rect ||
      !['x', 'y', 'width', 'height'].every((k) => Number.isFinite(rect[k])) ||
      rect.x < 0 ||
      rect.y < 0 ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.x + rect.width > width + 2 ||
      rect.y + rect.height > height + 2
    )
      throw Error('文件选区坐标无效')
    if (
      !element ||
      typeof element.text !== 'string' ||
      element.text.length > 4000 ||
      typeof args.data !== 'string' ||
      args.data.length > 6 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(args.data)
    )
      throw Error('文件截图无效')
    const bytes = Buffer.from(args.data, 'base64')
    if (
      bytes.length < 4 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.length > 4 * 1024 * 1024
    )
      throw Error('文件截图无效')
    const capture = {
      id: randomUUID(),
      sessionId: s.id,
      tabId: String(args.tabId || ''),
      url: d.resourceAddress,
      document: { ...d, kind: documentKind(d.path) },
      width,
      height,
      rect,
      element,
      scroll: args.scroll || { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
    }
    await writeFile(join(s.dir, 'captures', capture.id + '.jpg'), bytes, {
      mode: 0o600,
    })
    await writeFile(
      join(s.dir, 'captures', capture.id + '.json'),
      JSON.stringify(capture),
      { mode: 0o600 },
    )
    return capture
  }
  async note(s, args) {
    if (args.kind === 'delete') {
      uuid(args.id)
      s.notes = s.notes.filter((n) => n.id !== args.id)
      await this.save(s)
      return this.state(s)
    }
    const capture = await this.capture(s, args.captureId)
    const comment = String(args.comment || '').trim()
    if (!comment) throw Error('请先写下修改要求')
    if (comment.length > 10000) throw Error('批注最多 10,000 字')
    const existing = args.id && s.notes.find((n) => n.id === args.id)
    if (!existing && s.notes.length >= 40)
      throw Error('待发送批注已达 40 条，请先发送一部分')
    const note = {
      id: existing?.id || randomUUID(),
      sessionId: s.id,
      captureId: capture.id,
      comment,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: randomUUID(),
      element: capture.element,
      url: capture.url,
      tabId: capture.tabId,
      rect: capture.rect,
      width: capture.width,
      height: capture.height,
      ...(capture.document ? { document: capture.document } : {}),
    }
    if (existing)
      s.notes = s.notes.map((n) => (n.id === existing.id ? note : n))
    else s.notes.push(note)
    await this.save(s)
    return this.state(s)
  }
  async prepare(s, ids) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length)
      throw Error('批注选择无效')
    const notes = ids.map((id) => {
      const n = s.notes.find((x) => x.id === id)
      if (!n) throw Error('批注已变更，请重新检查后发送')
      return n
    })
    const captures = new Map()
    for (const n of notes)
      captures.set(n.captureId, await this.capture(s, n.captureId))
    const packet = buildPacket(notes, (id) => captures.get(id))
    const deliveryId = randomUUID()
    s.prepared[deliveryId] = {
      versions: packet.versions,
      createdAt: new Date().toISOString(),
    }
    if (Object.keys(s.prepared).length > 60)
      delete s.prepared[Object.keys(s.prepared)[0]]
    await this.save(s)
    return { deliveryId, ...packet }
  }
  async acknowledge(s, deliveryId) {
    uuid(deliveryId)
    const batch = s.prepared[deliveryId]
    if (!batch) {
      if (s.history.some((h) => h.deliveryId === deliveryId))
        return this.state(s)
      throw Error('发送记录不存在')
    }
    const next = acceptedVersions(s.notes, batch.versions)
    const remaining = new Set(next.map((n) => n.id))
    s.history.push({
      deliveryId,
      sentAt: new Date().toISOString(),
      notes: s.notes.filter((n) => !remaining.has(n.id)),
    })
    s.history = s.history.slice(-30)
    s.notes = next
    delete s.prepared[deliveryId]
    await this.save(s)
    return this.state(s)
  }
  async close() {
    this.closed = true
    await this.launching?.catch(() => {})
    const lease = this.browserLease
    this.browserLease = null
    await lease?.release()
    this.browser = null
  }
}
