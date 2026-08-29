import type { ChildProcess } from 'node:child_process'
import type { Generation } from './registry'

export interface GenerationInstallOptions {
  dshHome: string
  pluginSpec: string
  nodeExecutablePath: string
  pnpmEntryPath: string
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

export function verifyGenerationPeers(
  dshHome: string,
  generation: Generation
): Promise<{ ok: boolean; problems: string[] }>
