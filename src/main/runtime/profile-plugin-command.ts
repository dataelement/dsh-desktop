import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { delimiter, dirname, join } from 'node:path'

const PROFILE = 'web'
const OPERATION_TIMEOUT_MS = 15 * 60 * 1000
const REPAIR_TIMEOUT_MS = 5 * 60 * 1000
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
 */
export function buildProfileInstallArguments(dshEntryPath: string): string[] {
  return [dshEntryPath, 'plugin', '--profile', PROFILE, 'install']
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
 * @param timeoutMs - shorter than a user-initiated operation on purpose: this
 * one sits between the user and their window, so it gives up rather than
 * turning a damaged profile into a launch that looks hung.
 */
export async function installProfileDependenciesWithDsh(
  options: ProfilePluginCommandOptions,
  timeoutMs = REPAIR_TIMEOUT_MS
): Promise<ProfilePluginCommandResult> {
  return runProfileCommand(options, buildProfileInstallArguments(options.dshEntryPath), 'Profile repair', timeoutMs)
}

async function runProfileCommand(
  options: ProfilePluginCommandOptions,
  commandArguments: string[],
  label: string,
  timeoutMs: number
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

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, timeoutMs)

    try {
      const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
        (resolve, reject) => {
          child.once('error', reject)
          child.once('exit', (code, signal) => resolve({ code, signal }))
        }
      )
      if (timedOut) {
        return {
          ok: false,
          detail: `${label} timed out after ${Math.round(timeoutMs / 60_000)} minutes.`
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
      clearTimeout(timer)
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    }
  }
}
