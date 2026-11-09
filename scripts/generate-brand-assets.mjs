import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

// Compose the brand rasters from the authoritative mark in build/brand-mark.svg.
//
// These four files used to be hand-drawn, so swapping the mark meant editing
// pixels by hand and they drifted apart. The composition constants below are the
// geometry measured from the artwork they replace: only the mark has changed,
// its optical height and the tile around it are the same, so an icon set picked
// up from any of the consumers still balances.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDirectory = path.join(projectRoot, 'build')
const markSource = path.join(buildDirectory, 'brand-mark.svg')

/** App icon: dark rounded tile, same footprint as before. */
const APP_ICON = {
  file: 'app-icon.png',
  size: 1024,
  tile: { inset: 100, radius: 185, colour: '#0d1616' },
  // The mark fills 80% of the tile's width. Sizing it to the *height* of the
  // outline it replaced left it visibly smaller and mushier than that mark at
  // dock sizes, because this silhouette is narrower and carries finer detail
  // (eye, fin notches) that has to survive the downscale to 16px.
  mark: { colour: '#ffffff', width: 660 }
}

/** Web favicon and <link rel="icon">: flat light plate, blue mark. */
const WEB_ICON = {
  file: 'icon.png',
  size: 1254,
  background: '#f8f9fc',
  mark: { colour: '#456ffa', width: 1000 }
}

/** Wordmark companions served to the Web UI in both themes. */
const LOGOS = [
  { file: 'logo-light.png', colour: '#000000' },
  { file: 'logo-dark.png', colour: '#ffffff' }
]
// This canvas has almost no slack: the old mark was 176px tall in a 192px frame,
// so the height is what fits and the width follows the aspect ratio.
const LOGO = { width: 336, height: 192, markHeight: 176 }

const svg = await readFile(markSource, 'utf8')
const markPath = /\sd="([^"]+)"/u.exec(svg)?.[1]
const viewBox = /viewBox="([^"]+)"/u.exec(svg)?.[1]
if (!markPath || !viewBox) {
  throw new Error(`build/brand-mark.svg must declare both a path and a viewBox`)
}
const [viewX, viewY, viewWidth, viewHeight] = viewBox.split(/\s+/u).map(Number)

/**
 * Render the mark at a given width, keeping its native aspect ratio.
 * @param colour - CSS colour for the silhouette.
 * @param width - rendered width in pixels.
 * @returns the mark as a transparent PNG.
 */
async function mark(colour, width) {
  const height = Math.round((width * viewHeight) / viewWidth)
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}"><path d="${markPath}" fill="${colour}"/></svg>`
  return sharp(Buffer.from(probe)).png().toBuffer()
}

/**
 * Centre a buffer on a canvas.
 * @param input - the buffer to place.
 * @param canvas - its pixel dimensions.
 * @param width - canvas width.
 * @param height - canvas height.
 * @returns a sharp composite entry.
 */
function centred(input, canvas, width, height) {
  return {
    input,
    left: Math.round((width - canvas.width) / 2),
    top: Math.round((height - canvas.height) / 2)
  }
}

// ---- app icon: tile + white mark ----
{
  const size = APP_ICON.size
  const side = size - APP_ICON.tile.inset * 2
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${APP_ICON.tile.inset}" y="${APP_ICON.tile.inset}" width="${side}" height="${side}" rx="${APP_ICON.tile.radius}" ry="${APP_ICON.tile.radius}" fill="${APP_ICON.tile.colour}"/></svg>`
  const markBuffer = await mark(APP_ICON.mark.colour, APP_ICON.mark.width)
  const markMeta = await sharp(markBuffer).metadata()
  const png = await sharp(Buffer.from(tile))
    .composite([centred(markBuffer, markMeta, size, size)])
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(path.join(buildDirectory, APP_ICON.file), png)
  console.log(`Wrote build/${APP_ICON.file} (${size}x${size})`)
}

// ---- web icon: flat plate + blue mark, opaque like the file it replaces ----
{
  const size = WEB_ICON.size
  const markBuffer = await mark(WEB_ICON.mark.colour, WEB_ICON.mark.width)
  const markMeta = await sharp(markBuffer).metadata()
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: WEB_ICON.background }
  })
    .composite([centred(markBuffer, markMeta, size, size)])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(path.join(buildDirectory, WEB_ICON.file), png)
  console.log(`Wrote build/${WEB_ICON.file} (${size}x${size})`)
}

// ---- wordmark companions: bare mark on transparency ----
for (const logo of LOGOS) {
  const markBuffer = await mark(logo.colour, LOGO.markHeight)
  const markMeta = await sharp(markBuffer).metadata()
  const png = await sharp({
    create: { width: LOGO.width, height: LOGO.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([centred(markBuffer, markMeta, LOGO.width, LOGO.height)])
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(path.join(buildDirectory, logo.file), png)
  console.log(`Wrote build/${logo.file} (${LOGO.width}x${LOGO.height})`)
}
