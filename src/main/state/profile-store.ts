import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { profilePackageJsonPath } from './plugin-recovery'

/**
 * Where the profile's packages are linked from, and why it has to be written
 * down.
 *
 * pnpm records the store it materialized `node_modules` from in
 * `.modules.yaml`, and refuses every later operation if the store it would use
 * now is a different one — `ERR_PNPM_UNEXPECTED_STORE`. That refusal is total:
 * not just installs, but uninstalls, updates and repairs, which is a plugin
 * system locked shut from the outside. A profile whose store sits inside
 * itself reaches that state the moment anything runs pnpm without saying so,
 * because the default store lives under the user's home instead.
 *
 * The desktop already writes the profile's `.npmrc`. Pinning the recorded
 * store there keeps the two accounts of the same fact from drifting apart.
 */

/** The store `node_modules` was linked from, as pnpm recorded it. */
export async function recordedStoreDir(profileDirectory: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(profileDirectory, 'node_modules', '.modules.yaml'), 'utf8')
    // pnpm writes this file as JSON-in-YAML, so the value arrives quoted and
    // comma-terminated; older layouts write it bare.
    const quoted = /^\s*"?storeDir"?\s*:\s*"([^"]+)"/mu.exec(raw)
    const bare = /^\s*"?storeDir"?\s*:\s*([^"\s][^,\n]*?)\s*,?\s*$/mu.exec(raw)
    const value = (quoted?.[1] ?? bare?.[1])?.trim()
    return value ? value : undefined
  } catch {
    return undefined
  }
}

/** The store an `.npmrc` pins, if it pins one. */
export function configuredStoreDir(npmrc: string): string | undefined {
  const match = /^\s*store-dir\s*=\s*(.+?)\s*$/mu.exec(npmrc)
  const value = match?.[1]
  return value ? value : undefined
}

/**
 * An `.npmrc` that pins the store pnpm actually used.
 * @returns the text to write, or undefined when it already says so — callers
 * leave the file alone rather than rewriting it on every launch.
 */
export function pinStoreDir(npmrc: string, storeDir: string): string | undefined {
  const configured = configuredStoreDir(npmrc)
  if (configured === storeDir) return undefined
  const newline = npmrc.includes('\r\n') ? '\r\n' : '\n'
  // pnpm strips the trailing store version segment from what it records, so
  // the pinned value is the directory that contains it.
  const body = configured === undefined
    ? npmrc
    : npmrc.replace(/^\s*store-dir\s*=.*(?:\r?\n|$)/mu, '')
  const separator = body.length === 0 || body.endsWith('\n') ? '' : newline
  return `${body}${separator}store-dir=${storeDir}${newline}`
}

async function writeFileAtomically(path: string, contents: string): Promise<void> {
  const temporary = `${path}.dsh-desktop-${process.pid}-${Date.now()}.tmp`
  try {
    await writeFile(temporary, contents, 'utf8')
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

/**
 * pnpm records the store including its version segment (`…/v10`); the setting
 * names the directory above it.
 */
export function storeDirSetting(recorded: string): string {
  return /[/\\]v\d+$/u.test(recorded) ? dirname(recorded) : recorded
}

/**
 * Write the recorded store into the profile's `.npmrc`, so the next pnpm run
 * uses the store its `node_modules` was built from.
 *
 * Only what pnpm already recorded is written — this states an existing fact
 * rather than choosing a new store, and a profile that never installed
 * anything has nothing to state. Run before Harness starts, alongside the
 * other repairs, so the operations that follow can actually run.
 * @returns the pinned store, or undefined when nothing needed doing.
 */
export async function ensureStoreDirPinned(dshHome: string): Promise<string | undefined> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const recorded = await recordedStoreDir(profileDirectory)
  if (recorded === undefined) return undefined

  const npmrcPath = join(profileDirectory, '.npmrc')
  let npmrc = ''
  try {
    npmrc = await readFile(npmrcPath, 'utf8')
  } catch {
    // A profile without an .npmrc still deserves the pin.
  }

  const expected = storeDirSetting(recorded)
  const pinned = pinStoreDir(npmrc, expected)
  if (pinned === undefined) return undefined

  try {
    await writeFileAtomically(npmrcPath, pinned)
    return expected
  } catch {
    return undefined
  }
}

/**
 * Whether a profile is about to meet ERR_PNPM_UNEXPECTED_STORE.
 * @returns a sentence naming the mismatch, or undefined when the two agree —
 * or when there is nothing recorded yet to disagree with.
 */
export async function inspectStoreConsistency(dshHome: string): Promise<string | undefined> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const recorded = await recordedStoreDir(profileDirectory)
  if (recorded === undefined) return undefined

  let npmrc = ''
  try {
    npmrc = await readFile(join(profileDirectory, '.npmrc'), 'utf8')
  } catch {
    // No .npmrc pins nothing, which is exactly the drift being reported.
  }

  const configured = configuredStoreDir(npmrc)
  const expected = storeDirSetting(recorded)
  if (configured === expected) return undefined

  return configured === undefined
    ? `node_modules was linked from ${recorded}, which no .npmrc pins — pnpm will refuse to run here`
    : `node_modules was linked from ${recorded}, but .npmrc pins ${configured} — pnpm will refuse to run here`
}
