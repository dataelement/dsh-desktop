import { app, BrowserWindow, type Event } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { installDesktopProtocol, registerDesktopScheme } from '../../src/main/desktop-protocol'
import { DESKTOP_PROFILE } from '../../src/main/shell/safe-mode-page'
import { runStartupRecovery, type StartupRecoverySessionOptions } from '../../src/main/shell/startup-recovery-session'

const root = process.env.DSH_RECOVERY_FIXTURE_ROOT
const buildDir = process.env.DSH_RECOVERY_BUILD
if (root === undefined || buildDir === undefined) {
  console.error('recovery fixture paths missing')
  process.exit(1)
}
const fixtureRoot: string = root
const pageBuild: string = buildDir

registerDesktopScheme()
app.setName('DSH Recovery Acceptance')
app.setPath('userData', join(fixtureRoot, 'user-data'))
for (const name of ['logs', 'crashDumps'] as const) {
  const directory = join(fixtureRoot, name)
  mkdirSync(directory, { recursive: true })
  app.setPath(name, directory)
}
app.on('window-all-closed', () => undefined)

const watchdog = setTimeout(() => {
  console.error('recovery fixture watchdog expired')
  app.exit(2)
}, 25_000)

app.whenReady().then(async () => {
  installDesktopProtocol(name => join(pageBuild, name))
  await acceptEarlyClick()
  await acceptDuplicateClick()
  await acceptLoadFailure()
  await acceptWindowClose()
  await acceptQuit()
  clearTimeout(watchdog)
  console.log('NATIVE-RECOVERY-ACCEPTANCE-COMPLETE')
  app.exit(0)
}).catch((error: unknown) => {
  console.error(error)
  app.exit(1)
})

async function acceptEarlyClick(): Promise<void> {
  const home = join(fixtureRoot, 'known-plugin')
  writeProfile(home, 'dsh-better-sidebar')
  const window = openWindow()
  let relaunch = 0
  let quit = 0
  const quitting = { value: false }
  try {
    await runStartupRecovery(session(home, window, quitting, {
      plugins: ['dsh-better-sidebar'],
      message: 'failed to activate loader entry better-sidebar (dsh-better-sidebar): pending (waiting for service: webRuntime)',
      show: url => clickBeforeLoad(window, url, 'document.getElementById("primary").click()'),
      relaunch: () => { relaunch += 1 },
      quit: () => { quit += 1 }
    }))
  } finally {
    destroy(window)
  }
  if (relaunch !== 1 || quit !== 0) throw new Error(`early click relaunch=${String(relaunch)} quit=${String(quit)}`)
  const state = readFileSync(join(home, 'profiles', 'desktop', '.dsh-market', 'state.json'), 'utf8')
  if (!state.includes('dsh-better-sidebar')) throw new Error('desktop plugin was not disabled')
  console.log('PASS early-click')
}

async function acceptDuplicateClick(): Promise<void> {
  const home = join(fixtureRoot, 'duplicate')
  writeProfile(home, 'example-plugin')
  const window = openWindow()
  let relaunch = 0
  let quit = 0
  const quitting = { value: false }
  try {
    await runStartupRecovery(session(home, window, quitting, {
      plugins: ['example-plugin'],
      message: 'failed to import example-plugin',
      show: url => clickBeforeLoad(
        window,
        url,
        'document.getElementById("primary").click(); location.href = "dsh-recovery://quit"'
      ),
      relaunch: () => { relaunch += 1 },
      quit: () => { quit += 1 }
    }))
  } finally {
    destroy(window)
  }
  if (relaunch !== 1 || quit !== 0) throw new Error(`duplicate relaunch=${String(relaunch)} quit=${String(quit)}`)
  console.log('PASS duplicate')
}

async function acceptLoadFailure(): Promise<void> {
  const window = openWindow()
  let ran = 0
  const quitting = { value: false }
  try {
    await runStartupRecovery(session(join(fixtureRoot, 'missing'), window, quitting, {
      plugins: ['example-plugin'],
      message: 'example-plugin failed',
      show: () => false,
      relaunch: () => { ran += 1 },
      quit: () => { ran += 1 }
    }))
    throw new Error('a failed page should reject')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('did not open')) throw error
  } finally {
    destroy(window)
  }
  if (ran !== 0) throw new Error('failed page ran an action')
  console.log('PASS load-failure')
}

