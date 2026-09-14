import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildJsignArgs, findSignableBinaries } from '../scripts/sign-windows-unpacked.mjs'

describe('sign-windows-unpacked', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-unpacked-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('builds valid Jsign command line arguments', () => {
    const args = buildJsignArgs({
      jsignJar: '/path/to/jsign.jar',
      pinFile: '/path/to/pin.txt',
      targetFile: 'C:\\test\\app.exe'
    })

    expect(args).toEqual([
      '-jar',
      '/path/to/jsign.jar',
      '--storetype',
      'ETOKEN',
      '--storepass',
      'file:/path/to/pin.txt',
      '--alg',
      'SHA-256',
      '--tsaurl',
      'http://timestamp.digicert.com',
      '--tsmode',
      'RFC3161',
      '--tsretries',
      '3',
      '--tsretrywait',
      '10',
      '--name',
      'DSH Desktop',
      '--url',
      'https://www.dshdesktop.com',
      'C:\\test\\app.exe'
    ])
  })

  it('finds root executables, DLLs, packaged node.exe, and native .node addons', async () => {
    // 1. Root executables & dlls
    writeFileSync(join(tempDir, 'DSH Desktop.exe'), 'dummy exe')
    writeFileSync(join(tempDir, 'ffmpeg.dll'), 'dummy dll')
    writeFileSync(join(tempDir, 'LICENSE.electron.txt'), 'ignore me')

    // 2. Bundled Node runtime
    const nodeBinDir = join(tempDir, 'resources', 'app', 'node_modules', 'node', 'bin')
    mkdirSync(nodeBinDir, { recursive: true })
    writeFileSync(join(nodeBinDir, 'node.exe'), 'dummy node.exe')

    // 3. Native addons (.node) - Windows PE (MZ) should be included, non-PE skipped
    const koffiDir = join(tempDir, 'resources', 'app', 'node_modules', 'koffi', 'build', 'koffi')
    mkdirSync(koffiDir, { recursive: true })
    writeFileSync(join(koffiDir, 'koffi.node'), Buffer.from([0x4d, 0x5a, 0x00, 0x01]))

    const darwinDir = join(tempDir, 'resources', 'app', 'node_modules', 'node-pty', 'prebuilds', 'darwin-arm64')
    mkdirSync(darwinDir, { recursive: true })
    writeFileSync(join(darwinDir, 'pty.node'), Buffer.from([0xcf, 0xfa, 0xed, 0xfe])) // Mach-O magic

    writeFileSync(join(koffiDir, 'index.js'), 'ignore me')

    const binaries = await findSignableBinaries(tempDir)

    expect(binaries).toContain(join(tempDir, 'DSH Desktop.exe'))
    expect(binaries).toContain(join(tempDir, 'ffmpeg.dll'))
    expect(binaries).toContain(join(nodeBinDir, 'node.exe'))
    expect(binaries).toContain(join(koffiDir, 'koffi.node'))
    expect(binaries).not.toContain(join(darwinDir, 'pty.node'))
    expect(binaries).toHaveLength(4)
  })
})
