import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { parse } from 'yaml'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
  utilityProcess,
  type IpcMainInvokeEvent,
  type MessageBoxOptions
} from 'electron'
import { extractFailureCause, HarnessRuntime } from './runtime/harness-runtime'
import { launchDisclaimedUtilityProcess } from './runtime/disclaimed-utility-process'
import {
  installProfileDependenciesWithDsh,
  removeProfilePluginWithDsh
} from './runtime/profile-plugin-command'
import { clearDamagedPackageDirectories, hasProfile } from './state/profile-repair'
import { inspectProfileConsistency } from './state/profile-consistency'
import { LanMobileBridge } from './mobile/lan-mobile-bridge'
import {
  detectPluginRecovery,
  PLUGIN_RECOVERY_EVIDENCE_TIMEOUT_MS
} from './plugin-recovery-detection'
import { secureWindow } from './security'
import { ensureLaunchRoot } from './state/launch-root'
import {
  pruneMissingProfileBundles,
  resetPluginProfile,
  uninstallPluginFromProfile
} from './state/plugin-recovery'
import {
  desktopHarnessUrl,
  isAbortedNavigationError,
  shouldLoadHarnessUrl
} from './window-navigation'
import {
  checkForUpdates,
  registerUpdateHandlers,
  startUpdateManager,
  stopUpdateManager
} from './update/update-manager'
import type { RuntimeSnapshot } from '../shared/contracts'
import { resolveHarnessLocale } from './application-locale'
import { installContextMenu } from './context-menu'
import {
  WINDOWS_TITLEBAR_HEIGHT,
  isDesktopMenuCommand,
  type DesktopMenuCommand
} from '../shared/desktop-menu'
import { buildPluginRecoveryViewModel } from './plugin-recovery-view'
import { aboutDetail, bundledHarnessVersion } from './version-info'

type PluginRecoveryAction = 'uninstall' | 'show-log' | 'quit' | 'restart' | 'refresh'

const PLUGIN_RECOVERY_ACTIONS = new Set<PluginRecoveryAction>([
  'uninstall',
  'show-log',
  'quit',
  'restart'
])

let mainWindow: BrowserWindow | undefined
let mobileWindow: BrowserWindow | undefined
let runtime: HarnessRuntime
let mobileBridge: LanMobileBridge
let launchDirectory: string
let quitting = false
let failureRecoveryVisible = false
let harnessLaunchOperation: Promise<void> | undefined
let pluginRecoveryActionResolver: ((action: PluginRecoveryAction) => void) | undefined
let mainWindowNavigationVersion = 0
let rendererPluginFailureLogs: string[] = []
let pluginRecoveryRemovedPlugins: string[] = []
let pluginRecoveryResetTimer: ReturnType<typeof setTimeout> | undefined
let pendingFrontendPluginRecovery = false
let pendingFrontendPluginRecoveryMessage: string | undefined

function appendRendererPluginFailureLog(message: string): void {
  const trimmed = message.trim()
  if (!trimmed) return
  const logLine = `[stderr] ${trimmed}`
  if (rendererPluginFailureLogs.at(-1) === logLine) return
  rendererPluginFailureLogs.push(logLine)
  rendererPluginFailureLogs = rendererPluginFailureLogs.slice(-50)
}

function queuePendingFrontendPluginRecovery(message?: string): void {
  pendingFrontendPluginRecovery = true
  if (message) pendingFrontendPluginRecoveryMessage = message
  resolvePluginRecoveryAction('refresh')
}

function takePendingFrontendPluginRecovery(): {
  pending: boolean
  message?: string
} {
  const pending = pendingFrontendPluginRecovery
  const message = pendingFrontendPluginRecoveryMessage
  pendingFrontendPluginRecovery = false
  pendingFrontendPluginRecoveryMessage = undefined
  return { pending, message }
}

function cancelPluginRecoverySessionReset(): void {
  if (pluginRecoveryResetTimer) clearTimeout(pluginRecoveryResetTimer)
  pluginRecoveryResetTimer = undefined
}

function schedulePluginRecoverySessionReset(): void {
  cancelPluginRecoverySessionReset()
  pluginRecoveryResetTimer = setTimeout(() => {
    pluginRecoveryResetTimer = undefined
    pluginRecoveryRemovedPlugins = []
  // Keep the chain alive long enough for slower Windows machines to finish
  // rendering a frontend plugin failure after the backend reports ready.
  }, 60_000)
}

