import { describe, expect, it } from 'vitest'
import { developmentEnvironment } from '../src/main/development-environment'

describe('development worktree isolation', () => {
  it('keeps defaults and ignores development overrides in production', () => {
    expect(developmentEnvironment(false, 43129, { DSH_DEV_PROFILE: '../unsafe', DSH_DEV_HARNESS_PORT: 'invalid' }))
      .toEqual({ profile: 'dsh-desktop', harnessPort: 43129, mobilePort: 43127 })
    expect(developmentEnvironment(true, 43129, {}))
      .toEqual({ profile: 'dsh-desktop-dev', harnessPort: 43130, mobilePort: 43128 })
  })

  it('uses distinct profile and loopback ports for a second worktree', () => {
    expect(developmentEnvironment(true, 43129, {
      DSH_DEV_PROFILE: 'dsh-desktop-dev-workbench', DSH_DEV_HARNESS_PORT: '43132', DSH_DEV_MOBILE_PORT: '43133'
    })).toEqual({ profile: 'dsh-desktop-dev-workbench', harnessPort: 43132, mobilePort: 43133 })
  })

  it.each(['../profile', '/tmp/profile', 'a/b', 'a\\b', 'dsh-desktop', '..'])('rejects unsafe profile %s', profile => {
    expect(() => developmentEnvironment(true, 43129, { DSH_DEV_PROFILE: profile })).toThrow('DSH_DEV_PROFILE')
  })

  it.each(['0', '1023', '65536', '-1', '12.5', 'invalid', ' 43132 '])('rejects invalid port %s', value => {
    expect(() => developmentEnvironment(true, 43129, { DSH_DEV_HARNESS_PORT: value })).toThrow('DSH_DEV_HARNESS_PORT')
    expect(() => developmentEnvironment(true, 43129, { DSH_DEV_MOBILE_PORT: value })).toThrow('DSH_DEV_MOBILE_PORT')
  })

  it('rejects colliding service ports', () => {
    expect(() => developmentEnvironment(true, 43129, { DSH_DEV_MOBILE_PORT: '43130' })).toThrow('must differ')
  })
})
