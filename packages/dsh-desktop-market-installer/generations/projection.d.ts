export interface ProjectionResult {
  linked: string[]
  unlinked: string[]
  bundles: string[]
}

export function projectGenerations(dshHome: string, profile?: string): Promise<ProjectionResult>
