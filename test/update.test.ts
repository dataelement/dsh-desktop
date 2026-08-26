import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import {
  shouldCheckAfterResume,
  supportsAutoUpdates,
  UPDATE_CHECK_INTERVAL_MS
} from '../src/main/update/update-policy'
import {
  initialUpdateStatus,
  reduceUpdateStatus
} from '../src/main/update/update-state'
import { updateAction } from '../src/preload/update-view'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')
const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

describe('desktop update policy', () => {
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

describe('sidebar update action', () => {
  it('offers download after discovery and holds the progress ring at completion', () => {
    const idle = initialUpdateStatus('0.5.0')
    const available = reduceUpdateStatus(idle, {
      type: 'available',
      version: '0.6.0'
    })
    const downloading = reduceUpdateStatus(available, {
      type: 'progress',
      percent: 42.6
    })
    const downloaded = reduceUpdateStatus(downloading, {
      type: 'downloaded',
      version: '0.6.0'
    })

    expect(updateAction(idle)).toEqual({ kind: 'hidden' })
    expect(updateAction(available)).toEqual({ kind: 'download', version: '0.6.0' })
    expect(updateAction(downloading)).toEqual({ kind: 'progress', percent: 42.6 })
    expect(updateAction(downloaded)).toEqual({ kind: 'progress', percent: 100 })
  })

  it('keeps automatic failures hidden and makes manual failures retryable', () => {
    const idle = initialUpdateStatus('0.5.0')
    const automatic = reduceUpdateStatus(idle, {
      type: 'error',
      message: 'offline'
    })
    const checking = reduceUpdateStatus(idle, { type: 'check', manual: true })
    const manual = reduceUpdateStatus(checking, {
      type: 'error',
      message: 'offline'
    })

    expect(updateAction(automatic)).toEqual({ kind: 'hidden' })
    expect(updateAction(manual)).toEqual({ kind: 'retry', message: 'offline' })
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
      'sherlock-mac-arm64.zip',
      'sherlock-mac-x64.zip'
    ])
    expect(merged.path).toBe('sherlock-mac-arm64.zip')
    expect(merged.releaseDate).toBe('2026-08-14T02:00:00.000Z')
  })
})

function metadata(architecture: 'arm64' | 'x64', releaseDate: string) {
  return {
    version: '0.2.0',
    files: [
      {
        url: `sherlock-mac-${architecture}.zip`,
        sha512: `zip-${architecture}`,
        size: 100
      },
      {
        url: `sherlock-mac-${architecture}.dmg`,
        sha512: `dmg-${architecture}`,
        size: 200
      }
    ],
    releaseDate
  }
}
