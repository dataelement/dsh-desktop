import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createGenerationPackageBackend } from '../packages/dsh-desktop-market-installer/generations/package-backend.mjs'
import { readDesired } from '../packages/dsh-desktop-market-installer/generations/registry.mjs'

const homes = []

async function freshHome() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-generation-backend-'))
  homes.push(home)
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-web',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  return home
}

function installer(name, version) {
  return async staging => {
    const directory = join(staging, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      name,
      version,
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(directory, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(staging, 'package.json'), JSON.stringify({
      name: 'dsh-generation', private: true, version: '0.0.0', dependencies: { [name]: version }
    }))
    await writeFile(join(staging, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    return { code: 0, output: 'installed\n' }
  }
}

afterEach(async () => {
  await Promise.all(homes.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

describe('Plugin Manager generation package backend', () => {
  it('publishes immutable installs and restores the exact prior desired pointer on rollback', async () => {
    const home = await freshHome()
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: installer('demo-plugin', '1.0.0')
    })
    const first = await backend.install({
      spec: 'demo-plugin@1.0.0',
      kind: 'registry',
      expectedName: 'demo-plugin',
      signal: new AbortController().signal
    })

    expect(first.packageResult.exitCode).toBe(0)
    expect(first.bundle).toBe('demo-plugin')
    expect((await readDesired(home))).toHaveLength(1)
    const manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dependencies['demo-plugin']).toBe('1.0.0')
    expect(manifest.dsh.profile.bundles).not.toContain('demo-plugin')

    await first.rollback?.()
    expect(await readDesired(home)).toEqual([])
    const restored = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(restored.dependencies['demo-plugin']).toBeUndefined()
  })

  it('discovers the real package identity for a git source before publication', async () => {
    const home = await freshHome()
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: installer('git-plugin', '2.0.0')
    })
    const installed = await backend.install({
      spec: 'github:example/git-plugin#0123456789abcdef0123456789abcdef01234567',
      kind: 'git',
      signal: new AbortController().signal
    })
    expect(installed.packageResult.exitCode).toBe(0)
    expect(installed.bundle).toBe('git-plugin')
  })

  it('pins the manager-selected registry in the generation staging directory', async () => {
    const home = await freshHome()
    let stagingRegistry
    const populate = installer('demo-plugin', '1.0.0')
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: async staging => {
        stagingRegistry = await readFile(join(staging, '.npmrc'), 'utf8')
        return populate(staging)
      }
    })
    const installed = await backend.install({
      spec: 'demo-plugin@1.0.0', kind: 'registry', registry: 'https://registry.example.test'
    })
    expect(installed.packageResult.exitCode).toBe(0)
    expect(stagingRegistry).toContain('registry=https://registry.example.test/')
  })

  it('does not undo another package install or a newer replacement during rollback', async () => {
    const home = await freshHome()
    const makeBackend = (name, version) => createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: installer(name, version)
    })
    const first = await makeBackend('demo-plugin', '1.0.0').install({
      spec: 'demo-plugin@1.0.0', kind: 'registry'
    })
    const other = await makeBackend('other-plugin', '1.0.0').install({
      spec: 'other-plugin@1.0.0', kind: 'registry'
    })
    other.commit?.()
    await first.rollback?.()
    expect((await readDesired(home))).toHaveLength(1)
    let manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dependencies['demo-plugin']).toBeUndefined()
    expect(manifest.dependencies['other-plugin']).toBe('1.0.0')

    const replacement = await makeBackend('demo-plugin', '2.0.0').install({
      spec: 'demo-plugin@2.0.0', kind: 'registry'
    })
    const newer = await makeBackend('demo-plugin', '3.0.0').install({
      spec: 'demo-plugin@3.0.0', kind: 'registry'
    })
    newer.commit?.()
    await replacement.rollback?.()
    manifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(manifest.dependencies['demo-plugin']).toBe('3.0.0')
    expect(manifest.dependencies['other-plugin']).toBe('1.0.0')
  })

  it('removes only desired state and leaves generation bytes for cold-start cleanup', async () => {
    const home = await freshHome()
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: installer('demo-plugin', '1.0.0')
    })
    const installed = await backend.install({
      spec: 'demo-plugin@1.0.0', kind: 'registry', expectedName: 'demo-plugin', signal: new AbortController().signal
    })
    installed.commit?.()
    const removed = await backend.remove({ name: 'demo-plugin', signal: new AbortController().signal })
    expect(removed.packageResult.exitCode).toBe(0)
    expect(await readDesired(home)).toEqual([])
  })
})
