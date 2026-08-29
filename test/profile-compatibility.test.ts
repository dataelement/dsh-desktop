import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableProfilePlugins,
  inspectProfileCompatibility,
  quarantineProfileCorePackages,
  quarantineProfileWorkspaces
} from '../src/main/state/profile-compatibility'

describe('profile compatibility recovery', () => {
  const root = join(__dirname, '.temp-profile-compatibility')
  const dshHome = join(root, 'dsh-home')
  const profile = join(dshHome, 'profiles', 'web')
  const bundled = join(root, 'bundled-node-modules')
  const fixedNow = new Date('2026-08-28T08:00:00.000Z')

  async function manifest(directory: string, value: Record<string, unknown>): Promise<void> {
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), `${JSON.stringify(value, undefined, 2)}\n`)
  }

  beforeEach(async () => {
    await manifest(profile, {
      name: 'dsh-profile-web',
      private: true,
      dependencies: { 'dsh-dream-skin': '^0.4.14' },
      dsh: {
        profile: {
          bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-dream-skin']
        }
      }
    })
    await writeFile(join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await writeFile(join(profile, 'pnpm-workspace.yaml'), "packages:\n  - .\n  - 'packages/*'\n")
    await manifest(join(profile, 'node_modules', '@deepseek-ai', 'dsh-client-locale'), {
      name: '@deepseek-ai/dsh-client-locale',
      version: '0.1.0-rc.8'
    })
    await manifest(join(profile, 'node_modules', '@deepseek-ai', 'dsh-client-runtime'), {
      name: '@deepseek-ai/dsh-client-runtime',
      version: '0.1.0-rc.8'
    })
    await manifest(join(profile, 'node_modules', 'dsh-dream-skin'), {
      name: 'dsh-dream-skin',
      version: '0.4.14'
    })
    await mkdir(join(profile, 'node_modules', 'dsh-dream-skin', 'lib'), { recursive: true })
    await writeFile(
      join(profile, 'node_modules', 'dsh-dream-skin', 'lib', 'client.js'),
      'window.__ModuleLoader__.load({ factory: require => require("@deepseek-ai/dsh-client-runtime/client") })\n'
    )
    await manifest(join(profile, 'packages', 'dsh-doudizhu'), {
      name: 'dsh-doudizhu',
      version: '0.1.1',
      devDependencies: {
        '@deepseek-ai/dsh-client-locale': '0.1.0-rc.8',
        '@deepseek-ai/dsh-client-runtime': '0.1.0-rc.8'
      }
    })
    await manifest(join(bundled, '@deepseek-ai', 'dsh-client-locale'), {
      name: '@deepseek-ai/dsh-client-locale',
      version: '0.1.2-alpha.1'
    })
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('names core shadowing, missing client modules, and inactive workspace pollution', async () => {
    const result = await inspectProfileCompatibility(dshHome, bundled)
    const coreIssue = result.issues.find((issue) => issue.kind === 'core-version-mismatch')
    const workspaceIssue = result.issues.find((issue) => issue.kind === 'workspace-version-mismatch')

    expect(result.activePlugins).toEqual(['dsh-dream-skin'])
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'core-version-mismatch',
        packageName: '@deepseek-ai/dsh-client-locale',
        installedVersion: '0.1.0-rc.8',
        expectedVersion: '0.1.2-alpha.1',
        resolution: 'rebuild-profile'
      }),
      expect.objectContaining({
        kind: 'missing-client-module',
        packageName: 'dsh-dream-skin',
        resolution: 'disable-plugin'
      }),
      expect.objectContaining({
        kind: 'workspace-version-mismatch',
        packageName: 'dsh-doudizhu',
        resolution: 'quarantine-workspace'
      })
    ]))
    expect(coreIssue).toMatchObject({
      groupKind: 'workspace',
      groupName: 'dsh-doudizhu'
    })
    expect(coreIssue?.groupId).toBe(workspaceIssue?.groupId)
  })

  it('groups transitive component failures under their root plugin', async () => {
    await manifest(profile, {
      name: 'dsh-profile-web',
      private: true,
      dependencies: {
        'dsh-dream-skin': '^0.4.14',
        '@example/dsh-web-ui-all': '0.3.6'
      },
      dsh: {
        profile: {
          bundles: [
            '@deepseek-ai/dsh-base',
            '@deepseek-ai/dsh-web-app',
            'dsh-dream-skin',
            '@example/dsh-web-ui-all'
          ]
        }
      }
    })
    await manifest(join(profile, 'node_modules', '@example', 'dsh-web-ui-all'), {
      name: '@example/dsh-web-ui-all',
      version: '0.3.6',
      dependencies: {
        '@example/dsh-remote-web-ui': '0.3.6'
      },
      optionalDependencies: {
        '@example/platform-other': '0.3.6'
      }
    })

    const missingResult = await inspectProfileCompatibility(dshHome, bundled)
    expect(missingResult.issues).toContainEqual(expect.objectContaining({
      packageName: '@example/dsh-remote-web-ui',
      target: '@example/dsh-web-ui-all',
      groupId: 'plugin:@example/dsh-web-ui-all',
      detail: expect.stringContaining('not installed in this profile')
    }))
    expect(missingResult.issues.some(
      (issue) => issue.packageName === '@example/platform-other'
    )).toBe(false)

    await manifest(join(profile, 'node_modules', '@example', 'dsh-remote-web-ui'), {
      name: '@example/dsh-remote-web-ui',
      version: '0.3.6'
    })
    await mkdir(
      join(profile, 'node_modules', '@example', 'dsh-remote-web-ui', 'lib'),
      { recursive: true }
    )
    await writeFile(
      join(profile, 'node_modules', '@example', 'dsh-remote-web-ui', 'lib', 'index.js'),
      'import { RpcId } from "@deepseek-ai/dsh-host-apiproxy/api/rpc"\nexport { RpcId }\n'
    )

    const result = await inspectProfileCompatibility(dshHome, bundled)
    const issue = result.issues.find(
      (candidate) => candidate.packageName === '@example/dsh-remote-web-ui'
    )

    expect(issue).toMatchObject({
      kind: 'missing-client-module',
      installedVersion: '0.3.6',
      source: '@example/dsh-remote-web-ui/lib/index.js',
      target: '@example/dsh-web-ui-all',
      groupId: 'plugin:@example/dsh-web-ui-all',
      groupName: '@example/dsh-web-ui-all',
      groupKind: 'plugin',
      resolution: 'disable-plugin'
    })
    expect(issue?.detail).toContain('@deepseek-ai/dsh-host-apiproxy/api/rpc')
  })

  it('disables an incompatible plugin without deleting its dependency or files', async () => {
    const disabled = await disableProfilePlugins(dshHome, ['dsh-dream-skin'], fixedNow)

    expect(disabled).toEqual(['dsh-dream-skin'])
    const updated = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(updated.dependencies['dsh-dream-skin']).toBe('^0.4.14')
    expect(updated.dsh.profile.bundles).not.toContain('dsh-dream-skin')
    expect(existsSync(join(profile, 'node_modules', 'dsh-dream-skin'))).toBe(true)
    expect(existsSync(join(
      dshHome,
      'recovery',
      'compatibility',
      '2026-08-28T08-00-00-000Z',
      'package.json'
    ))).toBe(true)
  })

  it('quarantines an incompatible workspace and preserves its source', async () => {
    const workspace = join(profile, 'packages', 'dsh-doudizhu')
    const quarantined = await quarantineProfileWorkspaces(dshHome, [workspace], fixedNow)

    expect(quarantined).toEqual(['dsh-doudizhu'])
    expect(existsSync(workspace)).toBe(false)
    expect(existsSync(join(
      dshHome,
      'recovery',
      'compatibility',
      '2026-08-28T08-00-00-000Z',
      'workspaces',
      'dsh-doudizhu',
      'package.json'
    ))).toBe(true)
    expect(existsSync(join(profile, 'pnpm-lock.yaml'))).toBe(false)
  })

  it('moves a conflicting hoisted core package aside instead of deleting it', async () => {
    const quarantined = await quarantineProfileCorePackages(
      dshHome,
      ['@deepseek-ai/dsh-client-locale'],
      fixedNow
    )

    expect(quarantined).toEqual(['@deepseek-ai/dsh-client-locale'])
    expect(existsSync(join(profile, 'node_modules', '@deepseek-ai', 'dsh-client-locale'))).toBe(false)
    expect(existsSync(join(
      dshHome,
      'recovery',
      'compatibility',
      '2026-08-28T08-00-00-000Z',
      'core-packages',
      '@deepseek-ai__dsh-client-locale',
      'package.json'
    ))).toBe(true)
  })

  it('does not flag a plugin whose dependencies resolve from its own directory', async () => {
    // A plugin whose deps live under its own node_modules (a generation
    // layout, or any non-hoisted install) rather than flat in the profile.
    const pluginDir = join(profile, 'node_modules', 'dsh-vision-router')
    await manifest(pluginDir, {
      name: 'dsh-vision-router',
      version: '2.0.1',
      main: 'lib/public-entry.js',
      dependencies: { '@deepseek-ai/schemastery': '>=3.18.0', potrace: '^2.1.8' },
      dsh: { bundle: { patch: './cordis.patch.yml' } }
    })
    await mkdir(join(pluginDir, 'lib'), { recursive: true })
    await writeFile(
      join(pluginDir, 'lib', 'public-entry.js'),
      'import "@deepseek-ai/schemastery"\nimport "potrace"\n'
    )
    // deps present under the plugin's own node_modules, not the profile's
    await manifest(join(pluginDir, 'node_modules', '@deepseek-ai', 'schemastery'), {
      name: '@deepseek-ai/schemastery',
      version: '3.18.1'
    })
    await manifest(join(pluginDir, 'node_modules', 'potrace'), { name: 'potrace', version: '2.1.8' })
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-profile-web',
      private: true,
      dependencies: { 'dsh-dream-skin': '^0.4.14', 'dsh-vision-router': 'link:./x' },
      dsh: {
        profile: {
          bundles: [
            '@deepseek-ai/dsh-base',
            '@deepseek-ai/dsh-web-app',
            'dsh-dream-skin',
            'dsh-vision-router'
          ]
        }
      }
    }))
    // bundled provides schemastery too — either resolution path is fine
    await manifest(join(bundled, '@deepseek-ai', 'schemastery'), {
      name: '@deepseek-ai/schemastery',
      version: '3.18.1'
    })

    const { issues } = await inspectProfileCompatibility(dshHome, bundled)
    expect(issues.map((issue) => issue.target)).not.toContain('dsh-vision-router')
    expect(issues.filter((issue) => issue.detail.includes('potrace'))).toEqual([])
    expect(issues.filter((issue) => issue.detail.includes('schemastery'))).toEqual([])
  })
})
