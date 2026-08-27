import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { isAbsolute, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { parse } from 'yaml'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  protocol,
  session,
  shell,
  type BrowserWindowConstructorOptions
} from 'electron'
import {
  extractDuplicateLoaderEntryId,
  extractFailureCause,
  extractPluginFailureReferences,
  extractSlotConflictName,
  HarnessRuntime
} from './runtime/harness-runtime'
import { removeProfilePluginWithDsh } from './runtime/profile-plugin-command'
import { secureWindow } from './security'
import { ensureLaunchRoot } from './state/launch-root'
import {
  resetPluginProfile,
  resolveProfileRecoveryPlugins,
  uninstallPluginFromProfile
} from './state/plugin-recovery'
import { isAbortedNavigationError, shouldLoadHarnessUrl } from './window-navigation'
import {
  checkForUpdates,
  registerUpdateHandlers,
  startUpdateManager,
  stopUpdateManager
} from './update/update-manager'
import type { RuntimeSnapshot } from '../shared/contracts'
import { resolveHarnessLocale } from './application-locale'
import { installContextMenu } from './context-menu'
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from './developer-mode-state'
import {
  WINDOWS_TITLEBAR_HEIGHT,
  isDesktopMenuCommand,
  type DesktopMenuCommand
} from '../shared/desktop-menu'
import { developerModeArgument } from '../shared/developer-mode'
import { appVersionArgument } from '../shared/app-info'
import { buildPluginRecoveryViewModel } from './plugin-recovery-view'
import { resolveDesktopIdentity } from './app-identity'
import { migrateLegacyUserData } from './app-data-migration'
import { installBundledPluginProfile } from './bundled-plugin-profile'
import { synchronizeBundledESkillOverrides } from './bundled-skill-sync'
import {
  configureBrowserSearchSecurity,
  type BrowserSearchWindow
} from './search/browser-search-controller'
import { isAllowedSearchLocation } from './search/search-engines'
import {
  startLocalSearchRuntime,
  type LocalSearchRuntime
} from './search/local-search-runtime'
import { ResearchCanvasStorage } from './state/research-canvas-storage'
import {
  assertTrustedMainWindowEvent,
  registerPrivilegedMainWindowHandlers
} from './ipc-trust'
import {
  FileResearchPreviewAuthorizationStorage,
  HarnessWorkspaceFileResolver,
  RESEARCH_PREVIEW_SCHEME,
  ResearchFilePreviewRegistry,
  registerResearchFilePreviewHandlers
} from './state/research-file-preview'

protocol.registerSchemesAsPrivileged([{
  scheme: RESEARCH_PREVIEW_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}])

type PluginRecoveryAction = 'uninstall' | 'show-log' | 'quit' | 'restart'

const PLUGIN_RECOVERY_ACTIONS = new Set<PluginRecoveryAction>([
  'uninstall',
  'show-log',
  'quit'
])

let mainWindow: BrowserWindow | undefined
let runtime: HarnessRuntime
let localSearchRuntime: LocalSearchRuntime | undefined
let launchDirectory: string
let quitting = false
let failureRecoveryVisible = false
let harnessLaunchOperation: Promise<void> | undefined
let pluginRecoveryActionResolver: ((action: PluginRecoveryAction) => void) | undefined
let mainWindowNavigationVersion = 0
let rendererPluginFailureLogs: string[] = []
let pluginRecoveryRemovedPlugins: string[] = []
let pluginRecoveryResetTimer: ReturnType<typeof setTimeout> | undefined
let harnessThemePreferenceSyncTimer: ReturnType<typeof setInterval> | undefined
let researchFilePreviewRegistry: ResearchFilePreviewRegistry | undefined

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

function resolveDesktopChannel(): 'development' | 'legacy' | 'legacy-bridge' | 'notarized' {
  if (!app.isPackaged) return 'development'

  try {
    const metadata = JSON.parse(
      readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')
    ) as { dshDesktopChannel?: unknown }
    if (
      metadata.dshDesktopChannel === 'development' ||
      metadata.dshDesktopChannel === 'notarized' ||
      metadata.dshDesktopChannel === 'legacy-bridge' ||
      metadata.dshDesktopChannel === 'legacy'
    ) {
      return metadata.dshDesktopChannel
    }
    return 'legacy'
  } catch {
    return 'legacy'
  }
}

