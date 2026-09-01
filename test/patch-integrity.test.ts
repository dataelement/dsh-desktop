import { spawnSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('dependency patch integrity', () => {
  it('keeps every checked-in dependency patch structurally parseable', async () => {
    const patchDirectory = path.join(projectRoot, 'patches')
    const patchFiles = (await readdir(patchDirectory))
      .filter((file) => file.endsWith('.patch'))
      .sort()

    const malformed = patchFiles.flatMap((file) => {
      const result = spawnSync('git', ['apply', '--numstat', path.join(patchDirectory, file)], {
        cwd: projectRoot,
        encoding: 'utf8'
      })

      return result.status === 0
        ? []
        : [`${file}: ${(result.stderr || result.stdout).trim()}`]
    })

    expect(malformed).toEqual([])
  })
})
