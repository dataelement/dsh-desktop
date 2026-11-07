import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../packages/dsh-desktop-market-installer/client.js', import.meta.url), 'utf8')

function loadClient() {
  let client
  runInNewContext(source, {
    window: { __ModuleLoader__: { load(entry) { client = entry.factory(createRequire(import.meta.url)) } } },
    __DSH_BOOT__: { entries: [] },
    document: { querySelector: () => ({}) }
  })
  return client
}

describe('market installer section feedback (#831)', () => {
  it('still loads and registers its slots', () => {
    const registrations = []
    const client = loadClient()
    client.apply({
      effect(callback) { callback() },
      locale: { register() {}, bind: () => key => key },
      slots: {
        inject(_name, callback) { callback() },
        register(options) { registrations.push(options) }
      }
    })
    expect(registrations.some(entry => entry.id === 'market')).toBe(true)
  })

  it('gives the status probe a deadline instead of a possible permanent hang', () => {
    // A Harness restart can leave the same-origin fetch pending forever; the
    // abort deadline turns that into a visible error with a retry button.
    expect(source).toMatch(/AbortController/)
    const statusProbe = source.match(/async function readStatus\(\) \{[\s\S]*?\n    \}/)?.[0] ?? ''
    expect(statusProbe).toMatch(/fetchWithTimeout\(STATUS_PATH/)
    const installCall = source.match(/await fetchWithTimeout\(INSTALL_PATH[\s\S]*?\)\)/)?.[0] ?? ''
    expect(installCall).not.toBe('')
    const timeout = source.match(/REQUEST_TIMEOUT_MS = ([\d_]+)/)?.[1]?.replaceAll('_', '')
    expect(Number(timeout)).toBeLessThanOrEqual(15_000)
    expect(Number(timeout)).toBeGreaterThanOrEqual(3_000)
  })

  it('renders a checking state while the first status probe is in flight', () => {
    // Before #831 the card body rendered nothing until status or error
    // arrived, so a stalled probe left a silently disabled button.
    expect(source).toMatch(/: !status && !error\n\s+\? React\.createElement\(/)
    expect(source).toMatch(/t\('checking'\)/)
    expect(source).toMatch(/t\('checkingHint'\)/)
    // Copy ships in both dictionaries.
    expect(source).toMatch(/checking: '/)
    expect(source).toMatch(/checking: '[^']*(\u2026|Checking)/)
    expect(source.match(/checking: /g)?.length).toBe(2)
    expect(source.match(/checkingHint: /g)?.length).toBe(2)
  })
})
