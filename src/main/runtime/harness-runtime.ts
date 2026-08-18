import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process'
import { createWriteStream, existsSync, type WriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import type { RuntimePhase, RuntimeSnapshot } from '../../shared/contracts'
import { disableIncompatibleUserPlugins } from './plugin-recovery'

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
  ): ChildProcessWithoutNullStreams
  startupTimeoutMs?: number
  onChanged(snapshot: RuntimeSnapshot): void
}

export function buildHarnessArguments(
  port: number,
  patchPath?: string
): string[] {
  return [
    'web',
    ...(patchPath ? ['--patch', patchPath] : []),
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

  return {
    cwd: launchDirectory,
    env: {
      ...parentEnvironment,
      DSH_HOME: dshHome,
      NO_COLOR: '1',
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

export class HarnessRuntime {
  private child?: ChildProcessWithoutNullStreams
  private logStream?: WriteStream
  private phase: RuntimePhase = 'idle'
  private message = 'Harness is not running.'
  private launchDirectory?: string
  private url?: string
  private disabledPlugins: string[] = []
  private readonly logLines: string[] = []

  constructor(private readonly options: HarnessRuntimeOptions) {}

  snapshot(): RuntimeSnapshot {
    return {
      phase: this.phase,
      message: this.message,
      launchDirectory: this.launchDirectory,
      url: this.url,
      disabledPlugins: this.disabledPlugins.length > 0 ? [...this.disabledPlugins] : undefined,
      logs: [...this.logLines]
    }
  }

  async start(launchDirectory: string): Promise<void> {
    await this.stop()
    this.launchDirectory = launchDirectory
    this.url = undefined
    this.disabledPlugins = []

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
    this.logStream = createWriteStream(this.options.logPath, { flags: 'a' })

    const startupTimeoutMs =
      this.options.startupTimeoutMs ?? (process.platform === 'win32' ? 120_000 : 45_000)

    this.writeLog(`\n[desktop] starting ${new Date().toISOString()}`)
    this.writeLog(`[desktop] launch directory ${launchDirectory}`)
    this.setState('starting', 'Starting DeepSeek Harness…')

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const port = await reservePort()
      const url = `http://127.0.0.1:${port}`
      const args = buildNodeArguments(
        this.options.nodeEntryPath,
        this.options.dshEntryPath,
        port,
        this.options.dshPatchPath
      )
      this.writeLog(`[desktop] endpoint ${url}`)

      let child: ChildProcessWithoutNullStreams
      try {
        child = this.options.launchProcess(
          this.options.nodeExecutablePath,
          args,
          buildHarnessSpawnOptions(launchDirectory, this.options.dshHome)
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.writeLog(`[utility] launch failed: ${message}`)
        this.setState('failed', `Harness could not start: ${message}`)
        return
      }
      this.child = child

      let startupComplete = false
      let failureMessage: string | undefined
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk: Buffer) => {
        stdout = `${stdout}${chunk.toString('utf8')}`.slice(-32 * 1024)
        this.writeChunk('stdout', chunk)
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString('utf8')}`.slice(-128 * 1024)
        this.writeChunk('stderr', chunk)
      })
      child.once('spawn', () => this.writeLog('[desktop] Bundled Node.js Harness process started'))
      child.once('error', (error) => {
        this.writeLog(`[node] ${error.stack ?? error.message}`)
        if (this.child !== child) return
        this.child = undefined
        failureMessage = `Harness could not start: ${error.message}`
        if (startupComplete) this.setState('failed', failureMessage)
      })
      child.once('exit', (code, signal) => {
        const detail = signal ? `signal ${signal}` : formatExitCode(code ?? -1)
        this.writeLog(`[node] Harness process exited (${detail})`)
        if (this.child !== child) return
        this.child = undefined
        failureMessage = `Harness stopped unexpectedly (${detail}).`
        if (startupComplete) this.setState('failed', failureMessage)
      })

      const startedAt = Date.now()
      const progressTimer = setInterval(
        () => this.writeLog(`[desktop] waiting for Harness (${Math.round((Date.now() - startedAt) / 1000)}s)`),
        10_000
      )
      const ready = await waitUntilReady(
        url,
        () => this.child === child && child.exitCode === null,
        () => stdout.includes('[harness-node] DSH entry loaded'),
        startupTimeoutMs
      ).finally(() => clearInterval(progressTimer))

      if (this.child !== child) {
        if (this.phase === 'idle' || this.phase === 'stopping') return
        if (attempt === 0) {
          try {
            const disabled = await disableIncompatibleUserPlugins(this.options.dshHome, stderr)
            if (disabled.length > 0) {
              this.disabledPlugins = disabled
              this.writeLog(`[desktop] disabled incompatible plugins: ${disabled.join(', ')}`)
              this.writeLog('[desktop] retrying Harness startup once')
              continue
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.writeLog(`[desktop] plugin recovery failed: ${message}`)
          }
        }
        this.setState('failed', failureMessage ?? 'Harness stopped unexpectedly during startup.')
        return
      }
      if (!ready) {
        await this.stopChild(child)
        this.setState(
          'failed',
          `Harness did not become ready within ${Math.round(startupTimeoutMs / 1000)} seconds.`
        )
        return
      }

      startupComplete = true
      this.url = url
      this.setState('ready', 'Harness is ready.')
      return
    }
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

  private async stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
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
  isBooted: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline && isAlive()) {
    if (isBooted()) {
      try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1_000) })
        if (response.status >= 200 && response.status < 500) return true
      } catch {
        // The server is expected to reject connections while it is booting.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}
