import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { upgradeMarketInSharedTree, marketInstallPendingPath } from '../src/main/profile/plugin-upgrade'

const homes: string[] = []
afterEach(async () => {
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

describe('retired shared-tree market upgrade', () => {
  it('reports retirement without modifying the manifest, package or pending marker', async () => {
    const { home, profile, market, options } = await fixture()
    const before = await readFile(join(profile, 'package.json'), 'utf8')
    expect(await upgradeMarketInSharedTree(options)).toEqual({ ok: false, detail: expect.stringContaining('retired') })
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
    expect(JSON.parse(await readFile(join(market, 'package.json'), 'utf8')).version).toBe('1.39.0')
    expect((await lstat(market)).isDirectory()).toBe(true)
    await expect(lstat(marketInstallPendingPath(home))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
