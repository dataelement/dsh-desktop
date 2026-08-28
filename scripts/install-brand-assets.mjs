import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'icon.png')
const lightSource = path.join(projectRoot, 'build', 'logo-light.png')
const darkSource = path.join(projectRoot, 'build', 'logo-dark.png')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'dsh-desktop-logo.png')
const lightDestination = path.join(destinationDirectory, 'dsh-desktop-logo-light.png')
const darkDestination = path.join(destinationDirectory, 'dsh-desktop-logo-dark.png')
const indexPath = path.join(destinationDirectory, 'index.html')
const manifestPath = path.join(destinationDirectory, 'manifest.webmanifest')

/**
 * Swap the Harness favicon link for the desktop's own.
 *
 * The href is matched rather than pinned: 0.1.2-alpha.1 moved it from
 * `/favicon.svg` to `./favicon.svg`, and either is the same link. The tag
 * itself still has to be there exactly once — a frontend that stopped
 * declaring one is a change worth failing on, not one to paper over.
 * @param contents - index.html source.
 * @param file - path shown in the failure message.
 * @returns index.html with the desktop icon link.
 */
function replaceIconLink(contents, file) {
  const desktop = '<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />'
  if (contents.includes(desktop)) return contents
  const matches = contents.match(/<link rel="icon"[^>]*>/gu) ?? []
  if (matches.length !== 1) {
    throw new Error(
      `Could not update DSH Desktop branding in ${file}: expected one icon link, found ${String(matches.length)}`
    )
  }
  return contents.replace(matches[0], desktop)
}

/**
 * Point the web manifest's icon at the desktop logo.
 *
 * Edited as JSON rather than as text: upstream added `"purpose": "any"` to the
 * entry in 0.1.2-alpha.1, which a pinned multi-line string could not survive,
 * and key order is not a contract. The entry still has to exist.
 * @param contents - manifest source.
 * @param file - path shown in the failure message.
 * @returns manifest JSON with the desktop icon.
 */
function replaceManifestIcon(contents, file) {
  const manifest = JSON.parse(contents)
  const icons = Array.isArray(manifest.icons) ? manifest.icons : []
  const target = icons.find((icon) => icon?.src === '/dsh-desktop-logo.png')
    ?? icons.find((icon) => typeof icon?.src === 'string' && icon.src.endsWith('favicon.svg'))
  if (target === undefined) {
    throw new Error(`Could not update DSH Desktop branding in ${file}: no icon entry to replace`)
  }
  target.src = '/dsh-desktop-logo.png'
  target.sizes = '1254x1254'
  target.type = 'image/png'
  return `${JSON.stringify(manifest, null, 2)}\n`
}

await mkdir(destinationDirectory, { recursive: true })
await copyFile(source, destination)
await copyFile(lightSource, lightDestination)
await copyFile(darkSource, darkDestination)

const index = await readFile(indexPath, 'utf8')
await writeFile(indexPath, replaceIconLink(index, path.relative(projectRoot, indexPath)))

const manifest = await readFile(manifestPath, 'utf8')
await writeFile(
  manifestPath,
  replaceManifestIcon(manifest, path.relative(projectRoot, manifestPath))
)

console.log(`Installed DSH Desktop brand assets: ${[
  destination,
  lightDestination,
  darkDestination
].map((file) => path.relative(projectRoot, file)).join(', ')}`)