async function acceptWindowClose(): Promise<void> {
  const window = openWindow()
  let ran = 0
  const quitting = { value: false }
  try {
    await runStartupRecovery(session(join(fixtureRoot, 'close'), window, quitting, {
      plugins: ['example-plugin'],
      message: 'example-plugin failed',
      show: async url => {
        await window.loadURL(url)
        setTimeout(() => { if (!window.isDestroyed()) window.close() }, 20)
        return true
      },
      relaunch: () => { ran += 1 },
      quit: () => { ran += 1 }
    }))
  } finally {
    destroy(window)
  }
  if (ran !== 0) throw new Error('closing the page ran an action')
  console.log('PASS window-close')
}

async function acceptQuit(): Promise<void> {
  const window = openWindow()
  let ran = 0
  const quitting = { value: false }
  const hold = (event: Event): void => { event.preventDefault() }
  app.on('before-quit', hold)
  try {
    await runStartupRecovery(session(join(fixtureRoot, 'quit'), window, quitting, {
      plugins: ['example-plugin'],
      message: 'example-plugin failed',
      show: async url => {
        await window.loadURL(url)
        setTimeout(() => { app.quit() }, 20)
        return true
      },
      relaunch: () => { ran += 1 },
      quit: () => { ran += 1 }
    }))
  } finally {
    app.removeListener('before-quit', hold)
    destroy(window)
  }
  if (ran !== 0 || !quitting.value) throw new Error(`quit relaunch-or-quit=${String(ran)} quitting=${String(quitting.value)}`)
  console.log('PASS quit')
}

function session(
  home: string,
  window: BrowserWindow,
  quitting: { value: boolean },
  overrides: Pick<StartupRecoverySessionOptions, 'plugins' | 'message' | 'show' | 'relaunch' | 'quit'>
): StartupRecoverySessionOptions {
  return {
    dshHome: home,
    profile: DESKTOP_PROFILE,
    launchDirectory: join(home, 'profiles', 'desktop'),
    locale: 'zh',
    theme: 'light',
    bindRound: (deliver, cancel) => bindRound(window, quitting, deliver, cancel),
    openLog: () => undefined,
    isQuitting: () => quitting.value,
    ...overrides
  }
}

function bindRound(
  window: BrowserWindow,
  quitting: { value: boolean },
  deliver: (url: string) => void,
  cancel: () => void
): () => void {
  let receiver: ((url: string) => void) | undefined
  const accept = (url: string): void => {
    if (receiver !== accept) return
    receiver = undefined
    deliver(url)
  }
  receiver = accept
  const onNavigate = (event: Event, url: string): void => {
    if (!url.startsWith('dsh-recovery:')) return
    event.preventDefault()
    accept(url)
  }
  const onClose = (): void => { cancel() }
  const onQuit = (): void => {
    quitting.value = true
    cancel()
  }
  window.webContents.on('will-navigate', onNavigate)
  if (!window.isDestroyed()) window.on('closed', onClose)
  app.on('before-quit', onQuit)
  return () => {
    if (receiver === accept) receiver = undefined
    if (!window.isDestroyed()) {
      window.webContents.removeListener('will-navigate', onNavigate)
      window.removeListener('closed', onClose)
    }
    app.removeListener('before-quit', onQuit)
  }
}

function clickBeforeLoad(window: BrowserWindow, url: string, script: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    window.webContents.once('did-finish-load', () => {
      window.webContents.executeJavaScript(script).then(() => { resolve(!window.isDestroyed()) }, reject)
    })
    window.loadURL(url).catch((error: unknown) => { reject(error) })
  })
}

function openWindow(): BrowserWindow {
  const window = new BrowserWindow({
    show: true,
    width: 900,
    height: 700,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  })
  window.webContents.on('console-message', details => {
    if (details.level === 'error') console.error(`PAGE ${details.message}`)
  })
  return window
}

function destroy(window: BrowserWindow): void {
  if (!window.isDestroyed()) window.destroy()
}

function writeProfile(home: string, plugin: string): void {
  const directory = join(home, 'profiles', 'desktop')
  mkdirSync(join(directory, 'node_modules', plugin), { recursive: true })
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    dependencies: { [plugin]: '1.0.0' },
    dsh: { profile: { bundles: [plugin] } }
  }))
  writeFileSync(join(directory, 'node_modules', plugin, 'package.json'), JSON.stringify({
    name: plugin,
    version: '1.0.0'
  }))
}
