import { describe, expect, it } from 'vitest'

import { resolveMobileBridgePort } from '../src/main/mobile/mobile-bridge-port'

describe('mobile bridge port configuration', () => {
  it('keeps the production and development defaults when the environment variable is absent', () => {
    expect(resolveMobileBridgePort(false, {})).toBe(43127)
    expect(resolveMobileBridgePort(true, {})).toBe(43128)
  })

  it('uses DSH_DESKTOP_MOBILE_BRIDGE_PORT for the current Desktop process', () => {
    expect(resolveMobileBridgePort(false, { DSH_DESKTOP_MOBILE_BRIDGE_PORT: '45127' })).toBe(45127)
    expect(resolveMobileBridgePort(true, { DSH_DESKTOP_MOBILE_BRIDGE_PORT: '45128' })).toBe(45128)
  })

  it.each(['', '0', '-1', '1.5', '65536', 'port'])('rejects invalid configured port %j', (value) => {
    expect(() => resolveMobileBridgePort(false, { DSH_DESKTOP_MOBILE_BRIDGE_PORT: value })).toThrow(
      'DSH_DESKTOP_MOBILE_BRIDGE_PORT must be an integer from 1 to 65535'
    )
  })
})
