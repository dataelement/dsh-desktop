import { execFileSync, type SpawnOptionsWithoutStdio } from 'node:child_process'
import type { EventEmitter } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import type { RuntimePhase, RuntimeSnapshot } from '../../shared/contracts'

export interface HarnessRuntimeOptions {
  dshEntryPath: string
  nodeExecutablePath: string
  nodeEntryPath: string
  dshPatchPath: string
  dshHome: string
  logPath: string
  launchProcess(
    executablePath: string,
    args: string[],
    options: SpawnOptionsWithoutStdio
  ): HarnessChildProcess
  startupTimeoutMs?: number
  onChanged(snapshot: RuntimeSnapshot): void
}

export interface HarnessChildProcess extends EventEmitter {
  readonly stdout: NodeJS.ReadableStream
  readonly stderr: NodeJS.ReadableStream
  readonly exitCode: number | null
  kill(signal?: NodeJS.Signals): boolean
}

/**
 * Resolve the user's interactive login shell environment.
 *
 * Electron apps launched from macOS Finder/Spotlight inherit a minimal
 * environment from launchd that never sources the user's shell profile
 * (~/.zshenv, ~/.zprofile, ~/.zshrc). This leaves PATH without Homebrew,
 * mise shims, ~/.local/bin, etc., so CLIs like bun, lark-cli, and docker
 * are invisible to the Harness process and every subprocess it spawns.
 *
 * On Windows the same gap exists when tools are added via a PowerShell
 * profile ($PROFILE) rather than the user-level registry environment —
 * `cmd /c set` only sees registry vars, so we use PowerShell with the
 * profile loaded to capture the full set.
 *
 * This function shells out once to capture the full environment the user
 * would have in a terminal, and returns it for use as the Harness spawn
 * base. On any failure it falls back to `process.env` to preserve the
 * current behavior.
 *
 * The result is memoised for the process lifetime.
 */
let resolvedShellEnvironment: NodeJS.ProcessEnv | undefined

export function resolveShellEnvironment(): NodeJS.ProcessEnv {
  if (resolvedShellEnvironment !== undefined) return resolvedShellEnvironment

  try {
    if (process.platform === 'win32') {
      // PowerShell with the user profile loaded captures both registry
      // environment variables and any PATH additions sourced in $PROFILE
      // (e.g. conda activate, nvm use, scoop shim).  -OutputFormat Text
      // avoids BOM/XML wrapping.
      const output = execFileSync(
        'powershell',
        [
          '-NoLogo',
          '-NonInteractive',
          '-OutputFormat', 'Text',
          '-Command',
          // Dot-source the profile (suppress errors if it doesn't exist),
          // then emit NAME=VALUE for every environment variable.
          '. $PROFILE 2>$null; Get-ChildItem Env: | ForEach-Object { "$($_.Name)=$($_.Value)" }'
        ],
        {
          encoding: 'utf8',
          timeout: 15_000,
          stdio: ['ignore', 'pipe', 'ignore']
        }
      )
      resolvedShellEnvironment = parseEnvOutput(output, /\r?\n/)
    } else {
      // macOS / Linux: run a login + interactive shell so both .zprofile
      // (Homebrew, OrbStack) and .zshrc (mise shims, ~/.local/bin, cargo,
      // go, etc.) are sourced.  stderr is ignored to suppress prompt noise.
      const shell = process.env.SHELL ?? '/bin/sh'
      const output = execFileSync(shell, ['-l', '-i', '-c', 'env'], {
        encoding: 'utf8',
        timeout: 10_000,
        stdio: ['ignore', 'pipe', 'ignore']
      })
      resolvedShellEnvironment = parseEnvOutput(output, /\n/)
    }
  } catch {
    // Shell capture failed — stay silent and keep the inherited environment.
    resolvedShellEnvironment = process.env
  }

  return resolvedShellEnvironment
}

function parseEnvOutput(output: string, lineSeparator: RegExp): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const line of output.split(lineSeparator)) {
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    env[line.slice(0, eq)] = line.slice(eq + 1)
  }
  return env
}

export function buildHarnessArguments(port: number, patchPath?: string): string[] {
  return [
    'web',
    ...(patchPath ? ['--patch', patchPath] : []),
    // The desktop window is the only intended surface. Without this, Harness
    // hands the same loopback URL to the system browser on every launch.
    '--no-open',
    '--host',
    '127.0.0.1',
    '--port',
    String(port)
  ]
}

