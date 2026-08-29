import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  desiredIsUntried,
  markGenerationsBooted,
  prepareGenerationsForLaunch,
  rollBackToLastKnownGood
} from '../src/main/state/generation-launch'
import {
  commitLastKnownGood,
  ensureRegistryDirectories,
  readDesired,
  readLastKnownGood,
  registryLayout,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'

describe('the launch-process half of the generation model', () => {
  const homes: string[] = []
  const silent = (): void => undefined

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-genlaunch-'))
    homes.push(home)
    await mkdir(join(home, 'profiles', 'web'), { recursive: true })
    await writeFile(
      join(home, 'profiles', 'web', 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies: {},
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
      })
    )
    return home
  }

  async function fakeGeneration(home: string, id: string, pluginName: string): Promise<void> {
    const dir = join(registryLayout(home).generations, id)
    const pkg = join(dir, 'node_modules', pluginName)
    await mkdir(pkg, { recursive: true })
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'p.yml' } } })
    )
    await writeGenerationMeta(dir, { pluginName, version: '1.0.0' })
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('is a no-op on a profile that has never used a generation', async () => {
    const home = await freshHome()
    await expect(prepareGenerationsForLaunch(home, silent)).resolves.toBeUndefined()
    expect(await desiredIsUntried(home)).toBe(false)
    await markGenerationsBooted(home, silent)
    expect(await readLastKnownGood(home)).toEqual([])
  })

  it('sweeps an unreferenced generation and projects the desired one on launch', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'keep+1+x', 'keeper')
    await fakeGeneration(home, 'orphan+2+y', 'orphan')
    await writeDesired(home, ['keep+1+x'])
    await mkdir(join(registryLayout(home).staging, 'leftover'), { recursive: true })

    await prepareGenerationsForLaunch(home, silent)

    // orphan gone, staging cleared, keeper linked
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(registryLayout(home).generations, 'orphan+2+y'))).toBe(false)
    expect(existsSync(join(registryLayout(home).staging, 'leftover'))).toBe(false)
    expect(existsSync(join(home, 'profiles', 'web', 'node_modules', 'keeper'))).toBe(true)
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).toContain('keeper')
  })

  it('detects when desired has moved ahead of last-known-good', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await writeDesired(home, ['a+1+x'])
    await commitLastKnownGood(home)
    expect(await desiredIsUntried(home)).toBe(false)

    await writeDesired(home, ['a+1+x', 'b+2+y'])
    expect(await desiredIsUntried(home)).toBe(true)
  })

  it('rolls desired back to last-known-good and reprojects', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await fakeGeneration(home, 'good+1+x', 'good')
    await writeDesired(home, ['good+1+x'])
    await commitLastKnownGood(home)
    await prepareGenerationsForLaunch(home, silent)

    // a new plugin is desired but its generation is broken/missing
    await writeDesired(home, ['good+1+x', 'broken+2+y'])
    await rollBackToLastKnownGood(home, silent)

    expect(await readDesired(home)).toEqual(['good+1+x'])
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'good'
    ])
  })

  it('commits last-known-good from the current desired set', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await writeDesired(home, ['x+1+a', 'y+2+b'])
    await markGenerationsBooted(home, silent)
    expect(await readLastKnownGood(home)).toEqual(['x+1+a', 'y+2+b'])
  })
})
