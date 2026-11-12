export interface UpstreamModule {
  path: string
  upstream: string[]
  divergences: string[]
}

export interface UpstreamBaseline {
  repository: string
  commit: string
  dshVersion: string
  modules: UpstreamModule[]
  skipped: string[]
}

export interface BaselineError {
  code: 'version-mismatch' | 'missing-path'
  message: string
  path?: string
}

export interface UpstreamDiff {
  changes: Array<{ path: string, files: string[] }>
  unregistered: string[]
}

export function parseBaseline(value: unknown): UpstreamBaseline
export function resolvedDshVersion(lock: unknown): string
export function checkBaseline(
  baseline: UpstreamBaseline,
  options: { lockVersion: string, root: string }
): BaselineError[]
export function diffReport(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
  baseline: UpstreamBaseline
): UpstreamDiff
export function isUpstreamDesktopSource(file: string): boolean
export function ensureRepository(repository: string, cacheRoot: string): Promise<string>
export function readDesktopSources(repository: string, commit: string): Promise<Map<string, string>>
export function cacheDesktopSources(
  repository: string,
  commit: string,
  cacheRoot: string
): Promise<Map<string, string>>
