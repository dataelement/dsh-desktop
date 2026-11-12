import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const buildDirectory = path.join(projectRoot, 'build')
const source = path.join(buildDirectory, 'app-icon.png')
const iconsetDirectory = path.join(buildDirectory, 'app-icon.iconset')
const icnsDestination = path.join(buildDirectory, 'icon.icns')
const icoDestination = path.join(buildDirectory, 'icon.ico')

await rm(iconsetDirectory, { recursive: true, force: true })
await mkdir(iconsetDirectory, { recursive: true })

for (const size of [16, 32, 128, 256, 512]) {
  execFileSync('sips', [
    '-z',
    String(size),
    String(size),
    source,
    '--out',
    path.join(iconsetDirectory, `icon_${size}x${size}.png`)
  ])
  execFileSync('sips', [
    '-z',
    String(size * 2),
    String(size * 2),
    source,
    '--out',
    path.join(iconsetDirectory, `icon_${size}x${size}@2x.png`)
  ])
}

execFileSync('iconutil', ['-c', 'icns', iconsetDirectory, '-o', icnsDestination])

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoDirectory = await mkdtemp(path.join(os.tmpdir(), 'dsh-desktop-icons-'))
const icoImages = []
for (const size of icoSizes) {
  const destination = path.join(icoDirectory, `icon-${size}.png`)
  execFileSync('sips', [
    '-z',
    String(size),
    String(size),
    source,
    '--out',
    destination
  ])
  icoImages.push(await readFile(destination))
}
const header = Buffer.alloc(6 + icoImages.length * 16)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoImages.length, 4)

let offset = header.length
for (let index = 0; index < icoImages.length; index += 1) {
  const size = icoSizes[index]
  const entry = 6 + index * 16
  header.writeUInt8(size === 256 ? 0 : size, entry)
  header.writeUInt8(size === 256 ? 0 : size, entry + 1)
  header.writeUInt8(0, entry + 2)
  header.writeUInt8(0, entry + 3)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(icoImages[index].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += icoImages[index].length
}

await writeFile(icoDestination, Buffer.concat([header, ...icoImages]))
await rm(icoDirectory, { recursive: true, force: true })

const icon = await readFile(source)
console.log(`Generated app icons from ${path.relative(projectRoot, source)} (${icon.length} bytes PNG).`)
