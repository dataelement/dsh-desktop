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
    import { app, BrowserWindow } from 'electron'
    import { desktopFileUrl, navigateDesktopWindow } from './src/main/desktop-navigation'
    app.setPath('userData', ${JSON.stringify(join(temporary, 'profile'))})
    app.on('window-all-closed', () => {})
    app.whenReady().then(async () => {
      const create = () => new BrowserWindow({ show: true, width: 800, height: 600,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } })
      const window = create()
      let cancelled = false
      const splash = desktopFileUrl(${JSON.stringify(join(root, 'build', 'splash.html'))}, { theme: 'light' })
      assert.equal(await navigateDesktopWindow(window, splash, () => cancelled), true)
      console.log('Native splash loaded')
      const image = await window.webContents.capturePage()
      assert.equal(image.isEmpty(), false)
      const pixels = image.toBitmap()
      assert.ok(pixels.some((value, index) => index % 4 !== 3 && value !== pixels[index % 4]), 'Splash capture is blank')
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
      console.log('PASS: Electron ' + process.versions.electron + ' real splash capture, missing resource cause, cancellation and destroyed-window navigation')
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
