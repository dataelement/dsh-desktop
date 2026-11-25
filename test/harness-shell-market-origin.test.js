import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../packages/dsh-desktop-market-installer/index.js'

// The recommendation uses the authenticated Plugin Manager transport. There
// must be no parallel HTTP mutation route with its own Origin/auth policy.
describe('recommended market host integration', () => {
  let home
  const disposers = []
  afterEach(async () => {
    for (const dispose of disposers.splice(0).reverse()) await dispose()
    vi.unstubAllEnvs()
    if (home) await rm(home, { recursive: true, force: true })
  })

  it('provides ordinary plugin services without registering market HTTP routes', async () => {
    home = await mkdtemp(join(tmpdir(), 'recommended-market-'))
    vi.stubEnv('DSH_HOME', home)
    vi.stubEnv('DSH_DESKTOP_PROFILE', 'desktop')
    const services = new Map()
    const register = vi.fn()
    const inject = vi.fn()
    await apply({
      provide(name, service) { services.set(name, service) },
      effect(callback) { disposers.push(callback()) },
      inject,
      webServer: { register }
    })
    expect([...services.keys()].sort()).toEqual(['desktopPnpm', 'desktopProfiles', 'profileBundlePackageBackend'])
    expect(services.get('desktopProfiles').current.name).toBe('desktop')
    expect(services.get('profileBundlePackageBackend').install).toBeTypeOf('function')
    expect(services.get('profileBundlePackageBackend').remove).toBeTypeOf('function')
    expect(register).not.toHaveBeenCalled()
    expect(inject).not.toHaveBeenCalled()
  })
})
