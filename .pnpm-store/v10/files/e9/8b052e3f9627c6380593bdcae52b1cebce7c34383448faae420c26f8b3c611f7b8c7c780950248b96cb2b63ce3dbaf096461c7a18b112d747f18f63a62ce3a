import { Stats } from 'fs';
import { IOptions } from './types/glob';
export type CrawledFileType = {
    type: 'file' | 'directory' | 'link';
    stat: Pick<Stats, 'mode' | 'size'>;
    transformed?: {
        path: string;
        stat: Stats;
    };
};
export declare function determineFileType(filename: string): Promise<CrawledFileType | null>;
export declare function crawl(dir: string, options: IOptions): Promise<readonly [string[], Record<string, CrawledFileType>]>;