function appendRendererPluginRecoveryLog(logs: readonly string[]): void {
  if (logs.length === 0) return

  try {
    const evidence = logs
      .slice(-50)
      .join('\n')
      .slice(-20_000)
      .split(/\r?\n/)
      .map((line) => `[renderer] ${line}`)
      .join('\n')
    appendFileSync(
      join(app.getPath('logs'), 'harness.log'),
      `\n[desktop] frontend plugin recovery ${new Date().toISOString()}\n${evidence}\n`,
      'utf8'
    )
  } catch (error) {
    console.warn('[desktop] failed to persist frontend plugin recovery evidence', error)
  }
}

function appendPluginRecoveryDetectionLog(plugins: readonly string[]): void {
  try {
    const result = plugins.length > 0 ? plugins.join(', ') : 'unresolved'
    appendFileSync(
      join(app.getPath('logs'), 'harness.log'),
      `[desktop] plugin recovery detection: ${result}\n`,
      'utf8'
    )
  } catch (error) {
    console.warn('[desktop] failed to persist plugin recovery detection', error)
  }
}

function isDevelopmentBuild(): boolean {
  if (!app.isPackaged) return true

  try {
    const metadata = JSON.parse(
      readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')
    ) as { dshDesktopChannel?: unknown }
    return metadata.dshDesktopChannel === 'development'
  } catch {
    return false
  }
}

const developmentBuild = isDevelopmentBuild()

function windowsTitleBarOverlay(isDark: boolean): Electron.TitleBarOverlayOptions {
  return {
    color: '#00000000',
    symbolColor: isDark ? '#f3f4f6' : '#202124',
    height: WINDOWS_TITLEBAR_HEIGHT
  }
}

function applyWindowChromeTheme(window: BrowserWindow, isDark: boolean): void {
  if (window.isDestroyed()) return
  window.setBackgroundColor(isDark ? '#141416' : '#ffffff')
  if (process.platform === 'win32') {
    window.setTitleBarOverlay(windowsTitleBarOverlay(isDark))
  }
}

function configureAppIdentity(): void {
  if (developmentBuild) {
    app.setName('DSH Desktop Dev')
    app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop-dev'))
    return
  }

  app.setName('DSH Desktop')
  // Keep the historical lowercase directory stable across product-name and
  // branding changes. Harness stores workspaces, sessions, credentials, and
  // custom presets below userData, so deriving this path from app.getName()
  // would make an ordinary upgrade look like a fresh installation.
  app.setPath('userData', join(app.getPath('appData'), 'dsh-desktop'))
}

async function syncNativeTheme(window: BrowserWindow): Promise<void> {
  if (window.isDestroyed()) return

  // The sidebar already reserves enough room for macOS traffic lights. Read
  // Harness's resolved theme before showing the window so the native surface
  // matches the first rendered frame. The transparent drag strip restores the
  // native window gesture without adding a visual titlebar or covering the
  // traffic lights and right-side header actions.
  const isDark = await window.webContents.executeJavaScript(
    `(() => {
      if (${process.platform === 'darwin'}) {
        let dragRegion = document.getElementById('dsh-desktop-drag-region')
        if (!dragRegion) {
          dragRegion = document.createElement('div')
          dragRegion.id = 'dsh-desktop-drag-region'
          dragRegion.setAttribute('aria-hidden', 'true')
          Object.assign(dragRegion.style, {
            position: 'fixed',
            zIndex: '18',
            top: '0',
            left: '80px',
            right: '220px',
            height: '24px',
            background: 'transparent',
            pointerEvents: 'auto',
            userSelect: 'none'
          })
          dragRegion.style.setProperty('-webkit-app-region', 'drag')
          document.body.appendChild(dragRegion)
        }
      }
      if (document.body.hasAttribute('data-ds-dark-theme')) return true
      const color = getComputedStyle(document.body).backgroundColor
      const channels = color.match(/[\\d.]+/g)?.slice(0, 3).map(Number)
      if (!channels || channels.length < 3) {
        return matchMedia('(prefers-color-scheme: dark)').matches
      }
      const [red, green, blue] = channels
      return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128
    })()`
  )
  applyWindowChromeTheme(window, isDark)
}

