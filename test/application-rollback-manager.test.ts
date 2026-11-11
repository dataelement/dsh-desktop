import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApplicationRollback } from '../src/main/update/application-rollback'

const mocks = vi.hoisted(() => ({ root: '', catalog: vi.fn(), netFetch: vi.fn(), handlers: new Map<string, (info: { version: string }) => void>(),
  updater: { setFeedURL: vi.fn(), checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), on: vi.fn() } }))
vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.13.0', getPath: () => mocks.root, isReady: () => true },
  BrowserWindow: { getAllWindows: () => [] }, powerMonitor: { on: vi.fn(), removeListener: vi.fn() }, ipcMain: { handle: vi.fn() },
  net: { fetch: mocks.netFetch } }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: mocks.updater } }))
vi.mock('../src/main/desktop-service', () => ({ checkDesktopUpdate: vi.fn() }))
vi.mock('../src/main/update/version-catalog', async original => ({ ...await original<object>(), fetchAvailableReleases: mocks.catalog }))
let manager: typeof import('../src/main/update/update-manager')
beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.handlers.clear()
  mocks.root = await mkdtemp(join(tmpdir(), 'dsh-rollback-manager-'))
  mocks.updater.on.mockImplementation((event: string, callback: (info: { version: string }) => void) => mocks.handlers.set(event, callback))
  mocks.catalog.mockResolvedValue([{ version: '0.11.2' }, { version: '0.12.1' }])
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')?.({ version: '0.11.2' })
    return { updateInfo: { version: '0.11.2' } }
  })
  mocks.updater.downloadUpdate.mockImplementation(async () => {
    mocks.handlers.get('update-downloaded')?.({ version: '0.11.2' })
    return []
  })
  await usePlatform('darwin')
})

async function usePlatform(platform: NodeJS.Platform) {
  // The original recovery assertions require a supported installation, not the test host's OS.
  vi.stubGlobal('process', Object.create(process, {
    platform: { value: platform },
    arch: { value: 'x64' }
  }))
  await new ApplicationRollback(join(mocks.root, 'application-rollback.json'), {
    version: '0.11.2', platform, arch: 'x64', packaged: true
  }).recordUpgrade('0.13.0')
  vi.resetModules()
  manager = await import('../src/main/update/update-manager')
}

afterEach(async () => {
  try {
    manager.stopUpdateManager()
    await rm(mocks.root, { recursive: true, force: true })
  } finally {
    vi.unstubAllGlobals()
  }
})

async function expectDesktopSessionRequest(request: unknown): Promise<void> {
  expect(request).toEqual(expect.any(Function))
  if (typeof request !== 'function') throw new Error('missing version index request')
  const signal = new AbortController().signal
  const response = { ok: true, status: 200, json: async () => ({ versions: [] }) }
  mocks.netFetch.mockResolvedValue(response)
  await expect(request('https://dshdesktop.com/updates/versions.json', { signal })).resolves.toBe(response)
  expect(mocks.netFetch).toHaveBeenCalledWith('https://dshdesktop.com/updates/versions.json', { signal })
}

it('keeps recovery downgrade closed without a verified data compatibility policy', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {} })
  expect(await manager.getApplicationRollbackStatus()).toMatchObject({ available: false, reason: 'data-compatibility-unverified' })
  await expect(manager.rollbackApplication()).rejects.toThrow('data-compatibility-unverified')
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})
it.each(['darwin', 'win32'] as const)('downloads only the actual pre-upgrade version and invokes the existing verified installer on %s', async platform => {
  await usePlatform(platform)
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  await manager.rollbackApplication()
  const requests = mocks.catalog.mock.calls.map(call => call[1])
  expect(requests.length).toBeGreaterThan(0)
  expect(new Set(requests).size).toBe(1)
  expect(mocks.catalog).toHaveBeenCalledWith('0.13.0', requests[0])
  await expectDesktopSessionRequest(requests[0])
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: 'https://dshdesktop.com/updates/archive/0.11.2/' })
  expect(mocks.updater.quitAndInstall).toHaveBeenCalledWith(false, true)
  expect(await manager.getApplicationRollbackStatus()).toMatchObject({ available: false, reason: 'rollback-installing' })
})
it('keeps Linux recovery unsupported even with a compatible previous installation', async () => {
  await usePlatform('linux')
  const prepare = vi.fn(async () => {})
  manager.startUpdateManager({ prepareToInstall: prepare, rollbackCompatibility: async () => ({ compatible: true }) })
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'unsupported' })
  expect(await manager.getApplicationRollbackStatus()).toEqual({ available: false, reason: 'unsupported-installation' })
  await expect(manager.rollbackApplication()).rejects.toThrow('unsupported-installation')
  expect(mocks.catalog).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(prepare).not.toHaveBeenCalled()
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})

