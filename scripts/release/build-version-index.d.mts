export interface VersionIndexEntry {
  [key: string]: unknown
  version: string
  tag: string
  archiveUrl: string
}

export interface VersionIndex {
  [key: string]: unknown
  generatedAt: string
  versions: VersionIndexEntry[]
}

/** Append archive versions while preserving a validated existing catalog and its metadata. */
export function buildVersionIndex(archiveDirNames: string[], previous?: unknown): VersionIndex
