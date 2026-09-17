import type { SignOptions } from "@electron/osx-sign/dist/cjs/types";
import { TmpDir } from "builder-util";
import { Nullish } from "builder-util-runtime";
export declare const appleCertificatePrefixes: string[];
export type CertType = "Developer ID Application" | "Developer ID Installer" | "3rd Party Mac Developer Application" | "3rd Party Mac Developer Installer" | "Mac Developer" | "Apple Development" | "Apple Distribution";
export interface CodeSigningInfo {
    keychainFile?: string | null;
}
export declare function isSignAllowed(isPrintWarn?: boolean): boolean;
export declare function reportError(isMas: boolean, certificateTypes: CertType[], qualifier: string | Nullish, keychainFile: string | Nullish, isForceCodeSigning: boolean): Promise<void>;
export interface CreateKeychainOptions {
    tmpDir: TmpDir;
    cscLink: string;
    cscKeyPassword: string;
    cscILink?: string | null;
    cscIKeyPassword?: string | null;
    currentDir: string;
}
export declare function removeKeychain(keychainFile: string, printWarn?: boolean): Promise<any>;
export declare function createKeychain({ tmpDir, cscLink, cscKeyPassword, cscILink, cscIKeyPassword, currentDir }: CreateKeychainOptions): Promise<CodeSigningInfo>;
export declare function sign(opts: SignOptions): Promise<void>;
export declare let findIdentityRawResult: Promise<Array<string>> | null;
export declare class Identity {
    readonly name: string;
    readonly hash?: string;
    constructor(name: string, hash?: string);
}
export declare function findIdentity(certType: CertType, qualifier?: string | null, keychain?: string | null): Promise<Identity | null>;
