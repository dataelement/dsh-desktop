import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const harness = vi.hoisted(() => ({ appPath: '', constructed: 0 }))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => harness.appPath,
    isPackaged: true,
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
    constructor() {
      harness.constructed += 1
      throw new Error('Invalid application version')
    }
  }
}))

vi.mock('../src/main/desktop-service/diagnostics', () => ({
  attachDiagnostics: () => undefined
}))

beforeEach(() => {
  vi.resetModules()
  harness.constructed = 0
  harness.appPath = mkdtempSync(join(tmpdir(), 'desktop-update-service-failure-'))
  writeFileSync(join(harness.appPath, 'package.json'), JSON.stringify({
    dshDesktopUpdates: { updatesBaseUrl: 'https://updates.example/', strategy: 'policy', policyUrl: 'https://updates.example/policy' }
  }))
})

afterEach(() => {
  rmSync(harness.appPath, { recursive: true, force: true })
  harness.appPath = ''
  vi.resetModules()
})

describe('desktop update service initialization failure', () => {
  it('keeps the constructor error instead of the generic unavailable message', async () => {
    const { checkDesktopUpdate, initializeDesktopUpdateService } = await import('../src/main/desktop-service')
    initializeDesktopUpdateService()
    initializeDesktopUpdateService()

    await expect(checkDesktopUpdate(true)).rejects.toThrow('Invalid application version')
    expect(harness.constructed).toBe(1)
  })
})
