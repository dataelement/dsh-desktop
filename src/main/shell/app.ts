import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, protocol, session, shell, Tray, type IpcMainInvokeEvent, type MenuItemConstructorOptions } from 'electron'
import { DesktopStorageManager } from '../profile/desktop-storage'
import { prepareGenerationsForLaunch } from '../profile/generation-launch'
import { FATAL_REPORT_NAME, recordFatalFailure, redactFatalText } from '../recovery/fatal-entry'
import { migrateWebProfile } from '../profile/profile-rename'
import { appBundlePathFromExecutable, quarantineAppBundleLaunchAgents } from '../desktop-service/launch-agent-audit'
import { DESKTOP_SCHEME, installDesktopProtocol } from '../desktop-protocol'
import { normalRelaunchArguments, relaunchArguments, shouldStartInSafeMode } from '../safe-mode'
import { RepairDrafts } from '../repair-drafts'
import { RepairAgentService } from '../repair-agent'
import { RepairSessionStore } from '../recovery/repair-agent-sessions'
import { LanMobileBridge } from '../mobile/lan-mobile-bridge'
import { createFilePairingPinStore, pairingPinStorePath } from '../mobile/pairing-pin-store'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../recovery/safe-mode-profile'
import { checkForUpdates, getUpdateStatus, registerUpdateHandlers, startUpdateManager } from '../update/update-manager'
import { aboutDetail, bundledHarnessVersion } from '../version-info'
import {
  chosenHarnessLocale,
  explicitHarnessLocale,
  localePreferenceFromProfilePatch,
  localePreferenceFromSettings,
  resolveHarnessLocale,
  selectHarnessLocale,
  type HarnessLocale
} from '../application-locale'
import { defaultWebHome, type WebHomePreview } from '../profile/web-home-import'
import { developmentEnvironment } from '../development-environment'
import { resolveDesktopIdentity } from './product-identity'
import { desktopBrandLogoPaths } from './brand-logo'
import { workspaceDirectoryPrompt } from './directory-picker'
import { desktopWindowChrome } from './window-chrome'
import { buildWebImportViewModel } from '../web-import-view'
import { DesktopBackendController } from './backend/backend-controller'
import { DesktopBootSession, retainDesktopBoot } from './backend/boot-session'
import { DesktopHostFatalError, DesktopHostProcess } from './backend/host-process'
import { readDesktopLoginShellEnvironment, resolveDesktopLoginShellConfig } from './backend/login-shell-environment'
import { attachDesktopStorage } from './desktop-storage-bridge'
import { ENTERPRISE_URL, aboutUsesPage, buildDarwinDesktopMenu, externalUrlToOpen, insertFileMenu, shortcutFileMenuLabels } from './enterprise-menu'
import { installDesktopShortcuts, type DesktopShortcutController } from './keyboard'
import { installDesktopFileDrag } from './file-drag'
import { runQuitSteps } from './quit-steps'
import { SidebarBrowserGuests } from '../sidebar-browser'
import { SIDEBAR_BROWSER_IPC } from '../../shared/sidebar-browser'
import { officeLaunchPaths } from './office-launch'
import { isSplashPageUrl } from './splash-page'
import { isWebImportPageUrl, offerWebHomeImport, readWebImportAction, type WebImportChoice } from './web-import-offer'
import { resolveDesktopPaths } from './paths'
import { writeDesktopProductPatch } from './product-patch'
import {
  desktopMobilePort,
  hostSessionCookie,
  loopbackHarnessOrigin,
  SAFE_MODE_RENDERER_FLAG
} from './mobile-pairing'
import { presentMobilePairing } from './mobile-window'
import { DESKTOP_PROFILE } from './safe-mode-page'
import { isStartupRecoveryPageUrl, readStartupRecoveryNavigation, startupRecoveryTargets } from './startup-recovery'
import { runStartupRecovery } from './startup-recovery-session'
import { OperationJournal } from './operation-journal'
import { pluginOperationDirectory, readRecentPluginOperations } from './plugin-operations'
import { pruneCrashReports, RendererConsoleTail, writeCrashReport, type CrashReportSource } from './crash-report'
import { runOperationReportJob, type OperationReportJobResult } from './operation-report-job'
import { evaluatePluginMarketCompatibility, type PluginHealthReport } from '../recovery/plugin-market-check'
import { listInstalledProfilePlugins } from '../recovery/plugin-recovery'
import { upgradePluginToGeneration } from '../profile/plugin-upgrade'
import {
  cleanupVerifiedRemovalBackup,
  resolvePluginRemovalBackup,
  restorePluginRemovalBackup,
  snapshotPluginRemovalLedger
} from '../profile/plugin-removal'
import { electronNodeExecutable } from './backend/electron-node-executable'
import { installedPluginVersion, pnpmEntryPath, upgradeTargets } from './plugin-maintenance'
import { applyRepairNavigation, safeModeRepairPrompt, sidebarRepairPrompt } from './repair-session'
import { runSafeModeManager } from './safe-mode-manager'
import { DESKTOP_IPC, PLATFORM_IPC, SCHEME, assertDesktopSender } from './window/ipc'
import { DesktopPlatformView, platformBounds } from './window/platform-view'
import { authenticateWebHost, dispatchAppDocument } from './window/web-document'
import { desktopFileUrl } from '../desktop-navigation'
import {
  applyPersistedGpuFallback,
  attachBackgroundClose,
  attachMainWindowRecovery,
  DesktopStability,
  handleDesktopHostFailure,
  type PageRecovery
} from './stability-session'

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    codeCache: true
  }
}, {
  scheme: DESKTOP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
    codeCache: true
  }
}])

function readDesktopPackageMetadata(): unknown {
  try {
    return JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8'))
  } catch (error) {
    // Identity must never silently fall back to a different data directory.
    throw new Error('Unable to read Desktop product identity metadata.', { cause: error })
  }
}

function configureDesktopIdentity(): void {
  const identity = resolveDesktopIdentity(readDesktopPackageMetadata(), app.isPackaged, app.getPath('appData'))
  app.setName(identity.name)
  app.setPath('userData', identity.userData)
}

configureDesktopIdentity()
app.setAppLogsPath()
applyPersistedGpuFallback(app.getPath('userData'), app.commandLine, () => { app.disableHardwareAcceleration() })

let quitting = false
let pageRecovery: PageRecovery | undefined
let windowsTray: Tray | undefined
let backendReady = false
let acceptRecoveryNavigation: ((url: string) => void) | undefined
const rendererConsole = new RendererConsoleTail()
let activeOperationJournal: OperationJournal | undefined
let operationReportJob: Promise<OperationReportJobResult> | undefined
let operationReportAbort: AbortController | undefined
let operationReportsStopping = false

