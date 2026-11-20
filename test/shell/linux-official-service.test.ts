import { expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  getPath: vi.fn(),
  fetch: vi.fn(),
  attach: vi.fn(() => ({ dispose: vi.fn() })),
  checkUpdate: vi.fn(async () => ({ updateAvailable: false as const }))
}))
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getPath: native.getPath,
    getVersion: () => '0.14.1',
    getLocale: () => 'en-US',
    whenReady: () => Promise.resolve(),
    getGPUInfo: async () => ({}),
    isHardwareAccelerationEnabled: () => true,
    getAppMetrics: () => []
  },
  dialog: { showMessageBox: vi.fn() },
  net: { fetch: native.fetch }
}))

it('skips unsupported official services on Linux without failing startup or touching service state', async () => {
  const original = Object.getOwnPropertyDescriptor(process, 'platform')
  if (original === undefined) throw new Error('Missing process platform descriptor')
  const warning = vi.spyOn(console, 'warn')
  Object.defineProperty(process, 'platform', { value: 'linux' })
  try {
    const { initializeDesktopUpdateService, initializeDesktopService } = await import('../../src/main/desktop-service')
    expect(() => initializeDesktopUpdateService()).not.toThrow()
    expect(() => initializeDesktopService()).not.toThrow()
    expect(native.getPath).not.toHaveBeenCalled()
    expect(native.fetch).not.toHaveBeenCalled()
    expect(warning).not.toHaveBeenCalled()
  } finally {
    Object.defineProperty(process, 'platform', original)
    warning.mockRestore()
  }
})

it('attaches diagnostics when officialDiagnostics is enabled independently of officialUpdates', async () => {
  vi.resetModules()
  native.getPath.mockImplementation((name: string) => `/tmp/linux-service-test/${name}`)
  native.attach.mockClear()
  native.checkUpdate.mockClear()
  const warning = vi.spyOn(console, 'warn')
  vi.doMock('../../src/shared/desktop-platform', () => ({
    desktopPlatformAdapter: () => ({
      platform: 'linux', clientPlatform: 'linux', caption: 'overlay',
      nodeExecutable: 'self', loginEnvironment: 'posix-shell',
      officialAccount: false, officialUpdates: false, officialDiagnostics: true
    })
  }))
  vi.doMock('../../src/main/desktop-service/service', () => ({
    DesktopService: class { checkUpdate = native.checkUpdate }
  }))
  vi.doMock('../../src/main/desktop-service/diagnostics', () => ({
    attachDiagnostics: native.attach
  }))
  try {
    const desktopService = await import('../../src/main/desktop-service')
    desktopService.initializeDesktopService()
    expect(native.attach).toHaveBeenCalledOnce()
    expect(desktopService.desktopDiagnostics).toBeDefined()
    expect(warning).not.toHaveBeenCalled()
    await expect(desktopService.checkDesktopUpdate(true)).rejects.toThrow('Desktop update service is unavailable')
    expect(native.checkUpdate).not.toHaveBeenCalled()
  } finally {
    native.getPath.mockReset()
    warning.mockRestore()
    vi.doUnmock('../../src/shared/desktop-platform')
    vi.doUnmock('../../src/main/desktop-service/service')
    vi.doUnmock('../../src/main/desktop-service/diagnostics')
  }
})
