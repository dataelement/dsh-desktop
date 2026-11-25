import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { extractOffendingPlugins } from '../src/main/recovery/harness-log'
import { listInstalledProfilePlugins, resolveStartupFailureOwners } from '../src/main/recovery/plugin-recovery'
import { disableProfilePlugin, listDisabledProfilePlugins } from '../src/main/profile/plugin-disable'

const homes: string[] = []
afterEach(async () => {
  await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

describe('ordinary market recovery', () => {
  it.each(['web', 'desktop'])('lists and disables a broken market in the %s Profile without importing it', async profile => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-recovery-'))
    homes.push(home)
    const directory = join(home, 'profiles', profile)
    const market = join(directory, 'node_modules', 'dshmarket')
    await mkdir(market, { recursive: true })
    const manifest = JSON.stringify({ dependencies: { dshmarket: '1.15.0' }, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dshmarket'] } } })
    await writeFile(join(directory, 'package.json'), manifest)
    await writeFile(join(market, 'package.json'), '{broken package')
    expect(await listInstalledProfilePlugins(home, profile)).toEqual(['dshmarket'])
    expect(await disableProfilePlugin(home, 'dshmarket', profile)).toEqual({ ok: true, rows: [] })
    expect(await listDisabledProfilePlugins(home, ['dshmarket'], profile)).toEqual(['dshmarket'])
    expect(await readFile(join(directory, 'package.json'), 'utf8')).toBe(manifest)
    expect(await readFile(join(market, 'package.json'), 'utf8')).toBe('{broken package')
    if (profile === 'web') expect(await resolveStartupFailureOwners(home, ['dshmarket'])).toEqual(['dshmarket'])
  })

  it.each([
    '[stderr] failed to import loader entry market (dshmarket)',
    '[stderr] cannot resolve profile bundle "dshmarket"',
    '[stderr] profile bundle "dshmarket" declares no dsh.bundle',
    '[stderr] Failed to load plugins\ndshmarket'
  ])('retains actionable market ownership from %s', line => {
    expect(extractOffendingPlugins([line])).toEqual(['dshmarket'])
  })

  it('continues excluding official core packages from targeted plugin actions', () => {
    expect(extractOffendingPlugins(['[stderr] Failed to load plugins\n@deepseek-ai/dsh-base\n@deepseek-ai/dsh-web-app'])).toEqual([])
  })
})
