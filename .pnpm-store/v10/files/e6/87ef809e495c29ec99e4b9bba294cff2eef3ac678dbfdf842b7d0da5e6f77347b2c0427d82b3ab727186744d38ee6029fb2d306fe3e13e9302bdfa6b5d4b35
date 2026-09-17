import { Stats } from "fs-extra";
export interface ReadAsarHeader {
    readonly header: string;
    readonly size: number;
}
export interface NodeIntegrity {
    algorithm: "SHA256";
    hash: string;
    blockSize: number;
    blocks: Array<string>;
}
export declare class Node {
    files?: Record<string, Node>;
    unpacked?: boolean;
    size?: number;
    offset?: string;
    executable?: boolean;
    link?: string;
    integrity?: NodeIntegrity;
}
export declare class AsarFilesystem {
    readonly src: string;
    readonly header: Node;
    readonly headerSize: number;
    private offset;
    constructor(src: string, header?: Node, headerSize?: number);
    searchNodeFromDirectory(p: string, isCreate: boolean): Node | null;
    getOrCreateNode(p: string): Node;
    addFileNode(file: string, dirNode: Node, size: number, unpacked: boolean, stat: Stats, integrity?: NodeIntegrity): Node;
    getNode(p: string): Node | null;
    getFile(p: string, followLinks?: boolean): Node;
    readJson(file: string): Promise<any>;
    readFile(file: string): Promise<Buffer>;
    private newNode;
}
export declare function readAsarHeader(archive: string): Promise<ReadAsarHeader>;
export declare function readAsar(archive: string): Promise<AsarFilesystem>;
export declare function readAsarJson(archive: string, file: string): Promise<any>;
