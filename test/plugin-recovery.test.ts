import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import {
  isDisposableModuleDirectory,
  isThirdPartyPackageName,
  profilePackageJsonPath,
  pruneMissingProfileBundles,
  resetPluginProfile,
  resolveProfileRecoveryPlugins,
  uninstallPluginFromProfile
} from '../src/main/state/plugin-recovery'

describe('plugin-recovery', () => {
  const testDir = join(__dirname, '.temp-plugin-recovery-test')

  async function simulateDshPluginRemove(pluginName: string): Promise<boolean> {
    const profileDirectory = join(testDir, 'profiles', 'web')
    const manifestPath = join(profileDirectory, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    delete manifest.dependencies?.[pluginName]
    if (manifest.dsh?.profile?.bundles) {
      manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(
        (bundle: string) => bundle !== pluginName
      )
    }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    const lockfilePath = join(profileDirectory, 'pnpm-lock.yaml')
    const lockfile = parse(await readFile(lockfilePath, 'utf8'))
    delete lockfile.importers?.['.']?.dependencies?.[pluginName]
    await writeFile(lockfilePath, stringify(lockfile))
    await rm(join(profileDirectory, 'node_modules', pluginName), {
      recursive: true,
      force: true
    })
    return true
  }

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
    await mkdir(join(testDir, 'profiles', 'web', 'node_modules', 'dsh-better-sidebar'), {
      recursive: true
    })
    await writeFile(
      join(testDir, 'profiles', 'web', 'pnpm-lock.yaml'),
      stringify({
        lockfileVersion: '9.0',
        importers: {
          '.': {
            dependencies: {
              'dsh-better-sidebar': { specifier: '^0.13.1', version: '0.13.1' },
              '@linxin666/dsh-web-ui-all': { specifier: '^0.2.2', version: '0.2.2' },
              dshmarket: { specifier: '1.9.0', version: '1.9.0' }
            }
          }
        }
      })
    )

    const success = await uninstallPluginFromProfile(
      testDir,
      'dsh-better-sidebar',
      simulateDshPluginRemove
    )
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
    const updatedLockfile = parse(
      await readFile(join(testDir, 'profiles', 'web', 'pnpm-lock.yaml'), 'utf8')
    )
    expect(updatedLockfile.importers['.'].dependencies).toEqual({
      '@linxin666/dsh-web-ui-all': { specifier: '^0.2.2', version: '0.2.2' },
      dshmarket: { specifier: '1.9.0', version: '1.9.0' }
    })
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

  it('does not report success when the lockfile still imports the removed plugin', async () => {
    const profileDirectory = join(testDir, 'profiles', 'web')
    const pkgPath = profilePackageJsonPath(testDir)
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: { 'stale-lock-plugin': '^1.0.0' },
        dsh: { profile: { bundles: ['stale-lock-plugin'] } }
      })
    )
    await writeFile(
      join(profileDirectory, 'pnpm-lock.yaml'),
      stringify({
        lockfileVersion: '9.0',
        importers: {
          '.': {
            dependencies: {
              'stale-lock-plugin': { specifier: '^1.0.0', version: '1.0.0' }
            }
          }
        }
      })
    )

    const success = await uninstallPluginFromProfile(
      testDir,
      'stale-lock-plugin',
      async (pluginName) => {
        const manifest = JSON.parse(await readFile(pkgPath, 'utf8'))
        delete manifest.dependencies[pluginName]
        manifest.dsh.profile.bundles = []
        await writeFile(pkgPath, JSON.stringify(manifest))
        return true
      }
    )

    expect(success).toBe(false)
  })

  it('never treats Harness core packages as uninstallable third-party packages', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const manifest = {
      dependencies: {
        '@deepseek-ai/dsh-client-ui-directory-picker-native': '^0.1.0-rc.7',
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

  it('does not offer or remove a package that is not an active profile bundle', async () => {
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
    ).resolves.toEqual([])
    await expect(
      uninstallPluginFromProfile(testDir, 'partial-plugin', async () => true)
    ).resolves.toBe(false)
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

  it('maps the directory-picker frontend failure to the remaining remote bundle', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const remoteDir = join(testDir, 'profiles', 'web', 'node_modules', '@xgone', 'dsh-remote')
    await mkdir(remoteDir, { recursive: true })
    await writeFile(
      join(remoteDir, 'package.json'),
      JSON.stringify({
        name: '@xgone/dsh-remote',
        dsh: { bundle: { patch: './cordis.patch.yml' } }
      })
    )
    await writeFile(
      join(remoteDir, 'cordis.patch.yml'),
      [
        '- insert:',
        '    - id: directory-picker-browse-ui',
        "      name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'",
        ''
      ].join('\n')
    )
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          '@xgone/dsh-remote': '^0.2.0',
          dshmarket: '1.9.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              '@xgone/dsh-remote'
            ]
          }
        }
      })
    )

    await expect(
      resolveProfileRecoveryPlugins(testDir, [
        '@deepseek-ai/dsh-client-ui-directory-picker-browse'
      ])
    ).resolves.toEqual(['@xgone/dsh-remote'])
  })

  it('continues a recovery session by excluding the plugin removed in the previous round', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const fullRemoteDir = join(testDir, 'profiles', 'web', 'node_modules', 'dsh-full-remote')
    const xgoneRemoteDir = join(
      testDir,
      'profiles',
      'web',
      'node_modules',
      '@xgone',
      'dsh-remote'
    )
    for (const [directory, name] of [
      [fullRemoteDir, 'dsh-full-remote'],
      [xgoneRemoteDir, '@xgone/dsh-remote']
    ] as const) {
      await mkdir(directory, { recursive: true })
      await writeFile(
        join(directory, 'package.json'),
        JSON.stringify({ name, dsh: { bundle: { patch: './cordis.patch.yml' } } })
      )
      await writeFile(
        join(directory, 'cordis.patch.yml'),
        "- id: directory-picker-browse-ui\n  name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'\n"
      )
    }
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'dsh-full-remote': '^0.3.4',
          '@xgone/dsh-remote': '^0.2.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              '@xgone/dsh-remote',
              'dsh-full-remote'
            ]
          }
        }
      })
    )

    await expect(
      resolveProfileRecoveryPlugins(
        testDir,
        ['@deepseek-ai/dsh-client-ui-directory-picker-browse'],
        undefined,
        'conversation.hero.workspace.directoryFlow'
      )
    ).resolves.toEqual([])
    await expect(
      resolveProfileRecoveryPlugins(
        testDir,
        ['@deepseek-ai/dsh-client-ui-directory-picker-browse'],
        undefined,
        'conversation.hero.workspace.directoryFlow',
        ['dsh-full-remote']
      )
    ).resolves.toEqual(['@xgone/dsh-remote'])
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

  it('prunes missing third-party bundles and broken dependencies while preserving core and installed packages', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    const existingPluginDir = join(testDir, 'profiles', 'web', 'node_modules', 'dsh-existing-plugin')
    await mkdir(existingPluginDir, { recursive: true })
    await writeFile(join(existingPluginDir, 'package.json'), JSON.stringify({ name: 'dsh-existing-plugin' }))

    const lockfilePath = join(testDir, 'profiles', 'web', 'pnpm-lock.yaml')
    await writeFile(lockfilePath, 'lockfile-content')

    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          'dsh-existing-plugin': '^1.0.0',
          'dsh-full-remote': '^1.0.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket',
              'dsh-existing-plugin',
              'dsh-full-remote'
            ]
          }
        }
      })
    )

    const modified = await pruneMissingProfileBundles(testDir)
    expect(modified).toBe(true)

    const updated = JSON.parse(await readFile(pkgPath, 'utf8'))
    expect(updated.dependencies).toEqual({
      'dsh-existing-plugin': '^1.0.0'
    })
    expect(updated.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      'dshmarket',
      'dsh-existing-plugin'
    ])
  })

  it('leaves clean profile manifests unmodified when pruning missing bundles', async () => {
    const pkgPath = profilePackageJsonPath(testDir)
    await writeFile(
      pkgPath,
      JSON.stringify({
        dependencies: {
          dshmarket: '1.16.0'
        },
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-web-app',
              'dshmarket'
            ]
          }
        }
      })
    )

    const modified = await pruneMissingProfileBundles(testDir)
    expect(modified).toBe(false)
  })

  it('sweeps pnpm staging and sidelined package directories before launch', () => {
    // Windows refuses to replace a directory something still holds open, so
    // the packaged pnpm runner moves the blocked package aside and lets pnpm
    // install over the freed name. Nothing holds either leftover before
    // Harness starts, which is when this sweep runs.
    expect(isDisposableModuleDirectory('argparse_tmp_19856_4')).toBe(true)
    expect(isDisposableModuleDirectory('argparse.dsh-old-1787317710932')).toBe(true)
    expect(isDisposableModuleDirectory('argparse')).toBe(false)
    expect(isDisposableModuleDirectory('js-yaml')).toBe(false)
  })
})

