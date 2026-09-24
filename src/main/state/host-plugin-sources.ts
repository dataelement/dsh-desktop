import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'

const PACKAGE_SPECIFIER = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9._-]+)*$/i

interface HostPluginName {
  name: string
  start: number
  end: number
}

/** Only insertion names are host-owned sources. Config values and Profile
 * bundles must retain their own resolution base. Keep source offsets so the
 * generated patch preserves comments and !!js expressions verbatim.
 */
function hostPluginNames(source: string): HostPluginName[] {
  const document = parseDocument(source, { logLevel: 'silent' })
  if (document.errors.length > 0) throw document.errors[0]
  if (!isSeq(document.contents)) return []
  const names: HostPluginName[] = []
  for (const row of document.contents.items) {
    if (!isMap(row)) continue
    const inserted = row.get('insert', true)
    if (!isSeq(inserted)) continue
    for (const entry of inserted.items) {
      if (!isMap(entry)) continue
      const name = entry.get('name', true)
      if (!isScalar(name) || typeof name.value !== 'string' || !PACKAGE_SPECIFIER.test(name.value)) continue
      if (!name.range) throw new Error(`Missing source range for Desktop plugin ${name.value}`)
      names.push({ name: name.value, start: name.range[0], end: name.range[1] })
    }
  }
  return names
}

export function hostInsertedPluginNames(source: string): string[] {
  return hostPluginNames(source).map(({ name }) => name)
}

/** Resolve Desktop insertions from this installation, even when a Profile
 * contains a market package with the same name. Loader overrides cannot
 * change a row's source after insertion; the client graph uses this URL too.
 */
export async function prepareHostPluginSourcesPatch(
  dshHome: string,
  desktopPatchPath: string
): Promise<string> {
  const source = await readFile(desktopPatchPath, 'utf8')
  const names = hostPluginNames(source)
  if (names.length === 0) return desktopPatchPath
  const appManifest = join(dirname(desktopPatchPath), '..', 'package.json')
  const resolveHost = createRequire(appManifest).resolve
  let text = source
  for (const { name, start, end } of names.reverse()) {
    const sourceUrl = pathToFileURL(resolveHost(name)).href
    text = text.slice(0, start) + JSON.stringify(sourceUrl) + text.slice(end)
  }
  const outputPath = join(dshHome, 'desktop-host-sources.patch.yml')
  try {
    if (await readFile(outputPath, 'utf8') === text) return outputPath
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const temporary = `${outputPath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, text, 'utf8')
    await rename(temporary, outputPath)
  } finally {
    await rm(temporary, { force: true })
  }
  return outputPath
}
