export interface HeaderHash {
    algorithm: 'SHA256';
    hash: string;
}
export interface AsarIntegrity {
    [key: string]: HeaderHash;
}
export declare function computeIntegrityData(contentsPath: string): Promise<AsarIntegrity>;
