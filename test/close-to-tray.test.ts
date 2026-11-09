import { describe, expect, it } from 'vitest'
import { shouldKeepRunningInBackground } from '../src/main/close-to-tray'

describe('shouldKeepRunningInBackground', () => {
  it.each(['win32', 'linux'] as const)(
    'hides the window into the tray on %s while the app is not quitting',
    (platform) => {
      expect(shouldKeepRunningInBackground(platform, false, true)).toBe(true)
    }
  )

  it.each(['win32', 'linux'] as const)(
    'lets an explicit quit close the %s window',
    (platform) => {
      expect(shouldKeepRunningInBackground(platform, true, true)).toBe(false)
    }
  )

  it.each(['win32', 'linux'] as const)(
    'keeps the native %s close behavior when no tray icon exists',
    (platform) => {
      expect(shouldKeepRunningInBackground(platform, false, false)).toBe(false)
    }
  )

  it('does not change native darwin close behavior', () => {
    expect(shouldKeepRunningInBackground('darwin', false, true)).toBe(false)
    expect(shouldKeepRunningInBackground('darwin', false, false)).toBe(false)
  })
})
