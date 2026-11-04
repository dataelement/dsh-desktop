import { describe, expect, it } from 'vitest'
import { canGrantWindowPermission } from '../src/main/security-policy'

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
