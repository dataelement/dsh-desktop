import { FileIntegrity } from './integrity';
import { CrawledFileType } from './crawlfs';
export type EntryMetadata = {
    unpacked?: boolean;
};
export type FilesystemDirectoryEntry = {
    files: Record<string, FilesystemEntry>;
} & EntryMetadata;
export type FilesystemFileEntry = {
    unpacked: boolean;
    executable: boolean;
    offset: string;
    size: number;
    integrity: FileIntegrity;
} & EntryMetadata;
export type FilesystemLinkEntry = {
    link: string;
} & EntryMetadata;
export type FilesystemEntry = FilesystemDirectoryEntry | FilesystemFileEntry | FilesystemLinkEntry;
export declare class Filesystem {
    private src;
    private header;
    private headerSize;
    private offset;
    constructor(src: string);
    getRootPath(): string;
    getHeader(): FilesystemEntry;
    getHeaderSize(): number;
    setHeader(header: FilesystemEntry, headerSize: number): void;
    searchNodeFromDirectory(p: string): FilesystemEntry;
    searchNodeFromPath(p: string): FilesystemEntry;
    insertDirectory(p: string, shouldUnpack: boolean): Record<string, FilesystemEntry>;
    insertFile(p: string, streamGenerator: () => NodeJS.ReadableStream, shouldUnpack: boolean, file: CrawledFileType, options?: {
        transform?: (filePath: string) => NodeJS.ReadWriteStream | void;
    }): Promise<void>;
    insertLink(p: string, shouldUnpack: boolean, parentPath?: string, symlink?: string, // /var/tmp => /private/var
    src?: string): string;
    private resolveLink;
    listFiles(options?: {
        isPack: boolean;
    }): string[];
    getNode(p: string, followLinks?: boolean): FilesystemEntry;
    getFile(p: string, followLinks?: boolean): FilesystemEntry;
}
