import path from 'node:path'
import { inflateRawSync } from 'node:zlib'
export const LIMITS = Object.freeze({ archiveBytes: 32 * 1024 * 1024, entries: 2048, entryBytes: 16 * 1024 * 1024, totalBytes: 64 * 1024 * 1024 })

function u16(buffer, offset) {
  if (offset < 0 || offset + 2 > buffer.length) throw new Error('ZIP structure is truncated')
  return buffer.readUInt16LE(offset)
}

function u32(buffer, offset) {
  if (offset < 0 || offset + 4 > buffer.length) throw new Error('ZIP structure is truncated')
  return buffer.readUInt32LE(offset)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < table.length; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 65_557)
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (u32(buffer, offset) === 0x06054b50) return offset
  }
  throw new Error('ZIP end-of-central-directory record is missing')
}

function normalizeEntryName(name) {
  if (name.includes('\0') || name.includes('\\') || name.startsWith('/') || /^[A-Za-z]:/u.test(name)) {
    throw new Error(`Unsafe ZIP entry path: ${JSON.stringify(name)}`)
  }
  const normalized = path.posix.normalize(name)
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../') || normalized !== name) {
    throw new Error(`Unsafe ZIP entry path: ${JSON.stringify(name)}`)
  }
  return normalized
}

export function parseZip(buffer) {
  if (buffer.length > LIMITS.archiveBytes) throw new Error(`Office package exceeds ${LIMITS.archiveBytes} bytes`)
  const eocd = findEndOfCentralDirectory(buffer)
  const disk = u16(buffer, eocd + 4)
  const centralDisk = u16(buffer, eocd + 6)
  const diskEntries = u16(buffer, eocd + 8)
  const totalEntries = u16(buffer, eocd + 10)
  const centralSize = u32(buffer, eocd + 12)
  const centralOffset = u32(buffer, eocd + 16)
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) throw new Error('Multi-disk ZIP archives are not supported')
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported')
  if (totalEntries > LIMITS.entries) throw new Error(`Office package contains more than ${LIMITS.entries} ZIP entries`)
  if (centralOffset + centralSize > eocd) throw new Error('ZIP central directory points outside the archive')

  const entries = new Map()
  let totalBytes = 0
  let offset = centralOffset
  for (let index = 0; index < totalEntries; index += 1) {
    if (u32(buffer, offset) !== 0x02014b50) throw new Error('ZIP central directory entry is invalid')
    const flags = u16(buffer, offset + 8)
    const method = u16(buffer, offset + 10)
    const expectedCrc = u32(buffer, offset + 16)
    const compressedSize = u32(buffer, offset + 20)
    const uncompressedSize = u32(buffer, offset + 24)
    const nameLength = u16(buffer, offset + 28)
    const extraLength = u16(buffer, offset + 30)
    const commentLength = u16(buffer, offset + 32)
    const diskStart = u16(buffer, offset + 34)
    const localOffset = u32(buffer, offset + 42)
    const end = offset + 46 + nameLength + extraLength + commentLength
    if (end > buffer.length) throw new Error('ZIP central directory entry is truncated')
    if (diskStart !== 0) throw new Error('Multi-disk ZIP archives are not supported')
    if ((flags & 0x0001) !== 0) throw new Error('Encrypted ZIP entries are not supported')
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('ZIP64 entries are not supported')
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP compression method ${method}`)
    if (uncompressedSize > LIMITS.entryBytes) throw new Error(`ZIP entry exceeds ${LIMITS.entryBytes} bytes`)
    totalBytes += uncompressedSize
    if (totalBytes > LIMITS.totalBytes) throw new Error(`Office package expands beyond ${LIMITS.totalBytes} bytes`)
    const encoding = (flags & 0x0800) !== 0 ? 'utf8' : 'latin1'
    const name = normalizeEntryName(buffer.toString(encoding, offset + 46, offset + 46 + nameLength))
    if (entries.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`)
    if (!name.endsWith('/')) entries.set(name, { method, expectedCrc, compressedSize, uncompressedSize, localOffset })
    offset = end
  }
  if (offset !== centralOffset + centralSize) throw new Error('ZIP central directory size does not match its entries')

  const parts = new Map()
  for (const [name, entry] of entries) {
    if (u32(buffer, entry.localOffset) !== 0x04034b50) throw new Error(`ZIP local header is invalid for ${name}`)
    const localFlags = u16(buffer, entry.localOffset + 6)
    const localMethod = u16(buffer, entry.localOffset + 8)
    const nameLength = u16(buffer, entry.localOffset + 26)
    const extraLength = u16(buffer, entry.localOffset + 28)
    if ((localFlags & 0x0001) !== 0 || localMethod !== entry.method) throw new Error(`ZIP headers disagree for ${name}`)
    const dataStart = entry.localOffset + 30 + nameLength + extraLength
    const dataEnd = dataStart + entry.compressedSize
    if (dataEnd > buffer.length) throw new Error(`ZIP data is truncated for ${name}`)
    const compressed = buffer.subarray(dataStart, dataEnd)
    let content
    try {
      content = entry.method === 0
        ? Buffer.from(compressed)
        : inflateRawSync(compressed, { maxOutputLength: LIMITS.entryBytes })
    } catch (error) {
      throw new Error(`Could not decompress ${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (content.length !== entry.uncompressedSize) throw new Error(`Uncompressed size mismatch for ${name}`)
    if (crc32(content) !== entry.expectedCrc) throw new Error(`CRC mismatch for ${name}`)
    parts.set(name, content)
  }
  return { parts, totalBytes }
}

