import { describe, expect, it } from 'vitest'
import { canGrantWindowPermission, isTrustedPopupUrl } from '../src/main/security-policy'

describe('canGrantWindowPermission', () => {
  it('grants media from the trusted main frame so getUserMedia works in the shell', () => {
    expect(
      canGrantWindowPermission('media', 'http://127.0.0.1:43127/session', true, ['audio'])
    ).toBe(true)
    expect(
      canGrantWindowPermission('media', 'http://localhost:43127/session', true, ['audio'])
    ).toBe(true)
  })

  it('keeps denying media outside the trusted main frame', () => {
    expect(canGrantWindowPermission('media', 'https://evil.example/session', true, ['audio'])).toBe(
      false
    )
    expect(canGrantWindowPermission('media', 'https://127.0.0.1:43127/session', true, ['audio'])).toBe(
      false
    )
    expect(canGrantWindowPermission('media', 'file:///tmp/app.html', true, ['audio'])).toBe(false)
    expect(canGrantWindowPermission('media', 'http://127.0.0.1:43127/session', false, ['audio'])).toBe(
      false
    )
    expect(canGrantWindowPermission('media', undefined, true, ['audio'])).toBe(false)
  })

  it('keeps clipboard and notifications behavior unchanged', () => {
    expect(
      canGrantWindowPermission('clipboard-sanitized-write', 'http://127.0.0.1:43127', true)
    ).toBe(true)
    expect(
      canGrantWindowPermission('clipboard-sanitized-write', 'https://evil.example', true)
    ).toBe(false)
    expect(canGrantWindowPermission('clipboard-read', 'http://127.0.0.1:43127', true)).toBe(
      false
    )
    expect(
      canGrantWindowPermission('notifications', 'http://127.0.0.1:43127', true)
    ).toBe(true)
    expect(
      canGrantWindowPermission('notifications', 'https://evil.example', true)
    ).toBe(false)
    expect(canGrantWindowPermission('notifications', 'http://127.0.0.1:43127', false)).toBe(
      false
    )
  })
})

describe('isTrustedPopupUrl', () => {
  const harness = 'http://127.0.0.1:43127/'

  it('allows popups from the application protocols', () => {
    expect(isTrustedPopupUrl('dsh-desktop://harness/settings', [])).toBe(true)
    expect(isTrustedPopupUrl('dsh-recovery://plugin/', [])).toBe(true)
    expect(isTrustedPopupUrl('file:///tmp/app.html', [])).toBe(true)
  })

  it('allows popups to the running Harness backend origin', () => {
    expect(isTrustedPopupUrl('http://127.0.0.1:43127/api/file?id=1', [harness])).toBe(true)
  })

  it('allows popups to the opener origin', () => {
    expect(isTrustedPopupUrl('http://127.0.0.1:51000/desktop/help', ['http://127.0.0.1:51000/desktop?k=t'])).toBe(true)
  })

  it('leaves other loopback servers to the system browser', () => {
    expect(isTrustedPopupUrl('http://127.0.0.1:5180/', [harness, 'dsh-desktop://harness/'])).toBe(false)
    expect(isTrustedPopupUrl('http://localhost:43127/', [harness])).toBe(false)
    expect(isTrustedPopupUrl('http://127.0.0.1:43127/', [undefined, 'not a url'])).toBe(false)
  })

  it('never trusts remote or non-loopback application urls', () => {
    expect(isTrustedPopupUrl('https://example.com/', ['https://example.com/'])).toBe(false)
    expect(isTrustedPopupUrl('https://127.0.0.1:43127/', ['https://127.0.0.1:43127/'])).toBe(false)
    expect(isTrustedPopupUrl('not a url', [harness])).toBe(false)
  })
})
