export interface BundleManifest {
  schema_version: number
  plugin: { name: string; version: string; display_name: string; description: string; publisher: string; license: string; desktop_min: string; permissions: string[]; services: string[]; changelog?: string }
  targets: Record<string, Record<string, string>>
}
export interface BundleIdentity { name: string; version: string; digest: string }
export interface OfflineGeneration { id: string; directory: string; pluginName: string; version: string; sourceSpec: string; manifest: BundleManifest }
export declare const MAX_ARCHIVE: number
export declare function sha256(data: Buffer | string): string
export declare function safePath(value: string): boolean
export declare function readBundleZip(bytes: Buffer): Map<string, { data: Buffer; executable: boolean }>
export declare function validateOfflineBundle(bytes: Buffer, expected: BundleIdentity, target: string): { manifest: BundleManifest; files: Map<string, { data: Buffer; executable: boolean }> }
export declare function installOfflineBundle(home: string, bytes: Buffer, expected: BundleIdentity, target: string): Promise<OfflineGeneration>
export declare function verifyInstalledBundle(generation: BundleIdentity & { directory: string }, target: string): Promise<{ manifest: BundleManifest }>
