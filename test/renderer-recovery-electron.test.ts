import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { expect, it } from 'vitest'

const enabled = process.env.DSH_TEST_RENDERER_RECOVERY_ELECTRON === '1'

it.skipIf(!enabled)('recovers real sandboxed Electron navigation and renderer loss in an isolated process', async () => {
  const electron: unknown = createRequire(import.meta.url)('electron')
  if (typeof electron !== 'string') throw new Error('Native Electron executable is required for opt-in acceptance')
  const root = await mkdtemp(join(tmpdir(), 'dsh-renderer-recovery-'))
  const entry = join(root, 'fixture.cjs')
  const controller = resolve('src/main/main-window-recovery.ts')
  let cleanExit = false
  try {
    await mkdir(join(root, 'user-data'))
    await mkdir(join(root, 'home'))
    await writeFile(join(root, 'page.html'), '<!doctype html><title>Recovery fixture</title><main id="marker">renderer-recovered</main>')
    await build({
      stdin: {
        contents: 'import { RendererNavigationRecovery } from ' + JSON.stringify(controller) + '\n' +
          'import { loadDesktopWindowAfterStop } from ' + JSON.stringify(resolve('src/main/desktop-window-load.ts')) + '\n' + fixture,
        resolveDir: process.cwd(), loader: 'ts'
      },
      bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: entry
    })
    const env: NodeJS.ProcessEnv = { ...process.env, DSH_HOME: join(root, 'home'), DSH_RECOVERY_FIXTURE_ROOT: root }
    delete env.ELECTRON_RUN_AS_NODE
    const result = spawnSync(electron, [entry], {
      cwd: root, env, encoding: 'utf8', timeout: 35_000, killSignal: 'SIGKILL', maxBuffer: 2_000_000
    })
    cleanExit = result.status === 0 && !result.error && result.signal === null
    const evidence = result.stdout + '\n' + result.stderr
    expect(result.error, evidence).toBeUndefined()
    expect(result.status, evidence).toBe(0)
    for (const name of ['pending-replacement', 'native-renderer-crash', 'missing-resource', 'bounded-timeout', 'close-disposal']) {
      expect(result.stdout, evidence).toContain('PASS ' + name)
    }
    expect(result.stdout, evidence).toContain('SECURE-PREFERENCES {"sandbox":true,"contextIsolation":true,"nodeIntegration":false}')
    expect(result.stdout, evidence).toContain('NATIVE-RESTART {"before":2,"after":3,"restarts":1}')
    expect(result.stdout, evidence).toContain('NATIVE-RECOVERY-ACCEPTANCE-COMPLETE')
    console.log('Native renderer recovery evidence:', result.stdout)
  } finally {
    // A failed/timed-out child may retain renderer handles; preserve its temporary
    // data instead of recursively removing a directory an active process may use.
    if (cleanExit) await rm(root, { recursive: true, force: true })
    else console.error('Native recovery fixture evidence retained at', root)
  }
}, 45_000)

