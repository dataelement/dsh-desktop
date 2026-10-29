import { constants } from 'node:fs'
import { cp, copyFile, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isSeq, parse, parseDocument } from 'yaml'
import { writeTextAtomically } from './persona-prefix-migration'

const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/
const START = '# dsh-desktop legacy presets begin'
const END = '# dsh-desktop legacy presets end'
const BUILT_IN_PRESETS = new Set(['standard', 'ptc', 'minimal', 'cordis'])

function yamlString(value: string): string {
  return JSON.stringify(value)
}

/** Preserve the original composition text, including Cordis !!js expressions. */
function presetPatch(id: string, composition: string, metadata: unknown): string {
  const data = typeof metadata === 'object' && metadata !== null ? metadata as Record<string, unknown> : {}
  const fields = [`        id: ${id}`]
  for (const key of ['name', 'description'] as const) {
    if (typeof data[key] === 'string') fields.push(`        ${key}: ${yamlString(data[key])}`)
  }
  if (typeof data.order === 'number' && Number.isFinite(data.order)) fields.push(`        order: ${data.order}`)
  const rows = composition.trimEnd().split(/\r?\n/u).map((line) => line.length ? `          ${line}` : '').join('\n')
  const header = BUILT_IN_PRESETS.has(id)
    ? `- id: preset-${id}\n  config:`
    : `- insert:\n    - id: preset-${id}\n      name: '@deepseek-ai/dsh-agent-preset'\n      config:`
  const indent = BUILT_IN_PRESETS.has(id) ? '' : '  '
  return `${header}\n${fields.map((line) => indent + line).join('\n')}\n${indent}        plugins:\n${rows.split('\n').map((line) => indent + line).join('\n')}\n`
}

