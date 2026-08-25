import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { installBundledPluginProfile } from '../src/main/bundled-plugin-profile'

const temporaryDirectories: string[] = []

async function temporaryDirectory(label: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), `${label}-`))
  temporaryDirectories.push(directory)
  return directory
}

async function makeBundledProfile(root: string): Promise<string> {
  const profile = path.join(root, 'sherlock-plugin-profile')
  await mkdir(path.join(profile, 'modules', 'dsh-file-drop'), { recursive: true })
  await writeFile(
    path.join(profile, 'package.json'),
    `${JSON.stringify(
      {
        name: 'dsh-profile-web',
        private: true,
        dependencies: { 'dsh-file-drop': 'file:vendor/dsh-file-drop' },
        dsh: {
          profile: {
            bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-file-drop']
          }
        }
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  await writeFile(path.join(profile, 'cordis.patch.yml'), '- id: product-policy\n', 'utf8')
  await writeFile(path.join(profile, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n', 'utf8')
  await writeFile(
    path.join(profile, 'modules', 'dsh-file-drop', 'index.js'),
    'export default true\n',
    'utf8'
  )
  return profile
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    if (existsSync(directory)) {
      // Test cleanup is intentionally limited to directories created under os.tmpdir().
      rmSync(directory, { recursive: true, force: true })
    }
  }
})

describe('bundled Sherlock plugin profile', () => {
  it('installs the packaged profile for a fresh user without touching model credentials', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-fresh')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const harness = path.join(userDataPath, 'harness')
    await mkdir(harness, { recursive: true })
    await writeFile(path.join(harness, '.credentials.yaml'), 'OPENAI_API_KEY: user-owned\n')

    const result = installBundledPluginProfile({
      userDataPath,
      bundledProfilePath,
      appVersion: '0.6.7',
      now: new Date('2026-08-25T09:00:00.000Z')
    })

    const installedProfile = path.join(harness, 'profiles', 'web')
    expect(result.installed).toBe(true)
    expect(result.plugins).toEqual(['dsh-file-drop'])
    expect(readFileSync(path.join(installedProfile, 'cordis.patch.yml'), 'utf8')).toBe(
      '- id: product-policy\n'
    )
    expect(existsSync(path.join(installedProfile, 'node_modules', 'dsh-file-drop', 'index.js'))).toBe(
      true
    )
    expect(existsSync(path.join(installedProfile, 'modules'))).toBe(false)
    expect(await readFile(path.join(harness, '.credentials.yaml'), 'utf8')).toBe(
      'OPENAI_API_KEY: user-owned\n'
    )
    expect(existsSync(path.join(installedProfile, '.credentials.yaml'))).toBe(false)
  })

  it('backs up and replaces an older plugin profile while preserving all non-profile user data', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-upgrade')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const harness = path.join(userDataPath, 'harness')
    const oldProfile = path.join(harness, 'profiles', 'web')
    await mkdir(oldProfile, { recursive: true })
    await writeFile(
      path.join(oldProfile, 'package.json'),
      '{"dependencies":{"old-plugin":"1.0.0","dsh-update-checker":"1.4.16"}}\n',
      'utf8'
    )
    await writeFile(path.join(oldProfile, 'cordis.patch.yml'), '- id: old-profile\n', 'utf8')
    await writeFile(path.join(harness, 'settings.yaml'), 'models: user-owned\n', 'utf8')

    const result = installBundledPluginProfile({
      userDataPath,
      bundledProfilePath,
      appVersion: '0.6.7',
      now: new Date('2026-08-25T09:01:02.000Z')
    })

    expect(result.installed).toBe(true)
    expect(result.backupDirectory).toBeDefined()
    expect(
      JSON.parse(readFileSync(path.join(oldProfile, 'package.json'), 'utf8')).dependencies
    ).toEqual({ 'dsh-file-drop': 'file:vendor/dsh-file-drop' })
    expect(readFileSync(path.join(oldProfile, 'cordis.patch.yml'), 'utf8')).toBe(
      '- id: product-policy\n'
    )
    expect(
      readFileSync(path.join(result.backupDirectory!, 'package.json'), 'utf8')
    ).toContain('dsh-update-checker')
    expect(await readFile(path.join(harness, 'settings.yaml'), 'utf8')).toBe(
      'models: user-owned\n'
    )
  })

  it('is idempotent for the same packaged plugin fingerprint', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-idempotent')
    const bundledProfilePath = await makeBundledProfile(root)
    const userDataPath = path.join(root, 'user-data')
    const options = {
      userDataPath,
      bundledProfilePath,
      appVersion: '0.6.7',
      now: new Date('2026-08-25T09:02:00.000Z')
    }

    expect(installBundledPluginProfile(options).installed).toBe(true)
    writeFileSync(
      path.join(userDataPath, 'harness', 'profiles', 'web', 'runtime-marker'),
      'keep me\n',
      'utf8'
    )
    const second = installBundledPluginProfile(options)

    expect(second.installed).toBe(false)
    expect(
      readFileSync(
        path.join(userDataPath, 'harness', 'profiles', 'web', 'runtime-marker'),
        'utf8'
      )
    ).toBe('keep me\n')
  })

  it('does nothing in unpackaged development when no bundled profile exists', async () => {
    const root = await temporaryDirectory('sherlock-bundled-profile-absent')
    const result = installBundledPluginProfile({
      userDataPath: path.join(root, 'user-data'),
      bundledProfilePath: path.join(root, 'missing-profile'),
      appVersion: 'dev'
    })

    expect(result).toEqual({ installed: false, plugins: [] })
  })
})