function dshEntryPath(): string {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app',
      'node_modules',
      '@deepseek-ai',
      'dsh',
      'lib',
      'bin.js'
    )
  }
  return join(app.getAppPath(), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

function bundledNodePath(): string {
  const executable = process.platform === 'win32' ? 'node.exe' : 'node'
  return join(app.getAppPath(), 'node_modules', 'node', 'bin', executable)
}

/**
 * The packaged lock-recovery runner. The Harness-side installer stages its own
 * copy into .desktop-bin; the desktop writes shims to that same directory, so
 * it points at the same runner rather than replacing them with a plain pnpm
 * call that would silently drop the recovery.
 */
function bundledPnpmRunnerPath(): string {
  return join(
    app.getAppPath(),
    'node_modules',
    'dsh-desktop-market-installer',
    'pnpm-runner.mjs'
  )
}

function bundledPnpmEntryPath(): string {
  const root = join(app.getAppPath(), 'node_modules', 'pnpm', 'bin')
  const candidates = [join(root, 'pnpm.cjs'), join(root, 'pnpm.mjs')]
  return candidates.find((candidate) => existsSync(candidate)) ?? join(root, 'pnpm.cjs')
}

function harnessNodeEntryPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'harness-node-entry.mjs')
    : join(app.getAppPath(), 'build', 'harness-node-entry.mjs')
}

function desktopResourcePath(name: string): string {
  return app.isPackaged ? join(process.resourcesPath, name) : join(app.getAppPath(), 'build', name)
}

function desktopIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build', 'app-icon.png')
}

function dshBrandLogoPath(variant: 'light' | 'dark'): string {
  return join(
    app.getAppPath(),
    'node_modules',
    '@deepseek-ai',
    'dsh-web-frontend',
    'dist',
    `dsh-desktop-logo-${variant}.png`
  )
}

function harnessLocale(): 'en' | 'zh' {
  try {
    const settings = parse(
      readFileSync(join(app.getPath('userData'), 'harness', 'settings.yaml'), 'utf8')
    ) as { locale?: { preference?: unknown } }
    return resolveHarnessLocale(
      settings.locale?.preference,
      app.getPreferredSystemLanguages()
    )
  } catch {
    return resolveHarnessLocale(undefined, app.getPreferredSystemLanguages())
  }
}

function configureApplicationLocale(): void {
  app.commandLine.appendSwitch('lang', harnessLocale() === 'zh' ? 'zh-CN' : 'en-US')
}

function harnessThemePreference(): 'light' | 'dark' | 'system' {
  try {
    const settings = parse(
      readFileSync(join(app.getPath('userData'), 'harness', 'settings.yaml'), 'utf8')
    ) as { 'ui-theme'?: { preference?: unknown } }
    const preference = settings['ui-theme']?.preference
    return preference === 'light' || preference === 'dark' || preference === 'system'
      ? preference
      : 'system'
  } catch {
    return 'system'
  }
}

function isPluginRecoveryPage(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'file:' && parsed.pathname.endsWith('/plugin-recovery.html')
  } catch {
    return false
  }
}

function resolvePluginRecoveryAction(action: PluginRecoveryAction): void {
  const resolve = pluginRecoveryActionResolver
  pluginRecoveryActionResolver = undefined
  resolve?.(action)
}

function installPluginRecoveryNavigation(window: BrowserWindow): void {
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith('dsh-recovery://')) return
    event.preventDefault()
    if (!isPluginRecoveryPage(window.webContents.getURL())) return

    try {
      const action = new URL(targetUrl).hostname as PluginRecoveryAction
      if (PLUGIN_RECOVERY_ACTIONS.has(action)) resolvePluginRecoveryAction(action)
    } catch {
      // Ignore malformed recovery actions and keep the current recovery page visible.
    }
  })
}

function createWindow(): BrowserWindow {
  const isWindows = process.platform === 'win32'
  const window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: '',
    icon: desktopIconPath(),
    frame: process.platform !== 'darwin',
    ...(isWindows
      ? {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: windowsTitleBarOverlay(nativeTheme.shouldUseDarkColors),
          autoHideMenuBar: true
        }
      : {}),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#f8f8f6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      webSecurity: true
    }
  })
  if (process.platform === 'darwin') {
    window.setWindowButtonVisibility(true)
    window.setWindowButtonPosition({ x: 12, y: 9 })
  } else if (isWindows) {
    window.setMenuBarVisibility(false)
  }
  window.on('page-title-updated', (event) => {
    event.preventDefault()
    window.setTitle('')
  })
  window.webContents.on('console-message', (details) => {
    if (details.level !== 'error') return
    const sourceUrl = details.sourceId || window.webContents.getURL()
    if (!sourceUrl.startsWith('http://127.0.0.1:')) return
    appendRendererPluginFailureLog(details.message)
  })
  installPluginRecoveryNavigation(window)
  secureWindow(window)
  installContextMenu(window, harnessLocale)
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
    resolvePluginRecoveryAction('quit')
  })
  mainWindow = window
  return window
}

