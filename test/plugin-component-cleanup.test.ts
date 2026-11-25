import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupPluginOwnedComponents,
  discoverLegacyPluginOwnedComponents,
  orphanedPluginPackageDirectories,
  readPluginOwnedComponentBackups,
  restorePluginOwnedComponents,
  type LaunchAgentDescription
} from '../src/main/profile/plugin-component-cleanup'

describe('plugin component cleanup', () => {
  const testRoot = join(__dirname, '.temp-plugin-component-cleanup')
  const dshHome = join(testRoot, 'dsh-home')
  const profile = join(dshHome, 'profiles', 'web')
  const home = join(testRoot, 'home')
  const launchAgents = join(home, 'Library', 'LaunchAgents')
  const plugin = '@example/plugin-all'
  const doctor = '@example/plugin-doctor'

  async function writePackage(name: string, dependencies: Record<string, string> = {}): Promise<string> {
    const directory = join(profile, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', dependencies })
    )
    return directory
  }

  async function writeProfile(dependencies: Record<string, string>): Promise<void> {
    await mkdir(profile, { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies }))
  }

  async function installPluginGraph(shared = false): Promise<string> {
    await writeProfile({ [plugin]: '1.0.0', ...(shared ? { '@example/other-root': '1.0.0' } : {}) })
    await writePackage(plugin, { [doctor]: '1.0.0' })
    const doctorDirectory = await writePackage(doctor)
    if (shared) await writePackage('@example/other-root', { [doctor]: '1.0.0' })
    return doctorDirectory
  }

  beforeEach(async () => {
    await mkdir(launchAgents, { recursive: true })
  })

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true })
  })

  it('finds transitive packages owned only by the selected root', async () => {
    const doctorDirectory = await installPluginGraph()

    const directories = await orphanedPluginPackageDirectories(dshHome, plugin)

    expect(directories).toContain(join(profile, 'node_modules', plugin))
    expect(directories).toContain(doctorDirectory)
  })

  it('does not claim a transitive package still used by another profile root', async () => {
    const doctorDirectory = await installPluginGraph(true)

    const directories = await orphanedPluginPackageDirectories(dshHome, plugin)

    expect(directories).toContain(join(profile, 'node_modules', plugin))
    expect(directories).not.toContain(doctorDirectory)
  })

  it('boots out and quarantines a LaunchAgent that references an orphaned package', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    await writeFile(plistPath, 'fixture')
    const bootout = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const logs: string[] = []

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      now: () => new Date('2026-08-25T12:00:00.000Z'),
      readLaunchAgent: async () => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs'), 'supervisor']
      }),
      bootoutLaunchAgent: bootout,
      log: (message) => logs.push(message)
    })

    expect(result.ok).toBe(true)
    expect(result.matched).toBe(1)
    expect(bootout).toHaveBeenCalledWith('gui/501/com.example.doctor')
    expect(existsSync(plistPath)).toBe(false)
    expect(result.quarantined).toHaveLength(1)
    expect(await readFile(result.quarantined[0] as string, 'utf8')).toBe('fixture')
    expect(logs[0]).toContain('quarantined')
  })

  it('quarantines an owned LaunchAgent when its service is absent from a live domain', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    await writeFile(plistPath, 'fixture')
    const inspect = vi.fn(async (target: string) => ({
      code: target === 'gui/501' ? 0 : 113,
      stdout: '',
      stderr: 'arbitrary localized diagnostic'
    }))

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: async () => ({
        code: 3,
        stdout: '',
        stderr: 'arbitrary localized diagnostic'
      }),
      inspectLaunchAgent: inspect
    })

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
    expect(inspect.mock.calls).toEqual([
      ['gui/501/com.example.doctor'],
      ['gui/501']
    ])
    expect(existsSync(plistPath)).toBe(false)
    expect(result.quarantined).toHaveLength(1)
  })

  it('journals the removal id and original path before moving an owned LaunchAgent', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    const removalId = '2026-08-29T12-00-00-000Z-fixture'
    const backupDirectory = join(dshHome, 'recovery', 'plugin-removals', removalId, 'example__plugin-all')
    await writeFile(plistPath, 'fixture')
    const common = {
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      platform: 'darwin' as const,
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: async () => ({ code: 0, stdout: '', stderr: '' })
    }

    const interrupted = await cleanupPluginOwnedComponents({
      ...common,
      moveComponent: async () => { throw new Error('simulated rename failure') }
    })

    expect(interrupted.ok).toBe(false)
    expect(existsSync(plistPath)).toBe(true)
    const journaled = await readPluginOwnedComponentBackups(backupDirectory, removalId, plugin)
    expect(journaled).toEqual([{
      kind: 'launch-agent',
      label: 'com.example.doctor',
      originalPath: plistPath,
      backupRelativePath: 'owned-components/launch-agents/com.example.doctor.plist'
    }])

    const retried = await cleanupPluginOwnedComponents(common)
    expect(retried.ok).toBe(true)
    expect(retried.componentBackups).toEqual(journaled)
    expect(existsSync(plistPath)).toBe(false)
    expect(existsSync(join(
      backupDirectory,
      'owned-components',
      'launch-agents',
      'com.example.doctor.plist'
    ))).toBe(true)

    // If the service recreates its plist after the package was detached, the
    // durable component record still owns the exact path and stops it again.
    await writeProfile({})
    await rm(join(profile, 'node_modules'), { recursive: true, force: true })
    await writeFile(plistPath, 'recreated fixture')
    const afterDetach = await cleanupPluginOwnedComponents(common)
    expect(afterDetach.ok).toBe(true)
    expect(existsSync(plistPath)).toBe(false)
    expect(afterDetach.quarantined).toHaveLength(1)
    expect(await readFile(afterDetach.quarantined[0] as string, 'utf8')).toBe('recreated fixture')
  })

  it('does not boot out or move a LaunchAgent through an owned-components junction', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.linked-backup.plist')
    const removalId = '2026-08-29T12-02-00-000Z-fixture'
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      removalId,
      'example__plugin-all'
    )
    const external = join(testRoot, 'external-owned-components')
    await mkdir(backupDirectory, { recursive: true })
    await mkdir(external, { recursive: true })
    await symlink(
      external,
      join(backupDirectory, 'owned-components'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    await writeFile(plistPath, 'fixture')
    const bootout = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const move = vi.fn(async () => undefined)

    await expect(cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.linked-backup',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: bootout,
      moveComponent: move
    })).rejects.toThrow(/symbolic link|junction/u)

    expect(bootout).not.toHaveBeenCalled()
    expect(move).not.toHaveBeenCalled()
    expect(await readFile(plistPath, 'utf8')).toBe('fixture')
    expect(await readdir(external)).toEqual([])
  })

  it('refuses a LaunchAgents junction before inspecting or moving active components', async () => {
    const doctorDirectory = await installPluginGraph()
    const external = join(testRoot, 'external-launch-agents')
    await rm(launchAgents, { recursive: true, force: true })
    await mkdir(external, { recursive: true })
    await symlink(
      external,
      launchAgents,
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    const plistPath = join(external, 'com.example.external.plist')
    await writeFile(plistPath, 'fixture')
    const readLaunchAgent = vi.fn(async () => ({
      Label: 'com.example.external',
      ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
    }))
    const bootout = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    const move = vi.fn(async () => undefined)

    await expect(cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent,
      bootoutLaunchAgent: bootout,
      moveComponent: move
    })).rejects.toThrow(/symbolic link|junction/u)

    expect(readLaunchAgent).not.toHaveBeenCalled()
    expect(bootout).not.toHaveBeenCalled()
    expect(move).not.toHaveBeenCalled()
    expect(await readFile(plistPath, 'utf8')).toBe('fixture')
  })

  it('attributes every absolute owner argument but ignores relative node_modules decoys', async () => {
    const legacyDirectory = join(
      dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T12-03-00-000Z'
    )
    const source = join(legacyDirectory, 'com.example.owners.plist')
    await mkdir(legacyDirectory, { recursive: true })
    await writeFile(source, 'fixture')

    const discovery = await discoverLegacyPluginOwnedComponents({
      dshHome,
      homeDirectory: home,
      readLaunchAgent: async () => ({
        Label: 'com.example.owners',
        Program: '/opt/runtime/node_modules/@example/plugin-a/agent.mjs',
        ProgramArguments: [
          'node_modules/relative-decoy/agent.mjs',
          '/opt/runtime/node_modules/@example/plugin-b/helper.mjs'
        ]
      })
    })

    expect(discovery.unverified).toEqual([])
    expect(discovery.candidates).toHaveLength(1)
    expect(discovery.candidates[0]?.packageOwners).toEqual([
      '@example/plugin-a',
      '@example/plugin-b'
    ])
    expect(discovery.candidates[0]?.quarantinedAt).toBe('2026-08-29T12:03:00.000Z')
  })

  it('keeps the component backup and retries after LaunchAgent bootstrap fails', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    const removalId = '2026-08-29T12-05-00-000Z-fixture'
    const backupDirectory = join(dshHome, 'recovery', 'plugin-removals', removalId, 'example__plugin-all')
    const launchAgent = {
      Label: 'com.example.doctor',
      ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
    }
    await writeFile(plistPath, 'fixture')
    const removed = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => launchAgent,
      bootoutLaunchAgent: async () => ({ code: 0, stdout: '', stderr: '' })
    })
    const expectedComponents = removed.componentBackups ?? []
    const backupPath = join(
      backupDirectory,
      'owned-components',
      'launch-agents',
      'com.example.doctor.plist'
    )

    await expect(restorePluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      expectedComponents,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => launchAgent,
      bootstrapLaunchAgent: async () => ({ code: 5, stdout: '', stderr: 'not permitted' }),
      inspectLaunchAgent: async () => ({ code: 113, stdout: '', stderr: 'not loaded' })
    })).rejects.toThrow(/bootstrap failed/u)
    expect(await readFile(plistPath, 'utf8')).toBe('fixture')
    expect(await readFile(backupPath, 'utf8')).toBe('fixture')

    const bootstrap = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    await restorePluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      expectedComponents,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => launchAgent,
      bootstrapLaunchAgent: bootstrap,
      inspectLaunchAgent: async () => ({ code: 0, stdout: 'service = { }', stderr: '' })
    })
    expect(bootstrap).toHaveBeenCalledWith('gui/501', plistPath)
    expect(await readFile(backupPath, 'utf8')).toBe('fixture')
  })

  it('does not overwrite a conflicting LaunchAgent during component restore', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    const removalId = '2026-08-29T12-10-00-000Z-fixture'
    const backupDirectory = join(dshHome, 'recovery', 'plugin-removals', removalId, 'example__plugin-all')
    const launchAgent = {
      Label: 'com.example.doctor',
      ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
    }
    await writeFile(plistPath, 'original')
    const removed = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => launchAgent,
      bootoutLaunchAgent: async () => ({ code: 0, stdout: '', stderr: '' })
    })
    await writeFile(plistPath, 'new owner material')
    const bootstrap = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))

    await expect(restorePluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      removalId,
      backupDirectory,
      expectedComponents: removed.componentBackups ?? [],
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => launchAgent,
      bootstrapLaunchAgent: bootstrap,
      inspectLaunchAgent: async () => ({ code: 0, stdout: '', stderr: '' })
    })).rejects.toThrow(/different material/u)
    expect(await readFile(plistPath, 'utf8')).toBe('new owner material')
    expect(bootstrap).not.toHaveBeenCalled()
  })

  it('leaves an unrelated LaunchAgent and plugin data untouched', async () => {
    await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.unrelated.plist')
    const pluginData = join(home, '.plugin-data', 'state.json')
    await mkdir(join(home, '.plugin-data'), { recursive: true })
    await writeFile(plistPath, 'fixture')
    await writeFile(pluginData, '{}')
    const bootout = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.unrelated',
        ProgramArguments: ['/usr/bin/node', '/opt/example/cli.mjs']
      }),
      bootoutLaunchAgent: bootout
    })

    expect(result).toEqual({ ok: true, matched: 0, quarantined: [], failures: [] })
    expect(bootout).not.toHaveBeenCalled()
    expect(existsSync(plistPath)).toBe(true)
    expect(existsSync(pluginData)).toBe(true)
  })

  it('does not stop a service whose package is shared by another root', async () => {
    const doctorDirectory = await installPluginGraph(true)
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    await writeFile(plistPath, 'fixture')
    const bootout = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async (): Promise<LaunchAgentDescription> => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: bootout
    })

    expect(result.matched).toBe(0)
    expect(bootout).not.toHaveBeenCalled()
    expect(existsSync(plistPath)).toBe(true)
  })

  it('fails closed and keeps the plist when the owned service cannot be stopped', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    await writeFile(plistPath, 'fixture')

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: async () => ({ code: 5, stdout: '', stderr: 'permission denied' }),
      inspectLaunchAgent: async () => ({ code: 0, stdout: 'service = { }', stderr: '' })
    })

    expect(result.ok).toBe(false)
    expect(result.matched).toBe(1)
    expect(result.failures[0]).toContain('launchctl bootout failed')
    expect(existsSync(plistPath)).toBe(true)
  })

  it('contains a bootout execution error and keeps the package removable state intact', async () => {
    const doctorDirectory = await installPluginGraph()
    const plistPath = join(launchAgents, 'com.example.doctor.plist')
    await writeFile(plistPath, 'fixture')

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'darwin',
      homeDirectory: home,
      uid: 501,
      readLaunchAgent: async () => ({
        Label: 'com.example.doctor',
        ProgramArguments: ['/usr/bin/node', join(doctorDirectory, 'lib', 'cli.mjs')]
      }),
      bootoutLaunchAgent: async () => { throw new Error('launchctl unavailable') }
    })

    expect(result.ok).toBe(false)
    expect(result.failures[0]).toContain('launchctl unavailable')
    expect(existsSync(plistPath)).toBe(true)
  })

  it('is a no-op on non-macOS platforms', async () => {
    const readLaunchAgent = vi.fn(async () => ({}))

    const result = await cleanupPluginOwnedComponents({
      dshHome,
      pluginName: plugin,
      platform: 'win32',
      homeDirectory: home,
      readLaunchAgent
    })

    expect(result).toEqual({ ok: true, matched: 0, quarantined: [], failures: [] })
    expect(readLaunchAgent).not.toHaveBeenCalled()
  })
})
