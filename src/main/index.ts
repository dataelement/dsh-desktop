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
  WebContentsView,
  type IpcMainInvokeEvent,
  type MessageBoxOptions
} from 'electron'
import { extractFailureCause, HarnessRuntime, resolveShellEnvironment } from './runtime/harness-runtime'
import { launchDisclaimedUtilityProcess } from './runtime/disclaimed-utility-process'
import {
  installProfileDependenciesWithDsh,
  removeProfilePluginWithDsh
} from './runtime/profile-plugin-command'
import { clearDamagedPackageDirectories, hasProfile } from './state/profile-repair'
import {
  clearProfileInstallMarker,
  isProfileInstallComplete,
  markProfileInstallComplete
} from './state/profile-install-marker'
import { inspectProfileConsistency } from './state/profile-consistency'
import { ensureStoreDirPinned, inspectStoreConsistency } from './state/profile-store'
import { LanMobileBridge } from './mobile/lan-mobile-bridge'
import {
  detectPluginRecovery,
  PLUGIN_RECOVERY_EVIDENCE_TIMEOUT_MS
} from './plugin-recovery-detection'
import { isDaemonLaunch, isUserInitiatedInstance } from './launchd-guard'
import { secureWindow } from './security'
import { ensureLaunchRoot } from './state/launch-root'
import {
  listInstalledProfilePlugins,
  pruneMissingProfileBundles,
  resetPluginProfile,
  uninstallPluginFromProfile
} from './state/plugin-recovery'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from './state/safe-mode-profile'
import { cleanupPluginOwnedComponents } from './state/plugin-component-cleanup'
import { appBundlePathFromExecutable, auditLaunchAgents } from './state/launch-agent-audit'
import {
  desktopHarnessUrl,
  isAbortedNavigationError,
  shouldLoadHarnessUrl
} from './window-navigation'
import {
  raiseWindowWithoutStealingFocus,
  type WindowFocusIntent
} from './window-raise'
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
  isZoomMenuCommand,
  type DesktopMenuCommand
} from '../shared/desktop-menu'
import { buildPluginRecoveryViewModel } from './plugin-recovery-view'
import { buildSafeModeViewModel, shouldStartInSafeMode } from './safe-mode'
import { aboutDetail, bundledHarnessVersion } from './version-info'
import { windowsMenuViewBounds } from './windows-menu-view'

type PluginRecoveryAction = 'uninstall' | 'show-log' | 'quit' | 'restart' | 'refresh' | 'safe-mode'
type SafeModeAction =
  | { type: 'uninstall'; plugins: string[] }
  | { type: 'agent' }
  | { type: 'restart' }
  | { type: 'quit' }

const PLUGIN_RECOVERY_ACTIONS = new Set<PluginRecoveryAction>([
  'uninstall',
  'show-log',
  'quit',
  'restart',
  'safe-mode'
])

let mainWindow: BrowserWindow | undefined
let windowsMenuView: WebContentsView | undefined
let windowsMenuOpen = false
let windowsMenuDark = false
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
let safeModeVisible = false
let safeModeManagerVisible = false
let safeModeManagerWindow: BrowserWindow | undefined
let safeModeActionResolver: ((action: SafeModeAction) => void) | undefined
const startInSafeMode = shouldStartInSafeMode(process.argv)

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
    windowsMenuDark = isDark
    window.setTitleBarOverlay(windowsTitleBarOverlay(isDark))
    if (windowsMenuView && !windowsMenuView.webContents.isDestroyed()) {
      windowsMenuView.webContents.send('desktop-titlebar:theme-changed', isDark)
    }
  }
}

function updateWindowsMenuViewBounds(window: BrowserWindow): void {
  if (!windowsMenuView || windowsMenuView.webContents.isDestroyed() || window.isDestroyed()) return
  const contentSize = window.getContentSize()
  const width = contentSize[0] ?? 0
  const height = contentSize[1] ?? 0
  windowsMenuView.setBounds(
    windowsMenuViewBounds({ width, height }, windowsMenuOpen, window.isFullScreen())
  )
}

