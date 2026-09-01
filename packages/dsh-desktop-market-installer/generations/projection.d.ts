export interface ProjectionResult {
  linked: string[]
  unlinked: string[]
  bundles: string[]
}

export interface PublishedGenerationManifest {
  plugins: string[]
  bundles: string[]
}

export function projectGenerations(dshHome: string, profile?: string): Promise<ProjectionResult>
export function publishGenerationManifest(
  dshHome: string,
  profile?: string
): Promise<PublishedGenerationManifest>
export function exposeMissingGenerationLinks(dshHome: string, profile?: string): Promise<string[]>
