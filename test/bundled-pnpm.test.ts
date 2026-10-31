import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bundledPnpmEntryFrom, unpackedBundledPath } from '../src/main/bundled-pnpm'

describe('bundled pnpm entry', () => {
  it('rewrites archive members to their unpacked physical copies', () => {
    expect(unpackedBundledPath(join('/Applications/DSH Desktop.app/Contents/Resources', 'app.asar', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')))
      .toBe(join('/Applications/DSH Desktop.app/Contents/Resources', 'app.asar.unpacked', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))
    expect(unpackedBundledPath('C:\\Program Files\\DSH Desktop\\resources\\app.asar\\node_modules\\pnpm\\bin\\pnpm.cjs'))
      .toBe('C:\\Program Files\\DSH Desktop\\resources\\app.asar.unpacked\\node_modules\\pnpm\\bin\\pnpm.cjs')
  })

  it('rewrites the archive root itself and leaves non-archive paths alone', () => {
    expect(unpackedBundledPath(join('/opt/app', 'app.asar')))
      .toBe(join('/opt/app', 'app.asar.unpacked'))
    expect(unpackedBundledPath(join('/workspace', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')))
      .toBe(join('/workspace', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))
  })

  it('resolves the packaged entry from the unpacked copy, never the archive member', () => {
    const resources = '/Applications/DSH Desktop.app/Contents/Resources'
    const unpacked = join(resources, 'app.asar.unpacked', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
    expect(bundledPnpmEntryFrom(join(resources, 'app.asar'), (candidate) => candidate === unpacked)).toBe(unpacked)
    // A build without the unpacked copy keeps the unpacked spelling so the
    // miss is reported at resolution, not as a spawn failure.
    expect(bundledPnpmEntryFrom(join(resources, 'app.asar'), () => false))
      .toBe(unpacked)
    // Development installs are unchanged.
    const devEntry = join('/workspace', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
    expect(bundledPnpmEntryFrom('/workspace', () => true)).toBe(devEntry)
  })
})
