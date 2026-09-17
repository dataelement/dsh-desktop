export interface IconInfo {
    file: string;
    size: number;
}
export type IconFormat = "icns" | "ico" | "set";
export interface IconConvertResult {
    icons: IconInfo[];
    isFallback: boolean;
    error?: string;
    errorCode?: string;
}
type IconConversionConfig = {
    sources: string[];
    fallbackSources: string[];
    roots: string[];
    format: IconFormat;
    outDir: string;
};
export declare function convertIcon({ sources, fallbackSources, roots, format, outDir }: IconConversionConfig): Promise<IconConvertResult>;
export declare function getPngSize(filePath: string): Promise<{
    width: number;
    height: number;
}>;
export declare function buildSourceCandidates(sources: string[], format: IconFormat): string[];
export {};
