import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('macOS package runtime verification', () => {
  it('loads the Wiki database peer dependencies with the packaged Node runtime', () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/verify-packaged-macos.mjs',
        '--runtime-root',
        projectRoot,
        '--runtime-node',
        process.execPath
      ],
      {
        cwd: projectRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('apache-arrow: loadable')
  })
})
