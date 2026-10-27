import { encodePopupNotesMetadata } from '../../shared/update-release-notes'
import { join } from 'node:path'
import { ApplicationRollback, type ApplicationRollbackStatus } from './application-rollback'
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
  normalizeReleaseNotes,
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

let status = initialUpdateStatus(app.getVersion())
let prepareToInstall: (() => Promise<void>) | undefined
let installFailed: (() => Promise<void>) | undefined
let canCheckAutomatically: (() => boolean) | undefined
let startupTimer: NodeJS.Timeout | undefined
let intervalTimer: NodeJS.Timeout | undefined
let checkPromise: Promise<unknown> | undefined
let lastCheckedAt = 0
let installing = false
let downloading = false
let started = false
let handlersRegistered = false
let updateLocale: (() => 'en' | 'zh') | undefined
let skippedVersion: string | undefined
let skipLoaded = false
let manualCheck = false
let manualCheckRequested = false
let presentationId = 0
let pendingDowngrade = false
let selectedUpdateVersion: string | undefined
let rollbackLedger: ApplicationRollback | undefined
let rollbackPromise: Promise<UpdateStatus> | undefined
let rollbackTarget: string | undefined
const ROLLBACK_OWNER = Symbol('application-rollback')
let rollbackOwnsUpdater = false
let rollbackCompatibility: ((targetVersion: string) => Promise<{ compatible: boolean; reason?: string }>) | undefined

function applicationRollback(): ApplicationRollback {
  return rollbackLedger ??= new ApplicationRollback(join(app.getPath('userData'), 'application-rollback.json'), {
    version: app.getVersion(), platform: process.platform, arch: process.arch, packaged: app.isPackaged
  })
}

export async function getApplicationRollbackStatus(): Promise<ApplicationRollbackStatus> {
  try {
    const result = await applicationRollback().status()
    if (!result.available || !result.targetVersion) return result
    if (!rollbackCompatibility) return { ...result, available: false, reason: 'data-compatibility-unverified' }
    const compatibility = await rollbackCompatibility(result.targetVersion)
    if (!compatibility.compatible) return { ...result, available: false, reason: compatibility.reason ?? 'data-compatibility-unverified' }
    const releases = await fetchAvailableReleases(app.getVersion())
    if (!releases.some(release => release.version === result.targetVersion)) {
      return { ...result, available: false, reason: 'previous-version-archive-unavailable' }
    }
    return result
  } catch (error) {
    return { available: false, reason: errorMessage(error) }
  }
}

/** No renderer-supplied version: recovery can only return to the actual prior installation. */
export async function rollbackApplication(): Promise<UpdateStatus> {
  if (rollbackPromise) return rollbackPromise
  rollbackPromise = (async () => {
    const available = await getApplicationRollbackStatus()
    if (!available.available) throw new Error(available.reason ?? 'rollback-unavailable')
    if (checkPromise || downloading || installing || ['checking', 'downloading', 'downloaded'].includes(status.phase)) {
      throw new Error('updater-busy')
    }
    try {
      rollbackOwnsUpdater = true
      rollbackTarget = await applicationRollback().begin()
      const result = await installSpecificVersionOwned(rollbackTarget, ROLLBACK_OWNER)
      if (result.phase !== 'downloaded' || result.availableVersion !== rollbackTarget) {
        throw new Error(result.message ?? 'rollback-download-failed')
      }
      const requested = await installDownloadedUpdateOwned(ROLLBACK_OWNER)
      if (!requested) throw new Error(status.message ?? 'rollback-install-not-requested')
      if (status.phase === 'error') throw new Error(status.message ?? 'rollback-install-failed')
      return getUpdateStatus()
    } catch (error) {
      try { await applicationRollback().fail(errorMessage(error)) }
      catch (journalError) {
        throw new Error(`${errorMessage(error)}; rollback journal write failed: ${errorMessage(journalError)}`)
      }
      throw error
    } finally {
      rollbackTarget = undefined
      rollbackOwnsUpdater = false
    }
  })()
  try { return await rollbackPromise } finally { rollbackPromise = undefined }
}

export function getUpdateStatus(): UpdateStatus {
  return { ...status, locale: updateLocale?.() }
}

export function registerUpdateHandlers(options: { locale?: () => 'en' | 'zh' } = {}): void {
  updateLocale = options.locale ?? updateLocale
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
  if (rollbackOwnsUpdater || installing) return getUpdateStatus()
  if (typeof version !== 'string' || !version) return getUpdateStatus()
  skippedVersion = version
  skipLoaded = true
  writeSkippedVersion(skipFile(), version)
  transition({ type: 'reset' })
  return getUpdateStatus()
}

