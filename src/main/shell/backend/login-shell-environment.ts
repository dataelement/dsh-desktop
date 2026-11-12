/** POSIX login-shell environment for launches that inherit only the GUI session. */
import { spawn, type ChildProcessByStdio } from 'node:child_process'
import { homedir, userInfo } from 'node:os'
import type { Readable } from 'node:stream'

const DELIMITER = '_DSH_SHELL_ENV_DELIMITER_'
const MARKER = Buffer.from(`\0${DELIMITER}\0`)
const DUMP = `printf '\\0%s\\0' '${DELIMITER}'; command env -0 || exit; printf '\\0%s\\0' '${DELIMITER}'; exit`
const FALLBACK_SHELLS = ['/bin/zsh', '/bin/bash', '/bin/sh'] as const
/** Keep oh-my-zsh update prompts and tmux autostart plugins from blocking a non-terminal read. */
const PROBE_ENVIRONMENT = { DISABLE_AUTO_UPDATE: 'true', ZSH_TMUX_AUTOSTARTED: 'true', ZSH_TMUX_AUTOSTART: 'false' } as const
/** Variables that describe the probe shell process rather than the user's configuration. */
const SHELL_SESSION_KEYS = new Set(['PWD', 'OLDPWD', 'SHLVL', '_', ...Object.keys(PROBE_ENVIRONMENT)])
/** Desktop resolves DSH_HOME before the read, so the Host keeps the inherited launcher values. */
const LAUNCHER_OWNED_PREFIXES = ['DSH_', 'ELECTRON_'] as const
const DEFAULT_TIMEOUT_MS = 10_000

/** Validated login-shell read settings. */
export interface DesktopLoginShellConfig {
  /** Deadline for each candidate shell, in milliseconds. */
  readonly timeoutMs: number
}

/** One candidate shell that did not produce an environment. */
export interface DesktopLoginShellFailure {
  readonly shell: string
  /**
   * `exit <code>`, terminating signal name, spawn error, `timeout`, `aborted`, or `unparsed`
   * for output without both delimiters.
   */
  readonly reason: string
}

/** Environment for the Host and the candidate failures that preceded it. */
export interface DesktopLoginShellResult {
  /** `base` merged with the first successful shell's variables, or `base` itself when none succeeded. */
  readonly environment: NodeJS.ProcessEnv
  readonly failures: readonly DesktopLoginShellFailure[]
}

/** Child created for one candidate. Tests substitute this; product launches use `spawn`. */
export interface DesktopLoginShellChild {
  readonly pid?: number
  readonly stdout: Readable | null
  kill(signal?: NodeJS.Signals): boolean
  on(event: 'error', listener: (error: Error) => void): void
  on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void
}

/** Inputs of {@link readDesktopLoginShellEnvironment} that product launches leave unset. */
export interface DesktopLoginShellReadOptions {
  /** Operating system running Desktop; defaults to `process.platform`. */
  readonly platform?: NodeJS.Platform
  /** Candidates in trial order; defaults to {@link loginShellCandidates}. */
  readonly shells?: readonly string[]
  /** Aborting kills the running candidate's process group and skips the remaining candidates. */
  readonly signal?: AbortSignal
  /** Replaces process creation. Product launches omit this. */
  readonly spawnShell?: (
    shell: string,
    args: readonly string[],
    options: { cwd: string, env: NodeJS.ProcessEnv, detached: true }
  ) => DesktopLoginShellChild
}

/**
 * Resolve the per-candidate deadline.
 * The official helper lives in `duration-env.ts`; this shell reads only this one variable.
 */
export function resolveDesktopLoginShellConfig(env: NodeJS.ProcessEnv): DesktopLoginShellConfig {
  const raw = env.DSH_DESKTOP_LOGIN_SHELL_TIMEOUT_MS
  if (typeof raw !== 'string' || raw.trim() === '') return { timeoutMs: DEFAULT_TIMEOUT_MS }
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return { timeoutMs: DEFAULT_TIMEOUT_MS }
  return { timeoutMs: value }
}

/**
 * Candidate shells in order: the account record's login shell (not `$SHELL`), then fixed system shells.
 * Only the fixed shells are used when the account record is unreadable or empty.
 */
export function loginShellCandidates(): readonly string[] {
  let account: string | null = null
  try {
    account = userInfo().shell
  } catch {
    account = null
  }
  const recorded = account === null || account === '' ? [] : [account]
  return [...new Set([...recorded, ...FALLBACK_SHELLS])]
}

/**
 * Extract the variables printed between the two delimiters of the dump command.
 * Returns undefined when both delimiters are not present.
 */
