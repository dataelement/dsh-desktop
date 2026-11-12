import { describe, expect, it } from 'vitest'
import { HarnessBootFailures } from '../src/main/harness-boot-failures'

describe('frontend failure ownership across repair restarts', () => {
  it('ignores a late failure from the pre-repair document while keeping genuine new failures actionable', () => {
    const failures = new HarnessBootFailures()
    failures.bind('before-sidebar-upgrade', 1)
    expect(failures.isCurrent('before-sidebar-upgrade', 1)).toBe(true)
    failures.bind('after-sidebar-upgrade', 2)
    expect(failures.isCurrent('before-sidebar-upgrade', 2)).toBe(false)
    expect(failures.isCurrent('after-sidebar-upgrade', 2)).toBe(true)
    failures.bind('before-sidebar-upgrade', 2)
    expect(failures.isCurrent('before-sidebar-upgrade', 2)).toBe(false)
    expect(failures.isCurrent(undefined, 2)).toBe(false)
    expect(failures.isCurrent('unknown', 2)).toBe(false)
    failures.bind('reloaded-after-upgrade', 2)
    expect(failures.isCurrent('after-sidebar-upgrade', 2)).toBe(false)
    expect(failures.isCurrent('reloaded-after-upgrade', 2)).toBe(true)
  })

  it('bounds retained document identities and validates IPC input', () => {
    const failures = new HarnessBootFailures()
    for (const id of [undefined, {}, '', 'x'.repeat(65), 'bad identity']) {
      expect(() => failures.bind(id, 1)).toThrow('identity')
    }
    for (let i = 0; i < 65; i++) failures.bind(`page-${i}`, i)
    expect(failures.isCurrent('page-0', 0)).toBe(false)
    expect(failures.isCurrent('page-64', 64)).toBe(true)
  })
})