export function buildHarnessSpawnOptions(
  launchDirectory: string,
  dshHome: string,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env
): SpawnOptionsWithoutStdio {
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...parentEnvironment } = environment
  const pathKey = platform === 'win32' ? 'Path' : 'PATH'

  // ELECTRON_RUN_AS_NODE must not reach the Harness process itself: the macOS
  // utility process is launched with Chromium switches (--type=utility, …)
  // that Node rejects as bad options. The Harness entry re-declares Node mode
  // from the inside, for its children only.
  return {
    cwd: launchDirectory,
    env: {
      ...parentEnvironment,
      DSH_HOME: dshHome,
      NO_COLOR: '1',
      PNPM_MAX_WORKERS: '1',
      npm_config_child_concurrency: '1',
      npm_config_package_import_method: 'clone-or-copy',
      npm_config_side_effects_cache: 'false',
      PNPM_CONFIG_CHILD_CONCURRENCY: '1',
      PNPM_CONFIG_PACKAGE_IMPORT_METHOD: 'clone-or-copy',
      PNPM_CONFIG_SIDE_EFFECTS_CACHE: 'false',
      [pathKey]: environment[pathKey] ?? environment.PATH ?? ''
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  }
}

export function buildNodeArguments(
  nodeEntryPath: string,
  dshEntryPath: string,
  port: number,
  patchPath?: string
): string[] {
  return [
    '--expose-internals',
    nodeEntryPath,
    dshEntryPath,
    ...buildHarnessArguments(port, patchPath)
  ]
}

export function updateReadyStability(
  readySince: number | undefined,
  healthy: boolean,
  now: number,
  stabilityWindowMs = 500
): { readySince: number | undefined; ready: boolean } {
  if (!healthy) return { readySince: undefined, ready: false }
  const stableSince = readySince ?? now
  return {
    readySince: stableSince,
    ready: now - stableSince >= stabilityWindowMs
  }
}

export class HarnessRuntime {
  private child?: HarnessChildProcess
  private logStream?: WriteStream
  private phase: RuntimePhase = 'idle'
  private message = 'Harness is not running.'
  private launchDirectory?: string
  private url?: string
  private readonly logLines: string[] = []

  constructor(private readonly options: HarnessRuntimeOptions) {}

  snapshot(): RuntimeSnapshot {
    return {
      phase: this.phase,
      message: this.message,
      launchDirectory: this.launchDirectory,
      url: this.url,
      logs: [...this.logLines]
    }
  }