export function parseLoginShellOutput(stdout: string): Record<string, string> | undefined {
  const parts = stdout.split('\0')
  const first = parts.indexOf(DELIMITER)
  const last = parts.lastIndexOf(DELIMITER)
  if (first === -1 || first === last) return undefined
  const variables: Record<string, string> = {}
  for (const entry of parts.slice(first + 1, last)) {
    const separator = entry.indexOf('=')
    if (separator > 0) variables[entry.slice(0, separator)] = entry.slice(separator + 1)
  }
  return variables
}

/**
 * Overlay login-shell variables on the inherited environment.
 * Shell values win except for probe-session variables and launcher-owned `DSH_*` / `ELECTRON_*` names.
 */
export function mergeLoginShellEnvironment(
  base: NodeJS.ProcessEnv,
  shell: Readonly<Record<string, string>>
): NodeJS.ProcessEnv {
  const merged = { ...base }
  for (const [key, value] of Object.entries(shell)) {
    if (SHELL_SESSION_KEYS.has(key) || LAUNCHER_OWNED_PREFIXES.some(prefix => key.startsWith(prefix))) continue
    merged[key] = value
  }
  return merged
}

function defaultSpawnShell(
  shell: string,
  args: readonly string[],
  options: { cwd: string, env: NodeJS.ProcessEnv, detached: true }
): ChildProcessByStdio<null, Readable, null> {
  return spawn(shell, [...args], {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'ignore'],
    detached: true
  })
}

function readShell(
  shell: string,
  base: NodeJS.ProcessEnv,
  cwd: string,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  spawnShell: DesktopLoginShellReadOptions['spawnShell']
): Promise<Record<string, string> | string> {
  return new Promise(resolve => {
    if (signal?.aborted === true) {
      resolve('aborted')
      return
    }
    let child: DesktopLoginShellChild
    try {
      // Interactive login mode runs ~/.zprofile and ~/.zshrc. Closed stdin makes rc prompts read EOF.
      const start = spawnShell ?? defaultSpawnShell
      child = start(shell, ['-ilc', DUMP], {
        cwd,
        env: { ...base, ...PROBE_ENVIRONMENT },
        detached: true
      })
    } catch (error) {
      resolve(error instanceof Error ? error.message : String(error))
      return
    }
    const stdout = child.stdout
    if (stdout === null) {
      resolve('unparsed')
      return
    }
    const chunks: Buffer[] = []
    let tail = Buffer.alloc(0)
    let markers = 0
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const output = (): Record<string, string> | string => parseLoginShellOutput(Buffer.concat(chunks).toString('utf8')) ?? 'unparsed'
    const finish = (result: Record<string, string> | string): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      // Keep draining so rc-started children that write to stdout do not fail with EPIPE.
      stdout.off('data', onData)
      stdout.resume()
      resolve(result)
    }
    const killGroup = (): void => {
      if (typeof child.pid !== 'number') return
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        // The group already exited.
      }
    }
    // Members that left the process group can keep stdout open after SIGKILL.
    const stop = (reason: 'timeout' | 'aborted'): void => {
      finish(reason)
      killGroup()
    }
    const onAbort = (): void => { stop('aborted') }
    timer = setTimeout(() => { stop('timeout') }, timeoutMs)
    const onData = (chunk: Buffer): void => {
      chunks.push(chunk)
      const window = Buffer.concat([tail, chunk])
      for (
        let index = window.indexOf(MARKER);
        index !== -1;
        index = window.indexOf(MARKER, index + MARKER.length)
      ) markers += 1
      tail = window.subarray(Math.max(0, window.length - MARKER.length + 1))
      // Background children started by rc files can hold stdout open after the shell exits.
      if (markers >= 2) finish(output())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    stdout.on('data', onData)
    child.on('error', error => { finish(error.message) })
    child.on('close', (code, closeSignal) => {
      if (code !== 0) {
        finish(closeSignal ?? `exit ${String(code)}`)
        return
      }
      finish(output())
    })
  })
}

/**
 * Read the user's login-shell environment once.
 * Windows GUI launches already inherit the registry environment, so `win32` returns `base` unchanged.
 * Never rejects: each failing candidate is recorded and the next one tried.
 */
export async function readDesktopLoginShellEnvironment(
  base: NodeJS.ProcessEnv,
  config: DesktopLoginShellConfig,
  options: DesktopLoginShellReadOptions = {}
): Promise<DesktopLoginShellResult> {
  const platform = options.platform ?? process.platform
  const shells = options.shells ?? loginShellCandidates()
  if (platform === 'win32') return { environment: base, failures: [] }
  const failures: DesktopLoginShellFailure[] = []
  for (const shell of shells) {
    const result = await readShell(shell, base, homedir(), config.timeoutMs, options.signal, options.spawnShell)
    if (typeof result !== 'string') return { environment: mergeLoginShellEnvironment(base, result), failures }
    failures.push({ shell, reason: result })
    if (result === 'aborted') break
  }
  return { environment: base, failures }
}