function harnessHome(): string {
  return join(app.getPath('userData'), 'harness')
}

async function reportFatal(error: unknown, source: CrashReportSource = 'host'): Promise<void> {
  const message = redactFatalText(error instanceof Error && error.message.length > 0 ? error.message : 'Desktop host failed')
  console.error(error)
  let saved = false
  try {
    await recordFatalFailure(harnessHome(), error)
    saved = true
  } catch (failure) {
    console.error(failure)
  }
  const crashPath = await persistCrashReport(error, source)
  const parent = BrowserWindow.getFocusedWindow() ?? undefined
  const chinese = app.getLocale().toLowerCase().startsWith('zh')
  const crashNote = crashPath === undefined ? '' : `\n${chinese ? '崩溃记录：' : 'Crash log: '}${crashPath}`
  const detail = (saved ? 'The desktop host stopped. A recovery report was saved.' : 'The desktop host stopped.') + crashNote
  const alreadySafe = process.env.DSH_DESKTOP_SAFE_MODE === '1' || shouldStartInSafeMode(process.argv)
  const box = {
    type: 'error' as const,
    message,
    detail,
    buttons: alreadySafe
      ? [chinese ? '关闭' : 'Close']
      : [chinese ? '以安全模式重启' : 'Restart as Safe Mode', chinese ? '关闭' : 'Close'],
    defaultId: 0,
    cancelId: alreadySafe ? 0 : 1,
    noLink: true
  }
  const result = await (parent === undefined ? dialog.showMessageBox(box) : dialog.showMessageBox(parent, box)).catch((failure: unknown) => {
    console.error(failure)
    return undefined
  })
  if (!alreadySafe && result?.response === 0) restartInSafeMode()
}

async function persistCrashReport(error: unknown, source: CrashReportSource): Promise<string | undefined> {
  let directory: string
  try {
    directory = app.getPath('logs')
  } catch (failure) {
    console.error(failure)
    return undefined
  }
  const planned = !quitting && !operationReportsStopping
  const path = await writeCrashReport(directory, {
    operationHistoryPlanned: planned,
    source,
    phase: backendReady ? 'running' : 'startup',
    error,
    ...(error instanceof DesktopHostFatalError && error.diagnostic !== undefined ? { hostDiagnostic: error.diagnostic } : {}),
    rendererConsole: rendererConsole.snapshot(),
    app: {
      name: app.name,
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron ?? '',
      node: process.versions.node,
      locale: app.getLocale()
    },
    time: new Date()
  })
  if (path !== undefined && planned && operationReportJob === undefined) {
    operationReportAbort = new AbortController()
    operationReportJob = runOperationReportJob({
      reportPath: path,
      directory: pluginOperationDirectory(app.getPath('userData')),
      limits: { bytes: 64 * 1024, recordBytes: 4096, records: 100, outputBytes: 64 * 1024 },
      journal: activeOperationJournal?.status() ?? null
    }, { timeoutMs: 500, cancellationGraceMs: 100 }, operationReportAbort.signal)
    void operationReportJob.finally(() => {
      operationReportJob = undefined
      operationReportAbort = undefined
    })
  }
  return path
}

function stopOperationReports(): Promise<void> {
  operationReportsStopping = true
  operationReportAbort?.abort()
  const job = operationReportJob
  if (job === undefined) return Promise.resolve()
  return new Promise(resolve => {
    const timer = setTimeout(() => { resolve() }, 500)
    void job.finally(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function officeEnvironment(primaryRuntime: string): Record<string, string> {
  const office = officeLaunchPaths(primaryRuntime)
  if (office === undefined) return {}
  return {
    DSH_DESKTOP_OFFICE_RESOURCES: office.resources,
    DSH_DESKTOP_OFFICE_CLI: office.cli
  }
}

function restartInSafeMode(): void {
  app.relaunch({ args: relaunchArguments(process.argv) })
  app.quit()
}

function exitSafeMode(): void {
  delete process.env.DSH_DESKTOP_SAFE_MODE
  app.relaunch({ args: normalRelaunchArguments(process.argv) })
  app.quit()
}

function packagedPagePath(name: string): string {
  if (app.isPackaged) return join(process.resourcesPath, name)
  const fromApp = join(app.getAppPath(), 'build', name)
  if (existsSync(fromApp)) return fromApp
  return fileURLToPath(new URL(`../../build/${name}`, import.meta.url))
}

function createWindow(
  preload: string,
  importPage: string,
  splashPage: string,
  extraArguments: readonly string[]
): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 520,
    minHeight: 600,
    show: false,
    ...desktopWindowChrome(process.platform),
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: true,
      webviewTag: true,
      additionalArguments: [...extraArguments]
    }
  })
  window.webContents.on('console-message', details => {
    if (details.level !== 'error') return
    rendererConsole.push(`${details.sourceId}:${String(details.lineNumber)} ${details.message}`)
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    const external = externalUrlToOpen(url)
    if (external !== undefined) void shell.openExternal(external).catch((error: unknown) => { console.error(error) })
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (readStartupRecoveryNavigation(url) !== undefined) {
      event.preventDefault()
      acceptRecoveryNavigation?.(url)
      return
    }
    if (isStartupRecoveryPageUrl(url) || isWebImportPageUrl(url, importPage) || isSplashPageUrl(url, splashPage)) return
    let destination: URL
    try {
      destination = new URL(url)
    } catch {
      event.preventDefault()
      return
    }
    let current: URL | undefined
    try {
      current = new URL(window.webContents.getURL())
    } catch {
      current = undefined
    }
    if (destination.protocol !== `${SCHEME}:` && !(current !== undefined && destination.protocol === 'http:' && destination.origin === current.origin)) {
      event.preventDefault()
      const external = externalUrlToOpen(url)
      if (external !== undefined) void shell.openExternal(external).catch((error: unknown) => { console.error(error) })
    }
  })
  return window
}

async function presentAbout(window: BrowserWindow, locale: HarnessLocale): Promise<void> {
  const desktopVersion = app.getVersion()
  const harnessVersion = bundledHarnessVersion(app.getAppPath())
  if (aboutUsesPage(window.webContents.getURL(), SCHEME)) {
    window.webContents.send('desktop:show-about', {
      desktopVersion,
      harnessVersion: harnessVersion ?? (locale === 'zh' ? '未知' : 'Unknown'),
      locale
    })
    return
  }
  const result = await dialog.showMessageBox(window, {
    type: 'info',
    title: app.name,
    message: locale === 'zh' ? `关于 ${app.name}` : `About ${app.name}`,
    detail: aboutDetail(desktopVersion, harnessVersion, locale),
    buttons: [locale === 'zh' ? '检查更新' : 'Check for Updates', locale === 'zh' ? '关闭' : 'Close'],
    defaultId: 1,
    cancelId: 1,
    noLink: true
  })
  if (result.response === 0) await checkForUpdates(true)
}

