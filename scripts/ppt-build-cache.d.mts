import type { PptPackageStage } from './ppt-package-projection.mjs'

export const PPT_PACKAGES: readonly string[]
export const PPT_BUILD_INPUTS: readonly string[]

export interface PptBuildLocation {
  outputRoot: string
  nodeModulesRoot: string
  fingerprint: string
}

export function fingerprintInputs(root: string, inputs?: readonly string[]): Promise<string>
export function planPptBuild(options: PptBuildLocation): Promise<'full' | 'project' | 'fresh'>
export function recordPptBuild(options: PptBuildLocation): Promise<void>
export function stagedPptPackages(outputRoot: string): PptPackageStage[]
