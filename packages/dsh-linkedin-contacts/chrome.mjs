import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Chrome only exposes the DevTools endpoint while "Enable remote debugging" is on at
 * chrome://inspect/#remote-debugging. The port and browser id live in DevToolsActivePort.
 */
const ACTIVE_PORT = {
  darwin: () => join(homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort'),
  win32: () => join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'User Data', 'DevToolsActivePort'),
  linux: () => join(homedir(), '.config', 'google-chrome', 'DevToolsActivePort')
}

export async function discoverEndpoint(file = process.env.DSH_CHROME_ACTIVE_PORT ?? ACTIVE_PORT[process.platform]?.()) {
  if (!file) throw new Error(`unsupported platform: ${process.platform}`)
  const [port, path] = (await readFile(file, 'utf8')).trim().split('\n')
  if (!port || !path) throw new Error(`DevToolsActivePort is incomplete: ${file}`)
  return `ws://127.0.0.1:${port}${path}`
}

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ])

export async function connect({ endpoint, timeoutMs = 30_000 } = {}) {
  const url = endpoint ?? (await discoverEndpoint())
  const socket = new WebSocket(url)
  const pending = new Map()
  let nextId = 1

  await withTimeout(
    new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', () => reject(new Error(`cannot reach Chrome at ${url}`)), { once: true })
    }),
    timeoutMs,
    'connect'
  )

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const entry = message.id === undefined ? undefined : pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(`${message.error.message} (${message.error.code})`))
    else entry.resolve(message.result ?? {})
  })

  const send = (method, params = {}, sessionId) =>
    withTimeout(
      new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      }),
      timeoutMs,
      method
    )

  return { url, send, close: () => socket.close() }
}

/** Create a background tab and return its flattened CDP session id. */
export async function openPage(cdp, url = 'about:blank') {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', background: true })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  if (url !== 'about:blank') await navigate(cdp, sessionId, url)
  return { targetId, sessionId, close: () => cdp.send('Target.closeTarget', { targetId }) }
}

export async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  )
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text
    throw new Error(`page script failed: ${text}`)
  }
  return result.result?.value
}

export async function navigate(cdp, sessionId, url) {
  await cdp.send('Page.navigate', { url }, sessionId)
  return waitFor(cdp, sessionId, 'document.readyState === "complete"', 20_000)
}

/** Poll a page predicate. Returns the predicate value or throws once the budget is spent. */
export async function waitFor(cdp, sessionId, expression, timeoutMs = 15_000, intervalMs = 400) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const value = await evaluate(cdp, sessionId, expression)
      if (value) return value
    } catch {
      // The document can be mid-navigation; keep polling until the deadline.
    }
    if (Date.now() > deadline) throw new Error(`page never satisfied: ${expression.slice(0, 80)}`)
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}
