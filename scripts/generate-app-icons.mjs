import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

// Regenerate every icon format from build/app-icon.png.
//
// This used to shell out to the macOS-only sips/iconutil for the Windows and
// macOS containers, which left the Linux ladder to a second script and meant a
// Linux contributor could not refresh the committed icons at all. Both
// containers are written here instead, so one command produces the whole set on
// any host.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDirectory = path.join(projectRoot, 'build')
const source = path.join(buildDirectory, 'app-icon.png')
const icoDestination = path.join(buildDirectory, 'icon.ico')
const icnsDestination = path.join(buildDirectory, 'icon.icns')
const linuxDestination = path.join(buildDirectory, 'icons')

/** Windows icon sizes, each stored as a PNG frame. */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

// ICNS chunks: [type, pixel size]. These are the PNG-compressed types iconutil
// emits for a full iconset, so macOS keeps the same size matrix it had. ic13 and
// ic14 repeat the 256px and 512px pixels under their @2x slots, exactly as
// iconutil duplicates them. The legacy raw ic04/ic05 (16px/32px) are long
// obsolete.
const ICNS_CHUNKS = [
  ['ic12', 64],
  ['ic07', 128],
  ['ic13', 256],
  ['ic08', 256],
  ['ic14', 512],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32]
]

/** Sizes the freedesktop icon theme spec and the stock GNOME/Yaru themes resolve. */
const LINUX_SIZES = [16, 22, 24, 32, 36, 48, 64, 72, 96, 128, 192, 256, 512]

/**
 * Render one square frame from the app icon.
 * @param size - edge length in pixels.
 * @returns the frame as a PNG.
 */
async function frame(size) {
  return sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// ---- Windows ----
{
  const images = []
  for (const size of ICO_SIZES) images.push(await frame(size))
  const header = Buffer.alloc(6 + images.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  for (let index = 0; index < images.length; index += 1) {
    const size = ICO_SIZES[index]
    const entry = 6 + index * 16
    // 256 is encoded as 0 in the single-byte width/height fields.
    header.writeUInt8(size === 256 ? 0 : size, entry)
    header.writeUInt8(size === 256 ? 0 : size, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(images[index].length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += images[index].length
  }
  await writeFile(icoDestination, Buffer.concat([header, ...images]))
  console.log(`Wrote build/icon.ico (${ICO_SIZES.length} frames)`)
}

// ---- macOS ----
{
  const chunks = []
  for (const [type, size] of ICNS_CHUNKS) {
    const png = await frame(size)
    const chunkHeader = Buffer.alloc(8)
    chunkHeader.write(type, 0, 4, 'ascii')
    chunkHeader.writeUInt32BE(8 + png.length, 4)
    chunks.push(chunkHeader, png)
  }
  const body = Buffer.concat(chunks)
  const container = Buffer.alloc(8)
  container.write('icns', 0, 4, 'ascii')
  container.writeUInt32BE(8 + body.length, 4)
  await writeFile(icnsDestination, Buffer.concat([container, body]))
  console.log(`Wrote build/icon.icns (${ICNS_CHUNKS.length} chunks)`)
}

// ---- Linux ----
{
  await mkdir(linuxDestination, { recursive: true })
  for (const size of LINUX_SIZES) {
    await writeFile(path.join(linuxDestination, `${size}x${size}.png`), await frame(size))
  }
  console.log(`Wrote build/icons (${LINUX_SIZES.length} sizes)`)
}

const icon = await readFile(source)
console.log(`Generated every icon from ${path.relative(projectRoot, source)} (${icon.length} bytes PNG).`)
