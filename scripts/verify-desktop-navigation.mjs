import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

// Opt-in native acceptance: run on the target OS with an interactive desktop.
const root = resolve(import.meta.dirname, '..')
const temporary = await mkdtemp(join(tmpdir(), 'dsh-navigation-native-'))
const entry = join(temporary, 'main.cjs')
try {
  await build({ stdin: { contents: `
    import assert from 'node:assert/strict'
    import { createServer } from 'node:http'
    import { setTimeout as delay } from 'node:timers/promises'
    import { app, BrowserWindow } from 'electron'
    import { desktopFileUrl, navigateDesktopWindow, replaceDesktopWindowPage } from './src/main/desktop-navigation'
    app.setPath('userData', ${JSON.stringify(join(temporary, 'profile'))})
    // Software rendering lets virtual desktops exercise the same history/input paths.
    app.disableHardwareAcceleration()
    app.on('window-all-closed', () => {})
    app.whenReady().then(async () => {
      const create = () => new BrowserWindow({ show: false, width: 800, height: 600,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } })
      const window = create()
      const firstPaint = new Promise(resolve => window.once('ready-to-show', resolve))
      let cancelled = false
      const splash = desktopFileUrl(${JSON.stringify(join(root, 'build', 'splash.html'))}, { theme: 'light' })
      assert.equal(await replaceDesktopWindowPage(window, splash, () => cancelled), true)
      console.log('Native splash loaded')
      // loadURL resolves at did-finish-load, which can precede the first compositor
      // surface. Capture after the first paint instead of racing it (UnknownVizError).
      await firstPaint
      const image = await window.webContents.capturePage()
      assert.equal(image.isEmpty(), false)
      const pixels = image.toBitmap()
      assert.ok(pixels.some((value, index) => index % 4 !== 3 && value !== pixels[index % 4]), 'Splash capture is blank')
      const server = createServer((_request, response) => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end('<!doctype html><input id="draft"><button id="click">Click</button><script>document.getElementById("click").onclick = () => { document.getElementById("click").textContent = "clicked" }</script>')
      })
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      const endpoint = 'http://127.0.0.1:' + server.address().port + '/'
      await replaceDesktopWindowPage(window, endpoint, () => false)
      assert.deepEqual(window.webContents.navigationHistory.getAllEntries().map(entry => entry.url), [endpoint])
      await window.webContents.executeJavaScript('document.getElementById("draft").value = "unsent draft"')
      window.webContents.debugger.attach('1.3')
      const click = async (button, x = 450, y = 300) => {
        const buttons = button === 'back' ? 8 : button === 'forward' ? 16 : 1
        for (const type of ['mousePressed', 'mouseReleased']) {
          await window.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
            type, x, y, button, buttons: type === 'mousePressed' ? buttons : 0, clickCount: 1
          })
        }
        await delay(150)
      }
      await click('back')
      await click('forward')
      assert.equal(window.webContents.getURL(), endpoint)
      assert.equal(await window.webContents.executeJavaScript('document.getElementById("draft").value'), 'unsent draft')
      const point = await window.webContents.executeJavaScript('(() => { const r = document.getElementById("click").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()')
      await click('left', point.x, point.y)
      assert.equal(await window.webContents.executeJavaScript('document.getElementById("click").textContent'), 'clicked')
      // Application routing is still allowed to create and traverse its own history.
      await window.webContents.executeJavaScript('history.pushState({}, "", "#panel")')
      await click('back')
      assert.equal(window.webContents.getURL(), endpoint)
      assert.equal(await window.webContents.executeJavaScript('document.getElementById("draft").value'), 'unsent draft')
      // A future cross-document feature can use ordinary navigation without
      // losing its Back/Forward entries to the shell replacement policy.
      const details = endpoint + 'details'
      await navigateDesktopWindow(window, details, () => false)
      await click('back')
      assert.equal(window.webContents.getURL(), endpoint)
      await click('forward')
      assert.equal(window.webContents.getURL(), details)
      await replaceDesktopWindowPage(window, splash, () => false)
      await replaceDesktopWindowPage(window, endpoint, () => false)
      await click('back')
      await click('forward')
      assert.equal(window.webContents.getURL(), endpoint)
      window.webContents.debugger.detach()
      server.close()
      console.log('Side-button Back/Forward retain Harness and draft; left-click, in-page routing, ordinary document history and repeated shell transitions remain usable')
      const missing = desktopFileUrl(${JSON.stringify(join(temporary, 'missing.html'))})
      await assert.rejects(navigateDesktopWindow(window, missing, () => false), error => error.code === 'ERR_FILE_NOT_FOUND')
      console.log('Missing resource cause retained')
      cancelled = true
      assert.equal(await navigateDesktopWindow(window, splash, () => cancelled), false)
      window.destroy()
      assert.equal(await navigateDesktopWindow(window, splash, () => false), false)
      const destroyed = create()
      destroyed.webContents.once('did-start-navigation', () => setImmediate(() => destroyed.destroy()))
      console.log('Checking destruction during navigation')
      assert.equal(await navigateDesktopWindow(destroyed, splash, () => false), false)
      console.log('PASS: Electron ' + process.versions.electron + ' real splash capture, side-button history, missing resource cause, cancellation and destroyed-window navigation')
      app.exit(0)
    }).catch(error => { console.error(error); app.exit(1) })
  `, resolveDir: root, loader: 'ts' }, outfile: entry, bundle: true, platform: 'node', format: 'cjs', external: ['electron'] })
  const environment = { ...process.env }
  delete environment.ELECTRON_RUN_AS_NODE
  const child = spawn(createRequire(import.meta.url)('electron'), [entry], {
    env: environment, stdio: 'inherit', signal: AbortSignal.timeout(30_000)
  })
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
  assert.equal(code, 0, 'Native Electron navigation acceptance failed')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
