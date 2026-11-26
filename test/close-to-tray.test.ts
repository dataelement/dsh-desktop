import { describe, expect, it } from 'vitest'
import { shouldKeepRunningInBackground } from '../src/main/close-to-tray'

describe('shouldKeepRunningInBackground', () => {
  it.each(['darwin', 'win32'] as const)('keeps the %s app running while it is not explicitly quitting', platform => {
    expect(shouldKeepRunningInBackground(platform, false)).toBe(true)
  })

  it.each(['darwin', 'win32'] as const)('allows an explicit %s quit to close the window', platform => {
    expect(shouldKeepRunningInBackground(platform, true)).toBe(false)
  })

  it('does not change native linux close behavior', () => {
    expect(shouldKeepRunningInBackground('linux', false)).toBe(false)
  })
})
