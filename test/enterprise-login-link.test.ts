import { describe, expect, it } from 'vitest'
import { sameHarnessOrigin } from '../src/main/enterprise/harness-origin'

describe('enterprise login link origin check', () => {
  it('accepts only an exact matching Harness origin', () => {
    expect(sameHarnessOrigin('http://127.0.0.1:43126/chat', 'http://127.0.0.1:43126/')).toBe(true)
    expect(sameHarnessOrigin('http://127.0.0.1:43127/chat', 'http://127.0.0.1:43126/')).toBe(false)
    expect(sameHarnessOrigin('http://127.0.0.1:43126/chat', undefined)).toBe(false)
    expect(sameHarnessOrigin('not-a-url', 'http://127.0.0.1:43126/')).toBe(false)
  })
})
