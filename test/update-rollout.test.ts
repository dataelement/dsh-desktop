import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  skipped: vi.fn(), catalog: vi.fn(), send: vi.fn(), policy: vi.fn(), handlers: new Map<string, (...args: any[]) => void>(),
  updater: { setFeedURL: vi.fn(), checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), on: vi.fn(), autoDownload: false, allowDowngrade: false, allowPrerelease: false }
}))
vi.mock('../src/main/update/version-catalog', async importOriginal => ({ ...await importOriginal<object>(), fetchAvailableReleases: mocks.catalog }))
vi.mock('../src/main/update/skipped-version', async importOriginal => ({ ...await importOriginal<object>(), readSkippedVersion: mocks.skipped }))
vi.mock('../src/main/desktop-service', () => ({ checkDesktopUpdate: mocks.policy }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: mocks.updater } }))
vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.8.0', getPath: () => '/nonexistent-desktop-test', isReady: () => true }, BrowserWindow: { getAllWindows: () => [{ isDestroyed: () => false, webContents: { send: mocks.send } }] }, powerMonitor: { on: vi.fn(), removeListener: vi.fn() }, ipcMain: { handle: vi.fn() } }))
vi.mock('../src/main/update/update-policy', async importOriginal => ({ ...await importOriginal<object>(), supportsAutoUpdates: () => true }))
let manager: typeof import('../src/main/update/update-manager')
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); mocks.handlers.clear()
  mocks.updater.on.mockImplementation((event, callback) => { mocks.handlers.set(event, callback) })
  mocks.skipped.mockReturnValue(undefined)
  mocks.catalog.mockResolvedValue([{ version: '0.7.0', tag: 'v0.7.0', archiveUrl: 'https://dshdesktop.com/updates/archive/0.7.0/' }])
  mocks.updater.downloadUpdate.mockResolvedValue([])
  manager = await import('../src/main/update/update-manager')
  manager.startUpdateManager({ prepareToInstall: async () => {} })
})
afterEach(() => manager.stopUpdateManager())
it('does not contact latest or download when no rule is selected, even for a manual check', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: false })
  await manager.checkForUpdates(true)
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.setFeedURL).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(manager.getUpdateStatus().phase).toBe('up-to-date')
})
it('fails closed when the policy service fails', async () => {
  mocks.policy.mockRejectedValue(new Error('policy offline'))
  await manager.checkForUpdates()
  expect(manager.getUpdateStatus().phase).toBe('error')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
})
it('pins the archive, holds the existing lock, and waits for user acceptance to download', async () => {
  let resolve!: (value: unknown) => void
  mocks.policy.mockReturnValue(new Promise(r => { resolve = r }))
  mocks.updater.checkForUpdates.mockImplementation(async () => { mocks.handlers.get('update-available')!({ version: '0.9.0' }); return { updateInfo: { version: '0.9.0' } } })
  const checking = manager.checkForUpdates()
  const manualChecking = manager.checkForUpdates(true)
  expect(mocks.policy).toHaveBeenCalledTimes(1)
  resolve({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  await Promise.all([checking, manualChecking])
  expect(mocks.policy.mock.calls.map(args => args[0])).toEqual([false, true])
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  expect(manager.getUpdateStatus().phase).toBe('available')
  expect(manager.getUpdateStatus().source).toBe('manual')
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  await manager.downloadAvailableUpdate(); expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
})
it('blocks mismatched metadata before it can enter the download UI', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  mocks.updater.checkForUpdates.mockImplementation(async () => { mocks.handlers.get('update-available')!({ version: '0.10.0' }); expect(manager.getUpdateStatus().phase).toBe('error'); return { updateInfo: { version: '0.10.0' } } })
  await manager.checkForUpdates()
  await manager.downloadAvailableUpdate()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})
it('preserves explicitly selected history installs and validates version input', async () => {
  mocks.updater.checkForUpdates.mockImplementation(async () => { mocks.handlers.get('update-available')!({ version: '0.7.0' }); return { updateInfo: { version: '0.7.0' } } })
  await manager.installSpecificVersion('../../unsafe')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  await manager.installSpecificVersion('0.7.0')
  expect(mocks.policy).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: 'https://dshdesktop.com/updates/archive/0.7.0/' })
  expect(mocks.updater.allowDowngrade).toBe(false)
})


