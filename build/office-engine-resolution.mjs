import { realpathSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { basename, dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ENGINE_PACKAGE = /^@deepseek-ai\/libreoffice-kit-(?:darwin|win32|linux)-/u

/**
 * The application root that owns `dshEntryPath`
 * (`<root>/node_modules/@deepseek-ai/dsh/lib/bin.js`), or undefined when that
 * root is not an ASAR archive.
 */
export function packagedArchiveRoot(dshEntryPath) {
  const root = dirname(dirname(dirname(dirname(dirname(dshEntryPath)))))
  return basename(root) === 'app.asar' ? root : undefined
}

/**
 * Resolve the LibreOfficeKit engine package from app.asar.unpacked.
 *
 * Packages load through app.asar, but the engine's executable and resources
 * are spawned by the operating system, which cannot read the archive.
 * libreoffice-kit locates them from the engine package's resolved path, so the
 * engine package itself must resolve to its unpacked, physical directory.
 * Adapted from deepseek-harness apps/desktop-host/src/office-engine.ts.
 * Hooks apply to this thread only.
 */
export function registerOfficeEngineResolution(dshEntryPath) {
  const entryArchive = packagedArchiveRoot(dshEntryPath)
  if (entryArchive === undefined) return undefined
  // Compare canonical paths on both sides, as upstream does: resolved URLs are
  // realpath'd below, and the entry path can differ in spelling (a symlinked
  // or junctioned install directory, Windows 8.3 names or drive-letter case).
  const archive = realpathSync(entryArchive)
  const engines = join(archive, 'node_modules', '@deepseek-ai', 'libreoffice-kit-')
  const source = pathToFileURL(engines).href
  const destination = pathToFileURL(join(`${archive}.unpacked`, 'node_modules', '@deepseek-ai', 'libreoffice-kit-')).href
  const archivePrefix = pathToFileURL(archive + sep).href
  return registerHooks({
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context)
      if (!ENGINE_PACKAGE.test(specifier) || !resolved.url.startsWith('file:')) return resolved
      const canonical = pathToFileURL(realpathSync(fileURLToPath(resolved.url))).href
      if (!canonical.startsWith(source)) {
        if (canonical.startsWith(archivePrefix)) {
          throw new Error(`Office engine resolved outside the packaged engine directory: ${resolved.url}`)
        }
        return resolved
      }
      const physical = realpathSync(fileURLToPath(destination + canonical.slice(source.length)))
      return { ...resolved, url: pathToFileURL(physical).href }
    }
  })
}
