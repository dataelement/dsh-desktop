import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The registry is the single source of truth for which plugin generations
 * exist and which ones the app is running.
 *
 * A generation is a complete, independent plugin install project frozen under
 * an immutable directory. Nothing ever writes into a generation after it is
 * promoted, and nothing is ever replaced in place — an upgrade is a new
 * generation plus a pointer move. That is what keeps the mechanism off the one
 * Windows operation that wedges pnpm: renaming over a directory that already
 * exists.
 *
 * `desired.json` is the sole authority for the generations the user has asked
 * to run. A failed launch never rewrites it; recovery requires an explicit,
 * exact plugin selection so one incompatible plugin cannot remove siblings.
 */

/**
 * Generations live under `$DSH_HOME/profiles/.generations/` so that a plugin
 * running from `…/.generations/live/<id>/node_modules/<plugin>` reaches
 * `$DSH_HOME/profiles/node_modules` — the installation closure — through
 * Node's ordinary parent walk, which is how the app-boot contract expects
 * peers (react, cordis, the @deepseek-ai runtime) to resolve. A sibling
 * directory would never be on that walk.
 *
 * The leading dot keeps the directory out of Harness's profile enumeration,
 * which only lists names that do not start with `.`.
 */
export function registryLayout(dshHome) {
  const root = join(dshHome, 'profiles', '.generations')
  return {
    root,
    generations: join(root, 'live'),
    staging: join(root, 'staging'),
    trash: join(root, 'trash'),
    desiredPointer: join(root, 'desired.json'),
    lockFile: join(root, '.lock')
  }
}

const SAFE_PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/iu
const SAFE_VERSION_PATTERN = /^[0-9a-z][0-9a-z._+-]*$/iu

/**
 * Packages the profile always keeps as real directories in its shared tree:
 * pnpm-managed, and never resolved from a generation however one got into
 * `desired`.
 *
 * The app-side `KEEP_IN_SHARED_TREE` (generation-migration.ts) lists the same
 * intent for the migration, plus the two in-box bundles that never reach this
 * registry at all. Nothing keeps the two in sync — only dshmarket is ever
 * installable from the market, so only dshmarket needs guarding here.
 */
const SHARED_TREE_ONLY = new Set(['dshmarket'])

function assertSafePackageName(pluginName, context = 'Generation plugin name') {
  if (typeof pluginName !== 'string' || !SAFE_PACKAGE_NAME_PATTERN.test(pluginName)) {
    throw new Error(`${context} is not a safe npm package name: ${String(pluginName)}`)
  }
}

function assertSafeVersion(version, context = 'Generation version') {
  if (
    typeof version !== 'string' ||
    !SAFE_VERSION_PATTERN.test(version) ||
    version === '.' ||
    version === '..'
  ) {
    throw new Error(`${context} is not safe for a generation id: ${String(version)}`)
  }
}

export async function ensureRegistryDirectories(dshHome) {
  const layout = registryLayout(dshHome)
  for (const dir of [layout.generations, layout.staging, layout.trash]) {
    await mkdir(dir, { recursive: true })
  }
  return layout
}

/**
 * A generation ID that survives everything `<name>@<version>` cannot:
 * scoped names (the `/` and `@`), git and file specs that carry no clean
 * version, and two installs of the same version whose trees differ. The hash
 * is over the resolved lockfile, so identical inputs collapse to one
 * generation and different inputs never collide.
 */
export function generationId(pluginName, version, lockfileText) {
  assertSafePackageName(pluginName)
  assertSafeVersion(version)
  const safeName = pluginName.replace(/^@/u, '').replace(/[/\\]/gu, '+')
  const digest = createHash('sha256').update(lockfileText).digest('hex').slice(0, 12)
  return `${safeName}+${version}+${digest}`
}

async function readPointer(path) {
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw new Error(
      `Generation pointer could not be read: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(
      `Generation pointer is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    )
  }
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
    throw new Error('Generation pointer must be an array of generation ids.')
  }
  return parsed
}

