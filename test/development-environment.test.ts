import { describe, expect, it } from 'vitest'
import { skipBlockingWindowsDevHmr } from '../src/main/development-environment'

describe('development HMR workaround', () => {
  it('skips the blocking HMR service only for unpackaged Windows development', () => {
    expect(skipBlockingWindowsDevHmr(true, 'win32')).toBe(false)
    expect(skipBlockingWindowsDevHmr(false, 'darwin')).toBe(false)
    expect(skipBlockingWindowsDevHmr(false, 'linux')).toBe(false)
    expect(skipBlockingWindowsDevHmr(false, 'win32')).toBe(true)
  })
})
