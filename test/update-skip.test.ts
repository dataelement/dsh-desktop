import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  readSkippedVersion,
  shouldOfferUpdate,
  skippedVersionPath,
  writeSkippedVersion
} from '../src/main/update/skipped-version'

describe('skipping one update', () => {
  const homes: string[] = []

  async function home(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-update-skip-'))
    homes.push(directory)
    return directory
  }

  afterEach(async () => {
    await Promise.all(homes.splice(0).map((path) => rm(path, { recursive: true, force: true })))
  })

  it('silences the skipped version and nothing else', () => {
    expect(shouldOfferUpdate('0.4.4', '0.4.4', false)).toBe(false)
    // A later release is a new question.
    expect(shouldOfferUpdate('0.4.5', '0.4.4', false)).toBe(true)
    expect(shouldOfferUpdate('0.4.4', undefined, false)).toBe(true)
  })

  it('offers a skipped version again when the user asks', () => {
    // A manual check is the user asking, which is how they take back a version
    // they skipped — no separate unskip needed.
    expect(shouldOfferUpdate('0.4.4', '0.4.4', true)).toBe(true)
  })

  it('remembers the skip across launches', async () => {
    const path = skippedVersionPath(await home())
    expect(readSkippedVersion(path)).toBeUndefined()

    expect(writeSkippedVersion(path, '0.4.4')).toBe(true)
    expect(readSkippedVersion(path)).toBe('0.4.4')
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual({ version: '0.4.4' })

    expect(writeSkippedVersion(path, '0.4.5')).toBe(true)
    expect(readSkippedVersion(path)).toBe('0.4.5')
  })

  it('treats an unreadable or empty record as no skip', async () => {
    const path = skippedVersionPath(await home())
    for (const contents of ['', 'not json', '{}', '{"version": ""}', '{"version": 3}']) {
      await writeFile(path, contents, 'utf8')
      expect(readSkippedVersion(path)).toBeUndefined()
    }
  })

  it('loses the skip rather than the launch when it cannot be written', async () => {
    expect(writeSkippedVersion(join(await home(), 'missing', 'deeper.json'), '0.4.4')).toBe(false)
  })
})
