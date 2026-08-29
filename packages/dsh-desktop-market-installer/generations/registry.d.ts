export interface Generation {
  id: string
  pluginName: string
  version: string
  directory: string
}

export interface RegistryLayout {
  root: string
  generations: string
  staging: string
  trash: string
  desiredPointer: string
  lastKnownGoodPointer: string
  lockFile: string
}

export function registryLayout(dshHome: string): RegistryLayout
export function ensureRegistryDirectories(dshHome: string): Promise<RegistryLayout>
export function generationId(pluginName: string, version: string, lockfileText: string): string
export function withRegistryLock<T>(
  dshHome: string,
  run: () => Promise<T>,
  options?: { staleAfterMs?: number; retryMs?: number; timeoutMs?: number }
): Promise<T>
export function writeGenerationMeta(
  directory: string,
  meta: { pluginName: string; version: string }
): Promise<void>
export function listGenerations(dshHome: string): Promise<Generation[]>
export function readDesired(dshHome: string): Promise<string[]>
export function readLastKnownGood(dshHome: string): Promise<string[]>
export function writeDesired(dshHome: string, generationIds: string[]): Promise<void>
export function commitLastKnownGood(dshHome: string): Promise<void>
export function revertToLastKnownGood(dshHome: string): Promise<string[]>
export function disableGeneration(dshHome: string, pluginName: string): Promise<boolean>
export function isGenerationPlugin(dshHome: string, pluginName: string): Promise<boolean>
export function resolveEnabledGenerations(dshHome: string): Promise<Map<string, Generation>>
export function collectUnreferencedGenerations(dshHome: string): Promise<string[]>
export function sweepRegistry(dshHome: string): Promise<{ removed: string[]; failed: string[] }>
