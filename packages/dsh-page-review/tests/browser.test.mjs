import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, symlink, lstat, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import {
  acquireProfileBrowser,
  clearStaleBrowserLock,
  openProfileBrowser,
  reconnectBrowser,
} from '../src/browser.mjs'
import { ReviewEngine } from '../src/engine.mjs'
const temp = () => mkdtemp(join(tmpdir(), 'dsh-browser-lifecycle-'))
const fakeBrowser = () =>
  Object.assign(new EventEmitter(), {
    connected: true,
    closes: 0,
    async close() {
      this.closes++
      this.connected = false
      this.emit('disconnected')
    },
    async disconnect() {
      this.connected = false
      this.emit('disconnected')
    },
  })

test('活进程和其他主机的锁保留，不通过删除锁强行启动', async () => {
  const root = await temp()
  try {
    await symlink(`${hostname()}-123`, join(root, 'SingletonLock'))
    await assert.rejects(
      clearStaleBrowserLock(root, { isAlive: () => true }),
      /正在使用/,
    )
    assert.ok(await lstat(join(root, 'SingletonLock')))
    await assert.rejects(
      clearStaleBrowserLock(root, { host: 'other-host', isAlive: () => false }),
      /正在使用/,
    )
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('仅清理已退出的本机进程锁，不删除登录资料或符号链接指向内容', async () => {
  const root = await temp(),
    target = await temp()
  try {
    await writeFile(join(target, 'keep'), 'retained')
    await writeFile(join(root, 'Cookies'), 'login')
    await symlink(`${hostname()}-123`, join(root, 'SingletonLock'))
    await symlink(target, join(root, 'SingletonSocket'))
    await symlink('cookie', join(root, 'SingletonCookie'))
    await clearStaleBrowserLock(root, { isAlive: () => false })
    await assert.rejects(lstat(join(root, 'SingletonLock')), {
      code: 'ENOENT',
    })
    assert.ok(await lstat(join(target, 'keep')))
    assert.ok(await lstat(join(root, 'Cookies')))
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
    await rm(target, { recursive: true, force: true })
  }
})
test('优先重连已有进程；启动遇到并发实例可重连，不再启动第二个浏览器', async () => {
  const root = await temp(),
    browser = fakeBrowser()
  let launches = 0,
    probes = 0
  try {
    assert.equal(
      await openProfileBrowser(
        root,
        {},
        {
          reconnect: async () => browser,
          clear: async () => {
            throw Error('不可清理')
          },
          driver: { launch: async () => launches++ },
        },
      ),
      browser,
    )
    assert.equal(launches, 0)
    const recovered = await openProfileBrowser(
      root,
      {},
      {
        reconnect: async () => (++probes === 2 ? browser : null),
        clear: async () => {},
        driver: {
          launch: async () => {
            launches++
            throw Error('SingletonLock')
          },
        },
      },
    )
    assert.equal(recovered, browser)
    assert.equal(launches, 1)
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('同一配置的多实例及并发请求共用一个进程，最后一个使用者关闭才释放', async () => {
  const root = await temp(),
    browser = fakeBrowser()
  let starts = 0
  try {
    const open = async () => {
      starts++
      return browser
    }
    const [a, b] = await Promise.all([
      acquireProfileBrowser(root, {}, open),
      acquireProfileBrowser(root, {}, open),
    ])
    assert.equal(starts, 1)
    assert.equal(a.browser, b.browser)
    await a.release()
    assert.equal(browser.closes, 0)
    await b.release()
    await b.release()
    assert.equal(browser.closes, 1)
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('旧实例关闭中，新实例等待释放完成后再启动', async () => {
  const root = await temp(),
    one = fakeBrowser(),
    two = fakeBrowser()
  let finish,
    starts = 0
  try {
    one.close = () =>
      new Promise((r) => {
        finish = () => {
          one.connected = false
          r()
        }
      })
    const open = async () => (++starts === 1 ? one : two)
    const a = await acquireProfileBrowser(root, {}, open)
    const closing = a.release()
    await new Promise((r) => setImmediate(r))
    const pending = acquireProfileBrowser(root, {}, open)
    assert.equal(starts, 1)
    finish()
    await closing
    const b = await pending
    assert.equal(starts, 2)
    await b.release()
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('启动过程中停用插件会等待启动完成并释放进程，不遗留目录占用', async () => {
  const root = await temp(),
    browser = fakeBrowser()
  let finish,
    releases = 0
  try {
    const engine = new ReviewEngine(root, {
      browserExecutable: '/test/chrome',
      acquireBrowser: () =>
        new Promise(
          (r) =>
            (finish = () => r({ browser, release: async () => releases++ })),
        ),
    })
    const starting = engine.browserOf()
    const rejected = assert.rejects(starting, /已关闭/)
    while (!finish) await new Promise((r) => setImmediate(r))
    const closing = engine.close()
    finish()
    await closing
    await rejected
    assert.equal(releases, 1)
    assert.equal(engine.browser, null)
    await assert.rejects(engine.browserOf(), /已关闭/)
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('启动失败不缓存失败 Promise，下次请求可重试', async () => {
  const root = await temp(),
    browser = fakeBrowser()
  let attempts = 0
  try {
    const open = async () => {
      if (++attempts === 1) throw Error('启动失败')
      return browser
    }
    await assert.rejects(acquireProfileBrowser(root, {}, open), /启动失败/)
    const lease = await acquireProfileBrowser(root, {}, open)
    assert.equal(attempts, 2)
    await lease.release()
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
test('重连前核对配置目录，拒绝错误端点并断开连接', async () => {
  const root = await temp(),
    browser = fakeBrowser(),
    server = createServer((req, res) => {
      res.setHeader('content-type', 'application/json')
      res.end(
        JSON.stringify({
          webSocketDebuggerUrl:
            'ws://127.0.0.1:1/devtools/browser/test-browser',
        }),
      )
    })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  try {
    await writeFile(
      join(root, 'DevToolsActivePort'),
      `${server.address().port}\n/devtools/browser/test-browser`,
    )
    browser.target = () => ({
      createCDPSession: async () => ({
        send: async () => ({ arguments: ['--user-data-dir=/wrong-profile'] }),
        detach: async () => {},
      }),
    })
    const result = await reconnectBrowser(root, {
      driver: { connect: async () => browser },
    })
    assert.equal(result, null)
    assert.equal(browser.connected, false)
  } finally {
    await new Promise((r) => server.close(r))
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})

test('真实 Chrome 连接丢失后复用同一进程；两个引擎关闭互不误杀', async () => {
  const root = await temp()
  let one, two
  try {
    one = new ReviewEngine(root)
    const original = await one.browserOf(),
      endpoint = original.wsEndpoint()
    await original.disconnect()
    const restored = await one.browserOf()
    assert.equal(restored.wsEndpoint(), endpoint)
    two = new ReviewEngine(root)
    const shared = await two.browserOf()
    assert.equal(shared, restored)
    await one.close()
    assert.equal(shared.connected, true)
    await two.close()
    assert.equal(shared.connected, false)
  } finally {
    await one?.close()
    await two?.close()
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    })
  }
})
