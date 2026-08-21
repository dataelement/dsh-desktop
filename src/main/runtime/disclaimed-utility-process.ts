import { EventEmitter } from 'node:events'
import type { SpawnOptionsWithoutStdio } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { UtilityProcess } from 'electron'
import type { HarnessChildProcess } from './harness-runtime'

interface UtilityProcessLauncher {
  fork(modulePath: string, args?: string[], options?: Electron.ForkOptions): UtilityProcess
}

export interface DisclaimedUtilityProcessSpec {
  modulePath: string
  args: string[]
  options: Electron.ForkOptions
}

export function buildDisclaimedUtilityProcessSpec(
  nodeArguments: readonly string[],
  spawnOptions: SpawnOptionsWithoutStdio,
  disclaim = true
): DisclaimedUtilityProcessSpec {
  const [internalLoaderFlag, modulePath, ...args] = nodeArguments
  if (internalLoaderFlag !== '--expose-internals' || !modulePath) {
    throw new Error('Unexpected Harness Node arguments for the macOS utility process.')
  }

  return {
    modulePath,
    args,
    options: {
      cwd:
        typeof spawnOptions.cwd === 'string'
          ? spawnOptions.cwd
          : spawnOptions.cwd
            ? fileURLToPath(spawnOptions.cwd)
            : undefined,
      env: definedEnvironment(spawnOptions.env),
      execArgv: [internalLoaderFlag],
      stdio: 'pipe',
      serviceName: 'DSH Harness',
      // Harness loads user-installed plugins and can launch third-party tools.
      // Keep their TCC requests out of DSH Desktop's responsibility chain in production.
      disclaim
    }
  }
}

export function launchDisclaimedUtilityProcess(
  launcher: UtilityProcessLauncher,
  nodeArguments: readonly string[],
  spawnOptions: SpawnOptionsWithoutStdio,
  disclaim = true
): HarnessChildProcess {
  const spec = buildDisclaimedUtilityProcessSpec(nodeArguments, spawnOptions, disclaim)
  return new UtilityProcessAdapter(
    launcher.fork(spec.modulePath, spec.args, spec.options)
  )
}

function definedEnvironment(environment: NodeJS.ProcessEnv | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(environment ?? {}).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  )
}

class UtilityProcessAdapter extends EventEmitter implements HarnessChildProcess {
  readonly stdout: NodeJS.ReadableStream
  readonly stderr: NodeJS.ReadableStream
  exitCode: number | null = null

  constructor(private readonly child: UtilityProcess) {
    super()
    if (!child.stdout || !child.stderr) {
      child.kill()
      throw new Error('The DSH Harness utility process did not expose piped output.')
    }
    this.stdout = child.stdout
    this.stderr = child.stderr

    child.once('spawn', () => this.emit('spawn'))
    child.once('error', (type, location, report) => {
      const detail = [type, location, report].filter(Boolean).join(': ')
      this.emit('error', new Error(`Harness utility process failed: ${detail}`))
    })
    child.once('exit', (code) => {
      this.exitCode = code
      this.emit('exit', code, null)
    })
  }

  kill(signal?: NodeJS.Signals): boolean {
    if (signal === 'SIGKILL' && this.child.pid !== undefined) {
      try {
        process.kill(this.child.pid, signal)
        return true
      } catch {
        return false
      }
    }
    return this.child.kill()
  }
}