export function startUpdateManager(options: {
  prepareToInstall: () => Promise<void>
  installFailed?: () => Promise<void>
  canCheckAutomatically?: () => boolean
  rollbackCompatibility?: (targetVersion: string) => Promise<{ compatible: boolean; reason?: string }>
}): void {
  prepareToInstall = options.prepareToInstall
  installFailed = options.installFailed
  canCheckAutomatically = options.canCheckAutomatically
  rollbackCompatibility = options.rollbackCompatibility
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
    () => void checkForUpdates(false, 'startup'),
    UPDATE_STARTUP_DELAY_MS + Math.random() * UPDATE_STARTUP_JITTER_MS
  )
  intervalTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
  powerMonitor.on('resume', checkAfterResume)
}

export async function checkForUpdates(manual = false, source: UpdateStatus['source'] = manual ? 'manual' : 'runtime'): Promise<UpdateStatus> {
  if (rollbackOwnsUpdater || installing || (!manual && canCheckAutomatically?.() === false)) return getUpdateStatus()
  if (manual) status.presentationId = ++presentationId
  if (!supportsUpdates()) {
    transition(
      {
        type: 'unsupported',
        message: 'Update checks are only available in installed macOS and Windows builds.'
      },
      manual
    )
    return getUpdateStatus()
  }

  if (checkPromise) {
    if (manual) {
      manualCheckRequested = true
      transition({ type: 'present-manual' })
    }
    await checkPromise
    return getUpdateStatus()
  }
  if (['downloading', 'downloaded'].includes(status.phase) || (!manual && status.phase === 'available')) {
    if (manual) {
      manualCheck = true
      transition({ type: 'present-manual' })
    }
    return getUpdateStatus()
  }

  transition({ type: 'check', manual, source })
  manualCheck = manual
  manualCheckRequested = manual
  lastCheckedAt = Date.now()
  selectedUpdateVersion = undefined
  checkPromise = (async () => {
    try {
      let requestManual = manual
      while (true) {
        manualCheck = requestManual
        const policy = await checkDesktopUpdate(requestManual)
        // A manual request during the automatic policy check must get its own
        // decision; showing the automatic cohort miss would be misleading.
        if (!requestManual && manualCheckRequested) {
          requestManual = true
          status.presentationId = presentationId
          transition({ type: 'check', manual: true })
          continue
        }
        if (!policy.updateAvailable) {
          transition({ type: 'not-available' })
          return
        }
        selectedUpdateVersion = policy.version
        autoUpdater.setFeedURL({ provider: 'generic', url: policy.feedUrl })
        autoUpdater.allowPrerelease = isPrereleaseVersion(policy.version)
        autoUpdater.allowDowngrade = false
        const result = await autoUpdater.checkForUpdates()
        if (result?.updateInfo.version !== policy.version) throw new Error('Update archive does not match the selected version')
        if (!requestManual && manualCheckRequested) {
          // The archive check also runs under the same lock. Re-evaluate the
          // manual policy before releasing it, without starting a download.
          requestManual = true
          status.presentationId = presentationId
          transition({ type: 'check', manual: true })
          continue
        }
        return
      }
    } catch (error) {
      transition({ type: 'error', message: errorMessage(error) })
    } finally {
      checkPromise = undefined
    }
  })()
  await checkPromise

  return getUpdateStatus()
}

/**
 * Start the download the user just accepted. Consent and download are one
 * action — an update sits at `available` until it is taken.
 */
export async function downloadAvailableUpdate(): Promise<UpdateStatus> {
  return downloadAvailableUpdateOwned()
}

async function downloadAvailableUpdateOwned(owner?: symbol): Promise<UpdateStatus> {
  if ((rollbackOwnsUpdater && owner !== ROLLBACK_OWNER) || installing) return getUpdateStatus()
  if (status.phase !== 'available' || downloading) return getUpdateStatus()
  const expectedVersion = status.availableVersion
  // A queued manual check can replace an automatic offer. Consent to A must
  // not download B; history installs already own this lock and cannot await it.
  if (checkPromise && !pendingDowngrade) await checkPromise
  if (status.phase !== 'available' || status.availableVersion !== expectedVersion || downloading) {
    return getUpdateStatus()
  }
  downloading = true

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
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
  return installSpecificVersionOwned(version)
}