/** Publish old directory presets into the 0.1.7 profile without touching their source. */
export async function migrateLegacyAgentPresets(dshHome: string, note: (line: string) => void): Promise<void> {
  const sourceRoot = join(dshHome, '.agent-presets')
  let entries
  try {
    entries = await readdir(sourceRoot, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  const sections: Array<{ id: string; patch: string }> = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || !PRESET_ID.test(entry.name)) continue
    try {
      const composition = await readFile(join(sourceRoot, entry.name, 'agent.cordis.yml'), 'utf8')
      const document = parseDocument(composition.replace(/^\uFEFF/u, ''))
      if (document.errors.length || !isSeq(document.contents)) throw new Error('agent.cordis.yml must contain a YAML plugin list')
      const metadata = await readFile(join(sourceRoot, entry.name, 'preset.yml'), 'utf8')
        .then((text) => parse(text) as unknown)
        .catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
          throw error
        })
      sections.push({ id: entry.name, patch: presetPatch(entry.name, composition, metadata) })
    } catch (error) {
      note(`[desktop] legacy preset ${entry.name} could not be converted: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (sections.length === 0) return

  const profilePatch = join(dshHome, 'profiles', 'web', 'cordis.patch.yml')
  await mkdir(join(dshHome, 'profiles', 'web'), { recursive: true })
  const previous = await readFile(profilePatch, 'utf8').catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  })
  // A fresh Profile may contain comments followed by `[]`. Appending block
  // entries after that flow sequence creates a second YAML root document.
  const previousDocument = parseDocument(previous)
  const emptyFlowList = previousDocument.errors.length === 0 && isSeq(previousDocument.contents) &&
    previousDocument.contents.items.length === 0 && previousDocument.contents.flow
  const emptyListRange = emptyFlowList ? previousDocument.contents?.range : undefined
  const base = emptyListRange && previous.slice(emptyListRange[0], emptyListRange[1]).trim() === '[]'
    ? previous.slice(0, emptyListRange[0]) + previous.slice(emptyListRange[1])
    : previous
  const start = base.indexOf(START)
  const end = base.indexOf(END)
  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new Error('legacy preset section in the web Profile patch is incomplete')
  }
  // A converted row belongs to the new Profile from now on. Preserve edits
  // made through the new editor; only append legacy IDs not yet present.
  const existingIds = new Set(
    [...base.matchAll(/^(?:- id:|    - id:) preset-([a-z0-9-]+)\s*$/gmu)].map((match) => match[1])
  )
  const pending = sections.filter(({ id }) => !existingIds.has(id))
  if (pending.length === 0) return
  const generated = start === -1 ? '' : base.slice(start + START.length, end).trim()
  const withoutGenerated = start === -1 ? base : base.slice(0, start) + base.slice(end + END.length).replace(/^\r?\n/u, '')
  const generatedRows = [generated, ...pending.map(({ patch }) => patch.trimEnd())].filter(Boolean).join('\n\n')
  const next = `${withoutGenerated.trimEnd()}\n\n${START}\n${generatedRows}\n${END}\n`
  if (next === previous) return

  const backupRoot = join(dshHome, '.agent-presets.pre-0.1.7-backup')
  const backupExists = await stat(backupRoot).then(() => true).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  })
  if (!backupExists) {
    const staging = `${backupRoot}.${process.pid}.${Date.now()}.tmp`
    try {
      await cp(sourceRoot, staging, { recursive: true, errorOnExist: true, force: false, dereference: false })
      await rename(staging, backupRoot)
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      throw error
    }
  }
  if (previous) {
    try {
      await copyFile(profilePatch, `${profilePatch}.pre-0.1.7-backup`, constants.COPYFILE_EXCL)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  const document = parseDocument(next)
  if (document.errors.length || !isSeq(document.contents)) throw new Error('converted preset patch is not a YAML patch list')
  await writeTextAtomically(profilePatch, next)
  note(`[desktop] converted ${pending.length} legacy agent presets for the web Profile; originals and backup retained`)
}

/**
 * Disable the migrated row of one preset whose id a plugin already registers at
 * runtime. The registry rejects a duplicate id, so startup aborts while both the
 * row and the registration exist (#814). The row is kept — `existingIds` then
 * still sees it as migrated and never rewrites it — but a disabled row takes no
 * part in mounting or the startup audit, so the plugin's own registration is the
 * single live preset on the next launch.
 */

export async function disableMigratedLegacyPreset(
  dshHome: string,
  presetId: string,
  note: (line: string) => void
): Promise<boolean> {
  if (!PRESET_ID.test(presetId)) return false
  const profilePatch = join(dshHome, 'profiles', 'web', 'cordis.patch.yml')
  const previous = await readFile(profilePatch, 'utf8').catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  })
  const lines = previous.split('\n')
  // Block boundaries by line, not index-of-string: the preset id can appear in
  // rows outside the migrated block, and only the migrated rows are ours to edit.
  let blockStart = -1
  let blockEnd = -1
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] as string
    if (line.includes(START)) blockStart = index
    else if (line.includes(END)) blockEnd = index
  }
  if (blockStart === -1 || blockEnd === -1 || blockEnd < blockStart) return false

  const wanted = `preset-${presetId}`
  for (let index = blockStart; index <= blockEnd; index++) {
    const match = /^(\s*)- id: (\S+)\s*$/.exec(lines[index] as string)
    if (!match || match[2] !== wanted) continue
    const fieldIndent = `${match[1]}  `
    // The entry's own fields run until the next row at the entry indent.
    for (let scan = index + 1; scan <= blockEnd; scan++) {
      const later = lines[scan] as string
      if (later && !later.startsWith(fieldIndent) && later.trimStart().startsWith('- ')) break
      if (later.startsWith(`${fieldIndent}disabled:`)) return false
    }
    lines.splice(index + 1, 0, `${fieldIndent}disabled: true`)
    await writeTextAtomically(profilePatch, lines.join('\n'))
    note(`[desktop] disabled the migrated legacy preset row for "${presetId}"; a plugin registers it at runtime (#814)`)
    return true
  }
  return false
}