async function showSplash(window: BrowserWindow, pagePath: string): Promise<void> {
  if (window.isDestroyed()) return
  if (!isSplashPageUrl(window.webContents.getURL(), pagePath) && !await loadDesktopPage(window, pathToFileURL(pagePath).href)) return
  if (!window.isDestroyed()) window.show()
}

async function loadDesktopPage(window: BrowserWindow, url: string): Promise<boolean> {
  try {
    if (pageRecovery === undefined) {
      await window.loadURL(url)
      return !window.isDestroyed()
    }
    return await pageRecovery.navigate(url)
  } catch (error: unknown) {
    console.error(error)
    return false
  }
}

function askWebImport(
  window: BrowserWindow,
  pagePath: string,
  preview: WebHomePreview,
  notice?: string
): Promise<WebImportChoice | undefined> {
  const state = buildWebImportViewModel({
    locale: app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
    preview,
    notice
  })
  let finish: (choice: WebImportChoice | undefined) => void = () => undefined
  const choice = new Promise<WebImportChoice | undefined>(resolve => {
    finish = value => {
      finish = () => undefined
      resolve(value)
    }
  })
  const onClosed = (): void => finish(undefined)
  window.once('closed', onClosed)
  ipcMain.removeHandler(DESKTOP_IPC.webImportAction)
  ipcMain.handle(DESKTOP_IPC.webImportAction, (event, action: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return { ok: false }
    if (!isWebImportPageUrl(event.sender.getURL(), pagePath)) return { ok: false }
    const parsed = readWebImportAction(action)
    if (parsed === undefined) return { ok: false }
    finish(parsed)
    return { ok: true }
  })
  return loadDesktopPage(window, desktopFileUrl(pagePath, {
    state: JSON.stringify(state),
    theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  })).then(loaded => {
    if (!loaded) {
      finish(undefined)
      return choice
    }
    window.show()
    return choice
  }).finally(() => {
    window.removeListener('closed', onClosed)
  })
}

/** Desktop language for the menu: the live choice, then the saved profile, then the machine language. */
async function savedDesktopMenuLocale(
  dshHome: string,
  safeMode: boolean,
  reported: HarnessLocale | undefined
): Promise<HarnessLocale> {
  const profileName = safeMode ? SAFE_MODE_PROFILE : 'desktop'
  const profilePreference = await readFile(join(dshHome, 'profiles', profileName, 'cordis.patch.yml'), 'utf8')
    .then(localePreferenceFromProfilePatch)
    .catch(() => undefined)
  const settingsPreference = await readFile(join(dshHome, 'settings.yaml'), 'utf8')
    .then(localePreferenceFromSettings)
    .catch(() => undefined)
  return selectHarnessLocale({
    reported,
    profilePreference,
    settingsPreference,
    preferredSystemLanguages: app.getPreferredSystemLanguages()
  })
}

