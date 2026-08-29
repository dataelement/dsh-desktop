import { createHash } from 'node:crypto'
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
 * Two pointer files, not one:
 *
 *   desired.json         the generations the user has asked to run
 *   last-known-good.json  the generations that actually booted — committed only
 *                         after Harness reports ready AND the window renders
 *
 * `.install-complete` recorded that a pnpm command exited zero, then got read
 * as "this profile boots". Those are different claims. `desired` carries the
 * first, `last-known-good` the second, and a failed launch falls back to the
 * second rather than to a hash that only ever meant the first.
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
    lastKnownGoodPointer: join(root, 'last-known-good.json'),
    lockFile: join(root, '.lock')
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
  const safeName = pluginName.replace(/^@/u, '').replace(/[/\\]/gu, '+')
  const digest = createHash('sha256').update(lockfileText).digest('hex').slice(0, 12)
  return `${safeName}+${version}+${digest}`
}

async function readPointer(path) {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => typeof entry === 'string')
  } catch {
    return []
  }
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
  try {
    const parsed = JSON.parse(await readFile(join(directory, META_NAME), 'utf8'))
    if (typeof parsed.pluginName !== 'string' || typeof parsed.version !== 'string') return undefined
    return {
      pluginName: parsed.pluginName,
      version: parsed.version,
      ...(typeof parsed.sourceSpec === 'string' ? { sourceSpec: parsed.sourceSpec } : {})
    }
  } catch {
    return undefined
  }
}

export async function writeGenerationMeta(directory, meta) {
  await writeFile(join(directory, META_NAME), `${JSON.stringify(meta, undefined, 2)}\n`, 'utf8')
}

/** Every promoted generation currently on disk. */
export async function listGenerations(dshHome) {
  const { generations } = registryLayout(dshHome)
  let entries
  try {
    entries = await readdir(generations, { withFileTypes: true })
  } catch {
    return []
  }
  const found = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const directory = join(generations, entry.name)
    const meta = await readGenerationMeta(directory)
    if (meta === undefined) continue
    found.push({ id: entry.name, directory, ...meta })
  }
  return found
}

export async function readDesired(dshHome) {
  return readPointer(registryLayout(dshHome).desiredPointer)
}

export async function readLastKnownGood(dshHome) {
  return readPointer(registryLayout(dshHome).lastKnownGoodPointer)
}

export async function writeDesired(dshHome, generationIds) {
  await writePointerAtomically(registryLayout(dshHome).desiredPointer, generationIds)
}

/**
 * Commit the currently-desired set as known good. Call this only once Harness
 * has reported ready and the main window has rendered — never on a pnpm exit
 * code.
 */
export async function commitLastKnownGood(dshHome) {
  const desired = await readDesired(dshHome)
  await writePointerAtomically(registryLayout(dshHome).lastKnownGoodPointer, desired)
}

/** Roll `desired` back to the last set that actually booted. */
export async function revertToLastKnownGood(dshHome) {
  const lkg = await readLastKnownGood(dshHome)
  await writeDesired(dshHome, lkg)
  return lkg
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
    if (generation !== undefined && existsSync(generation.directory)) {
      enabled.set(generation.pluginName, generation)
    }
  }
  return enabled
}

/**
 * The generation ids that are safe to physically delete now: nothing in either
 * pointer references them, so no running process could be importing from them
 * once Harness is stopped.
 */
export async function collectUnreferencedGenerations(dshHome) {
  const [desired, lkg, all] = await Promise.all([
    readDesired(dshHome),
    readLastKnownGood(dshHome),
    listGenerations(dshHome)
  ])
  const referenced = new Set([...desired, ...lkg])
  return all.filter((generation) => !referenced.has(generation.id)).map((generation) => generation.id)
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
  for (const id of unreferenced) {
    const directory = join(layout.generations, id)
    try {
      await rm(directory, { recursive: true, force: true })
      removed.push(id)
    } catch {
      failed.push(id)
    }
  }

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

  return { removed, failed }
}