async function writePointerAtomically(path, ids) {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  const body = `${JSON.stringify([...ids].sort(), undefined, 2)}\n`
  try {
    await writeFile(temporary, body, 'utf8')
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

/**
 * A cross-process lock. `operationPromise` inside the market plugin only
 * serialises calls within one process; an external `dsh plugin`, a second app
 * instance, or a recovery run can still race it. `open(path, 'wx')` fails when
 * the file exists, which is the whole primitive — a stale lock from a crash is
 * broken after the deadline.
 */
export async function withRegistryLock(dshHome, run, options = {}) {
  const { staleAfterMs = 20 * 60 * 1000, retryMs = 500, timeoutMs = 15 * 60 * 1000 } = options
  const { lockFile, root } = registryLayout(dshHome)
  await mkdir(root, { recursive: true })
  const deadline = Date.now() + timeoutMs

  for (;;) {
    try {
      const handle = await open(lockFile, 'wx')
      await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`)
      await handle.close()
      break
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      const age = await lockAgeMs(lockFile)
      if (age !== undefined && age > staleAfterMs) {
        await rm(lockFile, { force: true }).catch(() => undefined)
        continue
      }
      if (Date.now() > deadline) {
        throw new Error('Another plugin operation is holding the registry lock.')
      }
      await new Promise((resolve) => setTimeout(resolve, retryMs))
    }
  }

  try {
    return await run()
  } finally {
    await rm(lockFile, { force: true }).catch(() => undefined)
  }
}

async function lockAgeMs(lockFile) {
  try {
    const { mtimeMs } = await stat(lockFile)
    return Date.now() - mtimeMs
  } catch {
    return undefined
  }
}

const META_NAME = 'generation.json'

async function readGenerationMeta(directory) {
  const path = join(directory, META_NAME)
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    throw new Error(
      `Generation metadata could not be read at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(
      `Generation metadata is invalid JSON at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Generation metadata root is invalid at ${path}.`)
  }
  assertSafePackageName(parsed.pluginName, `Generation metadata plugin name at ${path}`)
  assertSafeVersion(parsed.version, `Generation metadata version at ${path}`)
  if (parsed.sourceSpec !== undefined && typeof parsed.sourceSpec !== 'string') {
    throw new Error(`Generation metadata source spec is invalid at ${path}.`)
  }
  return {
    pluginName: parsed.pluginName,
    version: parsed.version,
    ...(typeof parsed.sourceSpec === 'string' ? { sourceSpec: parsed.sourceSpec } : {})
  }
}

export async function writeGenerationMeta(directory, meta) {
  await writeFile(join(directory, META_NAME), `${JSON.stringify(meta, undefined, 2)}\n`, 'utf8')
}

async function listGenerationDirectoryIds(dshHome) {
  const { generations } = registryLayout(dshHome)
  let entries
  try {
    entries = await readdir(generations, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw new Error(
      `Generation registry could not be read at ${generations}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/** Every readable promoted generation currently on disk. */
export async function listGenerations(dshHome) {
  const { generations } = registryLayout(dshHome)
  const ids = await listGenerationDirectoryIds(dshHome)
  const found = []
  for (const id of ids) {
    const directory = join(generations, id)
    let meta
    try {
      meta = await readGenerationMeta(directory)
    } catch (error) {
      // A failed recursive deletion can remove generation.json before Windows
      // reports a locked descendant. Such an unreferenced shell must be inert
      // so projection and the next sweep can recover. Other metadata failures
      // remain fail-closed.
      if (error?.cause?.code === 'ENOENT') continue
      throw error
    }
    found.push({ id, directory, ...meta })
  }
  return found
}

export async function readDesired(dshHome) {
  return readPointer(registryLayout(dshHome).desiredPointer)
}

export async function writeDesired(dshHome, generationIds) {
  await writePointerAtomically(registryLayout(dshHome).desiredPointer, generationIds)
}

/**
 * Drop every generation of `pluginName` from `desired`. This is how a plugin
 * gets uninstalled: the recovery and Safe Mode paths route here for a
 * generation plugin instead of `dsh plugin remove`, because `desired` is what
 * projection re-derives the profile from — a `pnpm remove` would be undone on
 * the next launch. The generation directory stays for a fast re-enable and is
 * swept on a later cold start.
 * @returns whether a generation was removed.
 */
export async function disableGeneration(dshHome, pluginName) {
  const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const byId = new Map(generations.map((generation) => [generation.id, generation]))
  const next = desired.filter((id) => byId.get(id)?.pluginName !== pluginName)
  if (next.length === desired.length) return false
  await writeDesired(dshHome, next)
  return true
}

/** Whether any promoted generation provides `pluginName`. */
export async function isGenerationPlugin(dshHome, pluginName) {
  const generations = await listGenerations(dshHome)
  return generations.some((generation) => generation.pluginName === pluginName)
}

/**
 * The name -> directory map the loader resolves against. Built from `desired`
 * so a generation that exists on disk but is not currently wanted is invisible
 * to resolution while still available for a fast rollback.
 */
export async function resolveEnabledGenerations(dshHome) {
  const [desired, all] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const byId = new Map(all.map((generation) => [generation.id, generation]))
  const enabled = new Map()
  for (const id of desired) {
    const generation = byId.get(id)
    // A core bundle is never resolved from a generation, whatever `desired`
    // says. Projection would otherwise re-link it on every launch, which no
    // later repair can outrun. Left in place rather than thrown on: the
    // pointer is inert, and startup demotes it back to the shared tree.
    if (generation !== undefined && SHARED_TREE_ONLY.has(generation.pluginName)) continue
    if (generation === undefined || !existsSync(generation.directory)) {
      throw new Error(`Desired generation is missing or unreadable: ${id}`)
    }
    enabled.set(generation.pluginName, generation)
  }
  return enabled
}

/** The generation ids not referenced by the authoritative desired pointer. */
export async function collectUnreferencedGenerations(dshHome) {
  const layout = registryLayout(dshHome)
  const [desired, directoryIds] = await Promise.all([
    readDesired(dshHome),
    listGenerationDirectoryIds(dshHome)
  ])
  const known = new Set(directoryIds)
  for (const id of desired) {
    if (!known.has(id)) throw new Error(`Desired generation is missing or unreadable: ${id}`)
    try {
      await readGenerationMeta(join(layout.generations, id))
    } catch (error) {
      if (error?.cause?.code !== 'ENOENT') throw error
      throw new Error(`Desired generation is missing or unreadable: ${id}`, { cause: error })
    }
  }
  const referenced = new Set(desired)
  return directoryIds.filter((id) => !referenced.has(id))
}

/**
 * Physically remove staging leftovers and unreferenced generations. Safe to
 * call only while Harness is stopped. A removal that fails (a scanner still
 * has a handle, say) is left for the next cold start — an orphan generation
 * nothing resolves against is inert.
 */
export async function sweepRegistry(dshHome) {
  const layout = registryLayout(dshHome)
  const removed = []
  const failed = []

  const unreferenced = await collectUnreferencedGenerations(dshHome)
  // Remove leftovers from earlier runs before moving new generations into
  // trash. A failed delete below is intentionally left there until next run.
  for (const dir of [layout.staging, layout.trash]) {
    const label = dir === layout.staging ? 'staging' : 'trash'
    let entries = []
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }
    for (const name of entries) {
      try {
        await rm(join(dir, name), { recursive: true, force: true })
        removed.push(`${label}/${name}`)
      } catch {
        failed.push(`${label}/${name}`)
      }
    }
  }

  await mkdir(layout.trash, { recursive: true })
  for (const id of unreferenced) {
    const directory = join(layout.generations, id)
    const trashed = join(layout.trash, `${id}.${randomUUID()}`)
    try {
      // Keep live atomic: even if Windows refuses to delete a locked child,
      // the incomplete generation can no longer poison registry enumeration.
      await rename(directory, trashed)
      await rm(trashed, { recursive: true, force: true })
      removed.push(id)
    } catch {
      failed.push(id)
    }
  }

  return { removed, failed }
}