it('keeps a manual no-update result until the user dismisses it', async () => {
  vi.useFakeTimers()
  try {
    mocks.policy.mockResolvedValue({ updateAvailable: false })
    await manager.checkForUpdates(true)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(manager.getUpdateStatus()).toMatchObject({ phase: 'up-to-date', source: 'manual' })
  } finally {
    vi.useRealTimers()
  }
})

it('rechecks an available update under manual policy without starting a download', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')!({ version: '0.9.0', releaseNotes: [{ note: 'Improved stability' }] })
    return { updateInfo: { version: '0.9.0' } }
  })
  await manager.checkForUpdates(false, 'startup')
  expect(manager.getUpdateStatus().source).toBe('startup')
  mocks.send.mockClear()
  await manager.checkForUpdates(true)
  expect(mocks.send).toHaveBeenCalledWith('updates:status-changed', expect.objectContaining({ phase: 'available', source: 'manual' }))
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', source: 'manual', manual: true, releaseNotes: 'Improved stability' })
  expect(mocks.policy.mock.calls.map(args => args[0])).toEqual([false, true])
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(2)
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})


it.each(['downloading', 'downloaded'] as const)('reopens a manual result while %s without losing progress', async (phase) => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    return { updateInfo: { version: '0.9.0' } }
  })
  await manager.checkForUpdates()
  if (phase === 'downloading') mocks.handlers.get('download-progress')!({ percent: 25 })
  else mocks.handlers.get('update-downloaded')!({ version: '0.9.0' })
  mocks.send.mockClear()
  await manager.checkForUpdates(true)
  expect(mocks.send).toHaveBeenCalledWith('updates:status-changed', expect.objectContaining({ phase, source: 'manual', availableVersion: '0.9.0' }))
  if (phase === 'downloading') expect(manager.getUpdateStatus().percent).toBe(25)
  expect(mocks.policy).toHaveBeenCalledTimes(1)
})


it('changes presentation only for another explicit request, not progress events', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('checking-for-update')!()
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    return { updateInfo: { version: '0.9.0' } }
  })
  await manager.checkForUpdates(true)
  const firstPresentation = manager.getUpdateStatus().presentationId
  expect(firstPresentation).toBeGreaterThan(0)
  if (firstPresentation === undefined) throw new Error('Missing presentation ID')
  mocks.handlers.get('download-progress')!({ percent: 10 })
  mocks.handlers.get('download-progress')!({ percent: 20 })
  expect(manager.getUpdateStatus().presentationId).toBe(firstPresentation)
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().presentationId).toBeGreaterThan(firstPresentation)
  const secondPresentation = manager.getUpdateStatus().presentationId
  mocks.handlers.get('update-downloaded')!({ version: '0.9.0' })
  expect(manager.getUpdateStatus().presentationId).toBe(secondPresentation)
})


it('uses the current Harness locale for status reads and broadcasts', async () => {
  let locale: 'en' | 'zh' = 'zh'
  manager.registerUpdateHandlers({ locale: () => locale })
  expect(manager.getUpdateStatus().locale).toBe('zh')
  mocks.policy.mockResolvedValue({ updateAvailable: false })
  await manager.checkForUpdates(true)
  expect(mocks.send).toHaveBeenLastCalledWith('updates:status-changed', expect.objectContaining({ locale: 'zh' }))
  locale = 'en'
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus().locale).toBe('en')
  expect(mocks.send).toHaveBeenLastCalledWith('updates:status-changed', expect.objectContaining({ locale: 'en' }))
})