  async start(launchDirectory: string): Promise<void> {
    await this.stop()
    this.launchDirectory = launchDirectory
    this.url = undefined

    if (!existsSync(this.options.dshEntryPath)) {
      this.setState('failed', `Harness entry was not found: ${this.options.dshEntryPath}`)
      return
    }
    if (!existsSync(this.options.nodeExecutablePath)) {
      this.setState('failed', `Bundled Node.js runtime was not found: ${this.options.nodeExecutablePath}`)
      return
    }
    if (!existsSync(this.options.nodeEntryPath)) {
      this.setState('failed', `Harness diagnostic entry was not found: ${this.options.nodeEntryPath}`)
      return
    }
    if (!existsSync(this.options.dshPatchPath)) {
      this.setState('failed', `DSH Desktop patch was not found: ${this.options.dshPatchPath}`)
      return
    }

    await mkdir(this.options.dshHome, { recursive: true })
    await mkdir(dirname(this.options.logPath), { recursive: true })
    this.logStream ??= createWriteStream(this.options.logPath, { flags: 'a' })

    const port = await reservePort()
    const url = `http://127.0.0.1:${port}`
    const args = buildNodeArguments(
      this.options.nodeEntryPath,
      this.options.dshEntryPath,
      port,
      this.options.dshPatchPath
    )
    const startupTimeoutMs =
      this.options.startupTimeoutMs ?? (process.platform === 'win32' ? 120_000 : 45_000)

    this.writeLog(`\n[desktop] starting ${new Date().toISOString()}`)
    this.writeLog(`[desktop] launch directory ${launchDirectory}`)
    this.writeLog(`[desktop] endpoint ${url}`)
    this.setState('starting', 'Starting DeepSeek Harness…')

    let child: HarnessChildProcess
    try {
      child = this.options.launchProcess(
        this.options.nodeExecutablePath,
        args,
        buildHarnessSpawnOptions(
          launchDirectory,
          this.options.dshHome,
          process.platform,
          resolveShellEnvironment()
        )
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.writeLog(`[utility] launch failed: ${message}`)
      this.setState('failed', `Harness could not start: ${message}`)
      return
    }
    this.child = child

    child.stdout.on('data', (chunk: Buffer) => this.writeChunk('stdout', chunk))
    child.stderr.on('data', (chunk: Buffer) => this.writeChunk('stderr', chunk))
    child.once('spawn', () => this.writeLog('[desktop] Bundled Node.js Harness process started'))
    child.once('error', (error) => {
      this.writeLog(`[node] ${error.stack ?? error.message}`)
      if (this.child !== child) return
      this.child = undefined
      this.setState('failed', `Harness could not start: ${error.message}`)
    })
    child.once('exit', (code, signal) => {
      const detail = signal ? `signal ${signal}` : formatExitCode(code ?? -1)
      this.writeLog(`[node] Harness process exited (${detail})`)
      if (this.child !== child) return
      this.child = undefined
      const cause = extractFailureCause(this.logLines)
      this.setState(
        'failed',
        cause
          ? `Harness stopped unexpectedly (${detail}).
${cause}`
          : `Harness stopped unexpectedly (${detail}).`
      )
    })

    const startedAt = Date.now()
    const progressTimer = setInterval(
      () => this.writeLog(`[desktop] waiting for Harness (${Math.round((Date.now() - startedAt) / 1000)}s)`),
      10_000
    )
    const ready = await waitUntilReady(
      url,
      () => this.child === child && child.exitCode === null,
      startupTimeoutMs
    ).finally(() => clearInterval(progressTimer))

    if (this.child !== child) return
    if (!ready) {
      await this.stopChild(child)
      this.setState(
        'failed',
        `Harness did not become ready within ${Math.round(startupTimeoutMs / 1000)} seconds.`
      )
      return
    }

    this.url = url
    this.setState('ready', 'Harness is ready.')
  }

  async stop(): Promise<void> {
    const child = this.child
    if (!child) {
      this.closeLog()
      if (this.phase !== 'failed') this.setState('idle', 'Harness is not running.')
      return
    }

    this.setState('stopping', 'Stopping Harness…')
    this.child = undefined
    await this.stopChild(child)
    this.closeLog()
    this.url = undefined
    this.setState('idle', 'Harness is not running.')
  }

  private async stopChild(child: HarnessChildProcess): Promise<void> {
    if (child.exitCode !== null) return
    const exitPromise = new Promise<boolean>((resolve) =>
      child.once('exit', () => resolve(true))
    )
    child.kill('SIGTERM')
    const exited = await Promise.race([
      exitPromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4_000))
    ])
    if (!exited && child.exitCode === null) child.kill('SIGKILL')
  }

  private setState(phase: RuntimePhase, message: string): void {
    this.phase = phase
    this.message = message
    this.options.onChanged(this.snapshot())
  }

  private writeChunk(source: 'stdout' | 'stderr', chunk: Buffer): void {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
      if (line.length > 0) this.writeLog(`[${source}] ${line}`)
    }
  }

  /**
   * Record a line the desktop wants in the Harness log, including before a
   * launch: what happens to the profile between launches is exactly what
   * someone reading the log after a failed install needs to see.
   */
  note(line: string): void {
    if (!this.logStream) {
      try {
        mkdirSync(dirname(this.options.logPath), { recursive: true })
        this.logStream = createWriteStream(this.options.logPath, { flags: 'a' })
      } catch {
        // Keep the line in the in-memory buffer regardless.
      }
    }
    this.writeLog(line)
  }

  private writeLog(line: string): void {
    this.logLines.push(line)
    if (this.logLines.length > 200) this.logLines.splice(0, this.logLines.length - 200)
    this.logStream?.write(`${line}\n`)
  }

  private closeLog(): void {
    this.logStream?.end()
    this.logStream = undefined
  }
}

function latestHarnessAttemptLogs(logLines: readonly string[]): readonly string[] {
  for (let index = logLines.length - 1; index >= 0; index -= 1) {
    if (logLines[index]?.trimStart().startsWith('[desktop] starting ')) {
      return logLines.slice(index + 1)
    }
  }
  return logLines
}

export function extractFailureCause(logLines: readonly string[]): string | undefined {
  const stderrLines: string[] = []
  let dshEntryError: string | undefined
  let uncaughtError: string | undefined

  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    stderrLines.push(text)

    if (dshEntryError === undefined) {
      const m = text.match(/DSH entry failed:\s*(.+)/)
      if (m && m[1]) dshEntryError = m[1].trim()
    }

    if (uncaughtError === undefined) {
      const m1 = text.match(/uncaught exception:\s*(.+)/)
      if (m1 && m1[1]) {
        uncaughtError = m1[1].trim()
      } else {
        const m2 = text.match(/unhandled rejection:\s*(.+)/)
        if (m2 && m2[1]) uncaughtError = m2[1].trim()
      }
    }
  }

  if (dshEntryError) return dshEntryError
  if (uncaughtError) return uncaughtError

  for (let i = stderrLines.length - 1; i >= 0; i--) {
    const line = stderrLines[i]?.trim()
    if (!line) continue
    if (line.length < 200 && /\b(error|Error|ERROR|failed|Failed|FAILED)\b/.test(line)) {
      return line
    }
  }

  if (stderrLines.length > 0) {
    const last = stderrLines[stderrLines.length - 1]?.trim()
    if (last && last.length < 200) return last
  }

  return undefined
}

