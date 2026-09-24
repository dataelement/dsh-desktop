export interface PackageResult {
  exitCode: number
  output: string
  truncated: boolean
  logPath: string
}

export interface ProfileBundleInstallRequest {
  spec: string
  kind: 'registry' | 'path' | 'git' | 'tarball'
  path?: string
  expectedName?: string
  registry?: string
  expectedVersion?: string
  autoInstallPeers?: boolean
  minimumReleaseAge?: number
  signal?: AbortSignal
  onOutput?(text: string, stream: 'stdout' | 'stderr'): void
}

export interface ProfileBundlePackageBackend {
  install(request: ProfileBundleInstallRequest): Promise<{
    packageResult: PackageResult
    bundle?: string
    replaced?: boolean
    pendingBuilds?: string[]
    rollback?(): Promise<void>
    commit?(): void
  }>
  remove(request: {
    name: string
    signal?: AbortSignal
    onOutput?(text: string, stream: 'stdout' | 'stderr'): void
  }): Promise<{ packageResult: PackageResult }>
}

export function createGenerationPackageBackend(options: {
  dshHome: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  environment?: NodeJS.ProcessEnv
  spawnProcess?: unknown
  runInstall?: unknown
}): ProfileBundlePackageBackend
