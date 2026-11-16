import { expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ getPath: vi.fn(), fetch: vi.fn() }))
vi.mock('electron', () => ({
  app: { isPackaged: true, getPath: native.getPath },
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
