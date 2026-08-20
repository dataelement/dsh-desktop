import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  isThirdPartyPackageName,
  profilePackageJsonPath,
  resetPluginProfile,
  resolveProfileRecoveryPlugins,
  uninstallPluginFromProfile
} from '../src/main/state/plugin-recovery'

describe('plugin-recovery', () => {
  const testDir = join(__dirname, '.temp-plugin-recovery-test')

  beforeEach(async () => {
    await mkdir(join(testDir, 'profiles', 'web'), { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('uninstalls specific offending plugin from package.json dependencies and bundles', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const originalPkg = {
      name: 'dsh-profile-web',
      dependencies: {
        'dsh-better-sidebar': '^0.13.1',
        '@linxin666/dsh-web-ui-all': '^0.2.2',
        dshmarket: '1.9.0'
      },
      dsh: {
        profile: {
          bundles: [
            '@deepseek-ai/dsh-base',
            '@deepseek-ai/dsh-web-app',
            'dshmarket',
            'dsh-better-sidebar',
            '@linxin666/dsh-web-ui-all'
          ]
        }
      }
    }
    await writeFile(pkgPath, JSON.stringify(originalPkg, null, 2))

    const success = await uninstallPluginFromProfile(testDir, 'dsh-better-sidebar')
    expect(success).toBe(true)

    const updatedPkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    expect(updatedPkg.dependencies).toEqual({
      '@linxin666/dsh-web-ui-all': '^0.2.2',
      dshmarket: '1.9.0'
    })
    expect(updatedPkg.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'dshmarket',
      '@linxin666/dsh-web-ui-all'
    ])
  })

  it('returns false when package.json does not exist', async () => {
    const success = await uninstallPluginFromProfile(join(testDir, 'nonexistent'), 'some-plugin')
    expect(success).toBe(false)
  })

  it('returns false when plugin is not in package.json', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          dshmarket: '1.9.0'
        },
        dsh: {
          profile: {
            bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket']
          }
        }
      })
    )

    const success = await uninstallPluginFromProfile(testDir, 'non-existent-plugin')
    expect(success).toBe(false)
  })

  it('never treats Harness core packages as uninstallable third-party packages', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const manifest = {
      dependencies: {
        '@deepseek-ai/dsh-client-ui-directory-picker-native': '^0.1.0-rc.8',
        dshmarket: '1.15.0'
      },
      dsh: {
        profile: {
          bundles: [
            '@deepseek-ai/dsh-base',
            '@deepseek-ai/dsh-web-app',
            '@deepseek-ai/dsh-client-ui-directory-picker-native',
            'dshmarket'
          ]
        }
      }
    }
    await writeFile(pkgPath, JSON.stringify(manifest))

    expect(isThirdPartyPackageName('@deepseek-ai/dsh-client-ui-directory-picker-native')).toBe(false)
    expect(isThirdPartyPackageName('dshmarket')).toBe(false)
    expect(isThirdPartyPackageName('@linxin666/dsh-web-ui-all')).toBe(true)
    await expect(
      uninstallPluginFromProfile(testDir, '@deepseek-ai/dsh-client-ui-directory-picker-native')
    ).resolves.toBe(false)
    expect(JSON.parse(await readFile(pkgPath, 'utf8'))).toEqual(manifest)
  })

  it('maps an internal duplicate loader error to the profile bundle that declared it', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const pluginDirectory = join(
      testDir,
      'profiles',
      'web',
      'node_modules',
      '@deepseek-harness-tui',
      'dsh-tui'
    )
    await mkdir(pluginDirectory, { recursive: true })
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          '@deepseek-harness-tui/dsh-tui': '^0.8.4',
          dshmarket: '1.15.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              '@deepseek-harness-tui/dsh-tui'
            ]
          }
        }
      })
    )
    await writeFile(
      join(pluginDirectory, 'package.json'),
      JSON.stringify({
        name: '@deepseek-harness-tui/dsh-tui',
        dsh: { bundle: { patch: './cordis.patch.yml' } }
      })
    )
    await writeFile(
      join(pluginDirectory, 'cordis.patch.yml'),
      '- id: storage\n  name: "@deepseek-ai/dsh-storage"\n'
    )

    await expect(
      resolveProfileRecoveryPlugins(testDir, [], 'storage')
    ).resolves.toEqual(['@deepseek-harness-tui/dsh-tui'])
  })

  it('offers and cleans up a partially registered package', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'partial-plugin': '^1.0.0'
        },
        dsh: {
          profile: {
            bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
          }
        }
      })
    )

    await expect(
      resolveProfileRecoveryPlugins(testDir, ['partial-plugin'])
    ).resolves.toEqual(['partial-plugin'])
    await expect(
      uninstallPluginFromProfile(testDir, 'partial-plugin')
    ).resolves.toBe(true)
  })

  it('resets plugin profile by cleaning up specific failing plugin and related packages', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const originalPkg = {
      name: 'dsh-profile-web',
      dependencies: {
        '@linxin666/dsh-web-ui-all': '^0.2.2',
        dshmarket: '1.9.0'
      },
      dsh: {
        profile: {
          bundles: [
            '@deepseek-ai/dsh-base',
            '@deepseek-ai/dsh-web-app',
            'dshmarket',
            '@linxin666/dsh-web-ui-all'
          ]
        }
      }
    }
    await writeFile(pkgPath, JSON.stringify(originalPkg, null, 2))

    const success = await resetPluginProfile(testDir, '@linxin666/dsh-client-ui-web-ui-settings')
    expect(success).toBe(true)

    const updatedPkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    expect(updatedPkg.dependencies).toEqual({
      dshmarket: '1.9.0'
    })
    expect(updatedPkg.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'dshmarket'
    ])
  })

  it('resolves root package when a scoped sub-module fails', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const rootPackageDir = join(
      testDir,
      'profiles',
      'web',
      'node_modules',
      '@linxin666',
      'dsh-web-ui-all'
    )
    await mkdir(rootPackageDir, { recursive: true })
    await writeFile(
      join(rootPackageDir, 'package.json'),
      JSON.stringify({
        name: '@linxin666/dsh-web-ui-all',
        dependencies: {
          '@linxin666/dsh-client-ui-web-ui-settings': '0.2.2'
        }
      })
    )
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          '@linxin666/dsh-web-ui-all': '^0.2.2',
          '@openviking/dsh-memory-plugin': '^0.1.0',
          dshmarket: '1.9.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              '@linxin666/dsh-web-ui-all',
              '@openviking/dsh-memory-plugin'
            ]
          }
        }
      })
    )

    const resolved = await resolveProfileRecoveryPlugins(testDir, [
      '@linxin666/dsh-client-ui-web-ui-settings'
    ])
    expect(resolved).toEqual(['@linxin666/dsh-web-ui-all'])
  })

  it('resolves the specific plugin that declared a conflicting UI slot', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const remoteDir = join(testDir, 'profiles', 'web', 'node_modules', 'dsh-full-remote')
    const memoryDir = join(testDir, 'profiles', 'web', 'node_modules', '@openviking', 'dsh-memory-plugin')
    await mkdir(remoteDir, { recursive: true })
    await mkdir(memoryDir, { recursive: true })

    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'dsh-full-remote': '^0.3.4',
          '@openviking/dsh-memory-plugin': '^0.1.0',
          dshmarket: '1.9.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              'dsh-full-remote',
              '@openviking/dsh-memory-plugin'
            ]
          }
        }
      })
    )

    await writeFile(
      join(remoteDir, 'client.js'),
      'ctx.slot("conversation.hero.workspace.directoryFlow", component);'
    )
    await writeFile(
      join(memoryDir, 'client.js'),
      'ctx.slot("sidebar.panel", memoryComponent);'
    )

    const resolved = await resolveProfileRecoveryPlugins(
      testDir,
      ['@deepseek-ai/dsh-client-ui-directory-picker-browse'],
      undefined,
      'conversation.hero.workspace.directoryFlow'
    )
    expect(resolved).toEqual(['dsh-full-remote'])
  })

  it('maps a failed core entry to the third-party bundle that inserted it', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const remoteDir = join(testDir, 'profiles', 'web', 'node_modules', 'dsh-full-remote')
    await mkdir(remoteDir, { recursive: true })
    await writeFile(
      join(remoteDir, 'package.json'),
      JSON.stringify({
        name: 'dsh-full-remote',
        dsh: { bundle: { patch: './cordis.patch.yml' } }
      })
    )
    await writeFile(
      join(remoteDir, 'cordis.patch.yml'),
      "- id: ui-directory-picker-browse\n  name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'\n"
    )
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'dsh-full-remote': '^0.3.4',
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

    await expect(
      resolveProfileRecoveryPlugins(testDir, [
        '@deepseek-ai/dsh-client-ui-directory-picker-browse'
      ])
    ).resolves.toEqual(['dsh-full-remote'])
  })

  it('does not offer every third-party package when the failure has no direct match', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'plugin-a': '^1.0.0',
          'plugin-b': '^1.0.0',
          dshmarket: '1.15.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              'plugin-a',
              'plugin-b'
            ]
          }
        }
      })
    )

    await expect(
      resolveProfileRecoveryPlugins(testDir, [
        '@deepseek-ai/dsh-client-ui-directory-picker-native'
      ])
    ).resolves.toEqual([])
  })

  it('does not guess when more than one third-party package directly references a conflicting slot', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const firstDir = join(testDir, 'profiles', 'web', 'node_modules', 'plugin-a')
    const secondDir = join(testDir, 'profiles', 'web', 'node_modules', 'plugin-b')
    await mkdir(firstDir, { recursive: true })
    await mkdir(secondDir, { recursive: true })
    await writeFile(join(firstDir, 'client.js'), 'slots.register({ name: "sidebar.panel" })')
    await writeFile(join(secondDir, 'client.js'), 'slots.register({ name: "sidebar.panel" })')
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'plugin-a': '^1.0.0',
          'plugin-b': '^1.0.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'plugin-a',
              'plugin-b'
            ]
          }
        }
      })
    )

    await expect(
      resolveProfileRecoveryPlugins(
        testDir,
        ['@deepseek-ai/dsh-client-ui-sidebar'],
        undefined,
        'sidebar.panel'
      )
    ).resolves.toEqual([])
  })
})
