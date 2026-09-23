import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  policy: vi.fn(), handlers: new Map<string, (...args: any[]) => void>(),
  ipc: new Map<string, (...args: any[]) => unknown>(),
  updater: { setFeedURL: vi.fn(), checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), on: vi.fn(), autoDownload: false, allowDowngrade: false, allowPrerelease: false }
}))
vi.mock('../src/main/desktop-service', () => ({ checkDesktopUpdate: mocks.policy }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: mocks.updater } }))
vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.8.0', getPath: () => '/nonexistent-desktop-test', isReady: () => true }, BrowserWindow: { getAllWindows: () => [] }, powerMonitor: { on: vi.fn(), removeListener: vi.fn() }, ipcMain: { handle: vi.fn((channel: string, handler: (...args: any[]) => unknown) => { mocks.ipc.set(channel, handler) }) } }))
vi.mock('../src/main/update/update-policy', async importOriginal => ({ ...await importOriginal<object>(), supportsAutoUpdates: () => true }))
let manager: typeof import('../src/main/update/update-manager')
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); mocks.handlers.clear()
  mocks.updater.on.mockImplementation((event, callback) => { mocks.handlers.set(event, callback) })
  mocks.updater.downloadUpdate.mockResolvedValue([])
  manager = await import('../src/main/update/update-manager')
  manager.startUpdateManager({ prepareToInstall: async () => {} })
})
afterEach(() => manager.stopUpdateManager())
it('does not contact the DSH update feed for a manual check', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/archive/0.9.0/' })
  await manager.checkForUpdates(true)
  expect(mocks.policy).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.setFeedURL).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
  expect(manager.getUpdateStatus().phase).toBe('unsupported')
})
it('does not contact the DSH update feed for a background check', async () => {
  mocks.policy.mockResolvedValue({ updateAvailable: true, version: '0.9.0', feedUrl: 'https://dshdesktop.com/updates/latest/' })
  await manager.checkForUpdates()
  expect(mocks.policy).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.setFeedURL).not.toHaveBeenCalled()
  expect(manager.getUpdateStatus().phase).toBe('unsupported')
})
it('does not fetch the DSH version index', async () => {
  manager.registerUpdateHandlers()
  const listVersions = mocks.ipc.get('updates:list-versions')
  expect(listVersions?.()).toEqual([])
  expect(mocks.updater.setFeedURL).not.toHaveBeenCalled()
})
it('does not download or install a selected archive version', async () => {
  mocks.updater.checkForUpdates.mockImplementation(async () => { mocks.handlers.get('update-available')!({ version: '0.7.0' }); return { updateInfo: { version: '0.7.0' } } })
  await manager.installSpecificVersion('../../unsafe')
  await manager.installSpecificVersion('0.7.0')
  expect(mocks.policy).not.toHaveBeenCalled()
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  expect(mocks.updater.setFeedURL).not.toHaveBeenCalled()
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(mocks.updater.quitAndInstall).not.toHaveBeenCalled()
})
