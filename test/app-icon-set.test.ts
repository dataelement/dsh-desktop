import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

// Sizes the freedesktop icon theme spec and the stock GNOME/Yaru themes resolve.
const LINUX_SIZES = [16, 22, 24, 32, 36, 48, 64, 72, 96, 128, 192, 256, 512]
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const ICNS_SIZES = [64, 128, 256, 256, 512, 512, 1024, 32]

/** Read the directory entries of an ICO container. */
function readIco(buffer: Buffer): Array<{ width: number; height: number; png: Buffer }> {
  const frames = []
  const count = buffer.readUInt16LE(4)
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16
    // A 256px frame is stored as 0 in the single-byte dimension fields.
    const length = buffer.readUInt32LE(entry + 8)
    const offset = buffer.readUInt32LE(entry + 12)
    frames.push({
      width: buffer.readUInt8(entry) || 256,
      height: buffer.readUInt8(entry + 1) || 256,
      png: buffer.subarray(offset, offset + length)
    })
  }
  return frames
}

/** Read the chunks of an ICNS container. */
function readIcns(buffer: Buffer): Array<{ type: string; png: Buffer }> {
  const chunks = []
  let offset = 8
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset + 4)
    chunks.push({
      type: buffer.toString('ascii', offset, offset + 4),
      png: buffer.subarray(offset + 8, offset + length)
    })
    offset += length
  }
  return chunks
}

interface MarkBounds {
  minX: number
  minY: number
  width: number
  height: number
}

/**
 * Bounding box of the pixels a predicate selects.
 * @param file - image to scan.
 * @param width - image width.
 * @param height - image height.
 * @param selects - predicate over one RGBA pixel.
 * @returns the box, all zero when nothing matched.
 */
async function markBounds(
  file: string,
  width: number,
  height: number,
  selects: (pixel: number[]) => boolean
): Promise<MarkBounds> {
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const pixel = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0]
      if (!selects(pixel)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return { minX: 0, minY: 0, width: 0, height: 0 }
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

it('ships a standard icon-theme size ladder instead of one odd-sized png', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
    build: { linux: { icon: string } }
  }
  // A single PNG makes electron-builder name the icon-theme directory after the
  // image's pixel width, which produced an unreadable hicolor/1254x1254 entry.
  expect(pkg.build.linux.icon).toBe('build/icons')

  for (const size of LINUX_SIZES) {
    const file = `build/icons/${size}x${size}.png`
    const meta = await sharp(file).metadata()
    expect([meta.width, meta.height], file).toEqual([size, size])
    expect(meta.hasAlpha, file).toBe(true)
  }
})

it('keeps the committed ladder in step with the app icon', async () => {
  // Regenerating in place is what scripts/generate-app-icons.mjs does; if
  // app-icon.png changes without rerunning it, this fails rather than shipping
  // icons that no longer match the Windows and macOS builds.
  const expected = await sharp('build/app-icon.png')
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer()
  const committed = await sharp('build/icons/512x512.png').ensureAlpha().raw().toBuffer()
  expect(Buffer.compare(committed, expected)).toBe(0)
})

it('writes a Windows container whose every frame decodes at its declared size', async () => {
  const frames = readIco(await readFile('build/icon.ico'))
  expect(frames.map((frame) => frame.width)).toEqual(ICO_SIZES)
  for (const frame of frames) {
    const meta = await sharp(frame.png).metadata()
    expect([meta.width, meta.height], `${frame.width}px frame`).toEqual([frame.width, frame.height])
    expect(meta.format).toBe('png')
  }
})

it('writes a macOS container whose every chunk decodes at its declared size', async () => {
  const buffer = await readFile('build/icon.icns')
  expect(buffer.toString('ascii', 0, 4)).toBe('icns')
  // The container length is what macOS trusts; a mismatch truncates the icon.
  expect(buffer.readUInt32BE(4)).toBe(buffer.length)

  const chunks = readIcns(buffer)
  expect(chunks).toHaveLength(ICNS_SIZES.length)
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    if (!chunk) throw new Error('missing ICNS chunk')
    const meta = await sharp(chunk.png).metadata()
    expect([meta.width, meta.height], chunk.type).toEqual([ICNS_SIZES[index], ICNS_SIZES[index]])
  }
})

it('generates all three formats from the app icon without the macOS toolchain', async () => {
  const script = await readFile('scripts/generate-app-icons.mjs', 'utf8')
  expect(script).toContain("path.join(buildDirectory, 'app-icon.png')")
  expect(script).toContain('icon.ico')
  expect(script).toContain('icon.icns')
  // The containers are written in Node; nothing shells out to sips or iconutil.
  expect(script).not.toContain('execFileSync')
  for (const size of LINUX_SIZES) expect(script).toContain(String(size))
  for (const size of ICO_SIZES) expect(script).toContain(String(size))
})

it('carries the official whale silhouette, not the retired window mark', async () => {
  // The mark inside the tile is the official whale, whose native box is
  // 23.16x17.04. The window mark it replaced was 898x564 — a wider ratio — so
  // the silhouette's proportions are what distinguishes them in the raster.
  const box = await markBounds('build/app-icon.png', 1024, 1024, (pixel) => {
    return (pixel[0] ?? 0) + (pixel[1] ?? 0) + (pixel[2] ?? 0) > 380 && (pixel[3] ?? 0) > 128
  })
  expect(box.width).toBeGreaterThan(0)
  expect(box.width / box.height).toBeCloseTo(23.16 / 17.04, 2)
})

it('fills enough of the plate to stay legible at dock sizes', async () => {
  // Sizing the mark to the *height* of the outline it replaced left it about a
  // fifth narrower than that mark, and the eye and fin notches that carry this
  // silhouette smeared into a blob at 24px and below. Both plates size the mark
  // to 80% of their width; these floors catch a future shrink back.
  const tile = { x: 100, width: 824 }
  const appMark = await markBounds('build/app-icon.png', 1024, 1024, (pixel) => {
    return (pixel[0] ?? 0) + (pixel[1] ?? 0) + (pixel[2] ?? 0) > 380 && (pixel[3] ?? 0) > 128
  })
  expect(appMark.width).toBeGreaterThanOrEqual(tile.width * 0.75)
  expect(appMark.width).toBeLessThanOrEqual(tile.width * 0.85)
  expect(appMark.minX).toBeGreaterThanOrEqual(tile.x)
  expect(appMark.minX + appMark.width).toBeLessThanOrEqual(tile.x + tile.width)

  const plate = 1254
  const webMark = await markBounds('build/icon.png', plate, plate, (pixel) => {
    return (pixel[2] ?? 0) - (pixel[0] ?? 0) > 30
  })
  expect(webMark.width).toBeGreaterThanOrEqual(plate * 0.75)
  expect(webMark.width).toBeLessThanOrEqual(plate * 0.85)
  expect(webMark.width / webMark.height).toBeCloseTo(23.16 / 17.04, 2)
})
