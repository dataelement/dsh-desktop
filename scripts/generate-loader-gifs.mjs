import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Regenerate the startup splash loaders (build/dsh-loader.gif and
// build/dsh-loader-dark.gif) from the brand mark in build/brand-mark.svg.
// The mark is quantised onto a 4px pixel grid, bobs gently, and sheds a few
// square "bubbles" from the window's traffic lights — the same motion the
// previous hand-drawn loaders used, so splash.html needs no changes.

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDirectory = path.join(projectRoot, 'build')
const markSource = path.join(buildDirectory, 'brand-mark.svg')

const WIDTH = 640
const HEIGHT = 360
const FRAMES = 48
const DELAY_MS = 50
const CELL = 4
const COLS = WIDTH / CELL
const ROWS = HEIGHT / CELL

/** Tight bounds of the mark inside its 1000x1000 artwork (shared with the sidebar mark). */
const MARK_VIEWBOX = { x: 42, y: 218, width: 898, height: 564 }
/** Body width in cells; matches the ~310px silhouette of the previous loader. */
const BODY_CELLS = 78

const THEMES = {
  light: {
    file: 'dsh-loader.gif',
    body: [0, 0, 0],
    sparks: [[143, 197, 242], [146, 203, 245], [180, 214, 239]]
  },
  dark: {
    file: 'dsh-loader-dark.gif',
    body: [253, 253, 253],
    sparks: [[32, 68, 170], [27, 66, 164], [21, 46, 106]]
  }
}

/**
 * Rasterise the mark at cell resolution and threshold it into a bitmask.
 * @returns {{ cells: Uint8Array, width: number, height: number }}
 */
async function markMask() {
  const svg = await readFile(markSource, 'utf8')
  const d = /\sd="([^"]+)"/u.exec(svg)?.[1]
  if (!d) throw new Error(`No path data in ${path.relative(projectRoot, markSource)}`)
  const width = BODY_CELLS
  const height = Math.round((BODY_CELLS * MARK_VIEWBOX.height) / MARK_VIEWBOX.width)
  // Render at 4x cell resolution and average down so thin features (the three
  // dots, the belly bump) survive the threshold instead of dropping out.
  const oversample = 4
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * oversample}" height="${height * oversample}" viewBox="${MARK_VIEWBOX.x} ${MARK_VIEWBOX.y} ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}" preserveAspectRatio="none"><path d="${d}" fill="#fff"/></svg>`
  const { data } = await sharp(Buffer.from(probe)).raw().toBuffer({ resolveWithObject: true })
  const cells = new Uint8Array(width * height)
  for (let cy = 0; cy < height; cy += 1) {
    for (let cx = 0; cx < width; cx += 1) {
      let sum = 0
      for (let oy = 0; oy < oversample; oy += 1) {
        for (let ox = 0; ox < oversample; ox += 1) {
          const px = (cy * oversample + oy) * width * oversample + cx * oversample + ox
          sum += data[px * 4 + 3]
        }
      }
      cells[cy * width + cx] = sum / (oversample * oversample) >= 128 ? 1 : 0
    }
  }
  return { cells, width, height }
}

/** Deterministic pseudo-random stream so every regeneration is byte-identical. */
function rng(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Bubbles are scheduled on a loop of FRAMES so the animation cycles seamlessly.
 * Each one starts inside the traffic-light corner, rises about a cell per two
 * frames with a little sideways drift, and fades through the theme's three
 * spark shades before it goes out.
 */
function buildSparks(body, random) {
  const sparks = []
  const emitters = [
    { x: body.left + 6, y: body.top - 1, count: 5, size: 3 },
    { x: body.left + 10, y: body.top - 1, count: 3, size: 2 },
    { x: body.left + body.width - 9, y: body.top + 9, count: 2, size: 2 }
  ]
  for (const emitter of emitters) {
    for (let index = 0; index < emitter.count; index += 1) {
      sparks.push({
        start: Math.floor(random() * FRAMES),
        life: 14 + Math.floor(random() * 8),
        x: emitter.x + Math.floor(random() * 4) - 1,
        y: emitter.y,
        drift: random() < 0.5 ? -1 : 1,
        size: emitter.size - (random() < 0.35 ? 1 : 0)
      })
    }
  }
  return sparks
}

function renderFrames(theme, mask) {
  const frame = new Uint8Array(WIDTH * HEIGHT * 4)
  const frames = Buffer.alloc(WIDTH * HEIGHT * 4 * FRAMES)
  const body = {
    left: Math.round((COLS - mask.width) / 2),
    top: Math.round((ROWS - mask.height) / 2) + 1,
    width: mask.width
  }
  const sparks = buildSparks(body, rng(0x5a17))

  const fillCell = (cx, cy, size, color) => {
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue
        for (let py = 0; py < CELL; py += 1) {
          for (let px = 0; px < CELL; px += 1) {
            const offset = ((y * CELL + py) * WIDTH + x * CELL + px) * 4
            frame[offset] = color[0]
            frame[offset + 1] = color[1]
            frame[offset + 2] = color[2]
            frame[offset + 3] = 255
          }
        }
      }
    }
  }

  for (let index = 0; index < FRAMES; index += 1) {
    frame.fill(0)
    const phase = (index / FRAMES) * Math.PI * 2
    const bobY = Math.round(Math.sin(phase) * 2)
    const bobX = Math.round(Math.cos(phase) * 1)
    for (let cy = 0; cy < mask.height; cy += 1) {
      for (let cx = 0; cx < mask.width; cx += 1) {
        if (mask.cells[cy * mask.width + cx]) fillCell(body.left + cx + bobX, body.top + cy + bobY, 1, theme.body)
      }
    }
    for (const spark of sparks) {
      const age = (index - spark.start + FRAMES) % FRAMES
      if (age >= spark.life) continue
      const progress = age / spark.life
      const rise = Math.floor(age / 2)
      const sway = Math.round(Math.sin(progress * Math.PI * 2) * spark.drift)
      const shade = theme.sparks[Math.min(theme.sparks.length - 1, Math.floor(progress * theme.sparks.length))]
      const size = progress > 0.75 ? Math.max(1, spark.size - 1) : spark.size
      fillCell(spark.x + sway + bobX, spark.y - rise + bobY, size, shade)
    }
    frames.set(frame, index * WIDTH * HEIGHT * 4)
  }
  return frames
}

const mask = await markMask()
for (const theme of Object.values(THEMES)) {
  const frames = renderFrames(theme, mask)
  const gif = await sharp(frames, {
    raw: { width: WIDTH, height: HEIGHT * FRAMES, channels: 4, pageHeight: HEIGHT }
  })
    .gif({ delay: Array.from({ length: FRAMES }, () => DELAY_MS), loop: 0, effort: 10 })
    .toBuffer()
  const destination = path.join(buildDirectory, theme.file)
  await writeFile(destination, gif)
  console.log(`Wrote ${path.relative(projectRoot, destination)} (${gif.length} bytes, ${FRAMES} frames)`)
}
