import type { ChildProcess } from 'node:child_process'
import type { Generation } from './registry'

export interface GenerationInstallOptions {
  dshHome: string
  profile?: string
  strictDepBuilds?: boolean
  /** Explicit market peer policy; otherwise inherit the Profile's explicit boolean. */
  autoInstallPeers?: boolean
  minimumReleaseAge?: number
  expectedVersion?: string
  pluginSpec: string
  /** Package name expected after installing a non-registry or aliased spec. */
  expectedPluginName?: string
  /** Original dependency declaration retained as generation provenance. */
  sourceSpec?: string
  /** Exact installed tree copied into staging for non-registry sources. */
  sourceDirectory?: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /**
   * Registry to pin the staging install to, keeping the source pnpm fetches
   * from aligned with the source the market read metadata from. Omit to leave
   * pnpm on whatever `~/.npmrc` says.
   */
  registry?: string | null
  /**
   * Idle ceiling for the pnpm subprocess: killed after this long with no
   * output (default 90 seconds). Continuous progress re-arms the clock, so a
   * large download is no longer bounded by one total duration (#851). Only a
   * safe positive integer overrides the default; anything else is ignored.
   */
  installTimeoutMs?: number
  /**
   * Absolute per-phase ceiling regardless of progress (default 6 minutes):
   * ends a process that keeps emitting output but never finishes. Both phases
   * plus staging stay inside the registry lock budget (15-minute waiters,
   * 20-minute stale deadline). Only a safe positive integer overrides it.
   */
  installHardTimeoutMs?: number
  spawnProcess?: unknown
  environment?: NodeJS.ProcessEnv
  onTrace?: (line: string) => void
  onOutput?: (chunk: string) => void
  registerChild?: (child: ChildProcess) => void
  /** A second phase fills providers from the staged manifest using the existing lock. */
  runInstall?: (stagingDir: string, phase?: 'peers') => Promise<{ code: number; output: string }>
}

export interface GenerationInstallResult {
  ok: boolean
  generation?: Generation
  hoisted?: string[]
  detail?: string
}

export function installGeneration(
  options: GenerationInstallOptions
): Promise<GenerationInstallResult>

export function installPnpmArguments(
  options: Pick<
    GenerationInstallOptions,
    | 'pnpmEntryPath'
    | 'pluginSpec'
    | 'registry'
    | 'autoInstallPeers'
    | 'strictDepBuilds'
    | 'minimumReleaseAge'
    | 'environment'
  > & { installPhase?: 'peers' },
  env?: NodeJS.ProcessEnv,
  platform?: NodeJS.Platform
): string[]

export function generationBuildApprovals(workspaceYaml: string): string[]

export function pinnedGitBuildApproval(
  pluginName: string,
  pluginSpec: string,
  approvals: string[]
): string | undefined

export function verifyGenerationPeers(
  dshHome: string,
  generation: Generation,
  options?: { dshEntryPath?: string }
): Promise<{ ok: boolean; problems: string[] }>
