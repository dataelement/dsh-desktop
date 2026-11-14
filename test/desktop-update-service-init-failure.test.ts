import { describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ constructed: 0 }))

vi.mock('electron', () => ({
  app: {
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

describe('desktop update service initialization failure', () => {
  it('keeps the constructor error instead of the generic unavailable message', async () => {
    const { checkDesktopUpdate, initializeDesktopUpdateService } = await import('../src/main/desktop-service')
    initializeDesktopUpdateService()
    initializeDesktopUpdateService()

    await expect(checkDesktopUpdate(true)).rejects.toThrow('Invalid application version')
    expect(harness.constructed).toBe(1)
  })
})
