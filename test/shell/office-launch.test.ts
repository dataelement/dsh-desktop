import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { officeLaunchPaths } from '../../src/main/shell/office-launch'

describe('office launch paths', () => {
  it('uses the packaged resources directory and the CLI beside it', () => {
    expect(officeLaunchPaths(join('/app', 'Resources', 'office-runtime', 'primary-runtime'))).toEqual({
      resources: join('/app', 'Resources', 'office-runtime'),
      cli: join('/app', 'Resources', 'office-cli.mjs')
    })
  })

  it('keeps the development CLI in build when resources are under .build', () => {
    expect(officeLaunchPaths(join('/repo', '.build', 'office-runtime', 'primary-runtime'))).toEqual({
      resources: join('/repo', '.build', 'office-runtime'),
      cli: join('/repo', 'build', 'office-cli.mjs')
    })
  })

  it('ignores a runtime that is not the office primary runtime', () => {
    expect(officeLaunchPaths(join('/tmp', 'unused-runtime'))).toBeUndefined()
  })
})