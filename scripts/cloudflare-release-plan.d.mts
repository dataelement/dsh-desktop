export type CloudflareUploadPhase = 'immutable' | 'stable' | 'metadata'

export interface CloudflareUploadEntry {
  phase: CloudflareUploadPhase
  source: string
  key: string
  contentType: string
  cacheControl: string
}

export interface CloudflareReleasePlanOptions {
  version: string
  tag?: string
  assetDirectory: string
  outputDirectory: string
}

export function buildCloudflareReleasePlan(
  options: CloudflareReleasePlanOptions
): Promise<CloudflareUploadEntry[]>