const desktopChannel = resolveDesktopChannel()
const developmentBuild = desktopChannel === 'development'

function windowsTitleBarOverlay(isDark: boolean): Electron.TitleBarOverlayOptions {
  return {
    color: '#00000000',
    symbolColor: isDark ? '#f3f4f6' : '#202124',
    height: WINDOWS_TITLEBAR_HEIGHT
  }
}

function startHarnessThemePreferenceSync(): void {
  if (harnessThemePreferenceSyncTimer) return
  const sync = (): void => {
    const preference = harnessThemePreference()
    if (nativeTheme.themeSource !== preference) nativeTheme.themeSource = preference
  }
  sync()
  harnessThemePreferenceSyncTimer = setInterval(sync, 250)
  harnessThemePreferenceSyncTimer.unref?.()
}

function stopHarnessThemePreferenceSync(): void {
  if (harnessThemePreferenceSyncTimer) clearInterval(harnessThemePreferenceSyncTimer)
  harnessThemePreferenceSyncTimer = undefined
}

function applyWindowChromeTheme(window: BrowserWindow, isDark: boolean): void {
  if (window.isDestroyed()) return
  if (process.platform === 'darwin') {
    window.setBackgroundColor('#00000000')
    window.setVibrancy('menu')
    return
  }

  window.setBackgroundColor(isDark ? '#141416' : '#ffffff')
  if (process.platform === 'win32') {
    window.setTitleBarOverlay(windowsTitleBarOverlay(isDark))
  }
}

function configureAppIdentity(): void {
  // Keep the historical lowercase directory stable across product-name and
  // branding changes. Harness stores workspaces, sessions, credentials, and
  // custom presets below userData, so deriving this path from app.getName()
  // would make an ordinary upgrade look like a fresh installation.
  const explicitAppDataPath = app.commandLine.getSwitchValue('sherlock-app-data-dir').trim()
  if (explicitAppDataPath && !isAbsolute(explicitAppDataPath)) {
    throw new Error('The Sherlock app-data path must be absolute.')
  }
  const appDataPath = explicitAppDataPath ? normalize(explicitAppDataPath) : app.getPath('appData')
  if (explicitAppDataPath) app.setPath('appData', appDataPath)
  const explicitUserDataPath = app.commandLine.getSwitchValue('sherlock-user-data-dir')
  const identity = resolveDesktopIdentity(appDataPath, desktopChannel, explicitUserDataPath)
  if (
    !explicitUserDataPath &&
    (desktopChannel === 'legacy-bridge' || desktopChannel === 'notarized')
  ) {
    try {
      migrateLegacyUserData(join(appDataPath, 'dsh-desktop'), identity.userData)
    } catch (error) {
      console.warn('[desktop] failed to migrate legacy Sherlock user data', error)
    }
  }
  app.setName(identity.name)
  app.setPath('userData', identity.userData)
  if (app.isPackaged) {
    try {
      const agentsHome = resolve(
        process.env.DSH_AGENTS_HOME?.trim() || join(homedir(), '.agents')
      )
      const result = synchronizeBundledESkillOverrides({
        bundledSkillDirectory: join(process.resourcesPath, 'sherlock-skills'),
        overrideSkillDirectories: [
          join(identity.userData, 'harness', 'skills'),
          join(agentsHome, 'skills')
        ]
      })
      for (const upgrade of result.upgraded) {
        console.info(
          `[desktop] upgraded official skill ${upgrade.slug} from ${upgrade.fromVersion} to ${upgrade.toVersion}`
        )
      }
    } catch (error) {
      console.warn('[desktop] failed to synchronize bundled Sherlock skills', error)
    }

    const bundledProfilePath = join(process.resourcesPath, 'sherlock-plugin-profile')
    try {
      const result = installBundledPluginProfile({
        userDataPath: identity.userData,
        bundledProfilePath,
        appVersion: app.getVersion()
      })
      if (result.installed) {
        console.info('[desktop] installed bundled Sherlock plugin profile', result.plugins)
      }
    } catch (error) {
      console.error('[desktop] failed to install bundled Sherlock plugin profile', error)
      throw error
    }
  }
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
            right: 'max(220px, var(--dsh-sidebar-width, 0px))',
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

function bundledSkillDirectory(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'sherlock-skills')
    : join(app.getAppPath(), 'skills')
}