async function installSpecificVersionOwned(version: unknown, owner?: symbol): Promise<UpdateStatus> {
  if ((rollbackOwnsUpdater && owner !== ROLLBACK_OWNER) || installing) return getUpdateStatus()
  if (!isVersion(version) || compareVersions(version, app.getVersion()) >= 0) return getUpdateStatus()
  if (!supportsUpdates()) return getUpdateStatus()
  if (checkPromise || ['checking', 'downloading', 'downloaded'].includes(status.phase)) {
    return getUpdateStatus()
  }

  manualCheck = true
  status.presentationId = ++presentationId
  transition({ type: 'check', manual: true })
  lastCheckedAt = Date.now()
  checkPromise = (async () => {
    try {
      const releases = await fetchAvailableReleases(app.getVersion())
      if (!releases.some(release => release.version === version)) {
        throw new Error('Selected version is not in the release history')
      }
      selectedUpdateVersion = version
      pendingDowngrade = true
      autoUpdater.setFeedURL({ provider: 'generic', url: archiveFeedUrl(version) })
      autoUpdater.allowDowngrade = true
      autoUpdater.allowPrerelease = isPrereleaseVersion(version)
      const result = await autoUpdater.checkForUpdates()
      if (result?.updateInfo.version !== version) throw new Error('Update archive does not match the selected version')
      if (status.phase === 'available' && status.availableVersion === version) {
        await downloadAvailableUpdateOwned(owner)
      } else if (status.phase !== 'downloading' && status.phase !== 'downloaded') {
        transition({ type: 'error', message: '在更新源未找到该版本' })
      }
    } catch (error) {
      transition({ type: 'error', message: errorMessage(error) })
    } finally {
      checkPromise = undefined
      autoUpdater.setFeedURL({ provider: 'generic', url: STABLE_FEED_URL })
      autoUpdater.allowDowngrade = false
      pendingDowngrade = false
      autoUpdater.allowPrerelease = false
    }
  })()
  await checkPromise

  return getUpdateStatus()
}

export async function installDownloadedUpdate(): Promise<void> {
  await installDownloadedUpdateOwned()
}

async function installDownloadedUpdateOwned(owner?: symbol): Promise<boolean> {
  if (rollbackOwnsUpdater && owner !== ROLLBACK_OWNER) return false
  if (status.phase !== 'downloaded' || installing) return false
  const version = status.availableVersion
  if (!version || version !== selectedUpdateVersion || (rollbackTarget && version !== rollbackTarget)) {
    transition({ type: 'error', message: 'downloaded-version-mismatch' }, true)
    return false
  }
  installing = true
  let prepareStarted = false

  try {
    // Persist all fallible journal work before stopping the runtime. The
    // installer state is not proof that the replacement application launched.
    if (rollbackTarget) await applicationRollback().markInstalling()
    else await applicationRollback().recordUpgrade(version)
    if (!prepareToInstall) throw new Error('updater-not-initialized')
    prepareStarted = true
    await prepareToInstall()
    if (status.phase !== 'downloaded' || status.availableVersion !== version) {
      throw new Error('downloaded-update-changed-during-install')
    }
    autoUpdater.quitAndInstall(false, true)
    return true
  } catch (error) {
    let message = errorMessage(error)
    if (prepareStarted && installFailed) {
      try { await installFailed() }
      catch (recoveryError) {
        message += `; installation failure recovery failed: ${errorMessage(recoveryError)}`
      }
    }
    installing = false
    transition({ type: 'error', message }, true)
    return false
  }
}

export function stopUpdateManager(): void {
  if (startupTimer) clearTimeout(startupTimer)
  if (intervalTimer) clearInterval(intervalTimer)
  startupTimer = undefined
  intervalTimer = undefined
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
    transition({ type: 'check', manual: status.manual, source: status.source })
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
    transition({ type: 'available', version: info.version, releaseNotes: encodePopupNotesMetadata(info) ?? normalizeReleaseNotes(info.releaseNotes) })
  })
  autoUpdater.on('download-progress', (progress) =>
    transition({ type: 'progress', percent: progress.percent })
  )
  autoUpdater.on('update-not-available', () => {
    transition({ type: 'not-available' })
  })
  autoUpdater.on('update-downloaded', (info) => {
    if (info.version !== selectedUpdateVersion) {
      transition({ type: 'error', message: 'Update archive does not match the selected version' })
      return
    }
    transition({ type: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    transition({ type: 'error', message: errorMessage(error) })
  })
}

function transition(event: UpdateStateEvent, manualOverride?: boolean): void {
  status = reduceUpdateStatus(status, event)
  if (manualOverride !== undefined) {
    status.manual = manualOverride
    if (manualOverride) status.source = 'manual'
  }
  if (pendingDowngrade && event.type !== 'reset') status.downgrade = true

  console.info('[updater] status', status.phase, status.percent ?? '')
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status-changed', getUpdateStatus())
  }
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
