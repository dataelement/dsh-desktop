import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildJsignArgs, findSignableBinaries } from '../scripts/sign-windows-unpacked.mjs'

function minimalPe(): Buffer {
  const bytes = Buffer.alloc(132)
  bytes.write('MZ', 0)
  bytes.writeUInt32LE(128, 0x3c)
  bytes.write('PE\0\0', 128)
  return bytes
}

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

  it('finds every PE by content, including nested and extensionless binaries', async () => {
    writeFileSync(join(tempDir, 'DSH Desktop.exe'), minimalPe())
    writeFileSync(join(tempDir, 'ffmpeg.dll'), minimalPe())
    writeFileSync(join(tempDir, 'LICENSE.electron.txt'), 'ignore me')

    // 2. Bundled Node runtime
    const nodeBinDir = join(tempDir, 'resources', 'app', 'node_modules', 'node', 'bin')
    mkdirSync(nodeBinDir, { recursive: true })
    writeFileSync(join(nodeBinDir, 'node.exe'), minimalPe())

    // 3. Native addons (.node) - Windows PE (MZ) should be included, non-PE skipped
    const koffiDir = join(tempDir, 'resources', 'app', 'node_modules', 'koffi', 'build', 'koffi')
    mkdirSync(koffiDir, { recursive: true })
    writeFileSync(join(koffiDir, 'koffi.node'), minimalPe())
    const helper = join(koffiDir, 'spawn-helper')
    writeFileSync(helper, minimalPe())

    const darwinDir = join(tempDir, 'resources', 'app', 'node_modules', 'node-pty', 'prebuilds', 'darwin-arm64')
    mkdirSync(darwinDir, { recursive: true })
    writeFileSync(join(darwinDir, 'pty.node'), Buffer.from([0xcf, 0xfa, 0xed, 0xfe])) // Mach-O magic

    writeFileSync(join(koffiDir, 'index.js'), 'ignore me')

    const binaries = await findSignableBinaries(tempDir)

    expect(binaries).toContain(join(tempDir, 'DSH Desktop.exe'))
    expect(binaries).toContain(join(tempDir, 'ffmpeg.dll'))
    expect(binaries).toContain(join(nodeBinDir, 'node.exe'))
    expect(binaries).toContain(join(koffiDir, 'koffi.node'))
    expect(binaries).toContain(helper)
    expect(binaries).not.toContain(join(darwinDir, 'pty.node'))
    expect(binaries).toHaveLength(5)
  })

  it('fails on damaged PE content instead of skipping it', async () => {
    writeFileSync(join(tempDir, 'DSH Desktop.exe'), minimalPe())
    writeFileSync(join(tempDir, 'bad.exe'), Buffer.from('MZbroken'))
    await expect(findSignableBinaries(tempDir)).rejects.toThrow('Invalid PE header')
  })
})
