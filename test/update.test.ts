import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import {
  AUTO_INSTALL_ON_APP_QUIT,
  shouldCheckAfterResume,
  supportsAutoUpdates,
  UPDATE_CHECK_INTERVAL_MS
} from '../src/main/update/update-policy'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')
const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

describe('desktop update policy', () => {
  it('only installs a downloaded update after explicit user confirmation', () => {
    expect(AUTO_INSTALL_ON_APP_QUIT).toBe(false)
  })

  it('only enables updates for installed macOS and Windows builds', () => {
    expect(supportsAutoUpdates(true, 'darwin')).toBe(true)
    expect(supportsAutoUpdates(true, 'win32')).toBe(true)
    expect(supportsAutoUpdates(true, 'linux')).toBe(false)
    expect(supportsAutoUpdates(false, 'darwin')).toBe(false)
  })

  it('checks after resume only when the interval has elapsed', () => {
    const now = 20_000_000
    expect(shouldCheckAfterResume(now - UPDATE_CHECK_INTERVAL_MS, now)).toBe(true)
    expect(shouldCheckAfterResume(now - UPDATE_CHECK_INTERVAL_MS + 1, now)).toBe(false)
  })
})

describe('macOS update metadata', () => {
  it('merges both architectures and keeps only ZIP update payloads', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-update-metadata-'))
    temporaryRoots.push(root)
    const armPath = path.join(root, 'latest-mac-arm64.yml')
    const x64Path = path.join(root, 'latest-mac-x64.yml')
    const outputPath = path.join(root, 'latest-mac.yml')

    await Promise.all([
      writeFile(
        armPath,
        stringify(metadata('arm64', '2026-08-14T01:00:00.000Z')),
        'utf8'
      ),
      writeFile(x64Path, stringify(metadata('x64', '2026-08-14T02:00:00.000Z')), 'utf8')
    ])
    await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'merge-mac-update-metadata.mjs'),
      armPath,
      x64Path,
      outputPath
    ])

    const merged = parse(await readFile(outputPath, 'utf8')) as {
      version: string
      files: Array<{ url: string; sha512: string }>
      path: string
      releaseDate: string
    }
    expect(merged.version).toBe('0.2.0')
    expect(merged.files.map((file) => file.url)).toEqual([
      'dsh-desktop-mac-arm64.zip',
      'dsh-desktop-mac-x64.zip'
    ])
    expect(merged.path).toBe('dsh-desktop-mac-arm64.zip')
    expect(merged.releaseDate).toBe('2026-08-14T02:00:00.000Z')
  })
})

function metadata(architecture: 'arm64' | 'x64', releaseDate: string) {
  return {
    version: '0.2.0',
    files: [
      {
        url: `dsh-desktop-mac-${architecture}.zip`,
        sha512: `zip-${architecture}`,
        size: 100
      },
      {
        url: `dsh-desktop-mac-${architecture}.dmg`,
        sha512: `dmg-${architecture}`,
        size: 200
      }
    ],
    releaseDate
  }
}
