const path = require('node:path')
const asar = require('@electron/asar')

// First bytes of the executable formats the OS loads directly: ELF, Mach-O
// (32/64-bit, both byte orders, universal), and PE (checked further below).
const ELF = Buffer.from([0x7f, 0x45, 0x4c, 0x46])
const MACHO = [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca]

/** Whether bytes start a file the OS, not Electron, must read from disk. */
function nativeFormat(bytes) {
  if (bytes.length < 4) return undefined
  if (bytes.subarray(0, 4).equals(ELF)) return 'ELF'
  if (MACHO.includes(bytes.readUInt32BE(0))) return 'Mach-O'
  if (bytes[0] === 0x4d && bytes[1] === 0x5a && bytes.length >= 0x40) {
    const offset = bytes.readUInt32LE(0x3c)
    if (offset + 4 <= bytes.length && bytes.toString('latin1', offset, offset + 4) === 'PE\0\0') return 'PE'
  }
  return undefined
}

/**
 * Fail packaging when app.asar holds a native binary inline. The archive is read
 * only through Electron; dlopen and process spawning need a real file, so every
 * such binary must be matched by `asarUnpack`.
 */
function verifyAsarUnpack(resourcesDir) {
  const archive = path.join(resourcesDir, 'app.asar')
  const inline = []
  for (const entry of asar.listPackage(archive, { isPack: false })) {
    const relative = entry.replace(/^[\\/]/u, '')
    const info = asar.statFile(archive, relative, false)
    if (!('size' in info) || info.unpacked || info.link !== undefined || info.size < 4) continue
    const format = nativeFormat(asar.extractFile(archive, relative))
    if (format !== undefined) inline.push(`${relative} (${format})`)
  }
  if (inline.length > 0) {
    throw new Error(`Native binaries packed inside app.asar; add them to asarUnpack:\n  ${inline.join('\n  ')}`)
  }
}

module.exports = { nativeFormat, verifyAsarUnpack }