function bundledWebSearchEntry(): string {
  return pathToFileURL(
    join(app.getAppPath(), 'node_modules', 'dsh-web-search-session-model', 'index.js')
  ).href
}

function bundledMarketInstallerEntry(): string {
  return pathToFileURL(
    join(app.getAppPath(), 'node_modules', 'dsh-desktop-market-installer', 'index.js')
  ).href
}

function desktopIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'build', 'app-icon.png')
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
  const isMacOS = process.platform === 'darwin'
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
    ...(isMacOS
      ? {
          vibrancy: 'menu' as const,
          visualEffectState: 'active' as const,
          backgroundColor: '#00000000'
        }
      : {
          backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#f8f8f6'
        }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      additionalArguments: [
        developerModeArgument(isDeveloperModeEnabled(app.getPath('userData'))),
        appVersionArgument(app.getVersion())
      ],
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
    const message = details.message.trim()
    if (!message) return
    rendererPluginFailureLogs.push(`[stderr] ${message}`)
    rendererPluginFailureLogs = rendererPluginFailureLogs.slice(-50)
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

function createLocalSearchWindow(
  options: BrowserWindowConstructorOptions
): BrowserSearchWindow {
  const window = new BrowserWindow(options)
  const owner = mainWindow
  const closeWithOwner = (): void => {
    if (!window.isDestroyed()) window.destroy()
  }
  owner?.once('closed', closeWithOwner)
  window.once('closed', () => {
    owner?.removeListener('closed', closeWithOwner)
  })
  const partition = options.webPreferences?.partition
  if (!partition) throw new Error('Local search browser requires an isolated partition.')
  configureBrowserSearchSecurity(window, session.fromPartition(partition))
  window.on('page-title-updated', (event) => {
    event.preventDefault()
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (
      isAllowedSearchLocation('bing', url) ||
      isAllowedSearchLocation('duckduckgo', url)
    ) {
      return
    }
    event.preventDefault()
  })
  return window
}

async function openHarness(url: string): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow()
  if (shouldLoadHarnessUrl(window.webContents.getURL(), url)) {
    const navigationVersion = ++mainWindowNavigationVersion
    rendererPluginFailureLogs = []
    window.webContents.stop()
    try {
      await window.loadURL(url)
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

function launchHarness(): Promise<void> {
  if (harnessLaunchOperation) return harnessLaunchOperation

  harnessLaunchOperation = (async () => {
    await showSplash()
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
  const researchCanvasStorage = new ResearchCanvasStorage(app.getPath('userData'))

  ipcMain.removeHandler('harness:restart')
  ipcMain.handle('harness:restart', async (event) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    if (runtime.snapshot().phase !== 'ready') {
      throw new Error('Harness is not ready to restart.')
    }

    await restartHarness()
    return { ok: runtime.snapshot().phase === 'ready' }
  })

  ipcMain.removeHandler('desktop-menu:execute')
  ipcMain.handle('desktop-menu:execute', async (event, command: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    if (!isDesktopMenuCommand(command)) {
      throw new Error('Unknown Sherlock menu command.')
    }
    await executeDesktopMenuCommand(command)
    return { ok: true }
  })

  ipcMain.removeHandler('desktop-titlebar:set-theme')
  ipcMain.handle('desktop-titlebar:set-theme', (event, isDark: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    if (typeof isDark !== 'boolean') {
      throw new Error('The Sherlock titlebar theme must be a boolean.')
    }
    if (
      (process.platform === 'win32' || process.platform === 'darwin') &&
      mainWindow
    ) {
      applyWindowChromeTheme(mainWindow, isDark)
    }
    return { ok: true }
  })

  registerPrivilegedMainWindowHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    showHarnessLog: () => {
      shell.showItemInFolder(join(app.getPath('logs'), 'harness.log'))
    },
    openDirectory: async () => {
      const window = mainWindow
      if (!window) throw new Error('The main Sherlock window is unavailable.')
      const result = await dialog.showOpenDialog(window, {
        title: harnessLocale() === 'zh' ? '选择工作区目录' : 'Select Workspace Directory',
        properties: ['openDirectory', 'createDirectory']
      })
      return result.canceled ? null : result.filePaths[0] ?? null
    },
    showItemInFolder: (path: unknown) => {
      if (typeof path !== 'string' || !isAbsolute(path) || !existsSync(path)) {
        throw new Error('Finder reveal requires an existing absolute filesystem path.')
      }
      shell.showItemInFolder(path)
      return { ok: true }
    },
    researchFilesAvailable: async (paths: unknown) => {
      const rejected = Array.isArray(paths)
        ? Array.from({ length: Math.min(paths.length, 64) }, () => false)
        : []
      const values = Array.isArray(paths) ? Array.from(paths) : []
      if (
        !Array.isArray(paths) ||
        values.length > 64 ||
        values.some((path) =>
          typeof path !== 'string' || path.length === 0 || path.length > 512
        )
      ) {
        return rejected
      }
      return Promise.all(values.map((path) =>
        stat(path).then((value) => value.isFile()).catch(() => false)
      ))
    },
    researchCanvasStorageGet: (key: unknown) => researchCanvasStorage.getItem(key),
    researchCanvasStorageSet: (key: unknown, value: unknown) =>
      researchCanvasStorage.setItem(key, value),
    onStorageReadRejected: (error) =>
      console.warn('[research-canvas] rejected storage read', error),
    onStorageWriteRejected: (error) =>
      console.warn('[research-canvas] rejected storage write', error)
  })
  if (!researchFilePreviewRegistry) {
    throw new Error('Research preview registry is unavailable.')
  }
  registerResearchFilePreviewHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    registry: researchFilePreviewRegistry
  })
}

