import { checkDesktopUpdate } from '../desktop-service'
import { isPrereleaseVersion, isVersion } from '../desktop-service/service'
import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../../shared/contracts'
import {
  AUTO_INSTALL_ON_APP_QUIT,
  shouldCheckAfterResume,
  supportsAutoUpdates,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_STARTUP_DELAY_MS,
  UPDATE_STARTUP_JITTER_MS
} from './update-policy'
import {
  initialUpdateStatus,
  reduceUpdateStatus,
  type UpdateStateEvent
} from './update-state'
import {
  readSkippedVersion,
  shouldOfferUpdate,
  skippedVersionPath,
  writeSkippedVersion
} from './skipped-version'
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  STABLE_FEED_URL
} from './version-catalog'

const { autoUpdater } = electronUpdater
const TRANSIENT_STATUS_MS = 8_000

let status = initialUpdateStatus(app.getVersion())
let prepareToInstall: (() => Promise<void>) | undefined
let startupTimer: NodeJS.Timeout | undefined
let intervalTimer: NodeJS.Timeout | undefined
let resetTimer: NodeJS.Timeout | undefined
let checkPromise: Promise<unknown> | undefined
let lastCheckedAt = 0
let installing = false
let downloading = false
let started = false
let handlersRegistered = false
let skippedVersion: string | undefined
let skipLoaded = false
let manualCheck = false
let pendingDowngrade = false
let selectedUpdateVersion: string | undefined

export function getUpdateStatus(): UpdateStatus {
  return { ...status }
}

export function registerUpdateHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true
  ipcMain.handle('updates:status', () => getUpdateStatus())
  ipcMain.handle('updates:check', () => checkForUpdates(true))
  ipcMain.handle('updates:install', () => installDownloadedUpdate())
  ipcMain.handle('updates:skip', (_event, version: unknown) => skipUpdate(version))
  ipcMain.handle('updates:download', () => downloadAvailableUpdate())
  ipcMain.handle('updates:list-versions', () => fetchAvailableReleases(app.getVersion()))
  ipcMain.handle('updates:install-version', (_event, version: unknown) =>
    installSpecificVersion(version)
  )
}

function skipFile(): string {
  return skippedVersionPath(app.getPath('userData'))
}

function currentSkippedVersion(): string | undefined {
  if (!skipLoaded) {
    skippedVersion = readSkippedVersion(skipFile())
    skipLoaded = true
  }
  return skippedVersion
}

/**
 * Stop offering one version. The banner goes away for good rather than until
 * the next launch, and a later release is a new question that still gets
 * asked. A manual check overrides this, which is how the user takes back a
 * version they skipped.
 */
export function skipUpdate(version: unknown): UpdateStatus {
  if (typeof version !== 'string' || !version) return getUpdateStatus()
  skippedVersion = version
  skipLoaded = true
  writeSkippedVersion(skipFile(), version)
  transition({ type: 'reset' })
  return getUpdateStatus()
}

export function startUpdateManager(options: { prepareToInstall: () => Promise<void> }): void {
  prepareToInstall = options.prepareToInstall
  if (started) return
  started = true

  if (!supportsUpdates()) {
    transition({
      type: 'unsupported',
      message: 'Updates are available in installed macOS and Windows builds.'
    })
    return
  }

  configureUpdater()
  startupTimer = setTimeout(
    () => void checkForUpdates(),
    UPDATE_STARTUP_DELAY_MS + Math.random() * UPDATE_STARTUP_JITTER_MS
  )
  intervalTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
  powerMonitor.on('resume', checkAfterResume)
}

export async function checkForUpdates(manual = false): Promise<UpdateStatus> {
  if (!supportsUpdates()) {
    transition(
      {
        type: 'unsupported',
        message: 'Update checks are only available in installed macOS and Windows builds.'
      },
      manual
    )
    if (manual) scheduleReset()
    return getUpdateStatus()
  }

  if (checkPromise || ['available', 'downloading', 'downloaded'].includes(status.phase)) {
    return getUpdateStatus()
  }

  transition({ type: 'check', manual })
  manualCheck = manual
  lastCheckedAt = Date.now()
  selectedUpdateVersion = undefined
  checkPromise = (async () => {
    const policy = await checkDesktopUpdate()
    if (!policy.updateAvailable) {
      transition({ type: 'not-available' })
      scheduleReset()
      return
    }
    selectedUpdateVersion = policy.version
    autoUpdater.setFeedURL({ provider: 'generic', url: policy.feedUrl })
    autoUpdater.allowPrerelease = isPrereleaseVersion(policy.version)
    autoUpdater.allowDowngrade = false
    const result = await autoUpdater.checkForUpdates()
    if (result?.updateInfo.version !== policy.version) throw new Error('Update archive does not match the selected version')
  })()

  try {
    await checkPromise
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
    if (manual) scheduleReset()
  } finally {
    checkPromise = undefined
  }

  return getUpdateStatus()
}

/**
 * Start the download the user just accepted. Consent and download are one
 * action — an update sits at `available` until it is taken.
 */
export async function downloadAvailableUpdate(): Promise<UpdateStatus> {
  if (status.phase !== 'available' || downloading) return getUpdateStatus()
  downloading = true

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
    if (status.manual) scheduleReset()
  } finally {
    downloading = false
  }

  return getUpdateStatus()
}

