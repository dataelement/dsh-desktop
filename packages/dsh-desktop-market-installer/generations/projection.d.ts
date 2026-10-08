export interface ProjectionResult {
  linked: string[]
  unlinked: string[]
  bundles: string[]
}

export interface PublishedGenerationManifest {
  plugins: string[]
  bundles: string[]
}

/** Error code of a live switch refused because pnpm still owns a real directory. */
export const REAL_DIRECTORY_IN_PLACE: string

export function projectGenerations(dshHome: string, profile?: string): Promise<ProjectionResult>
export function publishGenerationManifest(
  dshHome: string,
  profile?: string,
  options?: { syncBundles?: boolean }
): Promise<PublishedGenerationManifest>
export function exposeMissingGenerationLinks(dshHome: string, profile?: string): Promise<string[]>

export function publishInstalledGeneration(dshHome: string, pluginName: string, profile?: string, options?: { allowRealDirectory?: boolean; syncBundles?: boolean }): Promise<PublishedGenerationManifest>
