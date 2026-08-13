import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

const releaseAssets = [
  'dsh-desktop-mac-arm64.dmg',
  'dsh-desktop-mac-x64.dmg',
  'dsh-desktop-windows-x64-setup.exe',
  'dsh-desktop-windows-x64-portable.exe'
]

describe('GitHub release contract', () => {
  it('uses stable platform-specific artifact names', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      build: {
        artifactName: string
        nsis: { artifactName: string }
        portable: { artifactName: string }
      }
    }

    expect(packageJson.build.artifactName).toBe('dsh-desktop-${os}-${arch}.${ext}')
    expect(packageJson.build.nsis.artifactName).toBe(
      'dsh-desktop-windows-${arch}-setup.${ext}'
    )
    expect(packageJson.build.portable.artifactName).toBe(
      'dsh-desktop-windows-${arch}-portable.${ext}'
    )
  })

  it('keeps builder jobs from attempting implicit tag publishing', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> }

    for (const script of [
      'package:mac',
      'package:mac:arm64',
      'package:mac:x64',
      'package:win'
    ]) {
      expect(packageJson.scripts[script]).toContain('--publish never')
    }
  })

  it('builds and publishes every supported platform', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain('runs-on: macos-15')
    expect(workflow).toContain('runs-on: macos-15-intel')
    expect(workflow).toContain('runs-on: windows-2022')
    for (const asset of releaseAssets) expect(workflow).toContain(asset)
  })

  it('keeps English and Chinese latest-download links aligned with the assets', async () => {
    const readmes = await Promise.all(
      ['README.md', 'README.zh.md'].map((file) =>
        readFile(path.join(projectRoot, file), 'utf8')
      )
    )

    for (const readme of readmes) {
      for (const asset of releaseAssets) {
        expect(readme).toContain(
          `https://github.com/dataelement/dsh-desktop/releases/latest/download/${asset}`
        )
      }
    }
  })
})
