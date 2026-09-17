import { readFile, realpath, stat } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Validate an unpacked first-party workbench before it enters the local catalog. */
export async function checkWorkbenchPackage(directory) {
  const root = resolve(directory)
  const readJson = async name => JSON.parse(await readFile(resolve(root, name), 'utf8'))
  const [manifest, pkg] = await Promise.all([readJson('workbench.json'), readJson('package.json')])
  const errors = []
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1')
  if (!/^[a-z][a-z0-9-]{0,79}$/.test(manifest.id || '')) errors.push('invalid workbench id')
  for (const field of ['title', 'description', 'version', 'entry']) if (typeof manifest[field] !== 'string' || !manifest[field].trim()) errors.push(`missing ${field}`)
  if (manifest.version !== pkg.version) errors.push('manifest and package version differ')
  if (!manifest.compatibility?.desktopWorkbenches || !manifest.compatibility?.harness) errors.push('missing compatibility requirements')
  if (!Array.isArray(manifest.capabilities) || !manifest.capabilities.every(value => typeof value === 'string')) errors.push('capabilities must be a string array')
  if (!pkg.dsh?.client?.inject?.includes('dsh-desktop-workbenches')) errors.push('client must depend on desktop workbench service')
  if (!pkg.dsh?.bundle?.patch) errors.push('missing bundle patch')

  // Phase-2 market metadata is optional so existing schemaVersion 1 packages
  // remain valid. When supplied, validate it before the package is accepted.
  if (manifest.author !== undefined) {
    const name = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name
    if (typeof name !== 'string' || !name.trim() || name.length > 100) errors.push('author must be a non-empty string or an object with a name')
  }
  if (manifest.screenshots !== undefined) {
    if (!Array.isArray(manifest.screenshots) || manifest.screenshots.length < 1 || manifest.screenshots.length > 5) {
      errors.push('screenshots must contain 1 to 5 images')
    } else {
      const rootReal = await realpath(root).catch(() => root)
      for (const [index, screenshot] of manifest.screenshots.entries()) {
        const imagePath = typeof screenshot === 'string' ? screenshot : screenshot?.path
        const alt = typeof screenshot === 'object' && screenshot !== null ? screenshot.alt : undefined
        if (typeof imagePath !== 'string' || !imagePath.trim() || imagePath.length > 500
          || isAbsolute(imagePath) || /^[A-Za-z]:[\\/]/.test(imagePath)
          || imagePath.split(/[\\/]+/).includes('..')) {
          errors.push(`screenshot ${index + 1} must use a safe relative path`)
          continue
        }
        if (alt !== undefined && (typeof alt !== 'string' || !alt.trim() || alt.length > 300)) {
          errors.push(`screenshot ${index + 1} alt must be a non-empty string of at most 300 characters`)
        }
        const file = resolve(root, imagePath)
        const info = await stat(file).catch(() => null)
        const fileReal = await realpath(file).catch(() => null)
        const realRelative = fileReal && relative(rootReal, fileReal)
        if (!info?.isFile() || !fileReal || !realRelative || realRelative.startsWith('..') || isAbsolute(realRelative)) {
          errors.push(`screenshot ${index + 1} must be an existing regular file within the package`)
          continue
        }
        if (info.size > 2 * 1024 * 1024) {
          errors.push(`screenshot ${index + 1} must not exceed 2 MB`)
          continue
        }
        const bytes = await readFile(file)
        const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
        if (!png && !jpeg && !webp) errors.push(`screenshot ${index + 1} must be a PNG, JPEG, or WebP image`)
      }
    }
  }
  const entry = resolve(root, manifest.entry || '.')
  const path = relative(root, entry)
  if (!path || path.startsWith('..') || isAbsolute(path) || !(await stat(entry).catch(() => null))?.isFile()) errors.push('entry must be an existing file within the package')
  if (errors.length) throw new Error(`${pkg.name}: ${errors.join('; ')}`)
  return { package: pkg.name, id: manifest.id, version: pkg.version }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length < 3) throw new Error('Usage: node scripts/check-workbench-package.mjs <unpacked-directory> [...]')
  for (const path of process.argv.slice(2)) console.log(JSON.stringify(await checkWorkbenchPackage(path)))
}
