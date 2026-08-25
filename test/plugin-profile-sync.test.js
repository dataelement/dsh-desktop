import { mkdtemp, mkdir, readFile, readlink, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { rm } from 'node:fs/promises'

import {
  resolveSyncEndpoints,
  rewriteLocalPluginReferences,
  syncHarnessPluginProfile
} from '../scripts/sync-plugin-profile.mjs'

const testDirectories = []

afterEach(async () => {
  await Promise.all(
    testDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

async function makeUserData(name) {
  const root = await mkdtemp(path.join(tmpdir(), `sherlock-plugin-sync-${name}-`))
  testDirectories.push(root)
  return root
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

describe('rewriteLocalPluginReferences', () => {
  it('moves file and link dependencies rooted in the source custom-plugin directory', () => {
    const source = '/formal/harness/custom-plugins'
    const target = '/dev/harness/custom-plugins'
    const manifest = {
      dependencies: {
        local: `file:${source}/local-plugin`,
        linked: `link:${source}/linked-plugin`,
        remote: '^1.2.3'
      }
    }

    expect(rewriteLocalPluginReferences(manifest, source, target)).toEqual({
      dependencies: {
        local: `file:${target}/local-plugin`,
        linked: `link:${target}/linked-plugin`,
        remote: '^1.2.3'
      }
    })
    expect(manifest.dependencies.local).toBe(`file:${source}/local-plugin`)
  })

  it('treats sherlock-desktop as the single formal profile', () => {
    expect(resolveSyncEndpoints('dev-to-formal', '/app-data')).toEqual({
      sourceUserData: path.join('/app-data', 'dsh-desktop-dev'),
      targetUserData: path.join('/app-data', 'sherlock-desktop')
    })
  })
})

describe('syncHarnessPluginProfile', () => {
  it('copies the plugin profile and custom sources without touching other Dev data', async () => {
    const sourceUserData = await makeUserData('formal')
    const targetUserData = await makeUserData('dev')
    const sourceHarness = path.join(sourceUserData, 'harness')
    const targetHarness = path.join(targetUserData, 'harness')
    const sourceProfile = path.join(sourceHarness, 'profiles', 'web')
    const targetProfile = path.join(targetHarness, 'profiles', 'web')
    const sourceCustom = path.join(sourceHarness, 'custom-plugins')
    const targetCustom = path.join(targetHarness, 'custom-plugins')

    await writeJson(path.join(sourceProfile, 'package.json'), {
      name: 'dsh-profile-web',
      dependencies: {
        'local-sidebar': `file:${sourceCustom}/local-sidebar`,
        dshmarket: '1.17.0'
      },
      dsh: {
        profile: {
          bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket', 'local-sidebar']
        }
      }
    })
    await writeFile(
      path.join(sourceProfile, 'pnpm-lock.yaml'),
      `specifier: file:${sourceCustom}/local-sidebar\nresolution: file:../../custom-plugins/local-sidebar\n`,
      'utf8'
    )
    await mkdir(path.join(sourceProfile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(path.join(sourceProfile, 'node_modules', 'dshmarket', 'index.js'), 'formal-market\n')
    await mkdir(path.join(sourceCustom, 'local-sidebar', 'lib'), { recursive: true })
    await writeFile(path.join(sourceCustom, 'local-sidebar', 'lib', 'index.js'), 'optimized-sidebar\n')
    await symlink(
      path.join(sourceCustom, 'local-sidebar'),
      path.join(sourceProfile, 'node_modules', 'local-sidebar'),
      'dir'
    )

    await writeJson(path.join(targetProfile, 'package.json'), {
      dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
    })
    await mkdir(path.join(targetCustom, 'old-plugin'), { recursive: true })
    await writeFile(path.join(targetCustom, 'old-plugin', 'index.js'), 'old-dev-plugin\n')
    await mkdir(targetHarness, { recursive: true })
    await writeFile(path.join(targetHarness, 'settings.yaml'), 'locale:\n  preference: zh\n')

    const result = await syncHarnessPluginProfile({
      sourceUserData,
      targetUserData,
      direction: 'formal-to-dev',
      now: new Date('2026-08-21T09:30:00.000Z')
    })

    const targetManifest = JSON.parse(
      await readFile(path.join(targetProfile, 'package.json'), 'utf8')
    )
    expect(targetManifest.dependencies).toEqual({
      'local-sidebar': `file:${targetCustom}/local-sidebar`,
      dshmarket: '1.17.0'
    })
    expect(await readFile(path.join(targetProfile, 'node_modules', 'dshmarket', 'index.js'), 'utf8'))
      .toBe('formal-market\n')
    expect(await readFile(path.join(targetCustom, 'local-sidebar', 'lib', 'index.js'), 'utf8'))
      .toBe('optimized-sidebar\n')
    expect(await readlink(path.join(targetProfile, 'node_modules', 'local-sidebar')))
      .toBe(path.join(targetCustom, 'local-sidebar'))
    expect(await readFile(path.join(targetHarness, 'settings.yaml'), 'utf8'))
      .toBe('locale:\n  preference: zh\n')
    expect(
      await readFile(path.join(result.backupDirectory, 'profiles', 'web', 'package.json'), 'utf8')
    ).toContain('"dependencies": {}')
    expect(
      await readFile(path.join(result.backupDirectory, 'custom-plugins', 'old-plugin', 'index.js'), 'utf8')
    ).toBe('old-dev-plugin\n')
    expect(result.plugins).toEqual(['local-sidebar', 'dshmarket'])
  })

  it('refuses to overwrite a target when a local source dependency is missing', async () => {
    const sourceUserData = await makeUserData('missing-source')
    const targetUserData = await makeUserData('safe-target')
    const sourceCustom = path.join(sourceUserData, 'harness', 'custom-plugins')
    const sourceManifest = path.join(sourceUserData, 'harness', 'profiles', 'web', 'package.json')
    const targetManifest = path.join(targetUserData, 'harness', 'profiles', 'web', 'package.json')

    await writeJson(sourceManifest, {
      dependencies: { missing: `file:${sourceCustom}/missing` },
      dsh: { profile: { bundles: ['missing'] } }
    })
    await writeJson(targetManifest, { marker: 'keep-me' })

    await expect(
      syncHarnessPluginProfile({
        sourceUserData,
        targetUserData,
        direction: 'formal-to-dev'
      })
    ).rejects.toThrow('missing')
    expect(JSON.parse(await readFile(targetManifest, 'utf8'))).toEqual({ marker: 'keep-me' })
  })
})
