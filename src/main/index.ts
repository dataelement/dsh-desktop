import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
  Tray,
  utilityProcess,
  WebContentsView,
  type IpcMainInvokeEvent,
  type MessageBoxOptions
} from 'electron'
import { extractFailureCause, HarnessRuntime } from './runtime/harness-runtime'
import { launchDisclaimedUtilityProcess } from './runtime/disclaimed-utility-process'
import {
  installProfileDependenciesWithDsh,
  removeProfilePluginWithDsh
} from './runtime/profile-plugin-command'
import {
  ensureMinimumMarketBaseline,
  VERIFIED_MARKET_BASELINE
} from './state/profile-repair'
import {
  clearProfileInstallMarker,
  markProfileInstallComplete
} from './state/profile-install-marker'
import { inspectProfileConsistency } from './state/profile-consistency'
import {
  disableProfilePlugins,
  inspectProfileCompatibility,
  quarantineProfileCorePackages,
  quarantineProfileWorkspaces,
  type ProfileCompatibilityIssue
} from './state/profile-compatibility'
import { ensureStoreDirPinned, inspectStoreConsistency } from './state/profile-store'
import { LanMobileBridge } from './mobile/lan-mobile-bridge'
import {
  detectPluginRecovery,
  PLUGIN_RECOVERY_EVIDENCE_TIMEOUT_MS
} from './plugin-recovery-detection'
import { isDaemonLaunch, isUserInitiatedInstance } from './launchd-guard'
import {
  type GpuFallbackState,
  defaultGpuFallbackState,
  gpuFallbackStateEquals,
  gpuFallbackSwitches,
  isGpuLossFatal,
  isRendererGpuFallbackCandidate,
  parseGpuFallbackState,
  planGpuFallbackResponse,
  planStableLaunch,
  serializeGpuFallbackState
} from './gpu-fallback'
import { secureWindow } from './security'
import { ensureLaunchRoot } from './state/launch-root'
import {
  listInstalledProfilePlugins,
  resetPluginProfile
} from './state/plugin-recovery'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from './state/safe-mode-profile'
import {
  prepareGenerationsForLaunch,
  uninstallGenerationPlugin
} from './state/generation-launch'
import {
  confirmMigration,
  inspectMigrationRecoveryLock,
  migrateProfileToGenerations,
  recoverInterruptedMigration,
  rollBackMigration
} from './state/generation-migration'
import { runProfileStartupMaintenance } from './state/profile-startup-maintenance'
import { cleanupPluginOwnedComponents } from './state/plugin-component-cleanup'
import {
  cleanupVerifiedRemovalBackup,
  confirmPluginRemovalsBooted,
  enforcePendingPluginRemovals,
  incompletePluginRestoreId,
  listPendingPluginRemovals,
  removePluginSafely,
  resolvePluginRemovalBackup,
  restorePluginRemovalBackup,
  shouldDeferProfileMaintenance,
  snapshotPluginRemovalLedger,
  type PluginRemovalResult
} from './state/plugin-removal'
import {
  appBundlePathFromExecutable,
  auditLaunchAgents,
  quarantineAppBundleLaunchAgents
} from './state/launch-agent-audit'
import {
  clearStaleHarnessAuthCookies,
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
import {
  checkupAllProfilePlugins,
  evaluatePluginMarketCompatibility,
  readBundledDshVersion,
  readInstalledPluginVersion,
  type PluginHealthReport,
  type PluginUpgradeCandidate
} from './state/plugin-market-check'
import { upgradePluginToGeneration } from './state/plugin-upgrade'
import { aboutDetail, bundledHarnessVersion } from './version-info'
import { windowsMenuViewBounds } from './windows-menu-view'
import { shouldKeepRunningInBackground } from './close-to-tray'
import {
  MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS,
  shouldReloadAfterMainWindowRendererLoss
} from './main-window-recovery'

type PluginRecoveryAction = 'uninstall' | 'upgrade' | 'show-log' | 'quit' | 'restart' | 'refresh' | 'safe-mode'
type SafeModeAction =
  | { type: 'apply'; plugins: string[]; issues: string[] }
  | { type: 'upgrade'; plugins: string[] }
  | { type: 'recovery-open' }
  | { type: 'backup-open'; removalId: string }
  | { type: 'backup-restore'; removalId: string }
  | { type: 'backup-delete'; removalId: string }
  | { type: 'agent' }
  | { type: 'restart' }
  | { type: 'quit' }

const PLUGIN_RECOVERY_ACTIONS = new Set<PluginRecoveryAction>([
  'uninstall',
  'upgrade',
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
let tray: Tray | undefined
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
let migrationRecoveryLocked = false
let maintenanceRecoveryLocked = false
let maintenanceAllowedRestoreId: string | undefined
let profileBootConfirmationTimer: NodeJS.Timeout | undefined
let profileRendererHealthAt = 0
let profileBootNavigationVersion = 0
let profileBootConfirmationComplete = false
let safeModeSuspectedPlugins: string[] = []
// A renderer that crashes (render-process-gone) and reloads that fails the
// same way produces a permanent black window the user has to close by hand.
// The cooldown keeps reloads from stacking up when the underlying crash
// (almost always the GPU process) keeps recurring, and the counter gives us
// a way to give up after enough attempts and surface the harness failure
// page instead of hammering the GPU.
let mainWindowRecoveryReloadAt = 0
let mainWindowRecoveryReloadCount = 0
const startInSafeMode = shouldStartInSafeMode(process.argv)
// The GPU process can die before the harness is ever on screen, which is the
// whole reason the fallback exists; tracking the first harness render is what
// separates "this launch is unusable" from "the user is mid-task". Splash and
// the recovery page do not count: both are local pages that render on a
// machine whose harness never will.
let harnessRendered = false
let gpuFallbackState: GpuFallbackState = defaultGpuFallbackState
let gpuFallbackRelaunching = false
let gpuStableLaunchTimer: NodeJS.Timeout | undefined

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

/**
 * Record a renderer/GPU process loss in the harness log so the cause survives
 * a restart. Without this, a black window after running for a while leaves
 * nothing to diagnose — the desktop keeps the BrowserWindow alive and the
 * user has to close it by hand with no breadcrumb in the log.
 */
function recordMainWindowRendererLoss(
  source: 'render-process-gone' | 'did-fail-load' | 'unresponsive',
  details: string
): void {
  if (!runtime) return
  runtime.note(`[desktop] main window ${source}: ${details}`)
}

function reloadMainWindowAfterRendererLoss(window: BrowserWindow): void {
  if (window.isDestroyed() || window.webContents.isDestroyed()) return
  const now = Date.now()
  if (!shouldReloadAfterMainWindowRendererLoss({
    now,
    lastReloadAt: mainWindowRecoveryReloadAt,
    reloadCount: mainWindowRecoveryReloadCount
  })) {
    recordMainWindowRendererLoss(
      'render-process-gone',
      'reload throttled; surfacing harness failure instead'
    )
    const snapshot = runtime?.snapshot()
    if (snapshot && runtime?.snapshot().phase === 'ready') {
      // Reloading is failing on its own. Step the runtime back to 'failed' so
      // the plugin-recovery page is shown and the user can recover without a
      // hard restart.
      void showPluginRecovery({
        message: 'Harness web view stopped responding. Reload it to continue.',
        logs: snapshot.logs
      }).catch(showUnexpectedError)
    }
    return
  }
  mainWindowRecoveryReloadAt = now
  mainWindowRecoveryReloadCount += 1
  // Schedule a counter reset long after the cooldown so a single, isolated
  // crash recovers cleanly while a sustained failure still trips the cap.
  setTimeout(() => {
    mainWindowRecoveryReloadCount = 0
  }, MAIN_WINDOW_RECOVERY_RELOAD_COOLDOWN_MS * 4).unref?.()
  try {
    void window.webContents.reload()
  } catch (error) {
    recordMainWindowRendererLoss(
      'render-process-gone',
      `reload threw: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function installMainWindowRendererRecovery(window: BrowserWindow): void {
  const webContents = window.webContents
  webContents.on('render-process-gone', (event, details) => {
    clearProfileBootConfirmation()
    // Take control: by default the window stays drawn but blank, which is
    // exactly the black screen this recovery is meant to prevent.
    event.preventDefault()
    const reason = details?.reason ?? 'unknown'
    const exitCode = details?.exitCode ?? -1
    recordMainWindowRendererLoss('render-process-gone', `reason=${reason} exitCode=${exitCode}`)
    // `did-finish-load` can win the race by milliseconds before a broken
    // graphics stack takes the renderer down. The first post-render crash is
    // allowed the normal bounded reload; if that freshly reloaded renderer
    // dies with the same native signature, the launch is still unusable and
    // must take the same immediate relaunch path as a pre-render GPU loss.
    const unusableLaunch = !harnessRendered || mainWindowRecoveryReloadCount > 0
    if (
      isRendererGpuFallbackCandidate({ platform: process.platform, reason, exitCode }) &&
      respondToGpuFallbackSignal(
        `renderer native crash: reason=${reason} exitCode=${exitCode}`,
        { unusableLaunch }
      )
    ) return
    reloadMainWindowAfterRendererLoss(window)
  })
  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    clearProfileBootConfirmation()
    // The harness web server is local; a failure to reach it is almost
    // always the renderer dropping, not a real network error. Surface the
    // failure and let the recovery path try to reload the page.
    recordMainWindowRendererLoss(
      'did-fail-load',
      `errorCode=${errorCode} description=${errorDescription} url=${validatedURL}`
    )
    reloadMainWindowAfterRendererLoss(window)
  })
  webContents.on('unresponsive', () => {
    clearProfileBootConfirmation()
    // unresponsive fires before the renderer actually dies, so logging here
    // gives a useful "the GPU froze here" breadcrumb for the next time
    // the user has to recover the window.
    recordMainWindowRendererLoss('unresponsive', 'main window webContents became unresponsive')
  })
  webContents.on('responsive', () => {
    if (!runtime) return
    runtime.note('[desktop] main window webContents became responsive again')
  })
  webContents.on('did-start-navigation', (_event, _url, _isInPlace, isMainFrame) => {
    if (isMainFrame) clearProfileBootConfirmation()
  })
}

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

function gpuFallbackStatePath(): string {
  return join(app.getPath('userData'), 'gpu-fallback.json')
}

function readGpuFallbackState(): GpuFallbackState {
  try {
    return parseGpuFallbackState(readFileSync(gpuFallbackStatePath(), 'utf8'))
  } catch {
    return defaultGpuFallbackState
  }
}

function writeGpuFallbackState(state: GpuFallbackState): void {
  try {
    writeFileSync(gpuFallbackStatePath(), serializeGpuFallbackState(state))
  } catch {
    // A fallback we cannot persist still applies to this launch; the next
    // launch simply rediscovers it the same way this one did.
  }
}

/**
 * Apply the switches a previous launch discovered this machine needs. This
 * has to run before Chromium boots, so it lives beside the other pre-ready
 * command line configuration rather than in `bootstrap`.
 */
function configureGpuFallback(): void {
  gpuFallbackState = readGpuFallbackState()
  for (const name of gpuFallbackSwitches(gpuFallbackState.level)) {
    app.commandLine.appendSwitch(name)
  }
  // Electron wants hardware acceleration turned off through its own call
  // rather than the switch alone; the switches stay because they also cover
  // compositing and the sandbox, which this API does not.
  if (gpuFallbackState.level === 'gpu-disabled') app.disableHardwareAcceleration()
}

/**
 * How long a launch has to hold on to its GPU process before it counts as
 * stable. Long enough that the crash loop this fallback exists for has already
 * happened, short enough that a normal session always reaches it.
 */
const GPU_STABLE_LAUNCH_DELAY_MS = 60_000
const PROFILE_BOOT_STABILITY_MS = 60_000
const PROFILE_RENDERER_HEARTBEAT_MAX_AGE_MS = 15_000

function clearProfileBootConfirmation(): void {
  if (profileBootConfirmationTimer) clearTimeout(profileBootConfirmationTimer)
  profileBootConfirmationTimer = undefined
  profileRendererHealthAt = 0
  profileBootNavigationVersion = 0
  profileBootConfirmationComplete = false
}

function normalProfileBootIsHealthy(expectedNavigationVersion: number): boolean {
  const snapshot = runtime.snapshot()
  const window = mainWindow
  return (
    !safeModeVisible &&
    !failureRecoveryVisible &&
    snapshot.phase === 'ready' &&
    !!window &&
    !window.isDestroyed() &&
    expectedNavigationVersion === mainWindowNavigationVersion &&
    Date.now() - profileRendererHealthAt <= PROFILE_RENDERER_HEARTBEAT_MAX_AGE_MS &&
    window.webContents.getURL().startsWith('http://127.0.0.1:')
  )
}

function scheduleNormalProfileBootConfirmation(): void {
  if (safeModeVisible || failureRecoveryVisible || runtime.snapshot().phase !== 'ready') return
  profileRendererHealthAt = Date.now()
  if (profileBootConfirmationComplete || profileBootConfirmationTimer) return
  profileBootNavigationVersion = mainWindowNavigationVersion
  profileBootConfirmationTimer = setTimeout(() => {
    profileBootConfirmationTimer = undefined
    const expectedNavigationVersion = profileBootNavigationVersion
    const healthy = (): boolean => normalProfileBootIsHealthy(expectedNavigationVersion)
    if (!healthy()) {
      profileRendererHealthAt = 0
      profileBootNavigationVersion = 0
      return
    }
    profileBootConfirmationComplete = true
    const dshHome = join(app.getPath('userData'), 'harness')
    void (async () => {
      await confirmMigration(dshHome, (line) => runtime.note(line), healthy)
      if (!healthy()) {
        profileBootConfirmationComplete = false
        return
      }
      await confirmPluginRemovalsBooted(dshHome, (line) => runtime.note(line))
    })().catch((error) => {
      profileBootConfirmationComplete = false
      runtime.note(
        `[desktop] normal Profile boot confirmation failed: ${error instanceof Error ? error.message : String(error)
        }`
      )
    })
  }, PROFILE_BOOT_STABILITY_MS)
  profileBootConfirmationTimer.unref?.()
}

/**
 * Note that this launch rendered the harness and, if it then keeps its GPU
 * process for a while, that it ran cleanly — which is what eventually lets a
 * degraded machine climb back towards a sandboxed, hardware-accelerated
 * Chromium.
 */
function markHarnessRendered(): void {
  if (harnessRendered) return
  harnessRendered = true
  if (gpuFallbackState.level === 'default' && gpuFallbackState.stableLaunches === 0) return
  gpuStableLaunchTimer = setTimeout(() => {
    gpuStableLaunchTimer = undefined
    const next = planStableLaunch(gpuFallbackState)
    if (gpuFallbackStateEquals(next, gpuFallbackState)) return
    if (next.level !== gpuFallbackState.level) {
      runtime?.note(
        `[desktop] GPU fallback lowered to ${next.level} after ` +
        `${gpuFallbackState.stableLaunches + 1} stable launches`
      )
    }
    gpuFallbackState = next
    writeGpuFallbackState(next)
  }, GPU_STABLE_LAUNCH_DELAY_MS)
  gpuStableLaunchTimer.unref?.()
}

/**
 * Watch for the GPU process going away and step the fallback forward. A
 * launch whose harness never rendered is relaunched right away, because no
 * window the user could act on exists; a launch that did render keeps going
 * and only degrades once losses pile up, so a single crash during a driver
 * update cannot cost this machine its GPU sandbox.
 */
function installGpuFallbackWatch(): void {
  app.on('child-process-gone', (_event, details) => {
    if (details.type !== 'GPU') return
    if (gpuFallbackRelaunching || quitting) return
    // Chromium tears the GPU process down on shutdown and Electron reports it
    // here like any other loss; degrading on that would degrade everyone.
    if (!isGpuLossFatal(details.reason)) return
    respondToGpuFallbackSignal(
      `GPU process gone: reason=${details.reason} exitCode=${details.exitCode}`
    )
  })
}

/**
 * Feed one high-confidence graphics failure into the shared fallback ladder.
 * Returning true tells a renderer-loss caller that a relaunch is already in
 * progress, so it must not also reload the dying WebContents.
 */
function respondToGpuFallbackSignal(
  details: string,
  options: { unusableLaunch?: boolean } = {}
): boolean {
  if (gpuFallbackRelaunching || quitting) return false
  if (gpuStableLaunchTimer) {
    clearTimeout(gpuStableLaunchTimer)
    gpuStableLaunchTimer = undefined
  }
  runtime?.note(
    `[desktop] ${details} fallback=${gpuFallbackState.level} ` +
    `failures=${gpuFallbackState.failures}`
  )
  const plan = planGpuFallbackResponse({
    state: gpuFallbackState,
    harnessRendered: options.unusableLaunch === true ? false : harnessRendered
  })
  const escalated = plan.state.level !== gpuFallbackState.level
  if (!gpuFallbackStateEquals(plan.state, gpuFallbackState)) {
    gpuFallbackState = plan.state
    writeGpuFallbackState(plan.state)
  }
  if (escalated) runtime?.note(`[desktop] GPU fallback raised to ${plan.state.level}`)
  if (!plan.relaunch) return false
  gpuFallbackRelaunching = true
  app.relaunch()
  app.exit(0)
  return true
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

function restoreMainWindow(): void {
  const window = mainWindow
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    return
  }

  const snapshot = runtime?.snapshot()
  if (snapshot?.phase === 'ready' && snapshot.url) {
    void openHarness(snapshot.url, 'user').catch(showUnexpectedError)
  } else if (snapshot?.phase === 'idle') {
    void launchHarness().catch(showUnexpectedError)
  }
}

function ensureTray(): void {
  if (process.platform !== 'win32' || tray) return

  const locale = harnessLocale()
  tray = new Tray(desktopIconPath())
  tray.setToolTip('DSH Desktop')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: locale === 'zh' ? '显示 DSH Desktop' : 'Show DSH Desktop', click: restoreMainWindow },
      { type: 'separator' },
      { label: locale === 'zh' ? '退出' : 'Exit', click: () => app.quit() }
    ])
  )
  tray.on('click', restoreMainWindow)
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
  window.on('close', (event) => {
    if (!shouldKeepRunningInBackground(process.platform, quitting)) return
    event.preventDefault()
    window.hide()
  })
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
  installMainWindowRendererRecovery(window)
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
  const rendererUrl = desktopHarnessUrl(url, process.platform, runtime.snapshot().authToken)
  if (shouldLoadHarnessUrl(window.webContents.getURL(), url)) {
    const navigationVersion = ++mainWindowNavigationVersion
    rendererPluginFailureLogs = []
    window.webContents.stop()
    const clearedCookies = await clearStaleHarnessAuthCookies(
      window.webContents.session.cookies,
      rendererUrl,
      runtime.snapshot().authToken
    ).catch((error) => {
      runtime.note(
        `[desktop] stale Harness cookie cleanup failed: ${error instanceof Error ? error.message : String(error)
        }`
      )
      return 0
    })
    if (clearedCookies > 0) {
      runtime.note(`[desktop] cleared ${clearedCookies} stale Harness authentication cookie(s)`)
    }
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
  markHarnessRendered()
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
  clearProfileBootConfirmation()
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
 * Name what the profile contradicts about itself without changing it. A
 * dangling declaration does not throw — it leaves a service waiting on a
 * provider that never arrives — so without this the profile reads as a slow
 * start and the fault is found by reading logs for an afternoon. Reporting
 * only: startup never repairs or prunes the normal Profile automatically.
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
      runtime.note(`[desktop] ${finding.action} the background service ${finding.label}${owner}`)
    }
    for (const failure of result.failures) runtime.note(`[desktop] launch agent audit: ${failure}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    runtime.note(`[desktop] launch agent audit failed: ${detail}`)
  }
}

/**
 * A LaunchAgent executing anything from inside this application bundle races
 * an in-place update even when it is correctly configured as Node. Harness is
 * already stopped by the caller, so quarantine is durable for the update
 * window. Any failure aborts the install instead of risking a partial bundle.
 */
async function quarantineInstalledLaunchAgentsForUpdate(dshHome: string): Promise<void> {
  const appBundlePath = appBundlePathFromExecutable(process.execPath)
  if (appBundlePath === undefined) return
  const result = await quarantineAppBundleLaunchAgents({
    dshHome,
    appBundlePath,
    log: (message) => runtime.note(message)
  })
  for (const finding of result.findings) {
    const owner = finding.owner === undefined ? '' : ` installed by ${finding.owner}`
    runtime.note(
      `[desktop] quarantined the background service ${finding.label}${owner} before update`
    )
  }
  if (result.failures.length > 0) {
    for (const failure of result.failures) runtime.note(`[desktop] pre-update launch agent: ${failure}`)
    throw new Error('Unable to stop background services before replacing DSH Desktop.')
  }
}

function profileRecoveryLocked(): boolean {
  return maintenanceRecoveryLocked || migrationRecoveryLocked
}

async function refreshMigrationRecoveryLock(dshHome: string): Promise<boolean> {
  migrationRecoveryLocked = await inspectMigrationRecoveryLock(dshHome)
  return profileRecoveryLocked()
}

async function canRetryLockedPluginRestore(dshHome: string, removalId: string): Promise<boolean> {
  await refreshMigrationRecoveryLock(dshHome)
  if (migrationRecoveryLocked) return false
  if (!maintenanceRecoveryLocked) {
    try {
      const incompleteRestore = await incompletePluginRestoreId(dshHome)
      if (incompleteRestore === undefined) return true
      maintenanceRecoveryLocked = true
      maintenanceAllowedRestoreId = incompleteRestore
    } catch {
      maintenanceRecoveryLocked = true
      maintenanceAllowedRestoreId = undefined
      return false
    }
  }
  if (maintenanceAllowedRestoreId !== removalId) return false
  try {
    return await incompletePluginRestoreId(dshHome) === removalId
  } catch {
    return false
  }
}

async function enterMigrationSafeRecovery(
  dshHome: string,
  reason: string,
  allowedRestoreId?: string
): Promise<void> {
  if (failureRecoveryVisible) resolvePluginRecoveryAction('safe-mode')
  safeModeVisible = true
  maintenanceRecoveryLocked = true
  maintenanceAllowedRestoreId = allowedRestoreId
  await refreshMigrationRecoveryLock(dshHome)
  runtime.note(`[desktop] Profile recovery requires Safe Mode: ${reason}`)
  await runtime.stop()
  await ensureSafeModeProfile(dshHome)
  runtime.note('[desktop] safe mode: normal Profile maintenance is blocked until recovery succeeds')
  await runtime.start(launchDirectory, SAFE_MODE_PROFILE)
  if (runtime.snapshot().phase !== 'ready') return

  void mobileBridge.start().catch(showUnexpectedError)
  const notice = harnessLocale() === 'zh'
    ? `正常 Profile 恢复尚未完成，已停止所有自动修复并进入安全模式。恢复材料仍保留。${reason}`
    : `Normal Profile recovery is incomplete. Automatic maintenance is blocked and recovery material is preserved. ${reason}`
  queueMicrotask(() => {
    void showSafeModeManager({ notice, noticeTone: 'error' }).catch(showUnexpectedError)
  })
}

function launchHarness(): Promise<void> {
  if (harnessLaunchOperation) return harnessLaunchOperation

  harnessLaunchOperation = (async () => {
    safeModeVisible = false
    const dshHome = join(app.getPath('userData'), 'harness')
    await showSplash()
    // Migration and generation projection only hold on a stopped Harness, and
    // a restart still has the previous one running: start() stops it, but that
    // is after maintenance. Stopping here owns that mutation window.
    await runtime.stop()
    const maintenance = await runProfileStartupMaintenance({
      note: (line) => runtime.note(line),
      recoverInterruptedMigration: () =>
        recoverInterruptedMigration(dshHome, (line) => runtime.note(line)),
      incompletePluginRestoreId: () => incompletePluginRestoreId(dshHome),
      preparePackageStore: async () => {
        // This must run after interrupted-migration recovery has allowed
        // Profile writes, but before any operation invokes pnpm.
        const pinned = await ensureStoreDirPinned(dshHome)
        if (pinned) runtime.note(`[desktop] pinned the profile's pnpm store: ${pinned}`)
        const upgradedMarket = await ensureMinimumMarketBaseline(dshHome)
        if (upgradedMarket) {
          runtime.note(`[desktop] upgraded dshmarket baseline to ^${VERIFIED_MARKET_BASELINE} in profile manifest`)
          await clearProfileInstallMarker(dshHome)
        }
      },
      enforcePendingPluginRemovals: () =>
        enforcePendingPluginRemovals(dshHome, (line) => runtime.note(line)),
      prepareGenerationsForLaunch: () =>
        prepareGenerationsForLaunch(dshHome, (line) => runtime.note(line)),
      shouldDeferProfileMaintenance: () => shouldDeferProfileMaintenance(dshHome),
      migrateProfileToGenerations: () =>
        migrateProfileToGenerations({
          dshHome,
          nodeExecutablePath: bundledNodePath(),
          pnpmEntryPath: bundledPnpmEntryPath(),
          dshEntryPath: dshEntryPath(),
          note: (line) => runtime.note(line),
          reinstallSharedTree: async () => {
            await clearProfileInstallMarker(dshHome)
            const result = await installProfileDependenciesWithDsh({
              dshHome,
              dshEntryPath: dshEntryPath(),
              nodeExecutablePath: bundledNodePath(),
              pnpmEntryPath: bundledPnpmEntryPath(),
              pnpmRunnerPath: bundledPnpmRunnerPath()
            })
            if (result.ok) await markProfileInstallComplete(dshHome)
            return result
          }
        }),
      reportProfileConsistency: () => reportProfileConsistency(dshHome)
    })
    if (maintenance.outcome === 'safe-recovery') {
      await enterMigrationSafeRecovery(
        dshHome,
        maintenance.reason,
        maintenance.allowedRestoreId
      )
      return
    }
    maintenanceRecoveryLocked = false
    maintenanceAllowedRestoreId = undefined
    await refreshMigrationRecoveryLock(dshHome)
    await auditInstalledLaunchAgents(dshHome)
    await runtime.start(launchDirectory)

    // A failed launch must not rewrite the user's enabled plugin set. Recovery
    // and Safe Mode operate on explicit, exact plugin selections; automatically
    // restoring a stale snapshot can resurrect an incompatible old version or
    // collapse the whole profile when that snapshot is empty.
    if (runtime.snapshot().phase !== 'ready') {
      // A migration that did not boot rolls the whole profile back to the
      // pre-upgrade snapshot — nothing was lost, and the old shared-tree path
      // runs next launch. A failed rollback keeps the snapshot intact so the
      // user can recover instead of starting from an unverified half-tree.
      if (maintenance.migrationRebuiltSharedTree) {
        const rollback = await rollBackMigration(dshHome, (line) => runtime.note(line))
        if (rollback.outcome === 'restored') {
          runtime.note('[desktop] restarting the verified pre-upgrade Profile without package repair')
          await runtime.start(launchDirectory)
        } else {
          const reason = rollback.outcome === 'recovery-required'
            ? rollback.reason
            : 'the pre-upgrade migration snapshot is missing'
          await enterMigrationSafeRecovery(dshHome, reason)
        }
      }
    }
    if (runtime.snapshot().phase === 'ready') safeModeSuspectedPlugins = []
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
    await refreshMigrationRecoveryLock(dshHome)
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

async function uninstallMarketAndRestart(): Promise<{ ok: boolean }> {
  const dshHome = join(app.getPath('userData'), 'harness')
  await showSplash()
  await runtime.stop()
  const result = await removeProfilePluginWithDsh(
    {
      dshHome,
      dshEntryPath: dshEntryPath(),
      nodeExecutablePath: bundledNodePath(),
      pnpmEntryPath: bundledPnpmEntryPath(),
      pnpmRunnerPath: bundledPnpmRunnerPath()
    },
    'dshmarket',
    true
  )
  await launchHarness()
  if (!result.ok) {
    throw new Error(result.detail ?? 'Plugin market removal failed.')
  }
  return { ok: runtime.snapshot().phase === 'ready' }
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

  ipcMain.removeHandler('market:uninstall')
  ipcMain.handle('market:uninstall', async (event) => {
    assertTrustedMainWindowEvent(event)
    if (runtime.snapshot().phase !== 'ready') {
      throw new Error('Harness is not ready to uninstall the plugin market.')
    }
    return uninstallMarketAndRestart()
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

  ipcMain.removeHandler('desktop:about-info')
  ipcMain.handle('desktop:about-info', (event) => {
    assertTrustedMainWindowEvent(event)
    const locale = harnessLocale()
    return {
      desktopVersion: app.getVersion(),
      harnessVersion:
        bundledHarnessVersion(app.getAppPath()) ?? (locale === 'zh' ? '未知' : 'Unknown'),
      locale
    }
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
  const info = {
    desktopVersion: app.getVersion(),
    harnessVersion:
      bundledHarnessVersion(app.getAppPath()) ?? (locale === 'zh' ? '未知' : 'Unknown'),
    locale
  }
  if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
    try {
      window.webContents.send('desktop:show-about', info)
      return
    } catch {
      // Fall through to native dialog fallback
    }
  }

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
  upgradeCandidate?: PluginUpgradeCandidate
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

  const attemptedUpgrades = new Map<string, string>()

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

      let upgradeCandidate: PluginUpgradeCandidate | undefined
      if (detection.plugins.length === 1) {
        const targetPlugin = detection.plugins[0]!
        try {
          const installedVersion = await readInstalledPluginVersion(dshHome, targetPlugin)
          const runtimeVersion =
            (await readBundledDshVersion(join(app.getAppPath(), 'node_modules'))) || '0.1.2-alpha.1'
          const check = await evaluatePluginMarketCompatibility({
            packageName: targetPlugin,
            installedVersion,
            currentRuntimeVersion: runtimeVersion,
            hasLocalIssue: true,
            locale: harnessLocale()
          })
          if (
            check.upgradeReady &&
            check.upgradeVersion &&
            attemptedUpgrades.get(targetPlugin) !== check.upgradeVersion
          ) {
            upgradeCandidate = {
              packageName: targetPlugin,
              targetVersion: check.upgradeVersion,
              installedVersion
            }
          }
        } catch (error) {
          runtime.note(`[plugin-recovery] market check failed for ${targetPlugin}: ${String(error)}`)
        }
      }

      const action = await waitForPluginRecoveryAction({
        snapshot: {
          ...snapshot,
          message: message || snapshot.message,
          logs: detection.logs
        },
        plugins: detection.plugins,
        removedPlugins,
        notice,
        upgradeCandidate
      })
      notice = undefined

      if (action === 'refresh') {
        applyPendingFrontendEvidence()
        continue
      } else if (action === 'upgrade' && upgradeCandidate) {
        await runtime.stop()
        const upgradeResult = await upgradePluginToGeneration({
          dshHome,
          pluginName: upgradeCandidate.packageName,
          targetVersion: upgradeCandidate.targetVersion,
          nodeExecutablePath: bundledNodePath(),
          pnpmEntryPath: bundledPnpmEntryPath(),
          note: (line) => runtime.note(line)
        })
        attemptedUpgrades.set(upgradeCandidate.packageName, upgradeCandidate.targetVersion)

        if (!upgradeResult.ok) {
          notice = isChinese
            ? `升级 ${upgradeCandidate.packageName} 到 v${upgradeCandidate.targetVersion} 失败：${upgradeResult.detail ?? '未知错误'}。您可以重试或卸载该插件。`
            : `Failed to upgrade ${upgradeCandidate.packageName} to v${upgradeCandidate.targetVersion}: ${upgradeResult.detail ?? 'unknown error'}. You may retry or uninstall.`
          continue
        }

        const compatibility = await inspectProfileCompatibility(
          dshHome,
          join(app.getAppPath(), 'node_modules')
        )
        const blockingIssues = compatibility.issues.filter((issue) => issue.severity === 'blocking')
        if (blockingIssues.length > 0) {
          runtime.note(
            `[plugin-recovery] normal mode remains blocked by ${blockingIssues.length} ` +
            `profile compatibility issue${blockingIssues.length === 1 ? '' : 's'} after upgrade`
          )
          notice = isChinese
            ? `已升级至 v${upgradeCandidate.targetVersion}，但 Profile 仍有 ${blockingIssues.length} 项兼容问题。` +
            '为避免再次进入空白界面，请进入安全模式继续处理。'
            : `Upgraded to v${upgradeCandidate.targetVersion}, but ${blockingIssues.length} blocking profile compatibility ` +
            `issue${blockingIssues.length === 1 ? ' remains' : 's remain'}. ` +
            'Continue in Safe Mode to avoid another blank normal window.'
          continue
        }

        await launchHarness()
        if (applyPendingFrontendEvidence()) continue
        if (runtime.snapshot().phase === 'ready') {
          schedulePluginRecoverySessionReset()
          return
        }
        continue
      } else if (action === 'uninstall' && detection.plugins.length > 0) {
        // The normal web Harness may still have the failing plugin imported.
        // macOS permits renaming an open directory, but Windows does not; stop
        // the process before quarantine so both platforms use the same path.
        await runtime.stop()
        const failedPlugins: string[] = []
        const pendingPlugins: string[] = []
        for (const plugin of detection.plugins) {
          const removal = await removeProfilePluginCompletely(dshHome, plugin, 'plugin-recovery')
          if (removal.removed) {
            if (!removedPlugins.includes(plugin)) removedPlugins.push(plugin)
          } else if (removal.pending) {
            pendingPlugins.push(plugin)
          } else {
            failedPlugins.push(plugin)
          }
        }

        if (pendingPlugins.length > 0) {
          notice = isChinese
            ? `已禁用以下插件，但 Profile 依赖清理失败，尚未恢复正常模式：` +
            `${pendingPlugins.join('、')}。请重试卸载或进入安全模式。`
            : `These plugins are disabled, but profile dependency cleanup failed, so normal mode ` +
            `was not restarted: ${pendingPlugins.join(', ')}. Retry removal or enter Safe Mode.`
          continue
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
        const compatibility = await inspectProfileCompatibility(
          dshHome,
          join(app.getAppPath(), 'node_modules')
        )
        const blockingIssues = compatibility.issues.filter((issue) => issue.severity === 'blocking')
        if (blockingIssues.length > 0) {
          runtime.note(
            `[plugin-recovery] normal mode remains blocked by ${blockingIssues.length} ` +
            `profile compatibility issue${blockingIssues.length === 1 ? '' : 's'}`
          )
          notice = isChinese
            ? `插件已移除，但 Profile 仍有 ${blockingIssues.length} 项兼容问题。` +
            '为避免再次进入空白界面，请进入安全模式继续处理。'
            : `The plugin was removed, but ${blockingIssues.length} blocking profile compatibility ` +
            `issue${blockingIssues.length === 1 ? ' remains' : 's remain'}. ` +
            'Continue in Safe Mode to avoid another blank normal window.'
          continue
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
        safeModeSuspectedPlugins = [...new Set(detection.plugins)]
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
  suspectedPlugins: readonly string[]
  issues: readonly ProfileCompatibilityIssue[]
  healthReports?: readonly PluginHealthReport[]
  backups: Awaited<ReturnType<typeof snapshotPluginRemovalLedger>>['backups']
  recoveryLocked: boolean
  backupRestoreLocked: boolean
  allowedRestoreId?: string
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
    suspectedPlugins: options.suspectedPlugins,
    issues: options.issues,
    healthReports: options.healthReports,
    backups: options.backups,
    recoveryLocked: options.recoveryLocked,
    backupRestoreLocked: options.backupRestoreLocked,
    allowedRestoreId: options.allowedRestoreId,
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

async function removeSafeModePlugin(
  dshHome: string,
  pluginName: string
): Promise<PluginRemovalResult> {
  return removeProfilePluginCompletely(dshHome, pluginName, 'safe-mode')
}

async function repairSafeModeCompatibilityIssues(
  dshHome: string,
  issues: readonly ProfileCompatibilityIssue[]
): Promise<{ repaired: string[]; failed: string[]; installFailed?: string }> {
  const repaired: string[] = []
  const failed: string[] = []
  const pluginIssues = issues.filter((issue) => issue.resolution === 'disable-plugin')
  const workspaceIssues = issues.filter((issue) => issue.resolution === 'quarantine-workspace')
  const coreIssues = issues.filter((issue) => issue.resolution === 'rebuild-profile')

  if (pluginIssues.length > 0) {
    const targets = [...new Set(pluginIssues.map((issue) => issue.target))]
    const disabled = await disableProfilePlugins(dshHome, targets)
    repaired.push(...pluginIssues.filter((issue) => disabled.includes(issue.target)).map((issue) => issue.id))
    failed.push(...pluginIssues.filter((issue) => !disabled.includes(issue.target)).map((issue) => issue.id))
  }

  if (workspaceIssues.length > 0) {
    const targets = [...new Set(workspaceIssues.map((issue) => issue.target))]
    const quarantined = await quarantineProfileWorkspaces(dshHome, targets)
    repaired.push(
      ...workspaceIssues
        .filter((issue) => quarantined.includes(issue.packageName))
        .map((issue) => issue.id)
    )
    failed.push(
      ...workspaceIssues
        .filter((issue) => !quarantined.includes(issue.packageName))
        .map((issue) => issue.id)
    )
  }

  if (coreIssues.length > 0) {
    const targets = [...new Set(coreIssues.map((issue) => issue.target))]
    const quarantined = await quarantineProfileCorePackages(dshHome, targets)
    repaired.push(...coreIssues.filter((issue) => quarantined.includes(issue.target)).map((issue) => issue.id))
    failed.push(...coreIssues.filter((issue) => !quarantined.includes(issue.target)).map((issue) => issue.id))
  }

  if (workspaceIssues.length > 0 || coreIssues.length > 0) {
    await clearProfileInstallMarker(dshHome)
    const result = await installProfileDependenciesWithDsh({
      dshHome,
      dshEntryPath: dshEntryPath(),
      nodeExecutablePath: bundledNodePath(),
      pnpmEntryPath: bundledPnpmEntryPath(),
      pnpmRunnerPath: bundledPnpmRunnerPath()
    })
    if (!result.ok) return { repaired, failed, installFailed: result.detail ?? 'unknown error' }
    await markProfileInstallComplete(dshHome)
  }

  return { repaired, failed }
}

async function removeProfilePluginCompletely(
  dshHome: string,
  pluginName: string,
  logPrefix: string
): Promise<PluginRemovalResult> {
  runtime.note(`[${logPrefix}] removing ${pluginName} from the web profile`)
  const result = await removePluginSafely({
    dshHome,
    pluginName,
    cleanupOwnedComponents: ({ removalId, backupDirectory }) => cleanupPluginOwnedComponents({
      dshHome,
      pluginName,
      removalId,
      backupDirectory,
      log: (message) => runtime.note(`[${logPrefix}] ${message}`)
    }),
    uninstallGeneration: () => uninstallGenerationPlugin(
      dshHome,
      pluginName,
      (line) => runtime.note(line)
    ),
    reconcileLegacyProfile: async () => {
      runtime.note(`[${logPrefix}] rebuilding the web profile after removing ${pluginName}`)
      await clearProfileInstallMarker(dshHome)
      const rebuild = await installProfileDependenciesWithDsh({
        dshHome,
        dshEntryPath: dshEntryPath(),
        nodeExecutablePath: bundledNodePath(),
        pnpmEntryPath: bundledPnpmEntryPath(),
        pnpmRunnerPath: bundledPnpmRunnerPath()
      })
      if (!rebuild.ok) {
        runtime.note(
          `[${logPrefix}] web profile rebuild failed after removing ${pluginName}: ` +
          `${rebuild.detail ?? 'unknown error'}`
        )
        return rebuild
      }
      await markProfileInstallComplete(dshHome)
      const compatibility = await inspectProfileCompatibility(
        dshHome,
        join(app.getAppPath(), 'node_modules')
      )
      runtime.note(
        `[${logPrefix}] rebuilt the web profile after removing ${pluginName}; ` +
        `${compatibility.issues.length} compatibility issue${compatibility.issues.length === 1 ? '' : 's'} remain`
      )
      return rebuild
    },
    note: (line) => runtime.note(`[${logPrefix}] ${line}`)
  })
  for (const failure of result.failures) {
    runtime.note(`[${logPrefix}] ${pluginName} remains disabled; cleanup pending: ${failure}`)
  }
  return result
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

async function showSafeModeManager(initial?: {
  notice?: string
  noticeTone?: 'success' | 'error'
}): Promise<void> {
  if (!safeModeVisible || safeModeManagerVisible || quitting) return
  safeModeManagerVisible = true
  const dshHome = join(app.getPath('userData'), 'harness')
  const isChinese = harnessLocale() === 'zh'
  let notice = initial?.notice
  let noticeTone = initial?.noticeTone

  try {
    while (!quitting) {
      let recoveryLocked = await refreshMigrationRecoveryLock(dshHome)
      let removalLedgerReadable = true
      let active: string[] = []
      let pendingRemovals: string[] = []
      let compatibility = { issues: [] as ProfileCompatibilityIssue[] }
      let removalBackups: Awaited<ReturnType<typeof snapshotPluginRemovalLedger>> = {
        backups: [],
        pendingDeletion: []
      }
      try {
        removalBackups = await snapshotPluginRemovalLedger(dshHome)
        const incompleteRestoreIds = removalBackups.backups
          .filter((backup) => backup.restoreStartedAt !== undefined)
          .map((backup) => backup.removalId)
        if (incompleteRestoreIds.length > 0) {
          if (!maintenanceRecoveryLocked) {
            const incompleteRestore = await incompletePluginRestoreId(dshHome)
            maintenanceRecoveryLocked = true
            maintenanceAllowedRestoreId = incompleteRestore
          }
          recoveryLocked = true
          active = []
          pendingRemovals = []
          compatibility = { issues: [] }
        }
        if (!recoveryLocked) {
          active = await listInstalledProfilePlugins(dshHome)
          pendingRemovals = await listPendingPluginRemovals(dshHome)
          compatibility = await inspectProfileCompatibility(
            dshHome,
            join(app.getAppPath(), 'node_modules')
          )
        }
      } catch (error) {
        removalLedgerReadable = false
        maintenanceRecoveryLocked = true
        maintenanceAllowedRestoreId = undefined
        recoveryLocked = true
        active = []
        pendingRemovals = []
        compatibility = { issues: [] }
        const detail = error instanceof Error ? error.message : String(error)
        runtime.note(`[plugin-removal] recovery ledger inspection failed: ${detail}`)
        notice ??= isChinese
          ? `卸载恢复账本无法读取，已锁定正常 Profile 并保留原文件：${detail}`
          : `The removal recovery ledger is unreadable. The normal Profile is locked and the original file is preserved: ${detail}`
        noticeTone ??= 'error'
      }
      const installed = [...new Set([...active, ...pendingRemovals])]
      let healthReports: PluginHealthReport[] | undefined
      if (installed.length > 0 && !recoveryLocked) {
        try {
          const incompatiblePluginNames = compatibility.issues
            .filter((issue) => issue.resolution === 'disable-plugin')
            .map((issue) => issue.target)
          healthReports = await checkupAllProfilePlugins({
            plugins: installed,
            dshHome,
            bundledNodeModulesPath: join(app.getAppPath(), 'node_modules'),
            incompatiblePlugins: [...new Set([...safeModeSuspectedPlugins, ...incompatiblePluginNames])],
            locale: harnessLocale()
          })
        } catch (error) {
          runtime.note(`[safe-mode] plugin market health checkup failed: ${String(error)}`)
        }
      }

      const allowedRestoreId = recoveryLocked &&
        !migrationRecoveryLocked &&
        removalLedgerReadable &&
        maintenanceAllowedRestoreId !== undefined &&
        removalBackups.backups.some(
          (backup) =>
            backup.removalId === maintenanceAllowedRestoreId &&
            backup.restoreStartedAt !== undefined
        )
        ? maintenanceAllowedRestoreId
        : undefined
      const backupRestoreLocked = recoveryLocked || !removalLedgerReadable
      const action = await waitForSafeModeAction({
        plugins: installed,
        suspectedPlugins: safeModeSuspectedPlugins,
        issues: compatibility.issues,
        healthReports,
        backups: removalBackups.backups,
        recoveryLocked,
        backupRestoreLocked,
        allowedRestoreId,
        notice,
        noticeTone
      })
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
      if (action.type === 'recovery-open') {
        const openError = await shell.openPath(dshHome)
        notice = openError
          ? isChinese ? `无法打开恢复目录：${openError}` : `Unable to open the recovery folder: ${openError}`
          : isChinese ? '已打开 Profile 恢复材料目录。' : 'Opened the Profile recovery material folder.'
        noticeTone = openError ? 'error' : 'success'
        continue
      }
      if (action.type === 'backup-open') {
        const backup = await resolvePluginRemovalBackup(dshHome, action.removalId)
        if (!backup) {
          notice = isChinese ? '这份恢复备份已不存在。' : 'This recovery backup no longer exists.'
          noticeTone = 'error'
          continue
        }
        const openError = await shell.openPath(backup.backupDirectory)
        notice = openError
          ? isChinese ? `无法打开备份目录：${openError}` : `Unable to open the backup: ${openError}`
          : isChinese ? `已打开 ${backup.pluginName} 的恢复备份。` : `Opened the recovery backup for ${backup.pluginName}.`
        noticeTone = openError ? 'error' : 'success'
        continue
      }
      if (action.type === 'backup-restore') {
        if (!await canRetryLockedPluginRestore(dshHome, action.removalId)) {
          notice = isChinese ? '另一个恢复事务尚未完成，只能重试对应的插件备份。' : 'Another recovery transaction is incomplete; only its matching plugin backup can be retried.'
          noticeTone = 'error'
          continue
        }
        const backup = await resolvePluginRemovalBackup(dshHome, action.removalId)
        if (!backup || !backup.canRestore) {
          notice = isChinese
            ? `这份备份无法自动恢复：${backup?.integrityDetail ?? '恢复材料不存在或不完整'}`
            : `This backup cannot be restored automatically: ${backup?.integrityDetail ?? 'recovery material is missing or incomplete'}`
          noticeTone = 'error'
          continue
        }
        const confirmationOptions: Electron.MessageBoxOptions = {
          type: 'warning',
          title: isChinese ? '恢复插件' : 'Restore plugin',
          message: isChinese
            ? `从这份备份恢复 ${backup.pluginName}？`
            : `Restore ${backup.pluginName} from this backup?`,
          detail: isChinese
            ? '若当前已启用该插件的其他 generation，将切换为这份备份记录的版本。备份本身不会删除。'
            : 'If another generation of this plugin is enabled, it will switch to the version recorded here. The backup itself will be kept.',
          buttons: [isChinese ? '取消' : 'Cancel', isChinese ? '恢复' : 'Restore'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        }
        const owner = safeModeManagerWindow
        const confirmation = owner && !owner.isDestroyed()
          ? await dialog.showMessageBox(owner, confirmationOptions)
          : await dialog.showMessageBox(confirmationOptions)
        if (confirmation.response !== 1) {
          notice = isChinese ? '未恢复插件，备份保持不变。' : 'The plugin was not restored; the backup is unchanged.'
          continue
        }
        const restored = await restorePluginRemovalBackup(
          dshHome,
          action.removalId,
          (line) => runtime.note(line)
        )
        notice = restored.ok
          ? isChinese ? `已恢复 ${backup.pluginName}；请重启正常模式验证。` : `Restored ${backup.pluginName}; restart in normal mode to verify it.`
          : isChinese ? `恢复失败：${restored.reason ?? '未知错误'}` : `Restore failed: ${restored.reason ?? 'unknown error'}`
        noticeTone = restored.ok ? 'success' : 'error'
        continue
      }
      if (action.type === 'backup-delete') {
        if (await refreshMigrationRecoveryLock(dshHome)) {
          notice = isChinese ? 'Profile 恢复事务完成前禁止修改任何恢复材料。' : 'Recovery material is locked until the Profile recovery transaction completes.'
          noticeTone = 'error'
          continue
        }
        const backup = await resolvePluginRemovalBackup(dshHome, action.removalId)
        if (!backup) {
          notice = isChinese ? '这份恢复备份已不存在。' : 'This recovery backup no longer exists.'
          noticeTone = 'error'
          continue
        }
        const confirmationOptions: Electron.MessageBoxOptions = {
          type: 'warning',
          title: isChinese ? '永久删除恢复备份' : 'Permanently delete recovery backup',
          message: isChinese
            ? `永久删除 ${backup.pluginName} 的这份恢复备份？`
            : `Permanently delete this recovery backup for ${backup.pluginName}?`,
          detail: isChinese ? '此操作不可撤销。' : 'This action cannot be undone.',
          buttons: [isChinese ? '取消' : 'Cancel', isChinese ? '永久删除' : 'Delete permanently'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        }
        const owner = safeModeManagerWindow
        const confirmation = owner && !owner.isDestroyed()
          ? await dialog.showMessageBox(owner, confirmationOptions)
          : await dialog.showMessageBox(confirmationOptions)
        if (confirmation.response !== 1) {
          notice = isChinese ? '已保留恢复备份。' : 'The recovery backup was kept.'
          continue
        }
        const cleaned = await cleanupVerifiedRemovalBackup(
          dshHome,
          action.removalId,
          (line) => runtime.note(line)
        )
        notice = cleaned.ok
          ? isChinese ? `已永久删除 ${backup.pluginName} 的这份恢复备份。` : `Permanently deleted the recovery backup for ${backup.pluginName}.`
          : isChinese ? `备份未删除：${cleaned.reason ?? '尚未通过正常启动验证'}` : `Backup kept: ${cleaned.reason ?? 'normal boot has not been verified'}`
        noticeTone = cleaned.ok ? 'success' : 'error'
        continue
      }
      if (action.type === 'restart') {
        const unresolved = compatibility.issues.filter((issue) => issue.severity === 'blocking')
        if (unresolved.length > 0) {
          runtime.note(
            `[safe-mode] user exited with ${unresolved.length} unresolved compatibility issue${unresolved.length === 1 ? '' : 's'}`
          )
        }
        await launchHarness()
        if (await refreshMigrationRecoveryLock(dshHome)) {
          notice = isChinese
            ? 'Profile 恢复事务仍未完成。已继续保留恢复材料和安全模式；请按提示重试。'
            : 'The Profile recovery transaction is still incomplete. Recovery material and Safe Mode remain active; follow the prompt and retry.'
          noticeTone = 'error'
          continue
        }
        void mobileBridge.start().catch(showUnexpectedError)
        return
      }

      if (action.type === 'upgrade') {
        if (await refreshMigrationRecoveryLock(dshHome)) {
          notice = isChinese ? 'Profile 恢复事务完成前禁止升级插件。' : 'Plugins cannot be upgraded until the recovery transaction completes.'
          noticeTone = 'error'
          continue
        }
        const reportsByPkg = new Map((healthReports ?? []).map((r) => [r.packageName, r]))
        const targets = action.plugins.filter((pkg) => {
          const report = reportsByPkg.get(pkg)
          return report?.upgradeReady && report.upgradeVersion
        })

        if (targets.length === 0) {
          notice = isChinese ? '所选插件没有可升级的兼容版本。' : 'No compatible upgrade candidate found for selected plugins.'
          noticeTone = 'error'
          continue
        }

        let upgradedCount = 0
        const failedPackages: string[] = []
        for (const pkg of targets) {
          const report = reportsByPkg.get(pkg)!
          const res = await upgradePluginToGeneration({
            dshHome,
            pluginName: pkg,
            targetVersion: report.upgradeVersion!,
            nodeExecutablePath: bundledNodePath(),
            pnpmEntryPath: bundledPnpmEntryPath(),
            note: (line) => runtime.note(line)
          })
          if (res.ok) {
            upgradedCount++
          } else {
            failedPackages.push(pkg)
          }
        }

        if (failedPackages.length === 0) {
          notice = isChinese
            ? `成功升级 ${upgradedCount} 个插件。`
            : `Successfully upgraded ${upgradedCount} plugin${upgradedCount === 1 ? '' : 's'}.`
          noticeTone = 'success'
        } else {
          notice = isChinese
            ? `成功升级 ${upgradedCount} 个插件，${failedPackages.length} 个升级失败（${failedPackages.join('、')}）。`
            : `Upgraded ${upgradedCount} plugin${upgradedCount === 1 ? '' : 's'}; ${failedPackages.length} failed (${failedPackages.join(', ')}).`
          noticeTone = 'error'
        }
        continue
      }

      if (await refreshMigrationRecoveryLock(dshHome)) {
        notice = isChinese ? 'Profile 恢复事务完成前禁止修改正常 Profile。' : 'The normal Profile is locked until the recovery transaction completes.'
        noticeTone = 'error'
        continue
      }

      const issueById = new Map(compatibility.issues.map((issue) => [issue.id, issue]))
      const selectedIssues = [...new Set(action.issues)]
        .map((id) => issueById.get(id))
        .filter((issue): issue is ProfileCompatibilityIssue => issue !== undefined)
      const installedSet = new Set(installed)
      const selectedPlugins = [...new Set(action.plugins)].filter((plugin) => installedSet.has(plugin))
      if (selectedIssues.length === 0 && selectedPlugins.length === 0) {
        notice = isChinese ? '请选择要处理的插件或遗留项。' : 'Select at least one plugin or leftover to process.'
        noticeTone = 'error'
        continue
      }

      let repaired = 0
      let repairFailures = 0
      if (selectedIssues.length > 0) {
        const result = await repairSafeModeCompatibilityIssues(dshHome, selectedIssues)
        if (result.installFailed) {
          notice = isChinese
            ? `已备份并应用部分修复，但依赖重建失败：${result.installFailed}`
            : `Some recoverable repairs were applied, but dependency rebuild failed: ${result.installFailed}`
          noticeTone = 'error'
          continue
        }
        repaired = result.repaired.length
        repairFailures = result.failed.length
      }

      const failedPlugins: string[] = []
      const pendingPlugins: string[] = []
      for (const plugin of selectedPlugins) {
        const removal = await removeSafeModePlugin(dshHome, plugin)
        if (!removal.disabled) failedPlugins.push(plugin)
        else if (removal.pending) pendingPlugins.push(plugin)
      }
      const disabledPlugins = new Set(selectedPlugins.filter((plugin) => !failedPlugins.includes(plugin)))
      safeModeSuspectedPlugins = safeModeSuspectedPlugins.filter((plugin) => !disabledPlugins.has(plugin))
      const failed = repairFailures + failedPlugins.length
      notice = pendingPlugins.length > 0
        ? isChinese
          ? `已禁用 ${pendingPlugins.length} 个插件；Profile 依赖清理待重试。插件不会在后续启动中重新启用。`
          : `Disabled ${pendingPlugins.length} plugin${pendingPlugins.length === 1 ? '' : 's'}; profile dependency cleanup is pending. They will stay disabled on later launches.`
        : failed === 0
          ? isChinese
            ? `处理完成：修复 ${repaired} 项，卸载 ${selectedPlugins.length} 个插件。`
            : `Completed: ${repaired} repair${repaired === 1 ? '' : 's'} and ${selectedPlugins.length} plugin removal${selectedPlugins.length === 1 ? '' : 's'}.`
          : isChinese
            ? `已修复 ${repaired} 项、卸载 ${selectedPlugins.length - failedPlugins.length} 个插件；${failed} 项未能处理。`
            : `Completed ${repaired} repairs and removed ${selectedPlugins.length - failedPlugins.length} plugins; ${failed} items could not be processed.`
      noticeTone = failed === 0 && pendingPlugins.length === 0 ? 'success' : 'error'
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

/**
 * Pushed on change rather than polled: the preload used to ask every second,
 * in every window, for a flag that only moves when a phone pairs or drops.
 */
function broadcastMobileStatus(connected: boolean): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send('mobile:status-changed', { connected })
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
  ensureTray()
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
    harnessAuthToken: () => runtime.snapshot().authToken,
    locale: harnessLocale,
    brandLogoPaths: {
      light: dshBrandLogoPath('light'),
      dark: dshBrandLogoPath('dark')
    },
    appIconPath: desktopIconPath(),
    cloudflaredCacheDir: join(app.getPath('userData'), 'bin'),
    forceCloudflareFailure: process.env.DSH_TUNNEL_FORCE_PINGGY === '1',
    tunnelLog: (message) => console.warn(message),
    port: developmentBuild ? 43128 : 43127,
    onReconnectRequested: () => {
      void showMobilePairing().catch(showUnexpectedError)
    },
    onConnectedChange: (connected) => broadcastMobileStatus(connected)
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
  ipcMain.handle('harness:open-in-finder', async (event, path?: unknown) => {
    assertTrustedMainWindowEvent(event)
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('A directory path is required.')
    }
    const errorMessage = await shell.openPath(path)
    if (errorMessage) throw new Error(errorMessage)
    return { ok: true }
  })
  ipcMain.removeHandler('harness:renderer-healthy')
  ipcMain.handle('harness:renderer-healthy', (event) => {
    assertTrustedMainWindowEvent(event)
    if (safeModeVisible || failureRecoveryVisible || runtime.snapshot().phase !== 'ready') {
      return { ok: false }
    }
    scheduleNormalProfileBootConfirmation()
    return { ok: true }
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
  ipcMain.handle('safe-mode:action', async (event, action: unknown, selection: unknown) => {
    assertTrustedSafeModeManagerEvent(event)
    if (
      !safeModeVisible ||
      !safeModeManagerVisible ||
      (
        action !== 'apply' &&
        action !== 'upgrade' &&
        action !== 'recovery-open' &&
        action !== 'backup-open' &&
        action !== 'backup-restore' &&
        action !== 'backup-delete' &&
        action !== 'agent' &&
        action !== 'restart' &&
        action !== 'quit'
      )
    ) {
      return { ok: false }
    }
    await refreshMigrationRecoveryLock(join(app.getPath('userData'), 'harness'))
    if (
      (action === 'apply' || action === 'upgrade' || action === 'backup-delete') && profileRecoveryLocked()
    ) return { ok: false }
    if (action === 'apply') {
      if (typeof selection !== 'object' || selection === null) return { ok: false }
      const { plugins, issues } = selection as { plugins?: unknown; issues?: unknown }
      if (
        !Array.isArray(plugins) ||
        !plugins.every((plugin) => typeof plugin === 'string') ||
        !Array.isArray(issues) ||
        !issues.every((issue) => typeof issue === 'string')
      ) {
        return { ok: false }
      }
      resolveSafeModeAction({ type: 'apply', plugins, issues })
    } else if (action === 'upgrade') {
      if (typeof selection !== 'object' || selection === null) return { ok: false }
      const { plugins } = selection as { plugins?: unknown }
      if (
        !Array.isArray(plugins) ||
        !plugins.every((plugin) => typeof plugin === 'string')
      ) {
        return { ok: false }
      }
      resolveSafeModeAction({ type: 'upgrade', plugins })
    } else if (
      action === 'backup-open' ||
      action === 'backup-restore' ||
      action === 'backup-delete'
    ) {
      if (typeof selection !== 'object' || selection === null) return { ok: false }
      const { removalId } = selection as { removalId?: unknown }
      if (typeof removalId !== 'string' || removalId.length === 0) return { ok: false }
      if (
        action === 'backup-restore' &&
        !await canRetryLockedPluginRestore(join(app.getPath('userData'), 'harness'), removalId)
      ) return { ok: false }
      resolveSafeModeAction({ type: action, removalId })
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
  ipcMain.handle('safe-mode:exit', async (event) => {
    assertTrustedMainWindowEvent(event)
    if (!safeModeVisible) return { ok: false }
    const dshHome = join(app.getPath('userData'), 'harness')
    if (await refreshMigrationRecoveryLock(dshHome)) {
      resolveSafeModeAction({ type: 'agent' })
      await launchHarness()
      if (await refreshMigrationRecoveryLock(dshHome)) {
        void showSafeModeManager({
          notice: harnessLocale() === 'zh'
            ? 'Profile 恢复事务仍未完成，正常 Profile 继续保持锁定。'
            : 'The Profile recovery transaction is still incomplete; the normal Profile remains locked.',
          noticeTone: 'error'
        }).catch(showUnexpectedError)
        return { ok: false, blocked: true }
      }
      void mobileBridge.start().catch(showUnexpectedError)
      return { ok: true }
    }
    const compatibility = await inspectProfileCompatibility(
      dshHome,
      join(app.getAppPath(), 'node_modules')
    )
    if (compatibility.issues.some((issue) => issue.severity === 'blocking')) {
      void showSafeModeManager().catch(showUnexpectedError)
      return { ok: false, blocked: true }
    }
    resolveSafeModeAction({ type: 'agent' })
    await launchHarness()
    void mobileBridge.start().catch(showUnexpectedError)
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
        const dshHome = join(app.getPath('userData'), 'harness')
        await quarantineInstalledLaunchAgentsForUpdate(dshHome)
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
  configureGpuFallback()
  installGpuFallbackWatch()
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
      // Windows leaves the tray icon behind as a ghost until the user hovers
      // over it unless it is destroyed explicitly before the process exits.
      if (tray && !tray.isDestroyed()) tray.destroy()
      tray = undefined
      void Promise.all([runtime.stop(), mobileBridge?.stop()]).finally(() => app.quit())
    })
  }
}
