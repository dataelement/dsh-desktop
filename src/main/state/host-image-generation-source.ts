import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IMAGE_GENERATION_PLUGIN } from './image-generation-identity'

/** Keep the in-box row bound to this Desktop installation when a Profile has
 * a market package with the same name. The Loader forbids changing a row's
 * name through a later override, so resolve it in the insertion layer itself.
 * Client discovery follows the same file URL.
 */
export async function prepareHostImageGenerationSourcePatch(
  dshHome: string,
  desktopPatchPath: string
): Promise<string> {
  const source = await readFile(desktopPatchPath, 'utf8')
  const target = /(^[ \t]*- id: dsh-image-generation\r?\n[ \t]*name: )dsh-image-generation(?=\r?$)/m
  // Test and custom host patches may not insert the in-box image tool.
  if (!target.test(source)) return desktopPatchPath
  const appManifest = join(dirname(desktopPatchPath), '..', 'package.json')
  const hostEntry = createRequire(appManifest).resolve(IMAGE_GENERATION_PLUGIN)
  const sourceUrl = pathToFileURL(hostEntry).href
  const outputPath = join(dshHome, 'desktop-host-sources.patch.yml')
  const text = source.replace(target, `$1${JSON.stringify(sourceUrl)}`)
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
