import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canGrantWindowPermission } from '../src/main/security-policy'
import { installWindowPermissions } from '../src/main/window-permissions'

const os = vi.hoisted(() => ({ status: vi.fn(), request: vi.fn() }))
vi.mock('electron', () => ({ systemPreferences: {
  getMediaAccessStatus: os.status, askForMediaAccess: os.request
} }))

const shellUrl = 'dsh-desktop://harness/'

function setup(url = shellUrl) {
  let check
  let request
  const owner = { getURL: vi.fn(() => url), isDestroyed: vi.fn(() => false) }
  const session = {
    setPermissionCheckHandler: vi.fn(handler => { check = handler }),
    setPermissionRequestHandler: vi.fn(handler => { request = handler })
  }
  installWindowPermissions(session, owner, true)
  return {
    owner,
    session,
    check: (overrides = {}) => {
      const { contents = owner, permission = 'media', origin = url, ...details } = overrides
      return check(contents, permission, origin, { isMainFrame: true, mediaType: 'audio', ...details })
    },
    request: async (overrides = {}) => {
      const { contents = owner, permission = 'media', ...details } = overrides
      const callback = vi.fn()
      request(contents, permission, callback, {
        requestingUrl: url, isMainFrame: true, mediaTypes: ['audio'], ...details
      })
      await Promise.resolve()
      expect(callback).toHaveBeenCalledTimes(1)
      return callback.mock.calls[0][0]
    }
  }
}

beforeEach(() => {
  vi.stubGlobal('process', { ...process, platform: 'darwin' })
  os.status.mockReset().mockReturnValue('granted')
  os.request.mockReset().mockResolvedValue(true)
})
afterEach(() => vi.unstubAllGlobals())

describe('audio-only window permission policy', () => {
  it('requires explicit audio types for media while preserving existing permissions', () => {
    for (const url of [shellUrl, 'http://127.0.0.1:43127/session', 'http://localhost:43127/']) {
      expect(canGrantWindowPermission('media', url, true, ['audio'])).toBe(true)
      for (const types of [[], ['video'], ['audio', 'video'], ['unknown'], ['audio', 'audio']]) {
        expect(canGrantWindowPermission('media', url, true, types)).toBe(false)
      }
      expect(canGrantWindowPermission('media', url, true)).toBe(false)
      for (const permission of ['notifications', 'clipboard-sanitized-write']) {
        expect(canGrantWindowPermission(permission, url, true)).toBe(true)
      }
    }
    for (const permission of ['clipboard-read', 'display-capture', 'geolocation', 'midi', 'usb', 'serial']) {
      expect(canGrantWindowPermission(permission, shellUrl, true, ['audio'])).toBe(false)
    }
  })

  it('checks system authorization and requests the microphone on macOS', async () => {
    const fixture = setup()
    expect(fixture.check()).toBe(true)
    expect(os.status).toHaveBeenCalledExactlyOnceWith('microphone')
    os.status.mockReturnValue('not-determined')
    expect(fixture.check()).toBe(false)
    expect(await fixture.request()).toBe(true)
    expect(os.request).toHaveBeenCalledExactlyOnceWith('microphone')
  })

  it('rejects other windows, subframes, untrusted URLs and other loopback ports', async () => {
    const fixture = setup()
    for (const overrides of [
      { contents: null }, { contents: {} }, { isMainFrame: false },
      { requestingUrl: 'https://example.com/' },
      { requestingUrl: 'file:///app/index.html' },
      { requestingUrl: 'dsh-desktop://desktop/safe-mode.html' },
      { requestingUrl: 'dsh-desktop://user:pass@harness/' },
      { requestingUrl: 'http://127.0.0.1:43127/' },
      { requestingUrl: 'invalid-url' }
    ]) {
      expect(fixture.check(overrides)).toBe(false)
      expect(await fixture.request(overrides)).toBe(false)
    }
    const legacy = setup('http://127.0.0.1:43127/session')
    expect(legacy.check()).toBe(true)
    expect(await legacy.request()).toBe(true)
    expect(legacy.check({ requestingUrl: 'http://127.0.0.1:43128/' })).toBe(false)
    expect(await legacy.request({ requestingUrl: 'http://127.0.0.1:43128/' })).toBe(false)
    expect(os.request).toHaveBeenCalledTimes(1)
  })

  it('rejects camera, mixed, unknown and omitted media types before asking the OS', async () => {
    const fixture = setup()
    for (const mediaType of ['video', 'unknown', undefined]) {
      expect(fixture.check({ mediaType })).toBe(false)
    }
    for (const mediaTypes of [[], ['video'], ['audio', 'video'], ['unknown'], undefined]) {
      expect(await fixture.request({ mediaTypes })).toBe(false)
    }
    expect(os.request).not.toHaveBeenCalled()
  })

  it('returns OS denial and handles failed authorization without an unhandled rejection', async () => {
    const fixture = setup()
    os.status.mockReturnValue('denied')
    expect(fixture.check()).toBe(false)
    os.request.mockResolvedValue(false)
    expect(await fixture.request()).toBe(false)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      os.request.mockRejectedValue(new Error('permission service unavailable'))
      expect(await fixture.request()).toBe(false)
      expect(warning).toHaveBeenCalledWith('Microphone permission request failed', expect.any(Error))
    } finally { warning.mockRestore() }
  })

  it('does not grant a request after the owner closes or navigates during the OS prompt', async () => {
    for (const change of ['close', 'navigate']) {
      const fixture = setup()
      os.request.mockImplementation(async () => {
        if (change === 'close') fixture.owner.isDestroyed.mockReturnValue(true)
        else fixture.owner.getURL.mockReturnValue('https://example.com/')
        return true
      })
      expect(await fixture.request()).toBe(false)
    }
  })

  it('keeps the main window authorized when a dialog shares its session, and handles a recreated main window', async () => {
    const fixture = setup()
    const dialog = { getURL: () => shellUrl, isDestroyed: () => false }
    installWindowPermissions(fixture.session, dialog)
    expect(await fixture.request()).toBe(true)
    expect(await fixture.request({ contents: dialog })).toBe(false)
    expect(await fixture.request({ contents: dialog, permission: 'notifications' })).toBe(true)
    expect(fixture.session.setPermissionRequestHandler).toHaveBeenCalledTimes(1)
    expect(fixture.session.setPermissionCheckHandler).toHaveBeenCalledTimes(1)
    fixture.owner.isDestroyed.mockReturnValue(true)
    expect(await fixture.request()).toBe(false)
    const replacement = { getURL: () => shellUrl, isDestroyed: () => false }
    installWindowPermissions(fixture.session, replacement, true)
    expect(await fixture.request({ contents: replacement })).toBe(true)
  })

  it('allows valid audio on Windows without calling macOS APIs', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' })
    const fixture = setup()
    expect(fixture.check()).toBe(true)
    expect(await fixture.request()).toBe(true)
    expect(os.status).not.toHaveBeenCalled()
    expect(os.request).not.toHaveBeenCalled()
  })

  it('preserves the non-media whitelist instead of copying the upstream allow-all fallback', async () => {
    const fixture = setup()
    for (const permission of ['notifications', 'clipboard-sanitized-write']) {
      expect(fixture.check({ permission })).toBe(true)
      expect(await fixture.request({ permission })).toBe(true)
    }
    for (const permission of ['clipboard-read', 'display-capture', 'geolocation', 'usb']) {
      expect(fixture.check({ permission })).toBe(false)
      expect(await fixture.request({ permission })).toBe(false)
    }
    expect(os.request).not.toHaveBeenCalled()
  })
})