async function main(): Promise<void> {
  const platform = process.platform
  if (platform !== 'darwin' && platform !== 'win32') {
    throw new Error('DSH Desktop supports only macOS and Windows.')
  }
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }
  // Overlap the GUI-session read with Electron startup and the splash. Windows keeps the registry environment.
  const loginShellAbort = new AbortController()
  const loginShell = readDesktopLoginShellEnvironment(
    process.env,
    resolveDesktopLoginShellConfig(process.env),
    { signal: loginShellAbort.signal }
  )
  app.on('will-quit', () => { loginShellAbort.abort() })
  await app.whenReady()
  let desktopWindow: BrowserWindow | undefined
  let reportedLocale: HarnessLocale | undefined
  let menuLocale: HarnessLocale = 'en'
  let restartDesktop = async (): Promise<boolean> => false
  registerUpdateHandlers({ locale: () => menuLocale })
  let shortcuts: DesktopShortcutController | undefined
  const dshHome = harnessHome()
  const safeMode = process.env.DSH_DESKTOP_SAFE_MODE === '1' || shouldStartInSafeMode(process.argv)
  menuLocale = await savedDesktopMenuLocale(dshHome, safeMode, reportedLocale)
  const refreshDarwinMenu = (): void => {
    if (process.platform !== 'darwin') return
    const template = insertFileMenu(buildDarwinDesktopMenu({
      locale: menuLocale,
      appName: app.name,
      openEnterprise: () => {
        void shell.openExternal(ENTERPRISE_URL).catch((error: unknown) => { console.error(error) })
      },
      showAbout: () => {
        const target = desktopWindow
        if (target === undefined || target.isDestroyed()) return
        void presentAbout(target, menuLocale).catch((error: unknown) => { console.error(error) })
      },
      checkForUpdates: () => {
        void checkForUpdates(true).catch((error: unknown) => { console.error(error) })
      },
      restart: () => { void restartDesktop() },
      ...(shouldStartInSafeMode(process.argv) || process.env.DSH_DESKTOP_SAFE_MODE === '1'
        ? {}
        : { restartSafeMode: () => { restartInSafeMode() } }),
      hide: () => { app.hide() },
      hideOthers: () => { Menu.sendActionToFirstResponder('hideOtherApplications:') },
      unhideAll: () => { Menu.sendActionToFirstResponder('unhideAllApplications:') },
      quit: () => { app.quit() }
    }), shortcuts?.fileMenu(shortcutFileMenuLabels(menuLocale)))
    Menu.setApplicationMenu(Menu.buildFromTemplate(template as MenuItemConstructorOptions[]))
  }
  refreshDarwinMenu()
  const development = !app.isPackaged
  // Product packages place the primary runtime at Resources/office-runtime/primary-runtime.
  const primaryRuntime = development
    ? process.env.DSH_DESKTOP_PRIMARY_RUNTIME_DIR
    : join(process.resourcesPath, 'office-runtime', 'primary-runtime')
  if (primaryRuntime === undefined || primaryRuntime === '') {
    throw new Error('dsh desktop: DSH_DESKTOP_PRIMARY_RUNTIME_DIR is required for an unpackaged launch')
  }
  const preload = fileURLToPath(new URL('../preload/app.cjs', import.meta.url))
  const importPage = packagedPagePath('web-import.html')
  const splashPage = packagedPagePath('splash.html')
  let mainWindow: BrowserWindow | undefined
  const window = createWindow(preload, importPage, splashPage, safeMode ? [SAFE_MODE_RENDERER_FLAG] : [])
  desktopWindow = window
  let stopRecoveredHost = async (): Promise<void> => {}
  let releaseRecoveredPage = async (): Promise<void> => {}
  const stability = new DesktopStability({
    platform: process.platform,
    userData: app.getPath('userData'),
    quitting: () => quitting,
    locale: () => menuLocale,
    note: line => { console.error(line) },
    stopHost: () => stopRecoveredHost(),
    releasePage: () => releaseRecoveredPage(),
    showMessageBox: options => window.isDestroyed() ? dialog.showMessageBox(options) : dialog.showMessageBox(window, options),
    flushDiagnostics: async () => { await activeOperationJournal?.drain(500) },
    relaunch: () => { app.relaunch() },
    quit: () => { app.quit() },
    probePage: async () => {
      const contents = window.webContents
      if (window.isDestroyed() || contents.isDestroyed() || contents.isCrashed() || !stability.harnessRendered) return false
      return await contents.executeJavaScript('document.readyState === "complete" && document.body !== null') === true
    }
  })
  stability.attachProcessWatch(app)
  app.on('child-process-gone', (_event, details) => {
    stability.handleGpuProcess({ type: details.type, reason: details.reason, exitCode: details.exitCode })
  })
  pageRecovery = attachMainWindowRecovery(window, stability, {
    onError: error => { stability.processRecovery.start('window') },
    note: line => { console.error(line) }
  })
  const showMainWindow = (): void => {
    if (window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
  const refreshWindowsTray = (): void => {
    if (process.platform !== 'win32') return
    const icon = packagedPagePath(app.isPackaged ? 'icon.png' : 'app-icon.png')
    if (!existsSync(icon)) return
    if (windowsTray === undefined || windowsTray.isDestroyed()) {
      windowsTray = new Tray(icon)
      windowsTray.on('click', showMainWindow)
    }
    windowsTray.setToolTip(app.name)
    windowsTray.setContextMenu(Menu.buildFromTemplate([
      { label: menuLocale === 'zh' ? `显示 ${app.name}` : `Show ${app.name}`, click: showMainWindow },
      { type: 'separator' },
      { label: menuLocale === 'zh' ? '退出' : 'Exit', click: () => { app.quit() } }
    ]))
  }
  refreshWindowsTray()
  let flushOnClose = (): void => {}
  attachBackgroundClose(window, {
    platform: process.platform,
    quitting: () => quitting || stability.isQuitting(),
    onClose: () => { flushOnClose() },
    onHidden: refreshWindowsTray
  })
  await showSplash(window, splashPage)
  mainWindow = window
  shortcuts = installDesktopShortcuts(
    () => mainWindow,
    app.getPath('userData'),
    process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux',
    refreshDarwinMenu
  )
  shortcuts.attach(window)
  refreshDarwinMenu()
  app.on('will-quit', () => { shortcuts?.dispose() })
  app.on('window-all-closed', () => { app.quit() })
  if (!safeMode) {
    const imported = await offerWebHomeImport({
      dshHome,
      webHome: defaultWebHome(),
      choose: (preview, notice) => askWebImport(window, importPage, preview, notice),
      onProgress: line => {
        if (window.isDestroyed()) return
        const script = `(() => { const node = document.getElementById('progress'); if (!node) return; node.textContent = ${JSON.stringify(line)}; node.classList.add('visible'); })()`
        void window.webContents.executeJavaScript(script).catch(() => undefined)
      }
    })
    if (imported === 'cancelled' || window.isDestroyed()) {
      app.quit()
      return
    }
    if (imported !== 'not-offered') await showSplash(window, splashPage)
  }
  await migrateWebProfile(dshHome)
  const productPatch = await writeDesktopProductPatch(dshHome, safeMode ? 'safe' : 'desktop')
  const paths = resolveDesktopPaths(dshHome)
  const projectDir = safeMode ? await ensureSafeModeProfile(dshHome, 'desktop') : paths.profile
  const desktopStorage = new DesktopStorageManager(projectDir, {
    onError: (error, context) => { console.error(`[desktop-storage] ${context}:`, error) }
  })
  if (!safeMode) await prepareGenerationsForLaunch(dshHome, line => { console.error(line) }, 'desktop')
  flushOnClose = () => { desktopStorage.flushSync() }
  const runtimeDir = app.getAppPath()
  const hostEntry = fileURLToPath(new URL('./host.js', import.meta.url))
  const frontend = join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist')
  attachDesktopStorage(ipcMain, desktopStorage, () => mainWindow?.webContents)
  const bootSession = new DesktopBootSession()
  bootSession.suspend()
  function hostUrl(): string | undefined {
    return bootSession.ready?.url
  }
  function hostCookie(): string | undefined {
    return bootSession.ready?.cookie
  }
  const sidebarBrowser = new SidebarBrowserGuests(() => loopbackHarnessOrigin(hostUrl()))
  sidebarBrowser.bind(window, (guest, name) => shortcuts?.attachGuest(window, guest, name) ?? (() => undefined))
  ipcMain.handle(SIDEBAR_BROWSER_IPC.acquire, (event, workspace: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('desktop browser: rejected sender')
    }
    assertDesktopSender(event, ['app'])
    return sidebarBrowser.acquire(event.sender, workspace)
  })
  ipcMain.handle(SIDEBAR_BROWSER_IPC.release, async (event, lease: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('desktop browser: rejected sender')
    }
    assertDesktopSender(event, ['app'])
    await sidebarBrowser.release(event.sender, lease)
  })
  // No account session is applied, so usage and top-up stay closed.
  const platformView = new DesktopPlatformView(
    preload,
    () => app.getLocale().toLowerCase().startsWith('zh') ? 'zh_CN' : 'en_US',
    platform,
    app.getVersion(),
    () => false
  )
  let startupRecoveryOpen = false
  async function presentStartupRecovery(owner: BrowserWindow, error: unknown): Promise<boolean> {
    const message = redactFatalText(error instanceof Error && error.message.length > 0 ? error.message : 'Desktop host failed')
    try {
      await recordFatalFailure(dshHome, error)
    } catch (failure) {
      console.error(failure)
    }
    const plugins = startupRecoveryTargets(message, await listInstalledProfilePlugins(dshHome, DESKTOP_PROFILE))
    if (plugins.length === 0 || owner.isDestroyed()) return false
    await persistCrashReport(error, 'host')
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const operationLines = await readRecentPluginOperations(pluginOperationDirectory(app.getPath('userData')), 12)
      .catch(() => [])
    owner.show()
    await runStartupRecovery({
      dshHome,
      profile: DESKTOP_PROFILE,
      message: message.length > 4_000 ? `${message.slice(0, 4_000)}\n…` : message,
      plugins,
      launchDirectory: projectDir,
      locale,
      operationLines,
      theme: nativeTheme.themeSource,
      show: url => {
        if (!owner.isDestroyed()) void loadDesktopPage(owner, url).catch((error: unknown) => { console.error(error) })
      },
      nextAction: () => new Promise(resolve => { acceptRecoveryNavigation = resolve }),
      relaunch: () => {
        app.relaunch({ args: normalRelaunchArguments(process.argv) })
        app.quit()
      },
      quit: () => { app.quit() },
      openLog: () => { void shell.openPath(join(dshHome, FATAL_REPORT_NAME)) },
      isQuitting: () => quitting || owner.isDestroyed()
    })
    return true
  }
  void pruneCrashReports(app.getPath('logs'))
  const operationJournal = new OperationJournal(pluginOperationDirectory(app.getPath('userData')), {
    segmentBytes: 256 * 1024,
    recordBytes: 4096,
    queuedBytes: 64 * 1024
  })
  activeOperationJournal = operationJournal
  let desktopHost: DesktopHostProcess | undefined
  let hostEnvironment: NodeJS.ProcessEnv = process.env
  const pendingHostFailures: unknown[] = []
  let drainingHostFailures = false
  async function drainHostFailures(): Promise<void> {
    drainingHostFailures = true
    try {
      while (pendingHostFailures.length > 0 && !quitting) {
        const failure = pendingHostFailures.shift()
        await handleDesktopHostFailure(failure, {
          quitting: () => quitting,
          safeMode,
          recoverConfiguration: () => stability.recoverStartupConfiguration({
            dshHome,
            profile: safeMode ? SAFE_MODE_PROFILE : 'desktop',
            environment: hostEnvironment,
            launchDirectory: projectDir,
            showOpenDialog: options => window.isDestroyed() ? dialog.showOpenDialog(options) : dialog.showOpenDialog(window, options),
            reveal: path => { shell.showItemInFolder(path) }
          }),
          restartHost: async () => {
            try {
              await backend.start(async () => {})
            } catch (error: unknown) {
              console.error(error)
            }
          },
          presentPluginRecovery: async current => {
            if (startupRecoveryOpen) return true
            startupRecoveryOpen = true
            try {
              const presented = await presentStartupRecovery(window, current)
              if (!presented) startupRecoveryOpen = false
              return presented
            } catch (error: unknown) {
              startupRecoveryOpen = false
              throw error
            }
          },
          reportFatal: current => reportFatal(current)
        })
      }
    } finally {
      drainingHostFailures = false
      if (pendingHostFailures.length > 0 && !quitting) void drainHostFailures()
    }
  }
  function enqueueHostFailure(failure: unknown): void {
    pendingHostFailures.push(failure)
    if (!drainingHostFailures) void drainHostFailures()
  }
  const backend = new DesktopBackendController(onFailure => {
    const host = new DesktopHostProcess({
      // Market installs re-exec this binary. The macOS Helper stays in Node mode;
      // launching the app's main executable opens a terminal.
      node: electronNodeExecutable(process.execPath),
      entry: hostEntry,
      runtimeDir,
      projectDir,
      dshHome,
      profile: safeMode ? SAFE_MODE_PROFILE : 'desktop',
      environment: {
        ...hostEnvironment,
        DSH_CLIENT_VERSION: app.getVersion(),
        DSH_DESKTOP_PATCH_FILE: productPatch,
        ...(safeMode ? {} : officeEnvironment(primaryRuntime))
      },
      primaryRuntime,
      onFailure,
      onPluginOperation: record => { operationJournal.enqueue(JSON.stringify(record)) }
    })
    desktopHost = host
    return {
      start: async () => {
        const generation = bootSession.capture()
        const ready = await host.start()
        if (ready.injections === undefined) throw new Error('Desktop Host did not provide boot injections')
        const cookie = await authenticateWebHost(ready.url)
        bootSession.publish(generation, { url: ready.url, injections: ready.injections, cookie })
      },
      stop: () => host.stop()
    }
  }, state => {
    retainDesktopBoot(bootSession, state.phase)
    if (state.phase !== 'error' || quitting) return
    enqueueHostFailure(state.failure)
  })
  const disposeFileDrag = installDesktopFileDrag(event => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('desktop file drag: rejected sender')
    }
    assertDesktopSender(event, ['app'])
    return window
  }, (address, signal) => desktopHost?.resolveDragResource(address, signal) ?? Promise.resolve(null))
  const startup = backend.start(async () => {
    const result = await loginShell
    hostEnvironment = result.environment
    if (result.failures.length > 0) {
      console.error(`[desktop] login shell: ${result.failures.map(item => `${item.shell} (${item.reason})`).join('; ')}`)
    }
  })
  bootSession.track(startup)
  installDesktopProtocol(name => packagedPagePath(name))
  protocol.handle(SCHEME, request => dispatchAppDocument(request, bootSession.documentTarget(frontend)))
  const assertMain = (event: IpcMainInvokeEvent): BrowserWindow => {
    assertDesktopSender(event, ['app'])
    if (mainWindow === undefined || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents
      || event.senderFrame === null || event.senderFrame !== mainWindow.webContents.mainFrame) {
      throw new Error('dsh desktop: rejected IPC from an unowned renderer')
    }
    return mainWindow
  }
  const iconPath = existsSync(packagedPagePath('app-icon.png')) ? packagedPagePath('app-icon.png') : undefined
  const brandLogos = desktopBrandLogoPaths([runtimeDir, primaryRuntime])
  async function explicitDesktopLocale(): Promise<HarnessLocale | undefined> {
    const profileName = safeMode ? SAFE_MODE_PROFILE : 'desktop'
    const profilePreference = await readFile(join(dshHome, 'profiles', profileName, 'cordis.patch.yml'), 'utf8')
      .then(localePreferenceFromProfilePatch)
      .catch(() => undefined)
    const settingsPreference = await readFile(join(dshHome, 'settings.yaml'), 'utf8')
      .then(localePreferenceFromSettings)
      .catch(() => undefined)
    return chosenHarnessLocale([reportedLocale, profilePreference, settingsPreference])
  }
  async function desktopLocale(): Promise<HarnessLocale> {
    return await explicitDesktopLocale()
      ?? resolveHarnessLocale(undefined, app.getPreferredSystemLanguages())
  }
  ipcMain.handle(DESKTOP_IPC.localeBootstrap, async event => {
    assertMain(event)
    return {
      languages: [...app.getPreferredSystemLanguages()],
      preference: await explicitDesktopLocale() ?? null
    }
  })
  ipcMain.on(DESKTOP_IPC.localeChanged, (event, locale: unknown) => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return
    const resolved = explicitHarnessLocale(locale)
    if (resolved === undefined || resolved === menuLocale) {
      if (resolved !== undefined) reportedLocale = resolved
      return
    }
    reportedLocale = resolved
    menuLocale = resolved
    refreshDarwinMenu()
    refreshWindowsTray()
    if (!window.isDestroyed()) {
      window.webContents.send('desktop:ui-locale', menuLocale)
      window.webContents.send('updates:status-changed', getUpdateStatus())
    }
  })
  ipcMain.handle(DESKTOP_IPC.directoryPick, async event => {
    assertMain(event)
    const locale = await desktopLocale()
    const prompt = workspaceDirectoryPrompt(locale)
    const result = await dialog.showOpenDialog(window, {
      title: prompt,
      message: prompt,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  let mobileWindow: BrowserWindow | undefined
  const mobileBridge = safeMode ? undefined : new LanMobileBridge({
    harnessUrl: () => loopbackHarnessOrigin(hostUrl()),
    harnessCookie: () => hostSessionCookie(hostCookie()),
    locale: () => app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
    ...(iconPath === undefined ? {} : { appIconPath: iconPath }),
    ...(brandLogos === undefined ? {} : { brandLogoPaths: brandLogos }),
    cloudflaredCacheDir: join(app.getPath('userData'), 'bin'),
    forceCloudflareFailure: process.env.DSH_TUNNEL_FORCE_PINGGY === '1',
    tunnelLog: message => { console.warn(message) },
    port: desktopMobilePort(app.isPackaged && !desktopDevelopmentBuild()),
    onReconnectRequested: () => {
      void openMobilePairing().catch((error: unknown) => { console.error(error) })
    },
    onConnectedChange: connected => {
      if (window.isDestroyed()) return
      window.webContents.send(DESKTOP_IPC.mobileStatusChanged, { connected })
    },
    pairingPinStore: createFilePairingPinStore(pairingPinStorePath(app.getPath('userData')))
  })
  stopRecoveredHost = async () => {
    await backend.stop()
    await mobileBridge?.stop()
  }
  releaseRecoveredPage = async () => {
    desktopStorage.flushSync()
    if (window.isDestroyed() || window.webContents.isDestroyed()) return
    window.webContents.stop()
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      window.loadURL('about:blank').catch((error: unknown) => { console.error(error) }),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 3000) })
    ]).finally(() => { if (timer !== undefined) clearTimeout(timer) })
  }
  async function openMobilePairing(): Promise<void> {
    if (mobileBridge === undefined) return
    const opened = await presentMobilePairing({
      bridge: mobileBridge,
      parent: window.isDestroyed() ? undefined : window,
      ...(mobileWindow === undefined ? {} : { current: mobileWindow }),
      locale: app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
      ...(iconPath === undefined ? {} : { iconPath }),
      hostReady: hostUrl() !== undefined
    })
    mobileWindow = opened
    opened?.on('closed', () => { if (mobileWindow === opened) mobileWindow = undefined })
  }
  if (mobileBridge !== undefined) {
    ipcMain.handle(DESKTOP_IPC.mobileOpen, event => {
      assertMain(event)
      return openMobilePairing()
    })
    ipcMain.handle(DESKTOP_IPC.mobileStatus, event => {
      assertMain(event)
      return { connected: mobileBridge.snapshot().connected }
    })
  }
  const repairDrafts = new RepairDrafts()
  const repairSessions = new RepairSessionStore(join(app.getPath('userData'), 'recovery'))
  const presetsDirectory = join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh-agent-presets', 'presets')
  const repairAgent = new RepairAgentService({
    harnessUrl: () => loopbackHarnessOrigin(hostUrl()),
    harnessAuthToken: () => undefined,
    harnessCookie: () => hostSessionCookie(hostCookie()),
    environment: () => safeMode ? 'safe' : 'normal',
    sessionStateDirectory: join(app.getPath('userData'), 'recovery'),
    ensureHarnessReady: async () => {},
    workspaceDirectory: dshHome,
    harnessLogPath: join(app.getPath('logs'), 'harness.log'),
    ...(existsSync(presetsDirectory) ? { shippedPresetsDirectory: presetsDirectory } : {}),
    locale: () => app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
    appVersion: () => app.getVersion()
  })
  let repairOpening: Promise<{ ok: boolean; error?: string }> | undefined
  function openRepairAgent(prompt: string, fresh: boolean): Promise<{ ok: boolean; error?: string }> {
    repairOpening ??= openRepairAgentNow(prompt, fresh).finally(() => { repairOpening = undefined })
    return repairOpening
  }
  async function openRepairAgentNow(prompt: string, fresh: boolean): Promise<{ ok: boolean; error?: string }> {
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    if (hostUrl() === undefined) {
      return { ok: false, error: locale === 'zh' ? '维修核心服务尚未就绪。' : 'The repair core is not ready yet.' }
    }
    const previous = safeMode ? undefined : await repairSessions.load('normal')
    const session = await repairAgent.initSession({ fresh })
    if (!session.ok || session.sessionId === undefined) {
      const detail = (session.error ?? '').split('\n').map(line => line.trim()).filter(line => line.length > 0).slice(0, 2).join(' ').slice(0, 240)
      return {
        ok: false,
        error: locale === 'zh'
          ? `无法打开智能修复 Agent 会话${detail.length > 0 ? `：${detail}` : '。'}`
          : `The repair agent session could not be opened${detail.length > 0 ? `: ${detail}` : '.'}`
      }
    }
    try {
      applyRepairNavigation({
        storage: desktopStorage,
        drafts: repairDrafts,
        sessionId: session.sessionId,
        prompt,
        rememberReturn: !safeMode,
        ...(previous?.sessionId === undefined ? {} : { previousSessionId: previous.sessionId })
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      return { ok: false, error: detail.slice(0, 240) }
    }
    if (!window.isDestroyed()) await loadDesktopPage(window, window.webContents.getURL())
    return { ok: true }
  }
  ipcMain.handle(DESKTOP_IPC.repairOpen, event => {
    assertMain(event)
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    return openRepairAgent(sidebarRepairPrompt(locale), true)
  })
  ipcMain.handle(DESKTOP_IPC.repairDraftGet, (event, sessionId: unknown) => {
    assertMain(event)
    return typeof sessionId === 'string' ? repairDrafts.get(sessionId) : {}
  })
  ipcMain.handle(DESKTOP_IPC.repairDraftAck, (event, sessionId: unknown, token: unknown) => {
    assertMain(event)
    return { ok: typeof sessionId === 'string' && typeof token === 'string' && repairDrafts.acknowledge(sessionId, token) }
  })
  ipcMain.handle(DESKTOP_IPC.boot, async event => {
    assertDesktopSender(event, ['app'])
    return bootSession.readBoot()
  })
  let restartingHarness = false
  restartDesktop = async () => {
    if (restartingHarness || quitting) return false
    restartingHarness = true
    try {
      await backend.stop()
      await backend.start(async () => {})
      setImmediate(() => {
        if (!window.isDestroyed()) void loadDesktopPage(window, window.webContents.getURL()).catch((error: unknown) => { console.error(error) })
      })
      return true
    } catch (error: unknown) {
      console.error(error)
      return false
    } finally {
      restartingHarness = false
    }
  }
  ipcMain.handle(DESKTOP_IPC.restartHarness, async event => {
    assertMain(event)
    return { ok: await restartDesktop() }
  })
  let waitForSafeModeAction: ((value: { action: unknown; selection: unknown }) => void) | undefined
  if (safeMode) {
    ipcMain.handle(DESKTOP_IPC.safeModeAction, (event, action: unknown, selection: unknown) => {
      assertMain(event)
      const resolve = waitForSafeModeAction
      waitForSafeModeAction = undefined
      if (resolve === undefined) return { ok: false }
      resolve({ action, selection })
      return { ok: true }
    })
  }
  ipcMain.handle(DESKTOP_IPC.bootFailed, (event, message: unknown) => {
    assertMain(event)
    if (typeof message !== 'string' || message.length === 0 || message.length > 4_000) {
      throw new Error('dsh desktop: startup failure must be text')
    }
    void reportFatal(new Error(message), 'web-boot')
  })
  ipcMain.handle(PLATFORM_IPC.open, (event, page: unknown, bounds: unknown) => {
    const owner = assertMain(event)
    if (page !== 'usage' && page !== 'top-up') throw new Error('Invalid Platform page')
    return platformView.open(owner, page, platformBounds(bounds))
  })
  ipcMain.handle(PLATFORM_IPC.bounds, (event, bounds: unknown) => {
    assertMain(event)
    platformView.setBounds(platformBounds(bounds))
  })
  ipcMain.handle(PLATFORM_IPC.close, event => {
    assertMain(event)
    platformView.close()
  })
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['ws://127.0.0.1/*', 'wss://127.0.0.1/*'] }, (details, callback) => {
    const url = hostUrl()
    const cookie = hostCookie()
    if (url === undefined || cookie === undefined || details.webContentsId !== mainWindow?.webContents.id) {
      callback({})
      return
    }
    const target = new URL(url)
    const requested = new URL(details.url)
    if (requested.host !== target.host || requested.protocol !== (target.protocol === 'https:' ? 'wss:' : 'ws:')) {
      callback({})
      return
    }
    const headers = Object.fromEntries(Object.entries(details.requestHeaders).map(([name, value]) => [name.toLowerCase(), value]))
    if (headers.origin !== 'dsh-app://app') {
      callback({ cancel: true })
      return
    }
    callback({ requestHeaders: { ...headers, origin: target.origin, cookie, 'sec-fetch-site': 'same-origin' } })
  })
  app.on('second-instance', () => { showMainWindow() })
  app.on('activate', () => { showMainWindow() })
  let hostReady = false
  if (app.isPackaged) {
    startUpdateManager({
      canCheckAutomatically: () => hostReady && !quitting && !safeMode,
      prepareToInstall: async () => {
        quitting = true
        await backend.stop()
        const bundle = appBundlePathFromExecutable(process.execPath)
        if (bundle === undefined) return
        const result = await quarantineAppBundleLaunchAgents({
          dshHome,
          appBundlePath: bundle,
          log: message => { console.info(message) }
        })
        if (result.failures.length > 0) {
          throw new Error('Unable to stop background services before replacing DSH Desktop.')
        }
      },
      installFailed: async () => {
        quitting = false
        const chinese = app.getLocale().toLowerCase().startsWith('zh')
        await dialog.showMessageBox({
          type: 'error',
          message: chinese ? '应用安装未完成。' : 'Application installation did not finish.',
          buttons: [chinese ? '知道了' : 'OK']
        })
      }
    })
  }
  app.on('before-quit', event => {
    if (quitting) return
    event.preventDefault()
    quitting = true
    if (windowsTray !== undefined && !windowsTray.isDestroyed()) windowsTray.destroy()
    windowsTray = undefined
    stability.dispose()
    desktopStorage.flushSync()
    // Safe Mode has no phone bridge. Each step is awaited on its own so
    // closing the Host and the second quit still run.
    void runQuitSteps([
      () => disposeFileDrag(),
      () => stopOperationReports(),
      () => operationJournal.drain(500),
      () => mobileBridge?.stop(),
      () => backend.close()
    ]).finally(() => { app.quit() })
  })
  await startup
  hostReady = true
  backendReady = true
  if (hostUrl() === undefined) throw new Error('Desktop Host is unavailable')
  if (mobileBridge !== undefined) {
    void mobileBridge.start().catch((error: unknown) => { console.error(error) })
  }
  const opened = await loadDesktopPage(window, `${SCHEME}://app/`)
  if (!opened) {
    if (!quitting && !stability.blocksNavigation()) stability.processRecovery.start('window')
    return
  }
  window.show()
  let desktopHealthReports: PluginHealthReport[] = []
  let desktopHealthLoaded = false
  async function loadDesktopHealthReports(): Promise<readonly PluginHealthReport[]> {
    if (desktopHealthLoaded) return desktopHealthReports
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const runtimeVersion = bundledHarnessVersion(app.getAppPath()) ?? app.getVersion()
    const names = await listInstalledProfilePlugins(dshHome, DESKTOP_PROFILE)
    desktopHealthReports = await Promise.all(names.map(async name => evaluatePluginMarketCompatibility({
      packageName: name,
      installedVersion: await installedPluginVersion(dshHome, DESKTOP_PROFILE, name),
      currentRuntimeVersion: runtimeVersion,
      timeoutMs: 2_500,
      locale
    })))
    desktopHealthLoaded = true
    return desktopHealthReports
  }
  async function revealPath(path: string, success: string): Promise<{ ok: boolean; notice: string }> {
    const error = await shell.openPath(path)
    if (error !== '') return { ok: false, notice: error }
    return { ok: true, notice: success }
  }
  async function confirmMaintenance(message: string, confirmLabel: string): Promise<boolean> {
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const result = await dialog.showMessageBox(window, {
      type: 'warning',
      message,
      buttons: [locale === 'zh' ? '取消' : 'Cancel', confirmLabel],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    })
    return result.response === 1
  }
  async function upgradeDesktopPlugins(plugins: readonly string[]): Promise<{ ok: boolean; notice: string }> {
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const targets = upgradeTargets(plugins, await loadDesktopHealthReports())
    if (targets.length === 0) {
      return {
        ok: false,
        notice: locale === 'zh' ? '所选插件没有可升级的兼容版本。' : 'No compatible upgrade candidate found for selected plugins.'
      }
    }
    const pnpm = pnpmEntryPath(app.getAppPath(), existsSync)
    if (pnpm === undefined) {
      return { ok: false, notice: locale === 'zh' ? '找不到 pnpm，不能升级插件。' : 'pnpm is unavailable, so the plugin cannot be upgraded.' }
    }
    const failed: string[] = []
    for (const target of targets) {
      const result = await upgradePluginToGeneration({
        dshHome,
        pluginName: target.name,
        targetVersion: target.version,
        profile: DESKTOP_PROFILE,
        nodeExecutablePath: electronNodeExecutable(process.execPath),
        pnpmEntryPath: pnpm,
        note: line => { console.info(line) }
      })
      if (!result.ok) failed.push(target.name)
    }
    desktopHealthLoaded = false
    if (failed.length === 0) {
      return {
        ok: true,
        notice: locale === 'zh'
          ? `成功升级 ${targets.length} 个插件。退出安全模式后生效。`
          : `Upgraded ${targets.length} plugin${targets.length === 1 ? '' : 's'}. They load after you exit Safe Mode.`
      }
    }
    return {
      ok: false,
      notice: locale === 'zh' ? `以下插件未能升级：${failed.join('、')}` : `These plugins could not be upgraded: ${failed.join(', ')}`
    }
  }
  async function changeBackup(removalId: string, kind: 'restore' | 'delete'): Promise<{ ok: boolean; notice: string }> {
    const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const backup = await resolvePluginRemovalBackup(dshHome, removalId)
    if (backup === undefined) {
      return { ok: false, notice: locale === 'zh' ? '这份恢复备份已不存在。' : 'This recovery backup no longer exists.' }
    }
    if (kind === 'restore' && backup.canRestore !== true) {
      return {
        ok: false,
        notice: locale === 'zh'
          ? `这份备份无法自动恢复：${backup.integrityDetail ?? '恢复材料不存在或不完整'}`
          : `This backup cannot be restored automatically: ${backup.integrityDetail ?? 'recovery material is missing or incomplete'}`
      }
    }
    const confirmed = await confirmMaintenance(
      kind === 'restore'
        ? (locale === 'zh' ? `从这份备份恢复 ${backup.pluginName}？` : `Restore ${backup.pluginName} from this backup?`)
        : (locale === 'zh' ? `永久删除 ${backup.pluginName} 的这份恢复备份？` : `Permanently delete this recovery backup for ${backup.pluginName}?`),
      kind === 'restore' ? (locale === 'zh' ? '恢复' : 'Restore') : (locale === 'zh' ? '永久删除' : 'Delete permanently')
    )
    if (!confirmed) {
      return {
        ok: true,
        notice: kind === 'restore'
          ? (locale === 'zh' ? '未恢复插件，备份保持不变。' : 'The plugin was not restored; the backup is unchanged.')
          : (locale === 'zh' ? '已保留恢复备份。' : 'The recovery backup was kept.')
      }
    }
    const result = kind === 'restore'
      ? await restorePluginRemovalBackup(dshHome, removalId, line => { console.info(line) })
      : await cleanupVerifiedRemovalBackup(dshHome, removalId, line => { console.info(line) })
    if (!result.ok) {
      return {
        ok: false,
        notice: locale === 'zh'
          ? `${kind === 'restore' ? '恢复失败' : '备份未删除'}：${result.reason ?? '未知错误'}`
          : `${kind === 'restore' ? 'Restore failed' : 'Backup kept'}: ${result.reason ?? 'unknown error'}`
      }
    }
    return {
      ok: true,
      notice: kind === 'restore'
        ? (locale === 'zh' ? `已恢复 ${backup.pluginName}。退出安全模式后验证。` : `Restored ${backup.pluginName}. Exit Safe Mode to verify it.`)
        : (locale === 'zh' ? `已永久删除 ${backup.pluginName} 的这份恢复备份。` : `Permanently deleted the recovery backup for ${backup.pluginName}.`)
    }
  }
  if (safeMode) {
    void runSafeModeManager({
      dshHome,
      profile: DESKTOP_PROFILE,
      locale: app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
      theme: nativeTheme.themeSource,
      show: url => {
        if (window.isDestroyed()) return
        window.webContents.send(DESKTOP_IPC.safeModeFrame, url)
      },
      nextAction: () => new Promise(resolve => { waitForSafeModeAction = resolve }),
      quit: () => { app.quit() },
      exitSafeMode,
      loadBackups: async () => (await snapshotPluginRemovalLedger(dshHome)).backups,
      loadHealthReports: () => loadDesktopHealthReports(),
      upgradePlugins: plugins => upgradeDesktopPlugins(plugins),
      openRecoveryDirectory: () => revealPath(dshHome, app.getLocale().toLowerCase().startsWith('zh')
        ? '已打开 Profile 恢复材料目录。'
        : 'Opened the Profile recovery material folder.'),
      openBackup: async removalId => {
        const locale = app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'
        const backup = await resolvePluginRemovalBackup(dshHome, removalId)
        if (backup === undefined) {
          return { ok: false, notice: locale === 'zh' ? '这份恢复备份已不存在。' : 'This recovery backup no longer exists.' }
        }
        return revealPath(backup.backupDirectory, locale === 'zh'
          ? `已打开 ${backup.pluginName} 的恢复备份。`
          : `Opened the recovery backup for ${backup.pluginName}.`)
      },
      restoreBackup: removalId => changeBackup(removalId, 'restore'),
      deleteBackup: removalId => changeBackup(removalId, 'delete'),
      openAgent: prompt => openRepairAgent(
        prompt ?? safeModeRepairPrompt(app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en'),
        true
      ),
      isQuitting: () => quitting || window.isDestroyed()
    }).catch((error: unknown) => { void reportFatal(error) })
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  void reportFatal(error, 'main').finally(() => { app.exit(1) })
})
