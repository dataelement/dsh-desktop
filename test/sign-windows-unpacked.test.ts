import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildJsignArgs,
  findSignableBinaries,
  hasAuthenticodeCertificateTable
} from '../scripts/sign-windows-unpacked.mjs'

function minimalPe(): Buffer {
  const bytes = Buffer.alloc(132)
  bytes.write('MZ', 0)
  bytes.writeUInt32LE(128, 0x3c)
  bytes.write('PE\0\0', 128)
  return bytes
}

function peWithOptionalHeader({
  isPe32Plus = true,
  certOffset = 0,
  certSize = 0
}: {
  isPe32Plus?: boolean
  certOffset?: number
  certSize?: number
} = {}): Buffer {
  const peOffset = 128
  const bytes = Buffer.alloc(peOffset + 184)
  bytes.write('MZ', 0)
  bytes.writeUInt32LE(peOffset, 0x3c)
  bytes.write('PE\0\0', peOffset)
  const optionalHeaderSize = (isPe32Plus ? 112 : 96) + 16 * 8
  bytes.writeUInt16LE(optionalHeaderSize, peOffset + 20)
  bytes.writeUInt16LE(isPe32Plus ? 0x020b : 0x010b, peOffset + 24)
  const numRvaOffset = peOffset + 24 + (isPe32Plus ? 108 : 92)
  bytes.writeUInt32LE(16, numRvaOffset)
  const securityDirOffset = peOffset + 24 + (isPe32Plus ? 112 : 96) + 4 * 8
  bytes.writeUInt32LE(certOffset, securityDirOffset)
  bytes.writeUInt32LE(certSize, securityDirOffset + 4)
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

    // 4. Bundled office-runtime: .exe files must be signed so antivirus software
    // does not flag unsigned internal executables, while Python .dll/.pyd libraries are skipped.
    const pythonDir = join(tempDir, 'resources', 'office-runtime', 'primary-runtime', 'dependencies', 'python')
    const pythonDllDir = join(pythonDir, 'DLLs')
    const distlibDir = join(pythonDir, 'Lib', 'site-packages', 'pip', '_vendor', 'distlib')
    mkdirSync(pythonDllDir, { recursive: true })
    mkdirSync(distlibDir, { recursive: true })
    writeFileSync(join(pythonDir, 'python.exe'), minimalPe())
    writeFileSync(join(distlibDir, 't64.exe'), minimalPe())
    writeFileSync(join(pythonDllDir, 'sqlite3.dll'), minimalPe())
    writeFileSync(join(pythonDllDir, '_socket.pyd'), minimalPe())

    writeFileSync(join(koffiDir, 'index.js'), 'ignore me')

    const binaries = await findSignableBinaries(tempDir)

    expect(binaries).toContain(join(tempDir, 'DSH Desktop.exe'))
    expect(binaries).toContain(join(tempDir, 'ffmpeg.dll'))
    expect(binaries).toContain(join(nodeBinDir, 'node.exe'))
    expect(binaries).toContain(join(koffiDir, 'koffi.node'))
    expect(binaries).toContain(helper)
    expect(binaries).toContain(join(pythonDir, 'python.exe'))
    expect(binaries).toContain(join(distlibDir, 't64.exe'))
    expect(binaries).not.toContain(join(darwinDir, 'pty.node'))
    expect(binaries).not.toContain(join(pythonDllDir, 'sqlite3.dll'))
    expect(binaries).not.toContain(join(pythonDllDir, '_socket.pyd'))
    expect(binaries).toHaveLength(7)
  })

  it('detects PE Authenticode certificate tables without spawning Java for unsigned binaries', async () => {
    const unsigned64 = join(tempDir, 'unsigned64.exe')
    const signed64 = join(tempDir, 'signed64.exe')
    const unsigned32 = join(tempDir, 'unsigned32.exe')
    const signed32 = join(tempDir, 'signed32.exe')

    writeFileSync(unsigned64, peWithOptionalHeader({ isPe32Plus: true, certOffset: 0, certSize: 0 }))
    writeFileSync(signed64, peWithOptionalHeader({ isPe32Plus: true, certOffset: 4096, certSize: 2048 }))
    writeFileSync(unsigned32, peWithOptionalHeader({ isPe32Plus: false, certOffset: 0, certSize: 0 }))
    writeFileSync(signed32, peWithOptionalHeader({ isPe32Plus: false, certOffset: 2048, certSize: 1024 }))

    expect(await hasAuthenticodeCertificateTable(unsigned64)).toBe(false)
    expect(await hasAuthenticodeCertificateTable(signed64)).toBe(true)
    expect(await hasAuthenticodeCertificateTable(unsigned32)).toBe(false)
    expect(await hasAuthenticodeCertificateTable(signed32)).toBe(true)
  })

  it('fails on damaged PE content instead of skipping it', async () => {
    writeFileSync(join(tempDir, 'DSH Desktop.exe'), minimalPe())
    writeFileSync(join(tempDir, 'bad.exe'), Buffer.from('MZbroken'))
    await expect(findSignableBinaries(tempDir)).rejects.toThrow('Invalid PE header')
  })
})
