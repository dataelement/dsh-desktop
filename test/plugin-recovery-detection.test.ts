import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectPluginRecovery } from '../src/main/plugin-recovery-detection'
import { extractSlotConflictName } from '../src/main/runtime/harness-runtime'
import {
  profilePackageJsonPath,
  resolveProfileRecoveryPlugins
} from '../src/main/state/plugin-recovery'

describe('plugin recovery detection', () => {
  const testDir = join(__dirname, '.temp-plugin-recovery-detection-test')
  const pluginDir = join(testDir, 'profiles', 'web', 'node_modules', 'conflicting-plugin')

  beforeEach(async () => {
    await mkdir(join(pluginDir, 'lib'), { recursive: true })
    await writeFile(
      profilePackageJsonPath(testDir),
      JSON.stringify({
        dependencies: {
          'conflicting-plugin': '^1.0.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'conflicting-plugin'
            ]
          }
        }
      })
    )
    await writeFile(
      join(pluginDir, 'lib', 'client.js'),
      'ctx.slot("conversation.hero.workspace.directoryFlow", component);'
    )
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('retries unresolved frontend evidence and identifies a plugin from a later console error', async () => {
    let currentTime = 0
    let liveLogs: string[] = []
    let waits = 0

    const detection = await detectPluginRecovery({
      dshHome: testDir,
      initialLogs: [
        '[stderr] Failed to load plugins\n@deepseek-ai/dsh-client-ui-directory-picker-browse'
      ],
      readLatestLogs: () => liveLogs,
      timeoutMs: 1_000,
      pollIntervalMs: 100,
      now: () => currentTime,
      wait: async (milliseconds) => {
        waits += 1
        currentTime += milliseconds
        liveLogs = [
          '[stderr] single slot "conversation.hero.workspace.directoryFlow" already has a registration at priority 0'
        ]
      }
    })

    expect(waits).toBe(1)
    expect(detection.plugins).toEqual(['conflicting-plugin'])
    expect(detection.logs).toContain(liveLogs[0])
  })

  it('stops retrying at the deadline when no direct evidence arrives', async () => {
    let currentTime = 0
    let waits = 0

    const detection = await detectPluginRecovery({
      dshHome: testDir,
      initialLogs: ['[stderr] Failed to load plugins'],
      readLatestLogs: () => [],
      timeoutMs: 250,
      pollIntervalMs: 100,
      now: () => currentTime,
      wait: async (milliseconds) => {
        waits += 1
        currentTime += milliseconds
      }
    })

    expect(waits).toBe(3)
    expect(detection.plugins).toEqual([])
  })

  it('attributes a generic slot conflict to a bundle that dynamically loads its provider', async () => {
    const profileDirectory = join(testDir, 'profiles', 'web')
    const remotePluginDirectory = join(profileDirectory, 'node_modules', 'dsh-full-remote')
    const unrelatedPluginDirectory = join(profileDirectory, 'node_modules', 'unrelated-plugin')
    const coreNodeModules = join(testDir, 'app-node_modules')
    const browseProviderDirectory = join(
      coreNodeModules,
      '@deepseek-ai',
      'dsh-client-ui-directory-picker-browse',
      'lib'
    )

    await mkdir(remotePluginDirectory, { recursive: true })
    await mkdir(unrelatedPluginDirectory, { recursive: true })
    await mkdir(browseProviderDirectory, { recursive: true })
    await writeFile(
      profilePackageJsonPath(testDir),
      JSON.stringify({
        dependencies: {
          'dsh-full-remote': '^0.3.5',
          'unrelated-plugin': '^1.0.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dsh-full-remote',
              'unrelated-plugin'
            ]
          }
        }
      })
    )
    await writeFile(
      join(remotePluginDirectory, 'package.json'),
      JSON.stringify({ name: 'dsh-full-remote' })
    )
    await writeFile(
      join(remotePluginDirectory, 'index.js'),
      'const BROWSE_UI_PACKAGE = "@deepseek-ai/dsh-client-ui-directory-picker-browse";'
    )
    await writeFile(
      join(unrelatedPluginDirectory, 'package.json'),
      JSON.stringify({ name: 'unrelated-plugin' })
    )
    await writeFile(
      join(browseProviderDirectory, 'client.js'),
      'ctx.slots.inject("conversation.hero.workspace.directoryFlow", register);'
    )

    const logs = [
      '[stderr] UI slot "conversation.hero.workspace.directoryFlow" has duplicate registrations from conflicting plugins.'
    ]
    const slotName = extractSlotConflictName(logs)
    expect(slotName).toBe('conversation.hero.workspace.directoryFlow')
    await expect(
      resolveProfileRecoveryPlugins(testDir, [], undefined, slotName, [coreNodeModules])
    ).resolves.toEqual(['dsh-full-remote'])

    const detection = await detectPluginRecovery({
      dshHome: testDir,
      initialLogs: logs,
      slotProviderNodeModulesPaths: [coreNodeModules]
    })

    expect(detection.plugins).toEqual(['dsh-full-remote'])
  })
})
