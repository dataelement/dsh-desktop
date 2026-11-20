import { describe, expect, it } from 'vitest'
import { desktopPlatformAdapter, requireDesktopPlatform } from '../../src/shared/desktop-platform'
import { usesDesktopCaption } from '../../src/shared/desktop-menu'
import { electronNodeExecutable } from '../../src/main/shell/backend/electron-node-executable'
import { supportsAutoUpdates } from '../../src/main/update/update-policy'
import { desktopWindowChrome } from '../../src/main/shell/window-chrome'

describe('Desktop platform adaptation', () => {
  it('boots Linux with its own identity and the common Host executable', () => {
    const adapter = requireDesktopPlatform('linux')
    expect(adapter.clientPlatform).toBe('linux')
    expect(adapter.loginEnvironment).toBe('posix-shell')
    expect(electronNodeExecutable('/opt/product/product', adapter.platform)).toBe('/opt/product/product')
    expect(usesDesktopCaption(adapter.platform)).toBe(true)
    expect(desktopWindowChrome(adapter.platform).titleBarStyle).toBe('hidden')
    // Unsupported remote protocols do not turn into a Desktop startup prohibition.
    expect(adapter.officialAccount).toBe(false)
    expect(adapter.officialDiagnostics).toBe(false)
    expect(supportsAutoUpdates(true, adapter.platform)).toBe(false)
  })

  it('retains macOS and Windows native launch strategies', () => {
    const mac = requireDesktopPlatform('darwin')
    const windows = requireDesktopPlatform('win32')
    expect(mac.clientPlatform).toBe('macos')
    expect(mac.nodeExecutable).toBe('helper')
    expect(mac.loginEnvironment).toBe('posix-shell')
    expect(mac.officialDiagnostics).toBe(true)
    expect(usesDesktopCaption(mac.platform)).toBe(false)
    expect(windows.clientPlatform).toBe('windows')
    expect(windows.nodeExecutable).toBe('self')
    expect(windows.loginEnvironment).toBe('inherited')
    expect(windows.officialDiagnostics).toBe(true)
    expect(supportsAutoUpdates(true, mac.platform)).toBe(true)
    expect(supportsAutoUpdates(true, windows.platform)).toBe(true)
    expect(supportsAutoUpdates(false, windows.platform)).toBe(false)
  })

  it.each(['freebsd', 'unknown', 'toString', '__proto__'])('rejects unsupported %s without assuming Linux', platform => {
    expect(desktopPlatformAdapter(platform)).toBeUndefined()
    expect(() => requireDesktopPlatform(platform)).toThrow(`Unsupported Desktop platform: ${platform}`)
    expect(usesDesktopCaption(platform)).toBe(false)
  })
})