async function executeDesktopMenuCommand(command: DesktopMenuCommand): Promise<void> {
  const window = mainWindow
  if (!window || window.isDestroyed()) return
  const contents = window.webContents

  switch (command) {
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
      await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Sherlock',
        message: `Sherlock ${app.getVersion()}`,
        detail: 'A local-first desktop knowledge assistant.',
        buttons: ['OK'],
        noLink: true
      })
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
  dialog.showErrorBox('Sherlock encountered an error', message)
}

async function showPluginRecovery(options?: {
  message?: string
  logs?: readonly string[]
}): Promise<void> {
  if (failureRecoveryVisible || quitting) return
  failureRecoveryVisible = true

  const dshHome = join(app.getPath('userData'), 'harness')
  const isChinese = harnessLocale() === 'zh'
  cancelPluginRecoverySessionReset()
  const removedPlugins = pluginRecoveryRemovedPlugins
  let notice: string | undefined

  try {
    while (!quitting) {
      let snapshot = runtime.snapshot()
      const logs = options?.logs ?? snapshot.logs
      const message = options?.message ?? snapshot.message
      const offendingPlugins = await resolveProfileRecoveryPlugins(
        dshHome,
        extractPluginFailureReferences(logs),
        extractDuplicateLoaderEntryId(logs),
        extractSlotConflictName(logs),
        removedPlugins
      )
      const action = await waitForPluginRecoveryAction({
        snapshot: {
          ...snapshot,
          message: message || snapshot.message
        },
        plugins: offendingPlugins,
        removedPlugins,
        notice
      })
      notice = undefined

      if (action === 'uninstall' && offendingPlugins.length > 0) {
        const failedPlugins: string[] = []
        for (const plugin of offendingPlugins) {
          const removed = await uninstallPluginFromProfile(dshHome, plugin, async (pluginName) => {
            const result = await removeProfilePluginWithDsh(
              {
                dshHome,
                dshEntryPath: dshEntryPath(),
                nodeExecutablePath: bundledNodePath(),
                pnpmEntryPath: bundledPnpmEntryPath(),
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

        if (failedPlugins.length === offendingPlugins.length) {
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
        if (runtime.snapshot().phase === 'ready') {
          schedulePluginRecoverySessionReset()
          return
        }
        continue
      } else if (action === 'restart') {
        await launchHarness()
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
              { role: 'about' as const },
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

async function bootstrap(): Promise<void> {
  if (process.platform === 'darwin') app.dock?.setIcon(desktopIconPath())
  launchDirectory = await ensureLaunchRoot(app.getPath('userData'))
  registerUpdateHandlers(() => mainWindow)
  if (process.platform === 'darwin') startHarnessThemePreferenceSync()
  const dshHome = join(app.getPath('userData'), 'harness')
  researchFilePreviewRegistry = new ResearchFilePreviewRegistry({
    storage: new FileResearchPreviewAuthorizationStorage(app.getPath('userData')),
    workspaceResolver: new HarnessWorkspaceFileResolver(dshHome)
  })
  protocol.handle(
    RESEARCH_PREVIEW_SCHEME,
    (request) => researchFilePreviewRegistry!.handle(request)
  )
  createWindow()
  localSearchRuntime = await startLocalSearchRuntime({
    createWindow: createLocalSearchWindow
  })
  runtime = new HarnessRuntime({
    dshEntryPath: dshEntryPath(),
    nodeExecutablePath: bundledNodePath(),
    nodeEntryPath: harnessNodeEntryPath(),
    dshPatchPath: desktopResourcePath('dsh-desktop.patch.yml'),
    bundledSkillDirectory: bundledSkillDirectory(),
    bundledWebSearchEntry: bundledWebSearchEntry(),
    bundledMarketInstallerEntry: bundledMarketInstallerEntry(),
    localSearchUrl: localSearchRuntime.endpoint.url,
    localSearchToken: localSearchRuntime.endpoint.token,
    dshHome,
    logPath: join(app.getPath('logs'), 'harness.log'),
    launchProcess: (executablePath, args, options) => spawn(executablePath, args, options),
    onChanged: (snapshot) => {
      if (snapshot.phase === 'ready' && snapshot.url) {
        void openHarness(snapshot.url).catch(showUnexpectedError)
      } else if (snapshot.phase === 'failed') {
        void showRuntimeFailure(snapshot)
      }
    }
  })
  registerHarnessHandlers()
  ipcMain.handle('developer-mode:set-enabled', (event, enabled: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    if (typeof enabled !== 'boolean') {
      throw new Error('Developer mode state must be a boolean.')
    }
    setDeveloperModeEnabled(app.getPath('userData'), enabled)
    return { ok: true }
  })
  ipcMain.removeHandler('harness:open-recovery')
  ipcMain.handle('harness:open-recovery', async (event, frontendErrorMessage?: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    const message = typeof frontendErrorMessage === 'string' ? frontendErrorMessage : undefined
    const logs = [
      ...rendererPluginFailureLogs,
      ...(message ? [`[stderr] ${message}`] : [])
    ]
    appendRendererPluginRecoveryLog(logs)
    void showPluginRecovery({ message, logs })
    return { ok: true }
  })
  ipcMain.removeHandler('recovery:action')
  ipcMain.handle('recovery:action', (event, action: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
    if (typeof action === 'string' && PLUGIN_RECOVERY_ACTIONS.has(action as PluginRecoveryAction)) {
      resolvePluginRecoveryAction(action as PluginRecoveryAction)
      return { ok: true }
    }
    return { ok: false }
  })
  ipcMain.removeHandler('harness:reset-plugins')
  ipcMain.handle('harness:reset-plugins', async (event, pluginName?: unknown) => {
    assertTrustedMainWindowEvent(event, mainWindow)
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
        await localSearchRuntime?.stop()
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
  app.whenReady().then(bootstrap).catch(async (error: unknown) => {
    showUnexpectedError(error)
    await localSearchRuntime?.stop()
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
    stopHarnessThemePreferenceSync()
    stopUpdateManager()
    void Promise.all([runtime.stop(), localSearchRuntime?.stop()]).finally(() => app.quit())
  })
}
