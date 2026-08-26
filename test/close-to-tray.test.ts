import { describe, expect, it } from 'vitest'
import { shouldKeepRunningInBackground } from '../src/main/close-to-tray'

describe('shouldKeepRunningInBackground', () => {
  it('keeps the Windows app running while it is not explicitly quitting', () => {
    expect(shouldKeepRunningInBackground('win32', false)).toBe(true)
  })

  it('allows an explicit Windows quit to close the window', () => {
    expect(shouldKeepRunningInBackground('win32', true)).toBe(false)
  })

  it.each(['darwin', 'linux'] as const)('does not change native %s close behavior', (platform) => {
    expect(shouldKeepRunningInBackground(platform, false)).toBe(false)
  })
})