function setWindowsMenuOpen(window: BrowserWindow, open: boolean, notifyRenderer = false): void {
  windowsMenuOpen = open
  updateWindowsMenuViewBounds(window)
  if (notifyRenderer && windowsMenuView && !windowsMenuView.webContents.isDestroyed()) {
    windowsMenuView.webContents.send('desktop-titlebar:close-menu')
  }
}

function attachWindowsMenuView(window: BrowserWindow): void {
  const menuView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, '../preload/windows-menu.cjs'),
      sandbox: true,
      webSecurity: true
    }
  })
  windowsMenuView = menuView
  windowsMenuOpen = false
  windowsMenuDark = nativeTheme.shouldUseDarkColors
  menuView.setBackgroundColor('#00000000')
  menuView.webContents.setZoomFactor(1)
  menuView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  menuView.webContents.on('did-finish-load', () => {
    if (!menuView.webContents.isDestroyed()) {
      menuView.webContents.send('desktop-titlebar:theme-changed', windowsMenuDark)
    }
  })
  window.contentView.addChildView(menuView)
  updateWindowsMenuViewBounds(window)

  const updateBounds = (): void => updateWindowsMenuViewBounds(window)
  window.on('resize', updateBounds)
  window.on('enter-full-screen', updateBounds)
  window.on('leave-full-screen', updateBounds)
  window.on('blur', () => setWindowsMenuOpen(window, false, true))

  void menuView.webContents.loadFile(desktopResourcePath('windows-menu.html'), {
    query: {
      locale: harnessLocale(),
      theme: windowsMenuDark ? 'dark' : 'light'
    }
  }).catch(showUnexpectedError)
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

function resolveSafeModeAction(action: SafeModeAction): void {
  const resolve = safeModeActionResolver
  safeModeActionResolver = undefined
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
    if (windowsMenuView && !windowsMenuView.webContents.isDestroyed()) {
      windowsMenuView.webContents.close()
    }
    windowsMenuView = undefined
    windowsMenuOpen = false
    resolvePluginRecoveryAction('quit')
    resolveSafeModeAction({ type: 'quit' })
  })
  mainWindow = window
  if (isWindows) attachWindowsMenuView(window)
  return window
}

async function openHarness(
  url: string,
  focusIntent: WindowFocusIntent = 'automatic'
): Promise<void> {
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
  raiseWindowWithoutStealingFocus(
    window,
    process.platform,
    () => app.isActive(),
    focusIntent
  )
}

async function showSplash(): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  const navigationVersion = ++mainWindowNavigationVersion
  window.webContents.stop()
  await window.loadFile(desktopResourcePath('splash.html'), {
    query: { theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' }
  })
  if (window.isDestroyed() || navigationVersion !== mainWindowNavigationVersion) return
  raiseWindowWithoutStealingFocus(window, process.platform, () => app.isActive())
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
    // An install that never finished leaves nothing a damage scan can see: the
    // directories it did write are real packages, and the ones it never
    // reached are simply absent. Skipping the install on "nothing damaged" is
    // what let a half-built profile stay half-built across every later launch.
    const complete = await isProfileInstallComplete(dshHome)
    if (removed.length === 0 && complete) return

    runtime.note(
      removed.length === 0
        ? '[desktop] repairing profile: the last install did not finish'
        : `[desktop] repairing profile: cleared ${removed.length} damaged package ${
            removed.length === 1 ? 'directory' : 'directories'
          }`
    )
    // Withdrawn first: whatever happens to the run below, an interrupted
    // install must not leave a marker claiming the profile is whole.
    await clearProfileInstallMarker(dshHome)
    const result = await installProfileDependenciesWithDsh({
      dshHome,
      dshEntryPath: dshEntryPath(),
      nodeExecutablePath: bundledNodePath(),
      pnpmEntryPath: bundledPnpmEntryPath(),
      pnpmRunnerPath: bundledPnpmRunnerPath()
    })
    if (result.ok) await markProfileInstallComplete(dshHome)
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
    const store = await inspectStoreConsistency(dshHome)
    if (store) findings.push(store)
    for (const finding of findings) runtime.note(`[desktop] profile inconsistency: ${finding}`)
  } catch {
    // A profile that cannot be inspected is not a reason to refuse a launch.
  }
}

