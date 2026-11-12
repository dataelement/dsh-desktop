import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { migratePersonaPrefix } from '../../shared/persona-prefix'

/** User-authored presets live directly under the harness home. */
export const USER_PRESET_DIR = '.agent-presets'
const COMPOSITION_FILE = 'agent.cordis.yml'
/**
 * Dot-prefixed so preset discovery skips it. Holds the first original of each
 * rewritten composition; later runs do not overwrite it.
 */
export const PERSONA_PREFIX_BACKUP_DIR = '.persona-prefix-backups'
const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/

interface AtomicIo {
  writeFile: (path: string, text: string) => Promise<void>
  rename: (from: string, to: string) => Promise<void>
  rm: (path: string) => Promise<void>
}

const nodeAtomicIo: AtomicIo = {
  writeFile: (path, text) => writeFile(path, text, 'utf8'),
  rename: (from, to) => rename(from, to),
  rm: (path) => rm(path, { force: true })
}

/**
 * Replace `path` only after the new bytes are on disk. A failed rename removes
 * the temporary file and leaves the destination as it was.
 */
export async function writeTextAtomically(
  path: string,
  text: string,
  io: AtomicIo = nodeAtomicIo
): Promise<void> {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    await io.writeFile(temporary, text)
    await io.rename(temporary, path)
  } catch (error) {
    await io.rm(temporary).catch(() => undefined)
    throw error
  }
}

async function migrateOnePreset(root: string, id: string, note: (line: string) => void): Promise<void> {
  const compositionPath = join(root, id, COMPOSITION_FILE)
  let source: string
  try {
    source = await readFile(compositionPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  const rewritten = migratePersonaPrefix(source)
  if (rewritten.missingPrompt) {
    note(`[desktop] preset "${id}" still has a persona row without a usable prompt`)
  }
  if (!rewritten.changed) return

  const backupPath = join(root, PERSONA_PREFIX_BACKUP_DIR, id, COMPOSITION_FILE)
  await mkdir(dirname(backupPath), { recursive: true })
  try {
    await copyFile(compositionPath, backupPath, constants.COPYFILE_EXCL)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  await writeTextAtomically(compositionPath, rewritten.text)
  note(`[desktop] preset "${id}" persona text renamed to prefix`)
}

/**
 * Rename legacy persona `text` keys under the user preset root before Harness
 * mounts them. One unreadable preset is logged and skipped; startup continues.
 */
export async function migrateUserPresetPersonaPrefixes(
  dshHome: string,
  note: (line: string) => void
): Promise<void> {
  const root = join(dshHome, USER_PRESET_DIR)
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    note(`[desktop] persona prefix migration skipped: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !PRESET_ID.test(entry.name)) continue
    try {
      await migrateOnePreset(root, entry.name, note)
    } catch (error) {
      note(`[desktop] preset "${entry.name}" persona prefix migration skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
