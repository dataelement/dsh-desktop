import { DownloadOptions, HttpExecutor } from "builder-util-runtime";
import type { AuthInfo } from "electron";
import { RequestOptions } from "http";
import Session = Electron.Session;
import ClientRequest = Electron.ClientRequest;
export type LoginCallback = (username: string, password: string) => void;
export declare const NET_SESSION_NAME = "electron-updater";
export declare function getNetSession(): Session;
export declare class ElectronHttpExecutor extends HttpExecutor<Electron.ClientRequest> {
    private readonly proxyLoginCallback?;
    private cachedSession;
    constructor(proxyLoginCallback?: ((authInfo: AuthInfo, callback: LoginCallback) => void) | undefined);
    download(url: URL, destination: string, options: DownloadOptions): Promise<string>;
    createRequest(options: any, callback: (response: any) => void): Electron.ClientRequest;
    protected addRedirectHandlers(request: ClientRequest, options: RequestOptions, reject: (error: Error) => void, redirectCount: number, handler: (options: RequestOptions) => void): void;
}
