import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { delimiter, dirname, join } from 'node:path'

const PROFILE = 'web'
const OPERATION_TIMEOUT_MS = 15 * 60 * 1000
/**
 * The ceiling on a repair, not its budget. What actually ends a stalled repair
 * is {@link IDLE_TIMEOUT_MS}; this only stops a run that keeps producing
 * progress forever.
 *
 * It used to be five minutes of wall clock, which on Windows was less than a
 * healthy install takes: `clone` is a reflink, NTFS has none, so every package
 * is copied out of the store file by file with a virus scanner in the path.
 * The kill then landed mid-rename and left exactly the damaged directories
 * that trigger the next repair — each launch clearing more than the last.
 */
const REPAIR_CAP_MS = 30 * 60 * 1000
/** How long a run may show no sign of progress before it is considered stalled. */
const IDLE_TIMEOUT_MS = 2 * 60 * 1000
/** How often progress is sampled from the filesystem. */
const PROGRESS_POLL_MS = 5 * 1000
/**
 * Depth of the progress walk, counted from `node_modules`: the virtual store, an
 * entry inside it, that entry’s `node_modules`, the package, and one level of
 * the package’s own contents — far enough that a copy in progress is visible.
 */
const PROGRESS_SCAN_DEPTH = 5
/** Directories one walk may visit, so sampling stays cheap on a large profile. */
const PROGRESS_SCAN_LIMIT = 1024
const MAX_OUTPUT_BYTES = 32 * 1024

export interface ProfilePluginCommandOptions {
  dshHome: string
  dshEntryPath: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /**
   * The packaged lock-recovery runner. The shims below share a directory with
   * the ones the Harness-side installer writes, so leaving this out would
   * replace a runner-routed pnpm with a plain one and silently drop the
   * recovery until Harness next rewrote them.
   */
  pnpmRunnerPath?: string
  environment?: NodeJS.ProcessEnv
}

