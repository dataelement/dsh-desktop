import { afterEach, describe, expect, it, vi } from 'vitest'

const fakes = vi.hoisted(() => {
  class FakeAutoUpdater {
    autoDownload = true
    autoInstallOnAppQuit = true
    allowPrerelease = true
    logger: unknown
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>()

    on(event: string, listener: (...args: unknown[]) => void): this {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])
      return this
    }

    private emit(event: string, value: unknown): void {
      for (const listener of this.listeners.get(event) ?? []) listener(value)
    }

    async checkForUpdates(): Promise<void> {
      this.emit('update-available', { version: '0.6.0' })
    }

    async downloadUpdate(): Promise<string[]> {
      this.emit('download-progress', { percent: 44.4 })
      this.emit('update-downloaded', { version: '0.6.0' })
      return ['/tmp/sherlock-update.zip']
    }

    quitAndInstall(): void {}
  }

  return {
    autoUpdater: new FakeAutoUpdater(),
    ipcHandle: vi.fn(),
    powerOn: vi.fn(),
    powerRemove: vi.fn()
  }
})

vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.5.0',
    isPackaged: true,
    isReady: () => false
  },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: fakes.ipcHandle },
  powerMonitor: { on: fakes.powerOn, removeListener: fakes.powerRemove }
}))

vi.mock('electron-updater', () => ({
  default: { autoUpdater: fakes.autoUpdater }
}))

import {
  checkForUpdates,
  downloadAvailableUpdate,
  getUpdateStatus,
  startUpdateManager,
  stopUpdateManager
} from '../src/main/update/update-manager'

afterEach(() => stopUpdateManager())

describe('desktop update manager', () => {
  it('discovers without downloading and downloads only after the explicit action', async () => {
    const download = vi.spyOn(fakes.autoUpdater, 'downloadUpdate')
    startUpdateManager({ prepareToInstall: async () => {} })

    await checkForUpdates()
    expect(getUpdateStatus()).toMatchObject({
      phase: 'available',
      availableVersion: '0.6.0'
    })
    expect(fakes.autoUpdater.autoDownload).toBe(false)
    expect(download).not.toHaveBeenCalled()

    await downloadAvailableUpdate()
    expect(download).toHaveBeenCalledOnce()
    expect(getUpdateStatus()).toMatchObject({
      phase: 'downloaded',
      availableVersion: '0.6.0'
    })
  })
})