it('blocks missing exact archive rather than selecting a nearby release', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.catalog.mockResolvedValue([{ version: '0.12.1' }])
  await expect(manager.rollbackApplication()).rejects.toThrow('previous-version-archive-unavailable')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
})
it('persists failed downloads and prevents repeat installation attempts', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.updater.downloadUpdate.mockRejectedValue(new Error('checksum mismatch'))
  await expect(manager.rollbackApplication()).rejects.toThrow('checksum mismatch')
  await expect(manager.rollbackApplication()).rejects.toThrow('checksum mismatch')
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})
it('rejects archive metadata for the wrong application before downloading', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.updater.checkForUpdates.mockImplementation(async () => ({ updateInfo: { version: '0.12.1' } }))
  await expect(manager.rollbackApplication()).rejects.toThrow('Update archive does not match')
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})

it('keeps other update handlers from replacing the payload while recovery prepares installation', async () => {
  let release: (() => void) | undefined
  let prepared: (() => void) | undefined
  const preparing = new Promise<void>(resolve => { prepared = resolve })
  const finish = new Promise<void>(resolve => { release = resolve })
  manager.startUpdateManager({ prepareToInstall: async () => { prepared?.(); await finish }, rollbackCompatibility: async () => ({ compatible: true }) })
  const rollback = manager.rollbackApplication()
  await preparing
  await manager.checkForUpdates(true)
  await manager.installSpecificVersion('0.12.1')
  await manager.installDownloadedUpdate()
  manager.skipUpdate('0.11.2')
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'downloaded', availableVersion: '0.11.2' })
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(1)
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
  release?.()
  await rollback
  expect(mocks.updater.quitAndInstall).toHaveBeenCalledTimes(1)
})
it('does not claim installation when runtime preparation fails', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => { throw new Error('runtime-stop-failed') }, rollbackCompatibility: async () => ({ compatible: true }) })
  await expect(manager.rollbackApplication()).rejects.toThrow('runtime-stop-failed')
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
  expect(await manager.getApplicationRollbackStatus()).toMatchObject({ available: false, targetVersion: '0.11.2', reason: 'runtime-stop-failed' })
})
it('persists installer exceptions as failure without losing the previous installed version', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.updater.quitAndInstall.mockImplementationOnce(() => { throw new Error('installer-not-started') })
  await expect(manager.rollbackApplication()).rejects.toThrow('installer-not-started')
  expect(await manager.getApplicationRollbackStatus()).toMatchObject({ available: false, targetVersion: '0.11.2', reason: 'installer-not-started' })
})
it('rejects downloaded metadata for a different payload', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => {}, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.updater.downloadUpdate.mockImplementationOnce(async () => {
    mocks.handlers.get('update-downloaded')?.({ version: '0.12.1' })
    return []
  })
  await expect(manager.rollbackApplication()).rejects.toThrow('Update archive does not match')
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})

it('restores the recovery environment after runtime preparation has started and failed', async () => {
  const restore = vi.fn(async () => {})
  manager.startUpdateManager({ prepareToInstall: async () => { throw new Error('stop-failed') },
    installFailed: restore, rollbackCompatibility: async () => ({ compatible: true }) })
  await expect(manager.rollbackApplication()).rejects.toThrow('stop-failed')
  expect(restore).toHaveBeenCalledTimes(1)
})
it('does not stop or restore the runtime for an archive failure before installation preparation', async () => {
  const prepare = vi.fn(async () => {})
  const restore = vi.fn(async () => {})
  manager.startUpdateManager({ prepareToInstall: prepare, installFailed: restore, rollbackCompatibility: async () => ({ compatible: true }) })
  mocks.updater.downloadUpdate.mockRejectedValueOnce(new Error('invalid-checksum'))
  await expect(manager.rollbackApplication()).rejects.toThrow('invalid-checksum')
  expect(prepare).not.toHaveBeenCalled()
  expect(restore).not.toHaveBeenCalled()
})
it('retains the original install error and reports an unsuccessful runtime restoration', async () => {
  manager.startUpdateManager({ prepareToInstall: async () => { throw new Error('stop-failed') },
    installFailed: async () => { throw new Error('safe-runtime-failed') }, rollbackCompatibility: async () => ({ compatible: true }) })
  await expect(manager.rollbackApplication()).rejects.toThrow('stop-failed; installation failure recovery failed: safe-runtime-failed')
})
it('suppresses automatic update checks in recovery while preserving explicit manual checks', async () => {
  const allowed = vi.fn(() => false)
  manager.startUpdateManager({ prepareToInstall: async () => {}, canCheckAutomatically: allowed })
  await manager.checkForUpdates(false, 'startup')
  expect(manager.getUpdateStatus().phase).toBe('idle')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().phase).not.toBe('idle')
})