async function openHarness(url: string): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  const rendererUrl = desktopHarnessUrl(url, process.platform)
  if (shouldLoadHarnessUrl(window.webContents.getURL(), url)) {
    const navigationVersion = ++mainWindowNavigationVersion
    rendererPluginFailureLogs = []
    window.webContents.stop()
    try {
      await window.loadURL(rendererUrl)
    } catch (error) {
      if (navigationVersion !== mainWindowNavigationVersion) return
      if (isAbortedNavigationError(error)) return
      const snapshot = runtime.snapshot()
      if (snapshot.phase !== 'ready' || snapshot.url !== url) return
      throw error
    }
    if (navigationVersion !== mainWindowNavigationVersion) return
  }
  if (runtime.snapshot().url !== url || window.isDestroyed()) return
  await syncNativeTheme(window)
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

async function showSplash(): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  const navigationVersion = ++mainWindowNavigationVersion
  window.webContents.stop()
  await window.loadFile(desktopResourcePath('splash.html'))
  if (window.isDestroyed() || navigationVersion !== mainWindowNavigationVersion) return
  window.show()
  window.focus()
}

/**
 * Clear what an earlier failed package operation left behind, then put the
 * packages back — both while Harness is stopped, the only moment either is
 * safe. A profile damaged by an older build heals on the first launch of this
 * one; an undamaged profile costs a directory scan. Failure here is not fatal:
 * the prune below still keeps the profile bootable, and Harness reports
 * whatever remains.
 */
