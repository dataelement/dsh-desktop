import { describe, expect, it } from 'vitest'
import {
  desktopMobilePort,
  hostSessionCookie,
  isSafeModeRenderer,
  loopbackHarnessOrigin,
  SAFE_MODE_RENDERER_FLAG,
  shouldOpenInternetTunnel
} from '../../src/main/shell/mobile-pairing'

describe('mobile pairing on the new shell', () => {
  it('keeps only a loopback origin and drops the launch token', () => {
    expect(loopbackHarnessOrigin('http://127.0.0.1:43129/?token=secret')).toBe('http://127.0.0.1:43129')
    expect(loopbackHarnessOrigin('http://localhost:9/')).toBe('http://localhost:9')
    expect(loopbackHarnessOrigin('http://192.168.1.8:9/')).toBeUndefined()
    expect(loopbackHarnessOrigin('http://user:secret@127.0.0.1:9/')).toBeUndefined()
    expect(loopbackHarnessOrigin(undefined)).toBeUndefined()
  })

  it('rejects a cookie that could break the header', () => {
    expect(hostSessionCookie('session=desktop')).toBe('session=desktop')
    expect(hostSessionCookie('session=one\r\nX-Injected: 1')).toBeUndefined()
    expect(hostSessionCookie('')).toBeUndefined()
    expect(hostSessionCookie(undefined)).toBeUndefined()
  })

  it('uses the packaged port and a validated development port', () => {
    expect(desktopMobilePort(true, {})).toBe(43127)
    expect(desktopMobilePort(false, {})).toBe(43128)
    expect(desktopMobilePort(false, { DSH_DEV_MOBILE_PORT: '44000' })).toBe(44000)
    expect(() => desktopMobilePort(false, { DSH_DEV_MOBILE_PORT: '80' })).toThrow('DSH_DEV_MOBILE_PORT')
  })

  it('opens an internet tunnel only when no LAN address is available', () => {
    expect(shouldOpenInternetTunnel({})).toBe(true)
    expect(shouldOpenInternetTunnel({ pairingUrl: 'http://192.168.1.8:43128/pair?token=secret' })).toBe(false)
    expect(shouldOpenInternetTunnel({ tunnelActive: true })).toBe(false)
    expect(shouldOpenInternetTunnel({ connected: true })).toBe(false)
  })

  it('recognizes the safe-mode renderer flag', () => {
    expect(isSafeModeRenderer(['electron', SAFE_MODE_RENDERER_FLAG])).toBe(true)
    expect(isSafeModeRenderer(['electron'])).toBe(false)
  })
})