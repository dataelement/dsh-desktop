import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  auditLaunchAgents,
  quarantineAppBundleLaunchAgents,
  type LaunchAgentRecord
} from '../src/main/state/launch-agent-audit'
import { readComponentLedger, REPAIR_ESCALATION_THRESHOLD } from '../src/main/state/component-ledger'

describe('launch agent audit', () => {
  const testRoot = join(__dirname, '.temp-launch-agent-audit')
  const dshHome = join(testRoot, 'dsh-home')
  const home = join(testRoot, 'home')
  const launchAgents = join(home, 'Library', 'LaunchAgents')
  const appBundlePath = '/Applications/DSH Desktop.app'
  const helper = `${appBundlePath}/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper`
  const doctorPlist = join(launchAgents, 'com.dsh.doctor.plist')

  const brokenAgent: LaunchAgentRecord = {
    Label: 'com.dsh.doctor',
    ProgramArguments: [helper, '/Users/alex/.dsh/profiles/web/node_modules/@vendor/dsh-doctor/daemon.js'],
    KeepAlive: true
  }

  async function writeAgentFile(path: string): Promise<void> {
    await writeFile(path, 'binary plist placeholder')
  }

  function options(overrides: Record<string, unknown> = {}) {
    return {
      dshHome,
      appBundlePath,
      homeDirectory: home,
      platform: 'darwin' as NodeJS.Platform,
      uid: 501,
      readLaunchAgent: async () => structuredClone(brokenAgent),
      writeLaunchAgent: vi.fn(async (path: string, record: LaunchAgentRecord) => {
        await writeFile(path, JSON.stringify(record))
      }),
      bootoutLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
      bootstrapLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
      disableLaunchAgent: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' })),
      now: () => new Date('2026-08-25T10:00:00.000Z'),
      ...overrides
    }
  }

  beforeEach(async () => {
    await mkdir(launchAgents, { recursive: true })
    await mkdir(dshHome, { recursive: true })
  })

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true })
  })

  it('repairs an agent that boots our binary as a desktop application', async () => {
    await writeAgentFile(doctorPlist)
    const settings = options()

    const result = await auditLaunchAgents(settings)

    expect(result.findings).toEqual([
      expect.objectContaining({ label: 'com.dsh.doctor', action: 'repaired', plistPath: doctorPlist })
    ])
    const written = JSON.parse(await readFile(doctorPlist, 'utf8')) as LaunchAgentRecord
    expect(written.EnvironmentVariables).toEqual({ ELECTRON_RUN_AS_NODE: '1' })
    expect(written.KeepAlive).toBe(true)
  })

  it('reloads the repaired job so the running process stops', async () => {
    await writeAgentFile(doctorPlist)
    const settings = options()

    await auditLaunchAgents(settings)

    expect(settings.bootoutLaunchAgent).toHaveBeenCalledWith('gui/501/com.dsh.doctor')
    expect(settings.bootstrapLaunchAgent).toHaveBeenCalledWith('gui/501', doctorPlist)
  })

  it('backs up the original definition before rewriting it', async () => {
    await writeAgentFile(doctorPlist)

    const result = await auditLaunchAgents(options())

    expect(result.findings[0]?.backupPath).toBeDefined()
    expect(existsSync(result.findings[0]!.backupPath!)).toBe(true)
  })

  it('leaves an agent belonging to another application untouched', async () => {
    const foreign = join(launchAgents, 'com.google.keystone.agent.plist')
    await writeAgentFile(foreign)
    const settings = options({
      readLaunchAgent: async () => ({
        Label: 'com.google.keystone.agent',
        ProgramArguments: ['/Users/alex/Library/Google/GoogleUpdater/Current/updater']
      })
    })

    const result = await auditLaunchAgents(settings)

    expect(result.findings).toEqual([])
    expect(settings.bootoutLaunchAgent).not.toHaveBeenCalled()
    expect(await readFile(foreign, 'utf8')).toBe('binary plist placeholder')
  })

  it('does nothing away from macOS', async () => {
    await writeAgentFile(doctorPlist)
    const settings = options({ platform: 'win32' as NodeJS.Platform })

    const result = await auditLaunchAgents(settings)

    expect(result.findings).toEqual([])
    expect(settings.writeLaunchAgent).not.toHaveBeenCalled()
  })

  it('counts each repair against the label', async () => {
    await writeAgentFile(doctorPlist)

    await auditLaunchAgents(options())

    expect((await readComponentLedger(dshHome))['com.dsh.doctor']?.repairs).toBe(1)
  })

  it('disables and quarantines a label the plugin keeps recreating unsafely', async () => {
    await writeAgentFile(doctorPlist)
    for (let attempt = 0; attempt < REPAIR_ESCALATION_THRESHOLD; attempt += 1) {
      await writeAgentFile(doctorPlist)
      await auditLaunchAgents(options())
    }
    await writeAgentFile(doctorPlist)
    const settings = options()

    const result = await auditLaunchAgents(settings)

    expect(result.findings[0]?.action).toBe('disabled')
    expect(settings.writeLaunchAgent).not.toHaveBeenCalled()
    expect(settings.disableLaunchAgent).toHaveBeenCalledWith('gui/501/com.dsh.doctor')
    expect(settings.bootoutLaunchAgent).toHaveBeenCalledWith('gui/501/com.dsh.doctor')
    expect(existsSync(doctorPlist)).toBe(false)
  })

  it('keeps a repeatedly recreated job in place when it cannot persist the ban', async () => {
    await writeAgentFile(doctorPlist)
    for (let attempt = 0; attempt < REPAIR_ESCALATION_THRESHOLD; attempt += 1) {
      await writeAgentFile(doctorPlist)
      await auditLaunchAgents(options())
    }
    await writeAgentFile(doctorPlist)
    const settings = options({
      disableLaunchAgent: vi.fn(async () => ({ code: 1, stdout: '', stderr: 'not permitted' }))
    })

    const result = await auditLaunchAgents(settings)

    expect(result.findings).toEqual([])
    expect(result.failures[0]).toContain('not permitted')
    expect(settings.bootoutLaunchAgent).not.toHaveBeenCalled()
    expect(existsSync(doctorPlist)).toBe(true)
  })

  it('quarantines Node-mode app-bundle jobs before an update', async () => {
    const bundleWorkerPlist = join(launchAgents, 'com.example.bundle-worker.plist')
    await writeAgentFile(bundleWorkerPlist)
    const settings = options({
      readLaunchAgent: async () => ({
        ...structuredClone(brokenAgent),
        Label: 'com.example.bundle-worker',
        EnvironmentVariables: { ELECTRON_RUN_AS_NODE: '1' }
      })
    })

    const result = await quarantineAppBundleLaunchAgents(settings)

    expect(result.failures).toEqual([])
    expect(result.findings[0]?.action).toBe('quarantined')
    expect(existsSync(bundleWorkerPlist)).toBe(false)
    expect(settings.bootoutLaunchAgent).toHaveBeenCalledWith('gui/501/com.example.bundle-worker')
  })

  it('fails closed when an app-bundle job cannot be stopped before update', async () => {
    const bundleWorkerPlist = join(launchAgents, 'com.example.bundle-worker.plist')
    await writeAgentFile(bundleWorkerPlist)
    const settings = options({
      readLaunchAgent: async () => ({
        ...structuredClone(brokenAgent),
        Label: 'com.example.bundle-worker'
      }),
      bootoutLaunchAgent: vi.fn(async () => ({ code: 5, stdout: '', stderr: 'not permitted' }))
    })

    const result = await quarantineAppBundleLaunchAgents(settings)

    expect(result.findings).toEqual([])
    expect(result.failures[0]).toContain('not permitted')
    expect(existsSync(bundleWorkerPlist)).toBe(true)
  })

  it('quarantines the agent when the repair cannot be written', async () => {
    await writeAgentFile(doctorPlist)
    const settings = options({
      writeLaunchAgent: async () => { throw new Error('read-only file system') }
    })

    const result = await auditLaunchAgents(settings)

    expect(result.findings[0]?.action).toBe('quarantined')
    expect(existsSync(doctorPlist)).toBe(false)
    expect(settings.bootoutLaunchAgent).toHaveBeenCalledWith('gui/501/com.dsh.doctor')
  })

  it('skips a plist it cannot parse rather than guessing', async () => {
    await writeAgentFile(doctorPlist)
    const settings = options({
      readLaunchAgent: async () => { throw new Error('not a plist') }
    })

    const result = await auditLaunchAgents(settings)

    expect(result.findings).toEqual([])
    expect(settings.bootoutLaunchAgent).not.toHaveBeenCalled()
  })

  it('names the plugin package behind the agent when the path reveals it', async () => {
    await writeAgentFile(doctorPlist)

    const result = await auditLaunchAgents(options())

    expect(result.findings[0]?.owner).toBe('@vendor/dsh-doctor')
  })
})
