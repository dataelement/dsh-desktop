import { describe, expect, it } from 'vitest'
import { resolveDesktopIdentity } from '../src/main/app-identity'

describe('desktop app identity', () => {
  it('keeps formal and development data isolated', () => {
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', false, '')
    ).toEqual({
      name: 'Sherlock',
      userData: '/Users/test/Library/Application Support/dsh-desktop'
    })
    expect(
      resolveDesktopIdentity('/Users/test/Library/Application Support', true, '')
    ).toEqual({
      name: 'Sherlock Dev',
      userData: '/Users/test/Library/Application Support/dsh-desktop-dev'
    })
  })

  it('allows only an absolute explicit user-data path for an isolated launch', () => {
    expect(
      resolveDesktopIdentity('/Applications', false, '/tmp/sherlock-update-fixture').userData
    ).toBe('/tmp/sherlock-update-fixture')
    expect(() => resolveDesktopIdentity('/Applications', false, 'relative/path')).toThrow(
      'absolute'
    )
  })
})
