import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { electronNodeExecutable } from '../src/main/runtime/electron-node-executable'

describe('electronNodeExecutable', () => {
  it('uses the app Helper on macOS', () => {
    expect(electronNodeExecutable('/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop', 'darwin'))
      .toBe('/Applications/DSH Desktop.app/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper')
  })

  it('uses the main executable elsewhere', () => {
    expect(electronNodeExecutable('C:\\DSH Desktop\\DSH Desktop.exe', 'win32')).toBe('C:\\DSH Desktop\\DSH Desktop.exe')
    expect(electronNodeExecutable('/opt/dsh/dsh-desktop', 'linux')).toBe('/opt/dsh/dsh-desktop')
  })

  it('resolves an existing binary for the Electron build in use', () => {
    const electron = createRequire(import.meta.url)('electron') as string
    expect(existsSync(electronNodeExecutable(electron))).toBe(true)
  })
})
