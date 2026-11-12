import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { officeLaunchPaths, resolvePrimaryRuntime } from '../../src/main/shell/office-launch'

describe('office launch paths', () => {
  it('defaults unpackaged launches to the runtime prepared by npm run dev', () => {
    const runtime = join('/repo', '.build', 'office-runtime', 'primary-runtime')
    expect(resolvePrimaryRuntime('/repo', '/electron/resources', false)).toBe(runtime)
    expect(resolvePrimaryRuntime('/repo', '/electron/resources', false, '')).toBe(runtime)
    expect(officeLaunchPaths(runtime)).toEqual({
      resources: join('/repo', '.build', 'office-runtime'),
      cli: join('/repo', 'build', 'office-cli.mjs')
    })
  })

  it('keeps an explicit development runtime override', () => {
    expect(resolvePrimaryRuntime('/repo', '/electron/resources', false, '/custom/primary-runtime'))
      .toBe('/custom/primary-runtime')
  })

  it('uses packaged resources even when a development override is inherited', () => {
    expect(resolvePrimaryRuntime('/repo', '/app/Resources', true, '/custom/primary-runtime'))
      .toBe(join('/app/Resources', 'office-runtime', 'primary-runtime'))
  })

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