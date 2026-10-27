import puppeteer from 'puppeteer-core'
import { readFile, readlink, unlink, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { hostname } from 'node:os'

// Survives module reloads. Every engine holds a lease on the same profile owner.
const key = Symbol.for('dsh-page-review.browser-leases.v1')
const owners = (globalThis[key] ??= new Map())
const alive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code !== 'ESRCH'
  }
}
export async function clearStaleBrowserLock(
  profile,
  { isAlive = alive, host = hostname() } = {},
) {
  const file = join(profile, 'SingletonLock')
  let lock
  try {
    lock = await readlink(file)
  } catch (e) {
    if (e.code === 'ENOENT') return
    throw e
  }
  const match = lock.match(/^(.*)-(\d+)$/)
  if (!match || match[1] !== host || isAlive(Number(match[2])))
    throw Error(
      '浏览器配置正在使用，但暂时无法重新连接。请重启 DSH 后重试；网页和批注已保留。',
    )
  // Never unlink an active owner's lock or follow the socket/cookie symlinks.
  if ((await readlink(file)) !== lock || isAlive(Number(match[2])))
    throw Error('浏览器正在重启，请稍后重试')
  for (const name of ['SingletonSocket', 'SingletonCookie', 'SingletonLock'])
    await unlink(join(profile, name)).catch((e) => {
      if (e.code !== 'ENOENT') throw e
    })
}
export async function reconnectBrowser(profile, { driver = puppeteer } = {}) {
  let browser
  try {
    const [port, path] = String(
      await readFile(join(profile, 'DevToolsActivePort'), 'utf8'),
    )
      .trim()
      .split(/\r?\n/)
    if (
      !/^\d+$/.test(port) ||
      Number(port) < 1 ||
      Number(port) > 65535 ||
      !/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(path)
    )
      return null
    // Probe with a bounded request before attempting the WebSocket handshake.
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1500),
    })
    const info = await response.json()
    if (new URL(info.webSocketDebuggerUrl).pathname !== path) return null
    browser = await driver.connect({
      browserWSEndpoint: `ws://127.0.0.1:${port}${path}`,
      defaultViewport: null,
      protocolTimeout: 5000,
    })
    const client = await browser.target().createCDPSession()
    try {
      const { arguments: args } = await client.send(
        'Browser.getBrowserCommandLine',
      )
      if (!args.includes(`--user-data-dir=${profile}`))
        throw Error('浏览器配置不匹配')
    } finally {
      await client.detach()
    }
    return browser
  } catch {
    await browser?.disconnect().catch(() => {})
    return null
  }
}
export async function openProfileBrowser(profile, options = {}, deps = {}) {
  const reconnect = deps.reconnect || reconnectBrowser,
    clear = deps.clear || clearStaleBrowserLock,
    driver = deps.driver || puppeteer
  await mkdir(profile, { recursive: true })
  const existing = await reconnect(profile)
  if (existing) return existing
  await clear(profile)
  try {
    return await driver.launch({ ...options, userDataDir: profile })
  } catch (error) {
    // Another host may have completed startup between probing and launching.
    const recovered = await reconnect(profile)
    if (recovered) return recovered
    if (/ProcessSingleton|SingletonLock/.test(error.message))
      throw Error(
        '浏览器配置正在使用，暂时无法连接。请重启 DSH 后重试；网页和批注已保留。',
      )
    throw error
  }
}
export async function acquireProfileBrowser(
  profile,
  options = {},
  open = openProfileBrowser,
) {
  profile = resolve(profile)
  for (;;) {
    let entry = owners.get(profile)
    if (entry?.closing) {
      await entry.closing
      continue
    }
    if (!entry) {
      entry = { users: new Set(), browser: null, promise: null, closing: null }
      owners.set(profile, entry)
      entry.promise = Promise.resolve()
        .then(() => open(profile, options))
        .then((browser) => {
          entry.browser = browser
          browser.on('disconnected', () => {
            if (owners.get(profile) === entry && !entry.closing)
              owners.delete(profile)
          })
          return browser
        })
        .catch((error) => {
          if (owners.get(profile) === entry) owners.delete(profile)
          throw error
        })
    }
    const token = {}
    entry.users.add(token)
    let browser
    try {
      browser = await entry.promise
    } catch (error) {
      entry.users.delete(token)
      throw error
    }
    if (!browser.connected) {
      entry.users.delete(token)
      if (owners.get(profile) === entry) owners.delete(profile)
      throw Error('浏览器连接已中断，请重试')
    }
    let released = false
    return {
      browser,
      release: async () => {
        if (released) return
        released = true
        entry.users.delete(token)
        if (entry.users.size) return
        // A disconnected launcher may still hold an OS process handle. Closing
        // that stale handle would kill the process a newer lease just reattached.
        if (!browser.connected) {
          if (owners.get(profile) === entry) owners.delete(profile)
          return
        }
        entry.closing = Promise.resolve()
          .then(() => browser.close())
          .catch(() => browser.disconnect())
          .finally(() => {
            if (owners.get(profile) === entry) owners.delete(profile)
          })
        await entry.closing
      },
    }
  }
}
