export const WRANGLER_MAX_UPLOAD_BYTES: number
export const DEFAULT_MULTIPART_PART_SIZE: number
export const DEFAULT_MULTIPART_CONCURRENCY: number

export function selectUploadTransport(size: number): 'wrangler' | 'multipart'
export function assertMultipartReleaseKey(key: string, version: string): void
export function validateExistingImmutableResponse(options: {
  key: string
  localSize: number
  response: Response
}): void
export function fetchCloudflareWorker(
  input: string | URL,
  init?: RequestInit
): Promise<Response>
export function copyR2Object(options: {
  endpoint: string
  token: string
  version: string
  sourceKey: string
  targetKey: string
  contentType: string
  cacheControl: string
  fetchImpl?: typeof fetch
}): Promise<void>

export function uploadFileMultipart(options: {
  endpoint: string
  token: string
  version: string
  key: string
  source: string
  contentType: string
  cacheControl: string
  partSize?: number
  concurrency?: number
  maxPartAttempts?: number
  retryDelayMs?: number
  fetchImpl?: typeof fetch
  onProgress?: (progress: { key: string; completedBytes: number; totalBytes: number }) => void
}): Promise<void>