it('rechecks manually after an in-flight automatic cohort miss and shares the lock', async () => {
  let resolveAutomatic: ((value: { updateAvailable: false }) => void) | undefined
  mocks.policy.mockImplementation((manual: boolean) => manual
    ? Promise.resolve({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
    : new Promise(resolve => { resolveAutomatic = resolve }))
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    return { updateInfo: { version: '0.9.0' } }
  })
  const automatic = manager.checkForUpdates()
  const manual = manager.checkForUpdates(true)
  const anotherManual = manager.checkForUpdates(true)
  if (!resolveAutomatic) throw new Error('Automatic check did not start')
  resolveAutomatic({ updateAvailable: false })
  await Promise.all([automatic, manual, anotherManual])
  expect(mocks.policy.mock.calls.map(args => args[0])).toEqual([false, true])
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', manual: true })
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(1)
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})

it('rejects forward/current versions and unpublished rollback versions before archive checks', async () => {
  for (const version of ['0.8.0', '0.9.0']) await manager.installSpecificVersion(version)
  expect(mocks.catalog).not.toHaveBeenCalled()
  await manager.installSpecificVersion('0.6.0')
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'error', message: 'Selected version is not in the release history' })
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})


it('replaces an automatic older offer with the newest enabled manual offer', async () => {
  mocks.policy.mockImplementation(async (manual: boolean) => {
    const version = manual ? '0.10.0' : '0.9.0'
    return { updateAvailable: true, version, feedUrl: `https://dshdesktop.com/updates/archive/${version}/` }
  })
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    const version = mocks.policy.mock.calls.at(-1)?.[0] ? '0.10.0' : '0.9.0'
    mocks.handlers.get('update-available')!({ version })
    return { updateInfo: { version } }
  })
  await manager.checkForUpdates()
  expect(manager.getUpdateStatus().availableVersion).toBe('0.9.0')
  await manager.checkForUpdates(true)
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', availableVersion: '0.10.0', manual: true })
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})


it('recovers a manually requested skipped version after an automatic archive check', async () => {
  mocks.skipped.mockReturnValue('0.9.0')
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  let finishArchive: (() => void) | undefined
  mocks.updater.checkForUpdates.mockImplementationOnce(() => new Promise(resolve => {
    finishArchive = () => {
      mocks.handlers.get('update-available')!({ version: '0.9.0' })
      resolve({ updateInfo: { version: '0.9.0' } })
    }
  })).mockImplementationOnce(async () => {
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    return { updateInfo: { version: '0.9.0' } }
  })
  const automatic = manager.checkForUpdates()
  await vi.waitFor(() => expect(finishArchive).toBeTypeOf('function'))
  const manual = manager.checkForUpdates(true)
  if (!finishArchive) throw new Error('Archive check did not start')
  finishArchive()
  await Promise.all([automatic, manual])
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', manual: true, source: 'manual' })
  expect(manager.getUpdateStatus().presentationId).toBeGreaterThan(0)
  expect(mocks.policy.mock.calls.map(args => args[0])).toEqual([false, true])
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})


it.each([true, false])('keeps consent bound to the clicked offer across a locked check (replacement=%s)', async (replacement) => {
  let finishArchive: (() => void) | undefined
  mocks.policy.mockImplementation(async (manual: boolean) => {
    const version = manual && replacement ? '0.10.0' : '0.9.0'
    return { updateAvailable: true, version, feedUrl: `https://dshdesktop.com/updates/archive/${version}/` }
  })
  mocks.updater.checkForUpdates.mockImplementationOnce(() => new Promise(resolve => {
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    finishArchive = () => resolve({ updateInfo: { version: '0.9.0' } })
  })).mockImplementationOnce(async () => {
    const version = replacement ? '0.10.0' : '0.9.0'
    mocks.handlers.get('update-available')!({ version })
    return { updateInfo: { version } }
  })
  const automatic = manager.checkForUpdates()
  await vi.waitFor(() => expect(manager.getUpdateStatus().phase).toBe('available'))
  const manual = manager.checkForUpdates(true)
  const clickedOldOffer = manager.downloadAvailableUpdate()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  if (!finishArchive) throw new Error('Archive check did not start')
  finishArchive()
  await Promise.all([automatic, manual, clickedOldOffer])
  expect(manager.getUpdateStatus().availableVersion).toBe(replacement ? '0.10.0' : '0.9.0')
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(replacement ? 0 : 1)
  if (replacement) {
    await manager.downloadAvailableUpdate()
    expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
  }
})
