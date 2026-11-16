import assert from 'node:assert/strict'
import { ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, session } from 'electron'
import { LanMobileBridge } from '../../src/main/mobile/lan-mobile-bridge'
import type { InternetTunnelInstance } from '../../src/main/mobile/internet-tunnel'
import { presentMobilePairing } from '../../src/main/shell/mobile-window'

const root = process.env.DSH_MOBILE_FIXTURE_ROOT
if (root === undefined) throw new Error('Mobile fixture root is required')
app.setName('DSH Mobile Window Smoke')
for (const name of ['userData', 'logs', 'crashDumps'] as const) {
  const directory = join(root, name)
  mkdirSync(directory, { recursive: true })
  app.setPath(name, directory)
}
app.on('window-all-closed', () => undefined)
const bridges: LanMobileBridge[] = []
const releasePending: Array<() => void> = []
const watchdog = setTimeout(() => {
  console.error('Mobile fixture watchdog expired')
  for (const window of BrowserWindow.getAllWindows()) window.destroy()
  app.exit(2)
}, 30_000)

function gate() {
  let release = (): void => { throw new Error('Gate not initialized') }
  const promise = new Promise<void>(resolve => { release = resolve })
  releasePending.push(release)
  return { promise, release }
}

async function open(bridge: LanMobileBridge, options: {
  current?: BrowserWindow
  reason?: 'manual' | 'reconnect'
  hostReady?: boolean
} = {}): Promise<BrowserWindow> {
  const window = await presentMobilePairing({ bridge, locale: 'en', hostReady: true, ...options })
  assert.ok(window, 'Pairing window must open')
  const nodeGlobals: unknown = await window.webContents.executeJavaScript('typeof require + ":" + typeof process')
  assert.equal(nodeGlobals, 'undefined:undefined', 'Pairing renderer must not expose Node globals')
  return window
}

async function pageIs(window: BrowserWindow, expression: string): Promise<void> {
  const deadline = Date.now() + 8_000
  do {
    const matches: unknown = await window.webContents.executeJavaScript(`Boolean(${expression})`)
    if (matches === true) return
    await new Promise(resolve => setTimeout(resolve, 40))
  } while (Date.now() < deadline)
  const detail: unknown = await window.webContents.executeJavaScript('document.body.innerText')
  throw new Error(`Page condition timed out: ${expression}\n${String(detail)}`)
}

const internet = 'document.getElementById("btnTunnel").getAttribute("aria-pressed") === "true"'
const lan = 'document.getElementById("btnLan").getAttribute("aria-pressed") === "true"'
const loading = 'document.getElementById("qrLoading").classList.contains("show")'

async function acceptSuccessAndReuse(): Promise<void> {
  const pending = gate()
  let cloudflareCalls = 0
  let pinggyCalls = 0
  let stopped = 0
  const bridge = new LanMobileBridge({
    harnessUrl: () => undefined,
    port: 0,
    locale: 'en',
    createCloudflareTunnel: async port => {
      cloudflareCalls += 1
      await pending.promise
      // Only a local URL and inert process event emitter: no executable or external service.
      return {
        provider: 'cloudflare',
        url: `http://127.0.0.1:${port}`,
        process: new ChildProcess(),
        stop: async () => { stopped += 1 }
      } satisfies InternetTunnelInstance
    },
    createPinggyTunnel: async () => { pinggyCalls += 1; throw new Error('Unexpected fallback') }
  })
  bridges.push(bridge)
  const firstOpening = open(bridge)
  const secondOpening = open(bridge)
  const [window, duplicate] = await Promise.all([firstOpening, secondOpening])
  assert.equal(window, duplicate, 'Concurrent opens must share a real BrowserWindow')
  assert.equal(BrowserWindow.getAllWindows().length, 1)
  assert.equal(cloudflareCalls, 1)
  await pageIs(window, `${internet} && ${loading} && document.getElementById("urlRow").hidden`)
  assert.equal(bridge.snapshot().tunnelLoading, true)
  console.log('PASS manual-loading')

  const urlBefore = window.webContents.getURL()
  window.hide()
  const reused = await open(bridge, { current: window, hostReady: false })
  assert.equal(reused, window)
  assert.equal(window.isVisible(), true)
  assert.equal(window.webContents.getURL(), urlBefore)
  assert.equal(cloudflareCalls, 1)
  await pageIs(window, `${internet} && ${loading}`)
  console.log('PASS reuse')

  pending.release()
  await pageIs(window, `${internet} && !(${loading}) && !document.getElementById("urlRow").hidden && document.getElementById("url").textContent.startsWith("http://127.0.0.1:") && document.getElementById("qrCode").querySelector("svg")`)
  assert.equal(bridge.snapshot().tunnelActive, true)
  assert.equal(pinggyCalls, 0)
  console.log('PASS success')

  // Execute the real page's LAN action, then close and reopen for a phone reconnect.
  await window.webContents.executeJavaScript('document.getElementById("btnLan").click()')
  await pageIs(window, `${lan} && !(${loading}) && !document.getElementById("btnLan").disabled`)
  assert.equal(bridge.snapshot().tunnelActive, false)
  assert.equal(stopped, 1)
  window.destroy()
  const reconnected = await open(bridge, { current: window, reason: 'reconnect' })
  await pageIs(reconnected, `${lan} && !(${loading})`)
  assert.equal(cloudflareCalls, 1, 'LAN reconnect must not relaunch a tunnel')
  assert.equal(pinggyCalls, 0)
  assert.equal(bridge.snapshot().tunnelActive, false)
  reconnected.destroy()
  await bridge.stop()
}

