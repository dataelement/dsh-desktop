import type { ChildProcess } from 'node:child_process'
import type { Generation } from './registry'

export interface GenerationInstallOptions {
  dshHome: string
  profile?: string
  pluginSpec: string
  /** Package name expected after installing a non-registry or aliased spec. */
  expectedPluginName?: string
  /** Original dependency declaration retained as generation provenance. */
  sourceSpec?: string
  /** Exact installed tree copied into staging for non-registry sources. */
  sourceDirectory?: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  /** Hard ceiling for the pnpm subprocess; defaults to 12 minutes. */
  installTimeoutMs?: number
  spawnProcess?: unknown
  environment?: NodeJS.ProcessEnv
  onTrace?: (line: string) => void
  onOutput?: (chunk: string) => void
  registerChild?: (child: ChildProcess) => void
  runInstall?: (stagingDir: string) => Promise<{ code: number; output: string }>
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

export function generationBuildApprovals(workspaceYaml: string): string[]

export function pinnedGitBuildApproval(
  pluginName: string,
  pluginSpec: string,
  approvals: string[]
): string | undefined

export function verifyGenerationPeers(
  dshHome: string,
  generation: Generation
): Promise<{ ok: boolean; problems: string[] }>
