export declare function zipEntries(entries: Record<string, Buffer | { data: Buffer; executable?: boolean }>): Buffer
export declare function packEnterprisePlugin(config: { plugin: Record<string, unknown>; targets: Record<string, string> }, configDirectory?: string): Promise<Buffer>
