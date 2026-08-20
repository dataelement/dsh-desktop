import { describe, expect, it } from 'vitest'
import { resolveDesktopHarnessHome } from '../src/main/state/harness-home'

describe('Desktop Harness home', () => {
  it('shares the canonical Harness home in production', () => {
    expect(resolveDesktopHarnessHome('/app-data/dsh-desktop', false, '/users/alex')).toBe(
      '/users/alex/.dsh'
    )
  })

  it('keeps development builds isolated under Electron userData', () => {
    expect(resolveDesktopHarnessHome('/app-data/dsh-desktop-dev', true, '/users/alex')).toBe(
      '/app-data/dsh-desktop-dev/harness'
    )
  })
})
