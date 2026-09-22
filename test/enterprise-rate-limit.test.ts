import { describe, expect, it } from 'vitest'
import { SlidingWindowLimiter } from '../src/main/enterprise/enterprise-rate-limit'
import { stripEnterpriseEnvironment } from '../src/main/enterprise/enterprise-env'

describe('enterprise rate limit and environment hygiene', () => {
  it('rejects a burst that exceeds the window', () => {
    const limiter = new SlidingWindowLimiter(2, 1_000)
    expect(limiter.allow(1000)).toBe(true)
    expect(limiter.allow(1001)).toBe(true)
    expect(limiter.allow(1002)).toBe(false)
    expect(limiter.allow(2001)).toBe(true)
  })

  it('removes every DSH_DESKTOP_ENTERPRISE_ key regardless of case', () => {
    expect(stripEnterpriseEnvironment({
      PATH: '/bin',
      DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY: 'secret',
      dsh_desktop_enterprise_broker_url: 'http://127.0.0.1:1'
    })).toEqual({ PATH: '/bin' })
  })
})