/**
 * Install a specific past release, downgrades included. The feed is pointed at
 * that version's archive directory for one check + download, then restored to
 * the stable channel. A successful install resumes normal `latest` auto-updates
 * — there is no version pinning.
 */
export async function installSpecificVersion(version: unknown): Promise<UpdateStatus> {
  if (!isVersion(version)) return getUpdateStatus()
  if (!supportsUpdates()) return getUpdateStatus()
  if (checkPromise || ['checking', 'downloading', 'downloaded'].includes(status.phase)) {
    return getUpdateStatus()
  }

  selectedUpdateVersion = version
  pendingDowngrade = compareVersions(version, app.getVersion()) < 0
  autoUpdater.setFeedURL({ provider: 'generic', url: archiveFeedUrl(version) })
  autoUpdater.allowDowngrade = true
  autoUpdater.allowPrerelease = isPrereleaseVersion(version)
  manualCheck = true
  transition({ type: 'check', manual: true })
  lastCheckedAt = Date.now()
  checkPromise = autoUpdater.checkForUpdates()

  try {
    await checkPromise
    if (status.phase === 'available' && status.availableVersion === version) {
      await downloadAvailableUpdate()
    } else if (status.phase !== 'downloading' && status.phase !== 'downloaded') {
      transition({ type: 'error', message: '在更新源未找到该版本' })
      scheduleReset()
    }
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
    scheduleReset()
  } finally {
    checkPromise = undefined
    autoUpdater.setFeedURL({ provider: 'generic', url: STABLE_FEED_URL })
    autoUpdater.allowDowngrade = false
    pendingDowngrade = false
    autoUpdater.allowPrerelease = false
  }

  return getUpdateStatus()
}

export async function installDownloadedUpdate(): Promise<void> {
  if (status.phase !== 'downloaded' || installing) return
  installing = true

  try {
    await prepareToInstall?.()
    autoUpdater.quitAndInstall(false, true)
  } catch (error) {
    installing = false
    transition({ type: 'error', message: errorMessage(error) }, true)
    scheduleReset()
  }
}

export function stopUpdateManager(): void {
  if (startupTimer) clearTimeout(startupTimer)
  if (intervalTimer) clearInterval(intervalTimer)
  if (resetTimer) clearTimeout(resetTimer)
  startupTimer = undefined
  intervalTimer = undefined
  resetTimer = undefined
  if (started && app.isReady()) powerMonitor.removeListener('resume', checkAfterResume)
}

function configureUpdater(): void {
  // The download is ours to start: an update the user skipped should not be
  // fetched at all, and update-available is the only place that is known.
  autoUpdater.autoDownload = false
  // Reset here too: `installSpecificVersion` turns this on transiently, and its
  // `finally` may not run if the process is killed mid-flow.
  autoUpdater.allowDowngrade = false
  autoUpdater.autoInstallOnAppQuit = AUTO_INSTALL_ON_APP_QUIT
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = {
    info: (...args: unknown[]) => console.info('[updater]', ...args),
    warn: (...args: unknown[]) => console.warn('[updater]', ...args),
    error: (...args: unknown[]) => console.error('[updater]', ...args),
    debug: (...args: unknown[]) => console.debug('[updater]', ...args)
  }

  autoUpdater.on('checking-for-update', () =>
    transition({ type: 'check', manual: status.manual })
  )
  autoUpdater.on('update-available', (info) => {
    if (info.version !== selectedUpdateVersion) {
      transition({ type: 'error', message: 'Update archive does not match the selected version' })
      return
    }
    if (!shouldOfferUpdate(info.version, currentSkippedVersion(), manualCheck)) {
      console.info('[updater] skipping', info.version, 'at the user’s request')
      transition({ type: 'reset' })
      return
    }
    // Offered, not fetched: nothing leaves the network until the user accepts
    // the update, which is the same click that starts the download.
    transition({ type: 'available', version: info.version })
  })
  autoUpdater.on('download-progress', (progress) =>
    transition({ type: 'progress', percent: progress.percent })
  )
  autoUpdater.on('update-not-available', () => {
    transition({ type: 'not-available' })
    scheduleReset()
  })
  autoUpdater.on('update-downloaded', (info) =>
    transition({ type: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (error) => {
    transition({ type: 'error', message: errorMessage(error) })
    if (status.manual) scheduleReset()
  })
}

function transition(event: UpdateStateEvent, manualOverride?: boolean): void {
  if (event.type !== 'reset' && resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = undefined
  }

  status = reduceUpdateStatus(status, event)
  if (manualOverride !== undefined) status.manual = manualOverride
  if (pendingDowngrade && event.type !== 'reset') status.downgrade = true

  console.info('[updater] status', status.phase, status.percent ?? '')
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status-changed', getUpdateStatus())
  }
}

function scheduleReset(): void {
  if (!status.manual) return
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => transition({ type: 'reset' }), TRANSIENT_STATUS_MS)
}

function checkAfterResume(): void {
  if (shouldCheckAfterResume(lastCheckedAt)) void checkForUpdates()
}

function supportsUpdates(): boolean {
  return supportsAutoUpdates(app.isPackaged, process.platform)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
