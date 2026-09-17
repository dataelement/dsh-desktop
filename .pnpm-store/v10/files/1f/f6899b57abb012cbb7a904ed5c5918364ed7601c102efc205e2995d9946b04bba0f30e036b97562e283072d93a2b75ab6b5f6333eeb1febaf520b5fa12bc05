import { Filesystem, FilesystemFileEntry } from './filesystem';
import { CrawledFileType } from './crawlfs';
import { Stats } from 'fs';
export type InputMetadata = {
    [property: string]: CrawledFileType;
};
export type BasicFilesArray = {
    filename: string;
    unpack: boolean;
}[];
export type BasicStreamArray = {
    filename: string;
    streamGenerator: () => NodeJS.ReadableStream;
    mode: Stats['mode'];
    unpack: boolean;
    link: string | undefined;
}[];
export type FilesystemFilesAndLinks<T extends BasicFilesArray | BasicStreamArray> = {
    files: T;
    links: T;
};
export declare function writeFilesystem(dest: string, filesystem: Filesystem, lists: FilesystemFilesAndLinks<BasicFilesArray>, metadata: InputMetadata): Promise<NodeJS.WritableStream>;
export declare function streamFilesystem(dest: string, filesystem: Filesystem, lists: FilesystemFilesAndLinks<BasicStreamArray>): Promise<import("fs").WriteStream>;
export interface FileRecord extends FilesystemFileEntry {
    integrity: {
        hash: string;
        algorithm: 'SHA256';
        blocks: string[];
        blockSize: number;
    };
}
export type DirectoryRecord = {
    files: Record<string, DirectoryRecord | FileRecord>;
};
export type ArchiveHeader = {
    header: DirectoryRecord;
    headerString: string;
    headerSize: number;
};
export declare function readArchiveHeaderSync(archivePath: string): ArchiveHeader;
export declare function readFilesystemSync(archivePath: string): Filesystem;
export declare function uncacheFilesystem(archivePath: string): boolean;
export declare function uncacheAll(): void;
export declare function readFileSync(filesystem: Filesystem, filename: string, info: FilesystemFileEntry): Buffer;