/**
 * Correct any LaunchAgent that would have launchd start this bundle as a
 * desktop process. Those agents steal focus and crash on every restart, and
 * the daemon guard only silences the symptom for as long as the job keeps
 * failing, so the job itself is repaired here.
 */
async function auditInstalledLaunchAgents(dshHome: string): Promise<void> {
  const appBundlePath = appBundlePathFromExecutable(process.execPath)
  if (appBundlePath === undefined) return
  try {
    const result = await auditLaunchAgents({
      dshHome,
      appBundlePath,
      log: (message) => runtime.note(message)
    })
    for (const finding of result.findings) {
      const owner = finding.owner === undefined ? '' : ` installed by ${finding.owner}`
      runtime.note(
        finding.action === 'escalated'
          ? `[desktop] ${finding.label}${owner} keeps recreating a background service that starts DSH Desktop; consider removing that plugin`
          : `[desktop] ${finding.action} the background service ${finding.label}${owner}`
      )
    }
    for (const failure of result.failures) runtime.note(`[desktop] launch agent audit: ${failure}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    runtime.note(`[desktop] launch agent audit failed: ${detail}`)
  }
}

function launchHarness(): Promise<void> {
  if (harnessLaunchOperation) return harnessLaunchOperation

  harnessLaunchOperation = (async () => {
    safeModeVisible = false
    const dshHome = join(app.getPath('userData'), 'harness')
    await showSplash()
    // The repair only holds on a stopped Harness, and a restart still has the
    // previous one running: start() stops it, but that is after the repair.
    // Stopping here is what makes the window this launch path assumes.
    await runtime.stop()
    // Before anything else runs pnpm: a store the profile does not pin makes
    // every package operation fail, repairs included.
    const pinned = await ensureStoreDirPinned(dshHome).catch(() => undefined)
    if (pinned) runtime.note(`[desktop] pinned the profile's pnpm store: ${pinned}`)
    await repairProfilePackages(dshHome)
    await pruneMissingProfileBundles(dshHome).catch(() => false)
    await reportProfileConsistency(dshHome)
    await auditInstalledLaunchAgents(dshHome)
    await runtime.start(launchDirectory)
  })().finally(() => {
    harnessLaunchOperation = undefined
  })
  return harnessLaunchOperation
}

function launchSafeHarness(): Promise<void> {
  if (harnessLaunchOperation) return harnessLaunchOperation

  harnessLaunchOperation = (async () => {
    safeModeVisible = true
    const dshHome = join(app.getPath('userData'), 'harness')
    await showSplash()
    await runtime.stop()
    await ensureSafeModeProfile(dshHome)
    runtime.note('[desktop] safe mode: third-party web profile bundles are blocked')
    await runtime.start(launchDirectory, SAFE_MODE_PROFILE)
    if (runtime.snapshot().phase === 'ready') {
      void mobileBridge.start().catch(showUnexpectedError)
    }
  })().finally(() => {
    harnessLaunchOperation = undefined
  })
  return harnessLaunchOperation
}

