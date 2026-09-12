import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDesired, registryLayout, writeDesired, writeGenerationMeta } from 'dsh-desktop-market-installer/generations/registry'

const installMock = vi.hoisted(() => vi.fn())
vi.mock('../src/main/runtime/profile-plugin-command', () => ({
  installProfileDependenciesWithDsh: installMock
}))

const { upgradeMarketInSharedTree } = await import('../src/main/state/plugin-upgrade')

const homes: string[] = []
afterEach(async () => {
  installMock.mockReset()
  await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true })))
})

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-plugin-upgrade-'))
  homes.push(home)
  const profile = join(home, 'profiles', 'web')
  const market = join(profile, 'node_modules', 'dshmarket')
  await mkdir(market, { recursive: true })
  await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.39.0' }))
  await writeFile(
    join(profile, 'package.json'),
    JSON.stringify({
      dependencies: { dshmarket: '1.39.0' },
      dsh: { profile: { bundles: ['dshmarket'] } }
    })
  )
  const options = {
    dshHome: home,
    dshEntryPath: '/unused/dsh',
    targetVersion: '1.45.1',
    nodeExecutablePath: process.execPath,
    pnpmEntryPath: '/unused/pnpm',
    pnpmRunnerPath: '/unused/pnpm-runner.mjs'
  }
  return { home, profile, market, options }
}

describe('upgradeMarketInSharedTree', () => {
  it.each(['missing', 'unchanged'])('rejects a zero-exit install with an %s active package', async state => {
    const { profile, market, options } = await fixture()
    const before = await readFile(join(profile, 'package.json'), 'utf8')
    if (state === 'missing') await rm(market, { recursive: true })
    installMock.mockResolvedValue({ ok: true })
    expect((await upgradeMarketInSharedTree(options)).ok).toBe(false)
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
  })
  it('never installs dshmarket as a generation: it reinstalls the whole shared tree', async () => {
    installMock.mockImplementation(async () => {
      // Simulate the shared-tree reinstall landing the new version in place.
      return { ok: true }
    })
    const { profile, market, options } = await fixture()
    await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.45.1' }))

    const result = await upgradeMarketInSharedTree(options)

    expect(result).toEqual({ ok: true })
    expect(installMock).toHaveBeenCalledTimes(1)
    // The generation-aware runner has to reach the installer: ordinary plugins
    // are still projected as generations, and ensureProfilePnpmShim refuses to
    // run a plain pnpm against a projected profile rather than clobber them.
    expect(installMock).toHaveBeenCalledWith(
      expect.objectContaining({ pnpmRunnerPath: '/unused/pnpm-runner.mjs' })
    )
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dependencies.dshmarket).toBe('1.45.1')
    expect((await lstat(market)).isSymbolicLink()).toBe(false)
  })

  it('drops a stale generation link and its desired.json entry before reinstalling', async () => {
    installMock.mockImplementation(async () => ({ ok: true }))
    const { home, profile, market, options } = await fixture()

    // A previous, buggy build had promoted dshmarket into a generation.
    const generationDir = join(registryLayout(home).generations, 'dshmarket+1.38.0+deadbeef')
    const generationPackage = join(generationDir, 'node_modules', 'dshmarket')
    await mkdir(generationPackage, { recursive: true })
    await writeFile(join(generationPackage, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.38.0' }))
    await writeGenerationMeta(generationDir, { pluginName: 'dshmarket', version: '1.38.0' })
    await writeDesired(home, ['dshmarket+1.38.0+deadbeef', 'other-plugin+1.0.0+cafebabe'])
    await rm(market, { recursive: true, force: true })
    await symlink(generationPackage, market, 'junction')
    const manifestBefore = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    manifestBefore.dsh = {
      desktop: {
        generationProjection: {
          plugins: { dshmarket: { generationId: 'dshmarket+1.38.0+deadbeef', previousOverride: { present: false } } }
        }
      },
      profile: { bundles: ['dshmarket'] }
    }
    manifestBefore.pnpm = { overrides: { dshmarket: 'link:../.generations/live/dshmarket+1.38.0+deadbeef/node_modules/dshmarket' } }
    await writeFile(join(profile, 'package.json'), `${JSON.stringify(manifestBefore, undefined, 2)}\n`)

    // After the link is dropped, the shared-tree reinstall lands a real directory.
    installMock.mockImplementation(async () => {
      await mkdir(market, { recursive: true })
      await writeFile(join(market, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.45.1' }))
      return { ok: true }
    })

    const result = await upgradeMarketInSharedTree(options)

    expect(result).toEqual({ ok: true })
    expect((await lstat(market)).isSymbolicLink()).toBe(false)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dsh.desktop.generationProjection.plugins.dshmarket).toBeUndefined()
    expect(manifest.pnpm?.overrides?.dshmarket).toBeUndefined()
    expect(await readDesired(home)).toEqual(['other-plugin+1.0.0+cafebabe'])
  })

  it('restores the manifest and reports failure when the shared-tree install fails', async () => {
    installMock.mockImplementation(async () => ({ ok: false, detail: 'ERR_PNPM_NO_MATCHING_VERSION' }))
    const { profile, options } = await fixture()
    const before = await readFile(join(profile, 'package.json'), 'utf8')

    const result = await upgradeMarketInSharedTree(options)

    expect(result).toEqual({ ok: false, detail: 'ERR_PNPM_NO_MATCHING_VERSION' })
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
  })
})
