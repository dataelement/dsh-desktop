import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

export interface LoaderEntryFailure {
  id: string
  name: string
  reason: string
}

interface MarketState {
  disabled: string[]
  groups: Record<string, string[]>
  groupOrder: string[]
  raw: Record<string, unknown>
}

export function extractLoaderEntryFailures(stderr: string): LoaderEntryFailure[] {
  const failures = new Map<string, LoaderEntryFailure>()
  const pattern = /failed to apply loader entry ([^\s(]+) \(([^)]+)\): ([^\r\n]+)/g
  for (const match of stderr.matchAll(pattern)) {
    const [, id, name, reason] = match
    if (id && name && reason) failures.set(id, { id, name, reason })
  }
  return [...failures.values()]
}

function isCompatibilityFailure(reason: string): boolean {
  return /service "[^"]+" has been registered|unsupported JSON schema:/.test(reason)
}

export function profilePatchPath(dshHome: string): string {
  return join(dshHome, 'profiles', 'web', 'cordis.patch.yml')
}

export function marketStatePath(dshHome: string): string {
  return join(dshHome, 'profiles', 'web', '.dsh-market', 'state.json')
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))]
}

function readPatchDisabled(text: string): Set<string> {
  const disabled = new Set<string>()
  const lines = text.split(/\r?\n/u)
  let inInsert = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (/^- insert:\s*$/u.test(line)) {
      inInsert = true
      continue
    }
    if (/^- /u.test(line)) inInsert = false
    if (inInsert) continue
    const row = /^- id: ([A-Za-z0-9_.-]+)\s*$/u.exec(line)
    const id = row?.[1]
    const next = lines[index + 1] ?? ''
    if (id !== undefined && /^ {2}disabled: true\s*$/u.test(next)) {
      disabled.add(id)
    } else if (id !== undefined && /^ {2}disabled: false\s*$/u.test(next)) {
      disabled.delete(id)
    }
  }
  return disabled
}

function appendPatchBlocks(text: string, rowIds: string[]): string {
  const blocks = rowIds.map((id) => `- id: ${id}\n  disabled: true\n`).join('')
  const withoutComments = text.replace(/^[ \t]*#.*$/gmu, '').trim()
  if (text.trim() === '') return blocks
  if (withoutComments === '') return `${text.endsWith('\n') ? text : `${text}\n`}${blocks}`
  if (withoutComments === '[]' || withoutComments === '[ ]') {
    const commented = text.replace(/^[ \t]*\[[ \t]*\][ \t]*(?:#.*)?(?:\r?\n|$)/mu, '# []\n')
    return `${commented.endsWith('\n') ? commented : `${commented}\n`}${blocks}`
  }
  return `${text.endsWith('\n') ? text : `${text}\n`}${blocks}`
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryPath, contents, 'utf8')
  await rename(temporaryPath, path)
}

async function readMarketState(path: string): Promise<MarketState> {
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
    const groups: Record<string, string[]> = {}
    if (raw.groups !== null && typeof raw.groups === 'object' && !Array.isArray(raw.groups)) {
      for (const [name, members] of Object.entries(raw.groups)) {
        groups[name] = uniqueStrings(members)
      }
    }
    return {
      disabled: uniqueStrings(raw.disabled),
      groups,
      groupOrder: uniqueStrings(raw.groupOrder),
      raw
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { disabled: [], groups: {}, groupOrder: [], raw: {} }
  }
}

export async function disableIncompatibleUserPlugins(
  dshHome: string,
  stderr: string
): Promise<string[]> {
  const nodeModules = resolve(dshHome, 'profiles', 'web', 'node_modules')
  const failures = extractLoaderEntryFailures(stderr).filter(({ reason }) => {
    return isCompatibilityFailure(reason)
  })
  const userPlugins: LoaderEntryFailure[] = []

  for (const failure of failures) {
    const manifestPath = resolve(nodeModules, ...failure.name.split('/'), 'package.json')
    if (!manifestPath.startsWith(`${nodeModules}${sep}`) || !existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      if (manifest?.name === failure.name) userPlugins.push(failure)
    } catch {
      // Invalid packages are not safe recovery candidates.
    }
  }
  if (userPlugins.length === 0) return []

  const patchPath = profilePatchPath(dshHome)
  let patchText = ''
  try {
    patchText = await readFile(patchPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const patchDisabled = readPatchDisabled(patchText)
  const statePath = marketStatePath(dshHome)
  const state = await readMarketState(statePath)
  const stateDisabled = new Set(state.disabled)
  const patchAdded = userPlugins.filter((failure) => !patchDisabled.has(failure.id))
  const stateAdded = userPlugins.filter((failure) => !stateDisabled.has(failure.name))
  if (patchAdded.length === 0 && stateAdded.length === 0) return []

  if (patchAdded.length > 0) {
    await atomicWrite(patchPath, appendPatchBlocks(patchText, patchAdded.map(({ id }) => id)))
  }
  for (const failure of stateAdded) stateDisabled.add(failure.name)
  if (stateAdded.length > 0) {
    await atomicWrite(
      statePath,
      JSON.stringify({
        ...state.raw,
        disabled: [...stateDisabled],
        groups: state.groups,
        groupOrder: state.groupOrder
      })
    )
  }
  return userPlugins
    .filter((failure) => patchAdded.includes(failure) || stateAdded.includes(failure))
    .map(({ name }) => name)
}