function restartHarness(): Promise<void> {
  if (failureRecoveryVisible) resolvePluginRecoveryAction('restart')
  if (safeModeVisible) {
    resolveSafeModeAction({ type: 'agent' })
    return launchSafeHarness()
  }
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
    assertTrustedDesktopMenuEvent(event)
    if (!isDesktopMenuCommand(command)) {
      throw new Error('Unknown DSH Desktop menu command.')
    }
    const zoomFactor = await executeDesktopMenuCommand(command)
    return zoomFactor === undefined ? { ok: true } : { ok: true, zoomFactor }
  })

  ipcMain.removeHandler('desktop-menu:get-zoom-factor')
  ipcMain.handle('desktop-menu:get-zoom-factor', (event) => {
    assertTrustedDesktopMenuEvent(event)
    return { zoomFactor: mainWindow?.webContents.getZoomFactor() ?? 1 }
  })

  ipcMain.removeHandler('desktop-titlebar:set-menu-open')
  ipcMain.handle('desktop-titlebar:set-menu-open', (event, open: unknown) => {
    assertTrustedWindowsMenuEvent(event)
    if (typeof open !== 'boolean') {
      throw new Error('The application menu state must be a boolean.')
    }
    if (mainWindow && !mainWindow.isDestroyed()) setWindowsMenuOpen(mainWindow, open)
    return { ok: true }
  })

  ipcMain.removeHandler('desktop-titlebar:close-menu')
  ipcMain.handle('desktop-titlebar:close-menu', (event) => {
    assertTrustedMainWindowEvent(event)
    if (mainWindow && !mainWindow.isDestroyed()) setWindowsMenuOpen(mainWindow, false, true)
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

function assertTrustedDesktopMenuEvent(event: IpcMainInvokeEvent): void {
  const fromMainWindow =
    mainWindow &&
    !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  const fromWindowsMenu =
    windowsMenuView &&
    !windowsMenuView.webContents.isDestroyed() &&
    event.sender === windowsMenuView.webContents &&
    event.senderFrame === windowsMenuView.webContents.mainFrame
  if (!fromMainWindow && !fromWindowsMenu) {
    throw new Error('This action is only available from the DSH Desktop window.')
  }
}

function assertTrustedWindowsMenuEvent(event: IpcMainInvokeEvent): void {
  if (
    !windowsMenuView ||
    windowsMenuView.webContents.isDestroyed() ||
    event.sender !== windowsMenuView.webContents ||
    event.senderFrame !== windowsMenuView.webContents.mainFrame
  ) {
    throw new Error('This action is only available from the Windows application menu.')
  }
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

function assertTrustedSafeModeManagerEvent(event: IpcMainInvokeEvent): void {
  if (
    !safeModeManagerWindow ||
    safeModeManagerWindow.isDestroyed() ||
    event.sender !== safeModeManagerWindow.webContents ||
    event.senderFrame !== safeModeManagerWindow.webContents.mainFrame
  ) {
    throw new Error('This action is only available from the Safe Mode manager.')
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

async function executeDesktopMenuCommand(command: DesktopMenuCommand): Promise<number | undefined> {
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
    case 'safe-mode':
      void showSafeMode().catch(showUnexpectedError)
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

  return isZoomMenuCommand(command) ? contents.getZoomFactor() : undefined
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
  raiseWindowWithoutStealingFocus(window, process.platform, () => app.isActive())
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
          const removed = await removeProfilePluginCompletely(
            dshHome,
            plugin,
            resolveShellEnvironment(),
            'plugin-recovery'
          )
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
        await (safeModeVisible ? launchSafeHarness() : launchHarness())
        if (applyPendingFrontendEvidence()) continue
        if (runtime.snapshot().phase === 'ready') {
          schedulePluginRecoverySessionReset()
          return
        }
        continue
      } else if (action === 'show-log') {
        shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
        continue
      } else if (action === 'safe-mode') {
        takePendingFrontendPluginRecovery()
        queueMicrotask(() => void showSafeMode().catch(showUnexpectedError))
        return
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

async function waitForSafeModeAction(options: {
  plugins: readonly string[]
  notice?: string
  noticeTone?: 'success' | 'error'
}): Promise<SafeModeAction> {
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  const window = safeModeManagerWindow && !safeModeManagerWindow.isDestroyed()
    ? safeModeManagerWindow
    : (() => {
        const bounds = parent.getBounds()
        const manager = new BrowserWindow({
          parent,
          modal: true,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          minWidth: 640,
          minHeight: 520,
          show: false,
          frame: false,
          transparent: true,
          backgroundColor: '#00000000',
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          fullscreenable: false,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: join(import.meta.dirname, '../preload/index.cjs'),
            sandbox: true,
            webSecurity: true
          }
        })
        secureWindow(manager)
        manager.on('closed', () => {
          if (safeModeManagerWindow === manager) safeModeManagerWindow = undefined
          resolveSafeModeAction({ type: 'agent' })
        })
        safeModeManagerWindow = manager
        return manager
      })()
  const model = buildSafeModeViewModel({
    locale: harnessLocale(),
    plugins: options.plugins,
    notice: options.notice,
    noticeTone: options.noticeTone
  })
  const actionPromise = new Promise<SafeModeAction>((resolve) => {
    safeModeActionResolver = resolve
  })
  window.webContents.stop()
  try {
    await window.loadFile(desktopResourcePath('safe-mode.html'), {
      query: {
        state: JSON.stringify(model),
        icon: app.isPackaged ? 'icon.png' : 'app-icon.png',
        theme: harnessThemePreference()
      }
    })
  } catch (error) {
    safeModeActionResolver = undefined
    throw error
  }
  if (window.isDestroyed()) {
    return { type: 'quit' }
  }
  raiseWindowWithoutStealingFocus(window, process.platform, () => app.isActive())
  return actionPromise
}

async function removeSafeModePlugin(dshHome: string, pluginName: string): Promise<boolean> {
  return removeProfilePluginCompletely(
    dshHome,
    pluginName,
    process.env,
    'safe-mode'
  )
}

async function removeProfilePluginCompletely(
  dshHome: string,
  pluginName: string,
  environment: NodeJS.ProcessEnv,
  logPrefix: string
): Promise<boolean> {
  const cleanup = await cleanupPluginOwnedComponents({
    dshHome,
    pluginName,
    log: (message) => runtime.note(`[${logPrefix}] ${message}`)
  })
  if (!cleanup.ok) {
    for (const failure of cleanup.failures) {
      runtime.note(`[${logPrefix}] failed to clean components for ${pluginName}: ${failure}`)
    }
    return false
  }

  const removed = await uninstallPluginFromProfile(dshHome, pluginName, async (name) => {
    const result = await removeProfilePluginWithDsh(
      {
        dshHome,
        dshEntryPath: dshEntryPath(),
        nodeExecutablePath: bundledNodePath(),
        pnpmEntryPath: bundledPnpmEntryPath(),
        pnpmRunnerPath: bundledPnpmRunnerPath(),
        environment
      },
      name
    )
    if (!result.ok) {
      runtime.note(`[${logPrefix}] failed to remove ${name}: ${result.detail ?? 'unknown error'}`)
    }
    return result.ok
  })
  // Both recovery paths pass an exact configured root bundle. The fallback
  // must not widen that ownership to similarly-named or same-scope siblings.
  if (removed || await resetPluginProfile(dshHome, pluginName, false)) return true
  // A package command can finish the profile edit but fail its own final
  // verification (for example after a lockfile cleanup). Treat the observable
  // profile state as authoritative instead of reporting a false failure.
  return !(await listInstalledProfilePlugins(dshHome)).includes(pluginName)
}

async function showSafeMode(): Promise<void> {
  if (quitting) return
  if (failureRecoveryVisible) {
    resolvePluginRecoveryAction('safe-mode')
    return
  }
  if (safeModeVisible) {
    await launchSafeHarness()
    return
  }
  await launchSafeHarness()
}

async function showSafeModeManager(): Promise<void> {
  if (!safeModeVisible || safeModeManagerVisible || quitting) return
  safeModeManagerVisible = true
  const dshHome = join(app.getPath('userData'), 'harness')
  const isChinese = harnessLocale() === 'zh'
  let notice: string | undefined
  let noticeTone: 'success' | 'error' | undefined

  try {
    while (!quitting) {
      const installed = await listInstalledProfilePlugins(dshHome)
      const action = await waitForSafeModeAction({ plugins: installed, notice, noticeTone })
      notice = undefined
      noticeTone = undefined

      if (action.type === 'quit') {
        app.quit()
        return
      }
      if (action.type === 'agent') {
        const snapshot = runtime.snapshot()
        if (snapshot.phase === 'ready' && snapshot.url) await openHarness(snapshot.url)
        return
      }
      if (action.type === 'restart') {
        await launchHarness()
        void mobileBridge.start().catch(showUnexpectedError)
        return
      }

      const installedSet = new Set(installed)
      const selected = [...new Set(action.plugins)].filter((plugin) => installedSet.has(plugin))
      if (selected.length === 0) {
        notice = isChinese ? '请选择要卸载的插件。' : 'Select at least one plugin to remove.'
        noticeTone = 'error'
        continue
      }

      const failed: string[] = []
      for (const plugin of selected) {
        if (!(await removeSafeModePlugin(dshHome, plugin))) failed.push(plugin)
      }
      notice = failed.length === 0
        ? isChinese
          ? `成功卸载 ${selected.length} 个插件。`
          : `Successfully removed ${selected.length} plugin${selected.length === 1 ? '' : 's'}.`
        : isChinese
          ? `以下插件未能卸载：${failed.join('、')}`
          : `These plugins could not be removed: ${failed.join(', ')}`
      noticeTone = failed.length === 0 ? 'success' : 'error'
    }
  } finally {
    safeModeActionResolver = undefined
    safeModeManagerVisible = false
    const window = safeModeManagerWindow
    safeModeManagerWindow = undefined
    if (window && !window.isDestroyed()) window.close()
  }
}

function installMenu(): void {
  const isChinese = harnessLocale() === 'zh'
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
          label: isChinese ? '以安全模式重启…' : 'Restart as Safe Mode…',
          click: () => void showSafeMode().catch(showUnexpectedError)
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
  nativeTheme.themeSource = harnessThemePreference()
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
  if (!startInSafeMode) void mobileBridge.start().catch(showUnexpectedError)
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
  ipcMain.removeHandler('safe-mode:action')
  ipcMain.handle('safe-mode:action', (event, action: unknown, plugins: unknown) => {
    assertTrustedSafeModeManagerEvent(event)
    if (
      !safeModeVisible ||
      !safeModeManagerVisible ||
      (action !== 'uninstall' && action !== 'agent' && action !== 'restart' && action !== 'quit')
    ) {
      return { ok: false }
    }
    if (action === 'uninstall') {
      if (!Array.isArray(plugins) || !plugins.every((plugin) => typeof plugin === 'string')) {
        return { ok: false }
      }
      resolveSafeModeAction({ type: 'uninstall', plugins })
    } else {
      resolveSafeModeAction({ type: action })
    }
    return { ok: true }
  })
  ipcMain.removeHandler('safe-mode:status')
  ipcMain.handle('safe-mode:status', (event) => {
    assertTrustedMainWindowEvent(event)
    return { active: safeModeVisible, locale: harnessLocale() }
  })
  ipcMain.removeHandler('safe-mode:manage')
  ipcMain.handle('safe-mode:manage', (event) => {
    assertTrustedMainWindowEvent(event)
    if (!safeModeVisible) return { ok: false }
    void showSafeModeManager().catch(showUnexpectedError)
    return { ok: true }
  })
  ipcMain.removeHandler('safe-mode:exit')
  ipcMain.handle('safe-mode:exit', (event) => {
    assertTrustedMainWindowEvent(event)
    if (!safeModeVisible) return { ok: false }
    resolveSafeModeAction({ type: 'agent' })
    void launchHarness().then(() => mobileBridge.start()).catch(showUnexpectedError)
    return { ok: true }
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
  if (startInSafeMode) {
    void showSafeMode().catch(showUnexpectedError)
  } else {
    await launchHarness()
  }
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

if (isDaemonLaunch(process.env, process.platform)) {
  // launchd started this bundle from a LaunchAgent instead of the user
  // opening the app. Requesting the single instance lock here would reach
  // the running app's second-instance handler, which raises and focuses
  // its window as though the user had asked for it, so leave first.
  app.exit(0)
} else {
  configureAppIdentity()
  configureApplicationLocale()
  const singleInstance = app.requestSingleInstanceLock()
  if (!singleInstance) {
    app.quit()
  } else {
    app.on('second-instance', (_event, argv) => {
      if (!isUserInitiatedInstance(argv)) return
      if (shouldStartInSafeMode(argv)) {
        void showSafeMode().catch(showUnexpectedError)
        return
      }
      const snapshot = runtime?.snapshot()
      if (snapshot?.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url, 'user').catch(showUnexpectedError)
      }
    })
    app.whenReady().then(bootstrap).catch((error: unknown) => {
      showUnexpectedError(error)
      app.quit()
    })
    app.on('activate', () => {
      if (safeModeVisible && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
        return
      }
      const snapshot = runtime?.snapshot()
      if (snapshot?.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url, 'user').catch(showUnexpectedError)
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
}