const CORE_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'])
const PACKAGE_REFERENCE_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

function isPackageReference(value: string): boolean {
  const candidate = value.trim()
  if (!candidate || candidate.includes(':')) return false
  return PACKAGE_REFERENCE_PATTERN.test(candidate)
}

function isActionablePluginReference(value: string): boolean {
  const candidate = value.trim()
  return (
    isPackageReference(candidate) &&
    !CORE_BUNDLES.has(candidate) &&
    !candidate.startsWith('@deepseek-ai/')
  )
}

function extractPluginReferences(
  logLines: readonly string[],
  accepts: (value: string) => boolean
): string[] {
  const plugins = new Set<string>()

  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)

    const m1 = text.match(/failed to apply loader entry [^\s]+ \((@[^)]+|[^)]+)\)/i)
    if (m1 && m1[1] && accepts(m1[1])) {
      plugins.add(m1[1].trim())
    }

    const m2 = text.match(/cannot resolve profile bundle ["']([^"']+)["']/i)
    if (m2 && m2[1] && accepts(m2[1])) {
      plugins.add(m2[1].trim())
    }

    const m3 = text.match(/profile bundle ["']([^"']+)["'] declares no dsh\.bundle/i)
    if (m3 && m3[1] && accepts(m3[1])) {
      plugins.add(m3[1].trim())
    }

    const m4 = text.match(/failed to import loader entry [^\s]+ \((@[^)]+|[^)]+)\)/i)
    if (m4 && m4[1] && accepts(m4[1])) {
      plugins.add(m4[1].trim())
    }

    const m5 = text.match(/plugin\(s\) failed to load:\s*([a-zA-Z0-9@/_-]+)/i)
    if (m5 && m5[1] && accepts(m5[1])) {
      plugins.add(m5[1].trim())
    }

    const bootFailureLines = text.split(/\r?\n/).map((value) => value.trim())
    const bootFailureTitle = bootFailureLines.findIndex((value) => value === 'Failed to load plugins')
    if (bootFailureTitle >= 0) {
      for (const candidate of bootFailureLines.slice(bootFailureTitle + 1)) {
        if (accepts(candidate)) plugins.add(candidate)
      }
    }
  }

  return [...plugins]
}

export function extractPluginFailureReferences(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isPackageReference)
}

export function extractOffendingPlugins(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isActionablePluginReference)
}

export function extractDuplicateLoaderEntryId(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const match = line.slice(8).match(/duplicate loader entry id:\s*["']?([^\s"']+)["']?/i)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

export function extractSlotConflictName(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    const loaderMatch = text.match(
      /single slot\s+["']([^"']+)["']\s+already has a registration/i
    )
    if (loaderMatch?.[1]) return loaderMatch[1].trim()
    const rendererMatch = text.match(
      /UI slot\s+["']([^"']+)["']\s+has duplicate registrations/i
    )
    if (rendererMatch?.[1]) return rendererMatch[1].trim()
  }
  return undefined
}

export function extractOffendingPlugin(logLines: readonly string[]): string | undefined {
  return extractOffendingPlugins(logLines)[0]
}

export function formatExitCode(code: number): string {
  const unsigned = code >>> 0
  const hexadecimal = `0x${unsigned.toString(16).padStart(8, '0').toUpperCase()}`
  if (unsigned === 0xffff7003) {
    return `exit code ${unsigned} (${hexadecimal}, Crashpad handler unavailable)`
  }
  return `exit code ${code} (${hexadecimal})`
}

async function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not reserve a local port.'))
        return
      }
      const { port } = address
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function waitUntilReady(
  url: string,
  isAlive: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const stabilityWindowMs = 500
  let readySince: number | undefined
  while (Date.now() < deadline && isAlive()) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1_000) })
      const stability = updateReadyStability(
        readySince,
        response.status >= 200 && response.status < 500,
        Date.now(),
        stabilityWindowMs
      )
      readySince = stability.readySince
      if (stability.ready) return true
    } catch {
      // The server is expected to reject connections while it is booting.
      readySince = updateReadyStability(readySince, false, Date.now()).readySince
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}
