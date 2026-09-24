import { describe, expect, it } from 'vitest'
import { runtimePackageRoot } from '../src/main/runtime-package-root'

describe('packaged runtime package root', () => {
  it('resolves external Node dependencies to physical unpacked files', () => {
    expect(runtimePackageRoot('/Applications/DSH Desktop.app/Contents/Resources/app.asar', true))
      .toBe('/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked')
    expect(runtimePackageRoot('C:\\Program Files\\DSH Desktop\\resources\\app.asar', true))
      .toBe('C:\\Program Files\\DSH Desktop\\resources\\app.asar.unpacked')
  })

  it('keeps development and legacy unarchived paths intact', () => {
    expect(runtimePackageRoot('/repo/dsh-desktop', false)).toBe('/repo/dsh-desktop')
    expect(runtimePackageRoot('/app/resources/app', true)).toBe('/app/resources/app')
  })
})
