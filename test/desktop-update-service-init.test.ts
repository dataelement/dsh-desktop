import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const harness = vi.hoisted(() => ({
  packaged: false,
  appPath: '',
  constructed: 0,
  attached: 0,
  checkUpdate: vi.fn(async (_manual?: boolean) => ({ updateAvailable: false as const }))
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => harness.appPath || process.cwd(),
    get isPackaged() { return harness.packaged },
    getVersion: () => '0.12.1',
    getPath: () => '/tmp/dsh-desktop-update-service',
    whenReady: () => Promise.resolve(),
    getGPUInfo: async () => ({}),
    isHardwareAccelerationEnabled: () => true,
    getAppMetrics: () => []
  },
  dialog: { showMessageBox: vi.fn(async () => ({ response: 0 })) },
  net: { fetch: vi.fn() }
}))

vi.mock('../src/main/desktop-service/service', () => ({
  DesktopService: class {
    constructor() { harness.constructed += 1 }
    pending() { return [] }
    beginSession() {}
    checkUpdate(manual = false) { return harness.checkUpdate(manual) }
  }
}))

vi.mock('../src/main/desktop-service/diagnostics', () => ({
  attachDiagnostics: () => { harness.attached += 1 }
}))

describe('official desktop update service', () => {
  it('does not initialize a policy service or diagnostics for a feed-only update check', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'desktop-update-feed-'))
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ dshDesktopUpdates: { updatesBaseUrl: 'https://updates.example/', strategy: 'feed' } }))
      harness.appPath = dir
      harness.packaged = true
      vi.resetModules()
      const { initializeDesktopUpdateService } = await import('../src/main/desktop-service')
      initializeDesktopUpdateService()
      expect(harness.constructed).toBe(0)
      expect(harness.attached).toBe(0)
    } finally {
      harness.appPath = ''
      harness.packaged = false
      vi.resetModules()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('creates only the policy service for a packaged check', async () => {
    const { checkDesktopUpdate, initializeDesktopUpdateService } = await import('../src/main/desktop-service')
    await expect(checkDesktopUpdate(true)).rejects.toThrow('Desktop update service is unavailable')

    initializeDesktopUpdateService()
    expect(harness.constructed).toBe(0)
    expect(harness.attached).toBe(0)

    harness.packaged = true
    initializeDesktopUpdateService()
    initializeDesktopUpdateService()

    await expect(checkDesktopUpdate(true)).resolves.toEqual({ updateAvailable: false })
    expect(harness.constructed).toBe(1)
    expect(harness.attached).toBe(0)
    expect(harness.checkUpdate).toHaveBeenCalledWith(true)
  })
})