const fixture = String.raw`
import { app, BrowserWindow } from 'electron'
import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.env.DSH_RECOVERY_FIXTURE_ROOT
assert.ok(root)
app.setName('DSH Renderer Recovery Acceptance')
app.setPath('userData', join(root, 'user-data'))
for (const name of ['logs', 'crashDumps']) {
  const directory = join(root, name)
  mkdirSync(directory)
  app.setPath(name, directory)
}
app.enableSandbox()
const watchdog = setTimeout(() => { console.error('fixture watchdog expired'); app.exit(2) }, 25_000)
app.on('window-all-closed', () => {})
const windows = new Set()
const owners = new Set()
let server
let windowSequence = 0
const startedAt = Date.now()

function setup(timeoutMs = 5_000) {
  const window = new BrowserWindow({ show: false, webPreferences: {
    sandbox: true, contextIsolation: true, nodeIntegration: false
  } })
  windows.add(window)
  const preferences = window.webContents.getLastWebPreferences()
  assert.equal(preferences.sandbox, true)
  assert.equal(preferences.contextIsolation, true)
  assert.equal(preferences.nodeIntegration, false)
  console.log('SECURE-PREFERENCES ' + JSON.stringify({ sandbox: preferences.sandbox,
    contextIsolation: preferences.contextIsolation, nodeIntegration: preferences.nodeIntegration }))
  const events = new EventEmitter()
  const errors = []
  let loads = 0
  const windowId = ++windowSequence
  const trace = (event, details = {}) => console.log('NATIVE-TRACE ' + JSON.stringify({
    event, windowId, elapsedMs: Date.now() - startedAt, activeLoad: loads, ...details
  }))
  const owner = new RendererNavigationRecovery({
    load: async (url, cancelled) => {
      const id = ++loads
      trace('load-start', { id, url, loading: window.webContents.isLoading() })
      try {
        await loadDesktopWindowAfterStop(window, url, cancelled)
      } catch (error) {
        trace('load-rejected', { id, url, code: error.code, errno: error.errno, message: error.message })
        throw error
      }
      if (cancelled()) { trace('load-cancelled', { id, url }); return }
      trace('load-resolved', { id, url, currentUrl: window.webContents.getURL() })
      events.emit('loaded')
    },
    cancelled: () => window.isDestroyed(), onError: error => errors.push(error),
    cooldownMs: 30, timeoutMs, healthyMs: 10_000
  })
  owners.add(owner)
  window.webContents.on('did-start-navigation', (_event, url, inPlace, main) => {
    trace('did-start-navigation', { url, inPlace, main })
  })
  window.webContents.on('did-stop-loading', () => trace('did-stop-loading'))
  window.webContents.on('did-finish-load', () => trace('did-finish-load'))
  window.webContents.on('render-process-gone', (_event, details) => {
    trace('render-process-gone', details)
    events.emit('gone', details)
    if (details.reason !== 'clean-exit') owner.rendererGone(window.webContents.getURL())
  })
  window.webContents.on('did-fail-load', (_event, code, description, url, main) => {
    trace('did-fail-load', { code, description, url, main })
    if (main) owner.loadFailed(url, code, window.webContents.getURL())
  })
  window.once('closed', () => { owner.dispose(); owners.delete(owner); windows.delete(window) })
  return { window, owner, events, errors, trace, loads: () => loads }
}
async function marker(window) {
  const result = await window.webContents.executeJavaScript('({ marker: document.getElementById("marker")?.textContent, node: typeof require })')
  assert.deepEqual(result, { marker: 'renderer-recovered', node: 'undefined' })
}
async function run() {
  await app.whenReady()
  const page = pathToFileURL(join(root, 'page.html')).href
  const first = setup()
  const pending = first.owner.navigate(page)
  first.trace('manual-pending-renderer-loss')
  first.owner.rendererGone()
  assert.equal(await pending, true)
  assert.equal(first.loads(), 2)
  await marker(first.window)
  assert.equal(first.errors.length, 0)
  console.log('PASS pending-replacement')

  const nativeGone = once(first.events, 'gone')
  const replaced = once(first.events, 'loaded')
  first.window.webContents.forcefullyCrashRenderer()
  const [details] = await nativeGone
  console.log('NATIVE-TERMINATION ' + JSON.stringify(details))
  assert.ok(['crashed', 'killed'].includes(details.reason), 'Unexpected forced renderer termination reason: ' + details.reason)
  await replaced
  await marker(first.window)
  assert.equal(first.loads(), 3)
  assert.equal(first.errors.length, 0)
  console.log('NATIVE-RESTART ' + JSON.stringify({ before: 2, after: first.loads(), restarts: first.loads() - 2 }))
  console.log('PASS native-renderer-crash')
  first.window.destroy()

  const missing = setup()
  await assert.rejects(missing.owner.navigate(pathToFileURL(join(root, 'missing.html')).href), /ERR_FILE_NOT_FOUND/)
  assert.equal(missing.loads(), 1)
  missing.window.destroy()
  console.log('PASS missing-resource')

  server = createServer(() => {})
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const hanging = setup(200)
  await assert.rejects(hanging.owner.navigate('http://127.0.0.1:' + address.port + '/hang'), /renderer/)
  assert.equal(hanging.loads(), 4)
  assert.equal(hanging.errors.length, 0)
  hanging.window.destroy()
  console.log('PASS bounded-timeout')

  const closing = setup()
  const abandoned = closing.owner.navigate('http://127.0.0.1:' + address.port + '/hang')
  closing.window.destroy()
  assert.equal(await abandoned, false)
  assert.equal(closing.loads(), 1)
  assert.equal(closing.errors.length, 0)
  console.log('PASS close-disposal')
  console.log('NATIVE-RECOVERY-ACCEPTANCE-COMPLETE')
}
run().then(() => finish(0), error => { console.error(error); finish(1) })
function finish(code) {
  clearTimeout(watchdog)
  for (const owner of owners) owner.dispose()
  for (const window of windows) if (!window.isDestroyed()) window.destroy()
  if (server) { server.closeAllConnections(); server.close() }
  app.exit(code)
}
`
