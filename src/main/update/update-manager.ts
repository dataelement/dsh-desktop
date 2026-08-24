import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../../shared/contracts'
import {
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
let started = false
let handlersRegistered = false

export function getUpdateStatus(): UpdateStatus {
  return { ...status }
}

export function registerUpdateHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true
  ipcMain.handle('updates:status', () => getUpdateStatus())
  ipcMain.handle('updates:download', () => downloadAvailableUpdate())
  ipcMain.handle('updates:install', () => installDownloadedUpdate())
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
  lastCheckedAt = Date.now()
  checkPromise = autoUpdater.checkForUpdates()

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

export async function downloadAvailableUpdate(): Promise<UpdateStatus> {
  if (status.phase !== 'available') return getUpdateStatus()

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) }, true)
  }

  return getUpdateStatus()
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
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
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
  autoUpdater.on('update-available', (info) =>
    transition({ type: 'available', version: info.version })
  )
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
