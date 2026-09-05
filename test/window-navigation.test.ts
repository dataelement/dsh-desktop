import { describe, expect, it } from 'vitest'
import {
  isAbortedNavigationCode,
  isAbortedNavigationError
} from '../src/main/window-navigation'

describe('aborted-navigation detection', () => {
  it('recognizes the ERR_ABORTED numeric code reported by did-fail-load', () => {
    expect(isAbortedNavigationCode(-3)).toBe(true)
  })

  it('does not treat real load failures as aborted navigations', () => {
    // -105 is ERR_NAME_NOT_RESOLVED, -106 is ERR_INTERNET_DISCONNECTED,
    // 0 means "no error" — none of them is a superseded load.
    expect(isAbortedNavigationCode(-105)).toBe(false)
    expect(isAbortedNavigationCode(-106)).toBe(false)
    expect(isAbortedNavigationCode(0)).toBe(false)
  })

  it('recognizes the Error shapes thrown by webContents.loadURL', () => {
    expect(isAbortedNavigationError({ code: 'ERR_ABORTED' })).toBe(true)
    expect(isAbortedNavigationError({ errno: -3 })).toBe(true)
    expect(isAbortedNavigationError(new Error('ERR_ABORTED (-3)'))).toBe(true)
    expect(isAbortedNavigationError(new Error('ERR_NAME_NOT_RESOLVED (-105)'))).toBe(false)
  })
})
