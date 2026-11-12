import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
const require = createRequire(import.meta.url)
const { verifySherpaOverlay, withSherpaOverlay } = require('../scripts/release/sherpa-linux-overlay.cjs')

test('Linux configs preserve production/development identity and overlay before ASAR creation', () => {
  for (const [file, id] of [['../electron-builder.linux.cjs', 'io.dsh.desktop'], ['../electron-builder.linux-dev.cjs', 'io.dsh.desktop.dev']]) {
    const config = require(file)
    expect(config.appId).toBe(id)
    expect(config.files).toContain('!node_modules/sherpa-onnx-linux-x64/sherpa-onnx.node')
    expect(config.files.at(-1)).toEqual({ from: '.build/sherpa-linux', to: 'node_modules/sherpa-onnx-linux-x64', filter: ['sherpa-onnx.node'] })
    expect(config.afterPack).toBe(require('../package.json').build.afterPack)
  }
})

test('overlay gate verifies source/version, binary format, content hash and retains original hook', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-sherpa-overlay-'))
  try {
    const directory = join(root, '.build/sherpa-linux')
    mkdirSync(directory, { recursive: true })
    mkdirSync(join(root, 'node_modules/sherpa-onnx-linux-x64'), { recursive: true })
    writeFileSync(join(root, 'node_modules/sherpa-onnx-linux-x64/package.json'), JSON.stringify({ version: '1.13.8' }))
    const addon = Buffer.alloc(32)
    addon.writeUInt32BE(0x7f454c46); addon[4] = 2; addon.writeUInt16LE(62, 18)
    writeFileSync(join(directory, 'sherpa-onnx.node'), addon)
    const metadata = { version: '1.13.8', sourceSha256: 'b0374cc56dbc186d442ae73d5de743bb092470b640c4c50ce7b029044c0c4fa8', addonSha256: createHash('sha256').update(addon).digest('hex') }
    const save = () => writeFileSync(join(directory, 'rebuild.json'), JSON.stringify(metadata))
    save()
    expect(() => verifySherpaOverlay(root)).not.toThrow()
    let original = false
    const config = withSherpaOverlay({ files: [], beforePack: async () => { original = true } })
    await config.beforePack({ electronPlatformName: 'linux', arch: 1, packager: { projectDir: root } })
    expect(original).toBe(true)
    metadata.addonSha256 = 'bad'; save()
    expect(() => verifySherpaOverlay(root)).toThrow('SHA256 mismatch')
    metadata.version = 'future'; save()
    expect(() => verifySherpaOverlay(root)).toThrow('source/version')
    await expect(config.beforePack({ electronPlatformName: 'darwin', arch: 1 })).rejects.toThrow('Linux x64')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
