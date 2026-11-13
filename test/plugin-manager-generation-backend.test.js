import { execFileSync } from 'node:child_process'
import { copyFile, lstat, mkdir, mkdtemp, readFile, readlink, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGenerationPackageBackend } from '../packages/dsh-desktop-market-installer/generations/package-backend.mjs'
import { projectGenerations } from '../packages/dsh-desktop-market-installer/generations/projection.mjs'
import { listGenerations, readDesired, resolveEnabledGenerations } from '../packages/dsh-desktop-market-installer/generations/registry.mjs'
import { readDisabledPlugins } from '../packages/dsh-desktop-market-installer/plugin-state.mjs'

const homes = []

async function freshHome() {
  // pnpm canonicalizes Windows TEMP (which can contain RUNNER~1). Use the
  // same physical root for workspace discovery and source-bound build keys.
  const home = await realpath(await mkdtemp(join(tmpdir(), 'dsh-generation-backend-')))
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
  it('verifies catalog integrity before installing or publishing any generation', async () => {
    const home = await freshHome()
    const runInstall = vi.fn(installer('demo-plugin', '1.0.0'))
    const fetchImpl = vi.fn(async () => Response.json({ dist: { integrity: 'sha512-wrong' } }))
    const backend = createGenerationPackageBackend({ dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused', runInstall, fetchImpl })
    expect(backend.supportsVerifiedInstall).toBe(true)
    const request = { kind: 'registry', spec: 'demo-plugin@1.0.0', expectedName: 'demo-plugin', expectedVersion: '1.0.0', npmIntegrity: 'sha512-reviewed', registry: 'https://registry.example' }
    const failed = await backend.install(request)
    expect(failed.packageResult.exitCode).toBe(1)
    expect(failed.packageResult.output).toContain('integrity listed in the workbench index')
    expect(runInstall).not.toHaveBeenCalled()
    expect(await readDesired(home)).toEqual([])
    fetchImpl.mockResolvedValue(Response.json({ dist: { integrity: 'sha512-reviewed' } }))
    const accepted = await backend.install(request)
    expect(accepted.packageResult.exitCode).toBe(0)
    expect(fetchImpl).toHaveBeenCalledWith('https://registry.example/demo-plugin/1.0.0', expect.objectContaining({ headers: { accept: 'application/json' } }))
    expect(runInstall).toHaveBeenCalledTimes(1)
    await accepted.rollback()
    expect(await readDesired(home)).toEqual([])
  })

  it('publishes a desktop-profile install into that profile, not web', async () => {
    const home = await freshHome()
    const desktop = join(home, 'profiles', 'desktop')
    await mkdir(desktop, { recursive: true })
    await writeFile(join(desktop, 'package.json'), JSON.stringify({
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
    }))
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      profile: 'desktop',
      runInstall: installer('demo-plugin', '1.0.0')
    })
    const installed = await backend.install({
      spec: 'demo-plugin@1.0.0',
      kind: 'registry',
      expectedName: 'demo-plugin',
      signal: new AbortController().signal
    })
    expect(installed.packageResult.exitCode).toBe(0)
    const desktopManifest = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'))
    expect(desktopManifest.dependencies['demo-plugin']).toBe('1.0.0')
    const webManifest = JSON.parse(await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
    expect(webManifest.dependencies['demo-plugin']).toBeUndefined()
    const link = await lstat(join(desktop, 'node_modules', 'demo-plugin'))
    expect(link.isSymbolicLink()).toBe(true)
  })

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
    // Both updates remain pending; rollback must not project over the running copy.
    expect(manifest.dependencies['demo-plugin']).toBe('2.0.0')
    await projectGenerations(home)
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

  it('leaves a package pnpm owns to Plugin Manager instead of failing its removal', async () => {
    const home = await freshHome()
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused'
    })
    expect(await backend.remove({ name: 'legacy-plugin', signal: new AbortController().signal })).toBeUndefined()
    expect(await backend.remove({ name: 'dshmarket', signal: new AbortController().signal })).toBeUndefined()
  })

  it('installs, updates and removes the market through ordinary desired generation projection', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    const packagePath = join(profile, 'node_modules', 'dshmarket', 'package.json')
    const backend = version => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused',
      runInstall: installer('dshmarket', version)
    })
    const first = await backend('1.48.0').install({ spec: 'dshmarket@1.48.0', kind: 'registry' })
    expect(first.packageResult.exitCode).toBe(0)
    expect(first.restartRequired).toBe(false)
    expect(first.bundle).toBe('dshmarket')
    expect(JSON.parse(await readFile(join(first.bundleDirectory, 'package.json'), 'utf8')).version).toBe('1.48.0')
    first.commit()
    const before = await readDesired(home)
    const updated = await backend('1.49.0').install({ spec: 'dshmarket@1.49.0', kind: 'registry' })
    expect(updated.packageResult.exitCode).toBe(0)
    expect(updated.replaced).toBe(true)
    expect(updated.restartRequired).toBe(true)
    expect(await readDesired(home)).not.toEqual(before)
    expect((await resolveEnabledGenerations(home)).get('dshmarket').version).toBe('1.49.0')
    expect(JSON.parse(await readFile(join(updated.bundleDirectory, 'package.json'), 'utf8')).version).toBe('1.49.0')
    expect(JSON.parse(await readFile(packagePath, 'utf8')).version).toBe('1.48.0')
    await updated.rollback()
    expect(await readDesired(home)).toEqual(before)
    expect(JSON.parse(await readFile(packagePath, 'utf8')).version).toBe('1.48.0')
    const committed = await backend('1.49.0').install({ spec: 'dshmarket@1.49.0', kind: 'registry' })
    committed.commit()
    await committed.rollback()
    expect((await resolveEnabledGenerations(home)).get('dshmarket').version).toBe('1.49.0')
    expect(JSON.parse(await readFile(packagePath, 'utf8')).version).toBe('1.48.0')
    await projectGenerations(home)
    expect(JSON.parse(await readFile(packagePath, 'utf8')).version).toBe('1.49.0')
    expect(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')).dsh.profile.bundles).toContain('dshmarket')
    const removed = await backend('1.48.0').remove({ name: 'dshmarket' })
    expect(removed.packageResult.exitCode).toBe(0)
    expect(await readDesired(home)).toEqual([])
    expect(await listGenerations(home)).toHaveLength(2)
    await projectGenerations(home)
    await expect(lstat(join(profile, 'node_modules', 'dshmarket'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')).dependencies.dshmarket).toBeUndefined()
  })

  it.each(['demo-plugin', 'dshmarket'])('defers replacing a Profile-owned %s directory to launch projection', async name => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    const legacy = join(profile, 'node_modules', name)
    await mkdir(legacy, { recursive: true })
    await writeFile(join(legacy, 'package.json'), JSON.stringify({
      name, version: '0.9.0', dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    const previousManifest = JSON.stringify({
      name: 'dsh-profile-web', private: true, dependencies: { [name]: '0.9.0' },
      dsh: { profile: { bundles: [name] } }
    })
    await writeFile(join(profile, 'package.json'), previousManifest)
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused',
      runInstall: installer(name, '1.0.0')
    })
    const rejected = await backend.install({
      spec: name + '@1.0.0', kind: 'registry', expectedName: name
    })
    expect(rejected.packageResult.exitCode).toBe(0)
    await rejected.rollback()
    expect(await readDesired(home)).toEqual([])
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(previousManifest)
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    const installed = await backend.install({
      spec: name + '@1.0.0', kind: 'registry', expectedName: name, signal: new AbortController().signal
    })
    expect(installed.packageResult.exitCode).toBe(0)
    expect(installed.replaced).toBe(true)
    expect(installed.restartRequired).toBe(true)
    expect(JSON.parse(await readFile(join(installed.bundleDirectory, 'package.json'), 'utf8')).version).toBe('1.0.0')
    installed.commit?.()
    // The running copy stays in place until Harness stops.
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    expect((await readDesired(home)).length).toBe(1)
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(previousManifest)

    await projectGenerations(home)
    expect((await lstat(legacy)).isSymbolicLink()).toBe(true)
    const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest.dependencies[name]).toBe('1.0.0')
    expect(manifest.dsh.profile.bundles).toContain(name)
  })

  it('supports callers requiring immediate publication and refuses a real-directory upgrade safely', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    const backend = version => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused',
      deferUpdates: false, runInstall: installer('demo-plugin', version)
    })
    const first = await backend('1.0.0').install({ spec: 'demo-plugin@1.0.0', kind: 'registry' })
    first.commit()
    const desired = await readDesired(home)
    const updated = await backend('2.0.0').install({ spec: 'demo-plugin@2.0.0', kind: 'registry' })
    expect(updated.packageResult.exitCode).toBe(0)
    expect(updated.restartRequired).toBe(false)
    const packagePath = join(profile, 'node_modules', 'demo-plugin')
    expect(JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8')).version).toBe('2.0.0')
    await updated.rollback()
    expect(await readDesired(home)).toEqual(desired)
    expect(JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8')).version).toBe('1.0.0')

    const legacy = join(profile, 'node_modules', 'legacy-plugin')
    await mkdir(legacy, { recursive: true })
    await writeFile(join(legacy, 'package.json'), JSON.stringify({ name: 'legacy-plugin', version: '0.9.0' }))
    const beforeManifest = await readFile(join(profile, 'package.json'), 'utf8')
    const immediate = createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused',
      deferUpdates: false, runInstall: installer('legacy-plugin', '1.0.0')
    })
    const refused = await immediate.install({ spec: 'legacy-plugin@1.0.0', kind: 'registry' })
    expect(refused.packageResult.exitCode).toBe(1)
    expect(refused.packageResult.output).toContain('Cannot switch a non-link plugin directory')
    expect(refused.packageResult.output).toContain('Use the standard plugin manager to stage this update for restart.')
    expect(await readDesired(home)).toEqual(desired)
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(beforeManifest)
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    expect(JSON.parse(await readFile(join(legacy, 'package.json'), 'utf8')).version).toBe('0.9.0')
  })

  it.each([
    [true, 'cancel'], [false, 'cancel'], [true, 'restart'], [false, 'restart']
  ])('blocks other package mutations while an update is pending (deferUpdates=%s, then %s)', async (deferUpdates, finish) => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    const makeBackend = (name, version, overrides = {}) => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused',
      runInstall: installer(name, version), ...overrides
    })
    const b = makeBackend('plugin-b', '1.0.0')
    const installedB = await b.install({ spec: 'plugin-b@1.0.0', kind: 'registry' })
    installedB.commit()
    const c = makeBackend('plugin-c', '1.0.0')
    const installedC = await c.install({ spec: 'plugin-c@1.0.0', kind: 'registry' })
    installedC.commit()
    const staged = await makeBackend('plugin-b', '2.0.0').install({ spec: 'plugin-b@2.0.0', kind: 'registry' })
    expect(staged.restartRequired).toBe(true)
    staged.commit()
    const beforeDesired = await readDesired(home)
    const manifestPath = join(profile, 'package.json')
    const beforeManifest = await readFile(manifestPath, 'utf8')
    const bLink = join(profile, 'node_modules', 'plugin-b')
    const beforeLink = await readlink(bLink)
    const runInstall = vi.fn(installer('plugin-d', '1.0.0'))
    const d = makeBackend('plugin-d', '1.0.0', { deferUpdates, runInstall })
    const refused = await d.install({ spec: 'plugin-d@1.0.0', kind: 'registry' })
    expect(refused.packageResult.exitCode).toBe(1)
    expect(refused.packageResult.output).toContain('Pending generation update for plugin-b. Restart')
    expect(runInstall).not.toHaveBeenCalled()
    const removed = await makeBackend('plugin-c', '1.0.0', { deferUpdates }).remove({ name: 'plugin-c' })
    expect(removed.packageResult.exitCode).toBe(1)
    expect(await readDesired(home)).toEqual(beforeDesired)
    expect(await readFile(manifestPath, 'utf8')).toBe(beforeManifest)
    expect(await readlink(bLink)).toBe(beforeLink)
    const unknown = await d.install({ spec: 'github:example/unknown#0123456789abcdef0123456789abcdef01234567', kind: 'git' })
    expect(unknown.packageResult.exitCode).toBe(1)
    expect(runInstall).toHaveBeenCalledTimes(1)
    expect(await readDesired(home)).toEqual(beforeDesired)
    expect(await readFile(manifestPath, 'utf8')).toBe(beforeManifest)
    // Replacing the pending package itself remains possible.
    const newer = await makeBackend('plugin-b', '3.0.0').install({ spec: 'plugin-b@3.0.0', kind: 'registry' })
    expect(newer.packageResult.exitCode).toBe(0)
    expect(newer.restartRequired).toBe(true)
    newer.commit()
    if (finish === 'cancel') expect((await b.remove({ name: 'plugin-b' })).packageResult.exitCode).toBe(0)
    else await projectGenerations(home)
    const accepted = await d.install({ spec: 'plugin-d@1.0.0', kind: 'registry' })
    expect(accepted.packageResult.exitCode).toBe(0)
    accepted.commit()
    expect(JSON.parse(await readFile(join(profile, 'node_modules', 'plugin-d', 'package.json'), 'utf8')).version).toBe('1.0.0')
  })

  it('allows unrelated installation while a disabled installed package root is missing', async () => {
    const home = await freshHome()
    const makeBackend = (name, version) => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused', runInstall: installer(name, version)
    })
    const broken = await makeBackend('plugin-b', '1.0.0').install({ spec: 'plugin-b@1.0.0', kind: 'registry' })
    broken.commit()
    const profile = join(home, 'profiles', 'web')
    const state = join(profile, '.dsh-market')
    await mkdir(state, { recursive: true })
    await writeFile(join(state, 'state.json'), JSON.stringify({ disabled: ['plugin-b'] }))
    await rm(broken.bundleDirectory, { recursive: true })
    const fresh = await makeBackend('plugin-c', '1.0.0').install({ spec: 'plugin-c@1.0.0', kind: 'registry' })
    expect(fresh.packageResult.exitCode).toBe(0)
    fresh.commit()
  })

  it.each(['new-marker', 'missing-marker'])('blocks an old usable link while the desired disabled target is broken (%s)', async marker => {
    const home = await freshHome()
    const makeBackend = (name, version) => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused', runInstall: installer(name, version)
    })
    const old = await makeBackend('plugin-b', '1.0.0').install({ spec: 'plugin-b@1.0.0', kind: 'registry' })
    old.commit()
    const update = await makeBackend('plugin-b', '2.0.0').install({ spec: 'plugin-b@2.0.0', kind: 'registry' })
    update.commit()
    await rm(update.bundleDirectory, { recursive: true })
    const profile = join(home, 'profiles', 'web')
    const state = join(profile, '.dsh-market')
    await mkdir(state, { recursive: true })
    await writeFile(join(state, 'state.json'), JSON.stringify({ disabled: ['plugin-b'] }))
    if (marker === 'new-marker') await projectGenerations(home)
    else {
      const manifestPath = join(profile, 'package.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      delete manifest.dsh.desktop.generationProjection
      await writeFile(manifestPath, JSON.stringify(manifest))
    }
    const c = await makeBackend('plugin-c', '1.0.0').install({ spec: 'plugin-c@1.0.0', kind: 'registry' })
    expect(c.packageResult.exitCode).toBe(1)
    expect(c.packageResult.output).toContain('Pending generation update for plugin-b. Restart')
    expect(JSON.parse(await readFile(join(profile, 'node_modules', 'plugin-b', 'package.json'), 'utf8')).version).toBe('1.0.0')
  })

  it('does not apply another pending update while rolling back an earlier unvalidated install', async () => {
    const home = await freshHome()
    const makeBackend = (name, version) => createGenerationPackageBackend({
      dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused', runInstall: installer(name, version)
    })
    const installedB = await makeBackend('plugin-b', '1.0.0').install({ spec: 'plugin-b@1.0.0', kind: 'registry' })
    installedB.commit()
    const c = await makeBackend('plugin-c', '1.0.0').install({ spec: 'plugin-c@1.0.0', kind: 'registry' })
    const pending = await makeBackend('plugin-b', '2.0.0').install({ spec: 'plugin-b@2.0.0', kind: 'registry' })
    pending.commit()
    const profile = join(home, 'profiles', 'web')
    const bLink = join(profile, 'node_modules', 'plugin-b')
    const beforeLink = await readlink(bLink)
    await expect(c.rollback()).rejects.toThrow('Rollback restored desired state but Profile cleanup is incomplete. Restart')
    expect((await resolveEnabledGenerations(home)).has('plugin-c')).toBe(false)
    expect(await readlink(bLink)).toBe(beforeLink)
    expect(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')).dependencies['plugin-b']).toBe('1.0.0')
    await projectGenerations(home)
    expect(JSON.parse(await readFile(join(bLink, 'package.json'), 'utf8')).version).toBe('2.0.0')
    await expect(lstat(join(profile, 'node_modules', 'plugin-c'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('records enable switches and forgets them after removal', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: demo-row\n  disabled: false\n- id: other-row\n  disabled: false\n')
    const backend = createGenerationPackageBackend({
      dshHome: home,
      nodeExecutablePath: process.execPath,
      pnpmEntryPath: 'unused'
    })
    await backend.switched({ name: 'demo-plugin', enabled: false, rowIds: ['demo-row'] })
    expect(await readDisabledPlugins(profile)).toEqual(['demo-plugin'])
    // Only the package's own force-enable override goes; another plugin's stays.
    expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe('- id: other-row\n  disabled: false\n')

    await backend.switched({ name: 'demo-plugin', enabled: true, rowIds: ['demo-row'] })
    expect(await readDisabledPlugins(profile)).toEqual([])

    await backend.switched({ name: 'demo-plugin', enabled: false, rowIds: [] })
    await backend.removed({ name: 'demo-plugin' })
    expect(await readDisabledPlugins(profile)).toEqual([])
  })
})

it.each(['.tgz', '.tar.gz'])('binds uploaded %s script approval to the consumed archive snapshot', async extension => {
  const home = await freshHome()
  const fixture = join(home, 'fixture')
  await mkdir(fixture)
  await writeFile(join(fixture, 'package.json'), JSON.stringify({
    name: 'script-approval-fixture', version: '1.0.0',
    scripts: { postinstall: `"${process.execPath}" build.cjs` }
  }))
  await writeFile(join(fixture, 'build.cjs'), "require('node:fs').writeFileSync('build-proof.txt', 'approved')")
  const pnpmEntryPath = join(process.cwd(), 'node_modules/pnpm/bin/pnpm.cjs')
  execFileSync(process.execPath, [pnpmEntryPath, 'pack', '--pack-destination', home], { cwd: fixture, stdio: 'pipe' })
  const backend = createGenerationPackageBackend({ dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath })
  const packed = join(home, 'script-approval-fixture-1.0.0.tgz')
  const upload = join(home, `upload with spaces${extension}`)
  await copyFile(packed, upload)
  const request = { spec: upload, kind: 'tarball', path: upload }
  const blocked = await backend.install(request)
  expect(blocked.packageResult.exitCode, blocked.packageResult.output).not.toBe(0)
  expect(blocked.packageResult.output).toContain('script-approval-fixture')
  expect((await listGenerations(home))).toHaveLength(0)
  const pending = /Ignored build scripts: ([^\r\n]+)/u.exec(blocked.packageResult.output)[1].trim()
  expect(pending).toMatch(/^script-approval-fixture@file:source\/[a-f0-9]{64}\.tgz$/u)
  const policyPath = join(home, 'profiles/web/pnpm-workspace.yaml')
  await writeFile(policyPath, `allowBuilds:\n  ${JSON.stringify(pending)}: true\n`)
  const approved = await backend.install(request)
  expect(approved.packageResult.exitCode, approved.packageResult.output).toBe(0)
  expect(await readFile(join(approved.bundleDirectory, 'build-proof.txt'), 'utf8')).toBe('approved')
  // Roll back publication so the next attempt exercises the same install flow.
  await approved.rollback()
  await writeFile(join(fixture, 'build.cjs'), "require('node:fs').writeFileSync('build-proof.txt', 'changed-without-reapproval')")
  execFileSync(process.execPath, [pnpmEntryPath, 'pack', '--pack-destination', home], { cwd: fixture, stdio: 'pipe' })
  await copyFile(packed, upload)
  const changed = await backend.install(request)
  expect(changed.packageResult.exitCode, changed.packageResult.output).not.toBe(0)
  const changedPending = /Ignored build scripts: ([^\r\n]+)/u.exec(changed.packageResult.output)[1].trim()
  expect(changedPending).not.toBe(pending)
  // The original immutable generation has not executed the replacement script.
  expect(await readFile(join(approved.bundleDirectory, 'build-proof.txt'), 'utf8')).toBe('approved')
  await writeFile(policyPath, `allowBuilds:\n  ${JSON.stringify(changedPending)}: false\n`)
  const refused = await backend.install(request)
  expect(refused.packageResult.exitCode, refused.packageResult.output).toBe(0)
  await expect(readFile(join(refused.bundleDirectory, 'build-proof.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  await refused.rollback()
  await writeFile(policyPath, `allowBuilds:\n  ${JSON.stringify(changedPending)}: true\n`)
  const reapproved = await backend.install(request)
  expect(reapproved.packageResult.exitCode, reapproved.packageResult.output).toBe(0)
  expect(await readFile(join(reapproved.bundleDirectory, 'build-proof.txt'), 'utf8')).toBe('changed-without-reapproval')
  await reapproved.commit()
}, 120_000)
