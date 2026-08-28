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
})
