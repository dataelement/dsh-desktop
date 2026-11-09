export interface PptPackageStage {
  packageName: string
  source: string
}

export interface PptPackageProjectionOptions {
  nodeModulesRoot?: string
  beforeReplace?: (packageName: string, index: number) => void | Promise<void>
}

export function replaceInstalledPackages(
  stages: PptPackageStage[],
  options?: PptPackageProjectionOptions
): Promise<void>