async function acceptFailure(): Promise<void> {
  const pending = gate()
  let cloudflareCalls = 0
  let pinggyCalls = 0
  const bridge = new LanMobileBridge({
    harnessUrl: () => undefined,
    port: 0,
    locale: 'en',
    createCloudflareTunnel: async () => {
      cloudflareCalls += 1
      await pending.promise
      throw new Error('local-cloudflare-failure')
    },
    createPinggyTunnel: async () => { pinggyCalls += 1; throw new Error('local-pinggy-failure') }
  })
  bridges.push(bridge)
  const window = await open(bridge)
  await pageIs(window, `${internet} && ${loading}`)
  pending.release()
  await pageIs(window, `${internet} && !(${loading}) && document.getElementById("tunnelError").classList.contains("show") && document.getElementById("tunnelError").textContent.includes("local-cloudflare-failure") && document.getElementById("tunnelError").textContent.includes("local-pinggy-failure") && !document.getElementById("retryTunnel").hidden && document.getElementById("urlRow").hidden`)
  assert.equal(cloudflareCalls, 1)
  assert.equal(pinggyCalls, 1)
  assert.equal(bridge.snapshot().tunnelActive, false)
  window.destroy()
  await bridge.stop()
  console.log('PASS failure')
}

async function acceptFreshLanReconnect(): Promise<void> {
  let providerCalls = 0
  const forbidden = async (): Promise<InternetTunnelInstance> => {
    providerCalls += 1
    throw new Error('Reconnect must not call tunnel providers')
  }
  const bridge = new LanMobileBridge({
    harnessUrl: () => undefined,
    port: 0,
    createCloudflareTunnel: forbidden,
    createPinggyTunnel: forbidden
  })
  bridges.push(bridge)
  const window = await open(bridge, { reason: 'reconnect' })
  await pageIs(window, `${lan} && !(${loading}) && document.getElementById("btnTunnel").getAttribute("aria-pressed") === "false"`)
  assert.equal(providerCalls, 0)
  assert.equal(bridge.snapshot().tunnelLoading, false)
  window.destroy()
  await bridge.stop()
  console.log('PASS lan-reconnect')
}

app.whenReady().then(async () => {
  const externalRequests: string[] = []
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url)
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    if (!local && url.protocol !== 'data:') externalRequests.push(url.origin)
    callback({ cancel: !local && url.protocol !== 'data:' })
  })
  try {
    await acceptSuccessAndReuse()
    await acceptFailure()
    await acceptFreshLanReconnect()
    assert.deepEqual(externalRequests, [], 'The renderer must not request external resources')
  } finally {
    for (const release of releasePending) release()
    for (const window of BrowserWindow.getAllWindows()) window.destroy()
    for (const bridge of bridges) await bridge.stop()
  }
  assert.equal(BrowserWindow.getAllWindows().length, 0)
  assert.ok(bridges.every(bridge => !bridge.snapshot().running))
  console.log('PASS cleanup')
  console.log('MOBILE-WINDOW-ELECTRON-COMPLETE')
  clearTimeout(watchdog)
  app.exit(0)
}).catch((error: unknown) => {
  console.error(error)
  for (const window of BrowserWindow.getAllWindows()) window.destroy()
  app.exit(1)
})
