import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanupPluginOwnedComponents,
  orphanedPluginPackageDirectories,
  type LaunchAgentDescription
} from '../src/main/state/plugin-component-cleanup'

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
      bootoutLaunchAgent: async () => ({ code: 5, stdout: '', stderr: 'permission denied' })
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