async function repairProfilePackages(dshHome: string): Promise<void> {
  try {
    if (!hasProfile(dshHome)) return
    const removed = await clearDamagedPackageDirectories(dshHome)
    if (removed.length === 0) return

    runtime.note(
      `[desktop] repairing profile: cleared ${removed.length} damaged package ${
        removed.length === 1 ? 'directory' : 'directories'
      }`
    )
    const result = await installProfileDependenciesWithDsh({
      dshHome,
      dshEntryPath: dshEntryPath(),
      nodeExecutablePath: bundledNodePath(),
      pnpmEntryPath: bundledPnpmEntryPath(),
      pnpmRunnerPath: bundledPnpmRunnerPath()
    })
    runtime.note(
      result.ok
        ? '[desktop] profile repair completed'
        : `[desktop] profile repair failed: ${result.detail ?? 'unknown error'}`
    )
  } catch (error) {
    runtime.note(
      `[desktop] profile repair failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Name what the profile contradicts about itself, once the repair above has
 * had its turn. A dangling declaration does not throw — it leaves a service
 * waiting on a provider that never arrives — so without this the profile reads
 * as a slow start and the fault is found by reading logs for an afternoon.
 * Reporting only: the launch continues either way.
 */
async function reportProfileConsistency(dshHome: string): Promise<void> {
  try {
    const findings = await inspectProfileConsistency(dshHome)
    for (const finding of findings) runtime.note(`[desktop] profile inconsistency: ${finding}`)
  } catch {
    // A profile that cannot be inspected is not a reason to refuse a launch.
  }
}

function launchHarness(): Promise<void> {
  if (harnessLaunchOperation) return harnessLaunchOperation

  harnessLaunchOperation = (async () => {
    const dshHome = join(app.getPath('userData'), 'harness')
    await showSplash()
    // The repair only holds on a stopped Harness, and a restart still has the
    // previous one running: start() stops it, but that is after the repair.
    // Stopping here is what makes the window this launch path assumes.
    await runtime.stop()
    await repairProfilePackages(dshHome)
    await pruneMissingProfileBundles(dshHome).catch(() => false)
    await reportProfileConsistency(dshHome)
    await runtime.start(launchDirectory)
  })().finally(() => {
    harnessLaunchOperation = undefined
  })
  return harnessLaunchOperation
}

function restartHarness(): Promise<void> {
  if (failureRecoveryVisible) resolvePluginRecoveryAction('restart')
  return launchHarness()
}

function registerHarnessHandlers(): void {
  ipcMain.removeHandler('harness:restart')
  ipcMain.handle('harness:restart', async (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
      throw new Error('Harness restart is only available from the DSH Desktop window.')
    }
    if (runtime.snapshot().phase !== 'ready') {
      throw new Error('Harness is not ready to restart.')
    }

    await restartHarness()
    return { ok: runtime.snapshot().phase === 'ready' }
  })

  ipcMain.removeHandler('desktop-menu:execute')
  ipcMain.handle('desktop-menu:execute', async (event, command: unknown) => {
    assertTrustedMainWindowEvent(event)
    if (!isDesktopMenuCommand(command)) {
      throw new Error('Unknown DSH Desktop menu command.')
    }
    await executeDesktopMenuCommand(command)
    return { ok: true }
  })

  ipcMain.removeHandler('desktop-titlebar:set-theme')
  ipcMain.handle('desktop-titlebar:set-theme', (event, isDark: unknown) => {
    assertTrustedMainWindowEvent(event)
    if (typeof isDark !== 'boolean') {
      throw new Error('The DSH Desktop titlebar theme must be a boolean.')
    }
    if (process.platform === 'win32' && mainWindow) {
      applyWindowChromeTheme(mainWindow, isDark)
    }
    return { ok: true }
  })
}

function assertTrustedMainWindowEvent(event: IpcMainInvokeEvent): void {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    throw new Error('This action is only available from the main DSH Desktop window.')
  }
}

async function showAbout(window: BrowserWindow): Promise<void> {
  const locale = harnessLocale()
  const checkForUpdatesLabel = locale === 'zh' ? '检查更新' : 'Check for Updates'
  const result = await dialog.showMessageBox(window, {
    type: 'info',
    title: 'DSH Desktop',
    message: locale === 'zh' ? '关于 DSH Desktop' : 'About DSH Desktop',
    detail: aboutDetail(
      app.getVersion(),
      bundledHarnessVersion(app.getAppPath()),
      locale
    ),
    buttons: [checkForUpdatesLabel, locale === 'zh' ? '关闭' : 'Close'],
    defaultId: 1,
    cancelId: 1,
    noLink: true
  })
  if (result.response === 0) await checkForUpdates(true)
}

async function executeDesktopMenuCommand(command: DesktopMenuCommand): Promise<void> {
  const window = mainWindow
  if (!window || window.isDestroyed()) return
  const contents = window.webContents

  switch (command) {
    case 'connect-phone':
      await showMobilePairing()
      break
    case 'restart-harness':
      await restartHarness()
      break
    case 'show-harness-log':
      shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
      break
    case 'check-for-updates':
      await checkForUpdates(true)
      break
    case 'undo':
      contents.undo()
      break
    case 'redo':
      contents.redo()
      break
    case 'cut':
      contents.cut()
      break
    case 'copy':
      contents.copy()
      break
    case 'paste':
      contents.paste()
      break
    case 'select-all':
      contents.selectAll()
      break
    case 'reload':
      contents.reload()
      break
    case 'toggle-devtools':
      contents.toggleDevTools()
      break
    case 'zoom-reset':
      contents.setZoomLevel(0)
      break
    case 'zoom-in':
      contents.setZoomLevel(Math.min(3, contents.getZoomLevel() + 0.5))
      break
    case 'zoom-out':
      contents.setZoomLevel(Math.max(-3, contents.getZoomLevel() - 0.5))
      break
    case 'toggle-fullscreen':
      window.setFullScreen(!window.isFullScreen())
      break
    case 'about':
      await showAbout(window)
      break
    case 'quit':
      app.quit()
      break
  }
}

async function waitForPluginRecoveryAction(options: {
  snapshot: RuntimeSnapshot
  plugins: readonly string[]
  removedPlugins: readonly string[]
  notice?: string
}): Promise<PluginRecoveryAction> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  const state = buildPluginRecoveryViewModel({
    ...options,
    locale: harnessLocale()
  })
  const actionPromise = new Promise<PluginRecoveryAction>((resolve) => {
    pluginRecoveryActionResolver = resolve
  })
  const navigationVersion = ++mainWindowNavigationVersion
  window.webContents.stop()

  try {
    await window.loadFile(desktopResourcePath('plugin-recovery.html'), {
      query: {
        state: JSON.stringify(state),
        icon: app.isPackaged ? 'icon.png' : 'app-icon.png',
        theme: harnessThemePreference()
      }
    })
  } catch (error) {
    pluginRecoveryActionResolver = undefined
    throw error
  }

  if (window.isDestroyed() || navigationVersion !== mainWindowNavigationVersion) return 'quit'
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
  return actionPromise
}

function showUnexpectedError(error: unknown): void {
  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  dialog.showErrorBox('DSH Desktop encountered an error', message)
}

async function showPluginRecovery(options?: {
  message?: string
  logs?: readonly string[]
  followRendererLogs?: boolean
}): Promise<void> {
  if (failureRecoveryVisible || quitting) return
  failureRecoveryVisible = true

  const dshHome = join(app.getPath('userData'), 'harness')
  const isChinese = harnessLocale() === 'zh'
  cancelPluginRecoverySessionReset()
  const removedPlugins = pluginRecoveryRemovedPlugins
  let notice: string | undefined
  let recoveryMessage = options?.message
  let recoveryLogs = options?.logs
  let followRendererLogs = options?.followRendererLogs === true
  let waitForRendererEvidence = followRendererLogs

  const applyPendingFrontendEvidence = (): boolean => {
    const pending = takePendingFrontendPluginRecovery()
    if (!pending.pending) return false
    recoveryMessage = pending.message ?? recoveryMessage
    recoveryLogs = [...rendererPluginFailureLogs]
    followRendererLogs = true
    waitForRendererEvidence = false
    return true
  }

  try {
    while (!quitting) {
      const snapshot = runtime.snapshot()
      const message = recoveryMessage ?? snapshot.message
      const detection = await detectPluginRecovery({
        dshHome,
        initialLogs: recoveryLogs ?? snapshot.logs,
        readLatestLogs: followRendererLogs ? () => rendererPluginFailureLogs : undefined,
        excludedPlugins: removedPlugins,
        slotProviderNodeModulesPaths: [join(app.getAppPath(), 'node_modules')],
        timeoutMs: waitForRendererEvidence ? PLUGIN_RECOVERY_EVIDENCE_TIMEOUT_MS : 0
      })
      appendPluginRecoveryDetectionLog(detection.plugins)
      waitForRendererEvidence = false
      if (applyPendingFrontendEvidence()) continue
      const action = await waitForPluginRecoveryAction({
        snapshot: {
          ...snapshot,
          message: message || snapshot.message,
          logs: detection.logs
        },
        plugins: detection.plugins,
        removedPlugins,
        notice
      })
      notice = undefined

      if (action === 'refresh') {
        applyPendingFrontendEvidence()
        continue
      } else if (action === 'uninstall' && detection.plugins.length > 0) {
        const failedPlugins: string[] = []
        for (const plugin of detection.plugins) {
          const removed = await uninstallPluginFromProfile(dshHome, plugin, async (pluginName) => {
            const result = await removeProfilePluginWithDsh(
              {
                dshHome,
                dshEntryPath: dshEntryPath(),
                nodeExecutablePath: bundledNodePath(),
                pnpmEntryPath: bundledPnpmEntryPath(),
                pnpmRunnerPath: bundledPnpmRunnerPath(),
                environment: process.env
              },
              pluginName
            )
            if (!result.ok) {
              console.warn(
                `[plugin-recovery] Failed to remove ${pluginName}: ${result.detail ?? 'unknown error'}`
              )
            }
            return result.ok
          })
          if (removed) {
            if (!removedPlugins.includes(plugin)) removedPlugins.push(plugin)
          } else {
            failedPlugins.push(plugin)
          }
        }

        if (failedPlugins.length === detection.plugins.length) {
          notice = isChinese
            ? '未能修改插件配置。请打开 Harness 日志查看详情，或选择其他恢复方式。'
            : 'The plugin profile could not be updated. Open the Harness log for details or choose another recovery option.'
          continue
        }
        if (failedPlugins.length > 0) {
          notice = isChinese
            ? `以下插件未能移除：${failedPlugins.join('、')}`
            : `These plugins could not be removed: ${failedPlugins.join(', ')}`
        }
        await launchHarness()
        if (applyPendingFrontendEvidence()) continue
        if (runtime.snapshot().phase === 'ready') {
          schedulePluginRecoverySessionReset()
          return
        }
        continue
      } else if (action === 'restart') {
        await launchHarness()
        if (applyPendingFrontendEvidence()) continue
        if (runtime.snapshot().phase === 'ready') {
          schedulePluginRecoverySessionReset()
          return
        }
        continue
      } else if (action === 'show-log') {
        shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        continue
      } else {
        app.quit()
        return
      }
    }
  } catch (error) {
    showUnexpectedError(error)
  } finally {
    failureRecoveryVisible = false
    const pending = takePendingFrontendPluginRecovery()
    if (pending.pending && !quitting) {
      queueMicrotask(() => {
        void showPluginRecovery({
          message: pending.message,
          logs: [...rendererPluginFailureLogs],
          followRendererLogs: true
        })
      })
    }
  }
}

async function showRuntimeFailure(snapshot: RuntimeSnapshot): Promise<void> {
  await showPluginRecovery({ message: snapshot.message, logs: snapshot.logs })
}

function installMenu(): void {
  const isChinese = app.getLocale().toLowerCase().startsWith('zh')
  const checkForUpdatesLabel = isChinese
    ? '检查更新…'
    : 'Check for Updates…'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: isChinese ? '关于 DSH Desktop' : 'About DSH Desktop',
                click: () => {
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    void showAbout(mainWindow).catch(showUnexpectedError)
                  }
                }
              },
              {
                label: checkForUpdatesLabel,
                accelerator: 'CmdOrCtrl+U',
                click: () => void checkForUpdates(true).catch(showUnexpectedError)
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Harness',
      submenu: [
        {
          label: isChinese ? '连接手机…' : 'Connect Phone…',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => void showMobilePairing().catch(showUnexpectedError)
        },
        { type: 'separator' },
        {
          label: isChinese ? '重启 Harness' : 'Restart Harness',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => void restartHarness().catch(showUnexpectedError)
        },
        {
          label: isChinese ? '查看 Harness 日志' : 'Show Harness Log',
          click: () => shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        },
        ...(process.platform === 'darwin'
          ? []
          : [
              { type: 'separator' as const },
              {
                label: checkForUpdatesLabel,
                accelerator: 'CmdOrCtrl+U',
                click: () => void checkForUpdates(true).catch(showUnexpectedError)
              }
            ]),
        ...(process.platform === 'darwin'
          ? []
          : [{ type: 'separator' as const }, { role: 'quit' as const }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setMenuBarVisibility(false)
  }
}

async function showMobilePairing(): Promise<void> {
  if (runtime.snapshot().phase !== 'ready') {
    const options: MessageBoxOptions = {
      type: 'info',
      message: 'Harness is still starting.',
      detail: 'Wait until DSH Desktop is ready, then connect your phone again.',
      buttons: ['OK']
    }
    await (mainWindow ? dialog.showMessageBox(mainWindow, options) : dialog.showMessageBox(options))
    return
  }

  let snapshot = await mobileBridge.start()
  if (!snapshot.desktopUrl) {
    await mobileBridge.stop()
    const options: MessageBoxOptions = {
      type: 'warning',
      message: 'Failed to start mobile bridge.',
      detail: 'Please try again.',
      buttons: ['OK']
    }
    await (mainWindow ? dialog.showMessageBox(mainWindow, options) : dialog.showMessageBox(options))
    return
  }

  if (!snapshot.pairingUrl && !snapshot.tunnelActive) {
    snapshot = await mobileBridge.toggleTunnel(true)
  }

  if (mobileWindow && !mobileWindow.isDestroyed()) mobileWindow.destroy()
  nativeTheme.themeSource = harnessThemePreference()
  mobileWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    title: harnessLocale() === 'zh' ? '连接移动设备' : 'Connect Mobile Device',
    icon: desktopIconPath(),
    parent: mainWindow,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  secureWindow(mobileWindow)
  mobileWindow.on('closed', () => {
    mobileWindow = undefined
  })
  if (!snapshot.desktopUrl) return
  await mobileWindow.loadURL(snapshot.desktopUrl)
  mobileWindow.show()
  mobileWindow.focus()
}

async function bootstrap(): Promise<void> {
  if (process.platform === 'darwin') app.dock?.setIcon(desktopIconPath())
  launchDirectory = await ensureLaunchRoot(app.getPath('userData'))
  registerUpdateHandlers()
  createWindow()
  runtime = new HarnessRuntime({
    dshEntryPath: dshEntryPath(),
    nodeExecutablePath: bundledNodePath(),
    nodeEntryPath: harnessNodeEntryPath(),
    dshPatchPath: desktopResourcePath('dsh-desktop.patch.yml'),
    dshHome: join(app.getPath('userData'), 'harness'),
    logPath: join(app.getPath('logs'), 'harness.log'),
    launchProcess: (executablePath, args, options) =>
      process.platform === 'darwin'
        ? launchDisclaimedUtilityProcess(utilityProcess, args, options, {
            disclaim: !developmentBuild
          })
        : spawn(executablePath, args, options),
    onChanged: (snapshot) => {
      if (snapshot.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url).catch(showUnexpectedError)
      } else if (snapshot.phase === 'failed') {
        void showRuntimeFailure(snapshot)
      }
    }
  })
  registerHarnessHandlers()
  mobileBridge = new LanMobileBridge({
    harnessUrl: () => runtime.snapshot().url,
    locale: harnessLocale,
    brandLogoPaths: {
      light: dshBrandLogoPath('light'),
      dark: dshBrandLogoPath('dark')
    },
    appIconPath: desktopIconPath(),
    cloudflaredCacheDir: join(app.getPath('userData'), 'bin'),
    port: developmentBuild ? 43128 : 43127,
    onReconnectRequested: () => {
      void showMobilePairing().catch(showUnexpectedError)
    }
  })
  void mobileBridge.start().catch(showUnexpectedError)
  ipcMain.handle('directory-picker:open', async (event) => {
    if (
      !mainWindow ||
      mainWindow.isDestroyed() ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame
    ) {
      throw new Error('Directory picker requests are only allowed from the main Harness window')
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: harnessLocale() === 'zh' ? '选择工作区目录' : 'Select Workspace Directory',
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  ipcMain.handle('mobile:open-pairing', () => showMobilePairing())
  ipcMain.handle('mobile:status', () => ({ connected: mobileBridge.snapshot().connected }))
  ipcMain.handle('harness:show-log', () => {
    shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
  })
  ipcMain.removeHandler('harness:open-recovery')
  ipcMain.handle('harness:open-recovery', async (event, frontendErrorMessage?: unknown) => {
    assertTrustedMainWindowEvent(event)
    const message = typeof frontendErrorMessage === 'string' ? frontendErrorMessage : undefined
    if (message) appendRendererPluginFailureLog(message)
    const logs = [...rendererPluginFailureLogs]
    appendRendererPluginRecoveryLog(logs)
    if (failureRecoveryVisible) {
      queuePendingFrontendPluginRecovery(message)
      return { ok: true }
    }
    void showPluginRecovery({ message, logs, followRendererLogs: true })
    return { ok: true }
  })
  ipcMain.removeHandler('recovery:action')
  ipcMain.handle('recovery:action', (event, action: unknown) => {
    assertTrustedMainWindowEvent(event)
    if (typeof action === 'string' && PLUGIN_RECOVERY_ACTIONS.has(action as PluginRecoveryAction)) {
      resolvePluginRecoveryAction(action as PluginRecoveryAction)
      return { ok: true }
    }
    return { ok: false }
  })
  ipcMain.removeHandler('harness:reset-plugins')
  ipcMain.handle('harness:reset-plugins', async (event, pluginName?: unknown) => {
    assertTrustedMainWindowEvent(event)
    if (pluginName !== undefined && typeof pluginName !== 'string') {
      throw new Error('The failing plugin name must be a string.')
    }
    const dshHome = join(app.getPath('userData'), 'harness')
    await resetPluginProfile(dshHome, pluginName)
    await launchHarness()
    return { ok: runtime.snapshot().phase === 'ready' }
  })
  installMenu()
  await launchHarness()
  if (!developmentBuild) {
    startUpdateManager({
      prepareToInstall: async () => {
        await runtime.stop()
        quitting = true
        stopUpdateManager()
      }
    })
  }
}

configureAppIdentity()
configureApplicationLocale()
const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const snapshot = runtime?.snapshot()
    if (snapshot?.phase === 'ready' && snapshot.url) {
      void openHarness(snapshot.url).catch(showUnexpectedError)
    }
  })
  app.whenReady().then(bootstrap).catch((error: unknown) => {
    showUnexpectedError(error)
    app.quit()
  })
  app.on('activate', () => {
    const snapshot = runtime?.snapshot()
    if (snapshot?.phase === 'ready' && snapshot.url) {
      void openHarness(snapshot.url).catch(showUnexpectedError)
    } else if (snapshot?.phase === 'idle') {
      void launchHarness().catch(showUnexpectedError)
    }
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('before-quit', (event) => {
    if (quitting || !runtime) return
    event.preventDefault()
    quitting = true
    stopUpdateManager()
    void Promise.all([runtime.stop(), mobileBridge?.stop()]).finally(() => app.quit())
  })
}