export interface ProfilePluginCommandResult {
  ok: boolean
  detail?: string
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function buildProfilePluginRemoveArguments(
  dshEntryPath: string,
  pluginName: string
): string[] {
  return [dshEntryPath, 'plugin', '--profile', PROFILE, 'remove', pluginName]
}

/**
 * Reinstall everything the profile manifest asks for. This runs before Harness
 * starts, which is the only moment the packages it would otherwise hold open
 * can be replaced — so it is also how a profile left damaged by an earlier
 * failure gets its packages back.
 *
 * The lockfile is explicitly allowed to move. This repair runs with CI set,
 * which is pnpm's signal to install with a frozen lockfile, and the profile it
 * has to repair is exactly the one where the lockfile cannot be trusted: a
 * `pnpm add` that fails while linking has already written the new version into
 * pnpm-lock.yaml while package.json still names the old one. Frozen there
 * fails on the divergence — `ERR_PNPM_OUTDATED_LOCKFILE` — which turns the one
 * path out of a damaged profile into another way to stay in it. The manifest
 * is what the profile is meant to be; the lockfile follows it.
 */
export function buildProfileInstallArguments(dshEntryPath: string): string[] {
  return [dshEntryPath, 'plugin', '--profile', PROFILE, 'install', '--no-frozen-lockfile']
}

export function buildPnpmShimCommand(options: ProfilePluginCommandOptions): string[] {
  const runner =
    options.pnpmRunnerPath !== undefined && existsSync(options.pnpmRunnerPath)
      ? [options.pnpmRunnerPath]
      : []
  return [...runner, options.pnpmEntryPath]
}

export async function ensureProfilePnpmShim(options: ProfilePluginCommandOptions): Promise<string> {
  const directory = join(options.dshHome, '.desktop-bin')
  await mkdir(directory, { recursive: true })
  const command = buildPnpmShimCommand(options)

  if (process.platform === 'win32') {
    await writeFile(
      join(directory, 'pnpm.cmd'),
      `@chcp 65001 >nul\r\n@echo off\r\n"${options.nodeExecutablePath}" ${command
        .map((part) => `"${part}"`)
        .join(' ')} %*\r\n`,
      'utf8'
    )
    await writeFile(
      join(directory, 'node.cmd'),
      `@chcp 65001 >nul\r\n@echo off\r\n"${options.nodeExecutablePath}" %*\r\n`,
      'utf8'
    )
  } else {
    const pnpmPath = join(directory, 'pnpm')
    await writeFile(
      pnpmPath,
      `#!/bin/sh\nexec ${shellQuote(options.nodeExecutablePath)} ${command
        .map(shellQuote)
        .join(' ')} "$@"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(pnpmPath, 0o755)
    const nodePath = join(directory, 'node')
    await writeFile(
      nodePath,
      `#!/bin/sh\nexec ${shellQuote(options.nodeExecutablePath)} "$@"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(nodePath, 0o755)
  }

  return directory
}

export function buildProfilePluginCommandEnvironment(
  environment: NodeJS.ProcessEnv,
  shimDirectory: string,
  nodeExecutablePath: string
): NodeJS.ProcessEnv {
  const result = { ...environment }
  delete result.ELECTRON_RUN_AS_NODE

  const currentPath =
    (process.platform === 'win32' ? result.Path : result.PATH) ??
    result.PATH ??
    result.Path ??
    ''
  const parts = currentPath.split(delimiter).filter(Boolean)
  const additions = [shimDirectory, dirname(nodeExecutablePath)].filter(
    (directory) => !parts.includes(directory)
  )
  const nextPath = [...additions, currentPath].filter(Boolean).join(delimiter)
  result.PATH = nextPath
  if (process.platform === 'win32') result.Path = nextPath
  result.DSH_HOME = result.DSH_HOME ?? ''
  result.CI = 'true'
  result.NO_COLOR = '1'
  result.PNPM_MAX_WORKERS = '1'
  result.npm_config_child_concurrency = '1'
  result.npm_config_package_import_method = 'clone-or-copy'
  result.npm_config_side_effects_cache = 'false'
  result.PNPM_CONFIG_CHILD_CONCURRENCY = '1'
  result.PNPM_CONFIG_PACKAGE_IMPORT_METHOD = 'clone-or-copy'
  result.PNPM_CONFIG_SIDE_EFFECTS_CACHE = 'false'
  return result
}

/**
 * The line worth reporting from a failed run. dsh's own wrapper ("pnpm failed
 * in profile directory …") is always last and names no cause, so a line that
 * does name one wins — otherwise a failure reads as a dead end.
 */
export function diagnosticLine(output: string): string | undefined {
  const lines = output
    .trim()
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const named = lines.filter((line: string) =>
    /EPERM|EBUSY|EACCES|EEXIST|ENOTEMPTY|ENOENT|ERR_PNPM|error:/u.test(line)
  )
  return (named.at(-1) ?? lines.at(-1))?.slice(0, 800)
}

/**
 * A cheap signature of how far an install has got.
 *
 * stdout alone cannot answer this. These runs set CI and NO_COLOR, which
 * suppress pnpm's progress reporter, so a long copy and a hang look identical
 * from the pipe. The profile's `node_modules` is where the work lands, so its
 * shape is the signal.
 *
 * The walk starts at `node_modules`, not at the virtual store. This profile
 * sets `nodeLinker: hoisted`, so packages land directly under `node_modules`
 * and `.pnpm` holds nothing but a lockfile for the profile's whole life —
 * watching it would report a healthy install as motionless from the first
 * sample to the last. Starting a level up covers the hoisted layout and the
 * isolated one alike, since `.pnpm` is simply one of the entries walked.
 *
 * The shape also has to be sampled below the top level. A directory's mtime
 * moves only when its own entries change, so a package being copied file by
 * file — one package at a time, with child-concurrency pinned to 1 — leaves
 * everything above it untouched for as long as the copy takes. Reading that as
 * a stall would kill a healthy install mid-rename, which is how damaged
 * directories get made in the first place.
 *
 * Symlinks are skipped: pnpm's layout is mostly links into the store, they
 * lead back out of the tree, and none of them is where writing happens. The
 * walk is bounded rather than complete — a truncated walk that shifts between
 * samples reads as progress, which errs toward letting a run continue.
 * @returns a value to compare against the previous sample, never an error.
 */
export async function progressSignature(profileDirectory: string): Promise<string> {
  const root = join(profileDirectory, 'node_modules')
  const queue: Array<{ path: string; depth: number }> = [{ path: root, depth: 0 }]
  let directories = 0
  let latest = 0

  while (queue.length > 0 && directories < PROGRESS_SCAN_LIMIT) {
    const { path, depth } = queue.shift() as { path: string; depth: number }
    let entries
    try {
      entries = await readdir(path, { withFileTypes: true })
    } catch {
      continue
    }
    directories += 1

    try {
      const info = await stat(path)
      if (info.mtimeMs > latest) latest = info.mtimeMs
    } catch {
      // Gone between the two calls, which is itself the tree changing.
    }

    if (depth >= PROGRESS_SCAN_DEPTH) continue
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      queue.push({ path: join(path, entry.name), depth: depth + 1 })
    }
  }

  return `${directories}:${latest}`
}

function killProcessTree(child: ReturnType<typeof spawn>): void {
  if (child.exitCode !== null || !child.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore'
    }).unref()
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

export async function removeProfilePluginWithDsh(
  options: ProfilePluginCommandOptions,
  pluginName: string
): Promise<ProfilePluginCommandResult> {
  return runProfileCommand(options, buildProfilePluginRemoveArguments(options.dshEntryPath, pluginName), 'Plugin removal', OPERATION_TIMEOUT_MS)
}

/**
 * Restore the profile's packages with Harness stopped.
 *
 * This sits between the user and their window, so it still has to give up
 * rather than leave a launch looking hung — but it gives up on silence, not on
 * the clock. A repair that is still writing packages is the opposite of a hung
 * one, and killing it was how a damaged profile got more damaged.
 * @param timeoutMs - the ceiling, reached only by a run that never stops
 * making progress.
 */
export async function installProfileDependenciesWithDsh(
  options: ProfilePluginCommandOptions,
  timeoutMs = REPAIR_CAP_MS
): Promise<ProfilePluginCommandResult> {
  return runProfileCommand(options, buildProfileInstallArguments(options.dshEntryPath), 'Profile repair', timeoutMs)
}

async function runProfileCommand(
  options: ProfilePluginCommandOptions,
  commandArguments: string[],
  label: string,
  timeoutMs: number,
  idleTimeoutMs: number = IDLE_TIMEOUT_MS
): Promise<ProfilePluginCommandResult> {
  const requiredPaths = [
    options.dshEntryPath,
    options.nodeExecutablePath,
    options.pnpmEntryPath
  ]
  if (requiredPaths.some((path) => !existsSync(path))) {
    return { ok: false, detail: 'The bundled DSH, Node.js, or pnpm runtime was not found.' }
  }

  const profileDirectory = join(options.dshHome, 'profiles', PROFILE)
  if (!existsSync(profileDirectory)) {
    return { ok: false, detail: 'The web profile directory was not found.' }
  }

  try {
    const shimDirectory = await ensureProfilePnpmShim(options)
    const environment = buildProfilePluginCommandEnvironment(
      options.environment ?? process.env,
      shimDirectory,
      options.nodeExecutablePath
    )
    environment.DSH_HOME = options.dshHome

    const child = spawn(
      options.nodeExecutablePath,
      commandArguments,
      {
        cwd: profileDirectory,
        env: environment,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        detached: process.platform !== 'win32'
      }
    )

    let output = ''
    const append = (chunk: Buffer | string): void => {
      output = `${output}${chunk.toString()}`.slice(-MAX_OUTPUT_BYTES)
    }
    child.stdout?.on('data', append)
    child.stderr?.on('data', append)

    const started = Date.now()
    let lastProgress = started
    let signature = await progressSignature(profileDirectory)
    let expiry: 'idle' | 'cap' | undefined

    const noteProgress = (): void => {
      lastProgress = Date.now()
    }
    child.stdout?.on('data', noteProgress)
    child.stderr?.on('data', noteProgress)

    const monitor = setInterval(() => {
      void (async () => {
        const current = await progressSignature(profileDirectory)
        if (current !== signature) {
          signature = current
          noteProgress()
        }
        const now = Date.now()
        if (now - started >= timeoutMs) expiry = 'cap'
        else if (now - lastProgress >= idleTimeoutMs) expiry = 'idle'
        else return
        killProcessTree(child)
      })()
    }, PROGRESS_POLL_MS)

    try {
      const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
        (resolve, reject) => {
          child.once('error', reject)
          child.once('exit', (code, signal) => resolve({ code, signal }))
        }
      )
      if (expiry !== undefined) {
        return {
          ok: false,
          detail:
            expiry === 'idle'
              ? `${label} stalled: no progress for ${Math.round(idleTimeoutMs / 1000)}s.`
              : `${label} timed out after ${Math.round(timeoutMs / 60_000)} minutes.`
        }
      }
      if (exit.code !== 0) {
        const detail = diagnosticLine(output)
        return {
          ok: false,
          detail:
            detail ||
            `${label} exited with ${exit.signal ? `signal ${exit.signal}` : `code ${exit.code}`}.`
        }
      }
      return { ok: true }
    } finally {
      clearInterval(monitor)
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    }
  }
}
