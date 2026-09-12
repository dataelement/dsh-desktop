import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  readMarketRegion,
  registryFromArguments,
  resolveMarketRegistry
} from '../packages/dsh-desktop-market-installer/market-registry.mjs'

/**
 * The market picks a version by reading metadata from its region's registry
 * and then hands the spec to the install boundary. These cover the resolution
 * that keeps the second half fetching from the same place as the first (#337).
 */
describe('the registry a generation install fetches from', () => {
  const dirs = []

  async function profileWithRegion(region) {
    const home = await mkdtemp(join(tmpdir(), 'dsh-marketreg-'))
    dirs.push(home)
    const profileDir = join(home, 'profiles', 'web')
    await mkdir(join(profileDir, '.dsh-market'), { recursive: true })
    if (region !== undefined) {
      await writeFile(
        join(profileDir, '.dsh-market', 'state.json'),
        JSON.stringify({ region, regionAuto: true })
      )
    }
    return profileDir
  }

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })))
    dirs.length = 0
  })

  it('reads a registry named on the command line, in every spelling', () => {
    expect(registryFromArguments(['add', '--registry=https://example.test/npm/', 'pkg@1.0.0']))
      .toBe('https://example.test/npm')
    expect(registryFromArguments(['add', '--registry', 'https://example.test/npm', 'pkg@1.0.0']))
      .toBe('https://example.test/npm')
    expect(registryFromArguments(['add', '--config.registry=https://example.test/npm', 'pkg']))
      .toBe('https://example.test/npm')
    expect(registryFromArguments(['add', 'pkg@1.0.0'])).toBeNull()
    expect(registryFromArguments()).toBeNull()
  })

  it('reads the market\'s persisted download region', async () => {
    expect(await readMarketRegion(await profileWithRegion('china'))).toBe('china')
    expect(await readMarketRegion(await profileWithRegion('global'))).toBe('global')
    // Not chosen yet, and a value nobody recognizes, both mean "no answer".
    expect(await readMarketRegion(await profileWithRegion(undefined))).toBeNull()
    expect(await readMarketRegion(await profileWithRegion('mars'))).toBeNull()
    expect(await readMarketRegion(join(tmpdir(), 'dsh-marketreg-missing'))).toBeNull()
  })

  it('pins a mirror region to the same registry the market reads', async () => {
    const profileDir = await profileWithRegion('china')
    expect(await resolveMarketRegistry({ profileDir, environment: {} }))
      .toBe('https://mirrors.cloud.tencent.com/npm')
  })

  it('leaves the default registry unpinned so a private registry keeps working', async () => {
    const profileDir = await profileWithRegion('global')
    expect(await resolveMarketRegistry({ profileDir, environment: {} })).toBeNull()
  })

  it('does not overrule a registry the caller already named', async () => {
    const profileDir = await profileWithRegion('china')
    expect(await resolveMarketRegistry({
      profileDir,
      environment: { npm_config_registry: 'https://corp.test/npm/' }
    })).toBeNull()
    // Blank is not a statement.
    expect(await resolveMarketRegistry({
      profileDir,
      environment: { npm_config_registry: '  ' }
    })).toBe('https://mirrors.cloud.tencent.com/npm')
  })

  it('follows the market\'s own mirror override', async () => {
    const profileDir = await profileWithRegion('global')
    expect(await resolveMarketRegistry({
      profileDir,
      environment: { DSHM_NPM_MIRROR: 'https://mirror.test/npm/' }
    })).toBe('https://mirror.test/npm')
  })

  it('believes an explicit argument over anything it could infer', async () => {
    const profileDir = await profileWithRegion('china')
    expect(await resolveMarketRegistry({
      profileDir,
      args: ['add', '--registry=https://named.test/npm', 'pkg@1.0.0'],
      environment: { npm_config_registry: 'https://corp.test/npm', DSHM_NPM_MIRROR: 'https://mirror.test/npm' }
    })).toBe('https://named.test/npm')
  })

  it('has nothing to say before the market has chosen a region', async () => {
    const profileDir = await profileWithRegion(undefined)
    expect(await resolveMarketRegistry({ profileDir, environment: {} })).toBeNull()
  })
})
