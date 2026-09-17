import { HttpExecutor } from "builder-util-runtime";
import { ClientRequest } from "http";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
export declare class NodeHttpExecutor extends HttpExecutor<ClientRequest> {
    createRequest(options: any, callback: (response: any) => void): ClientRequest;
}
export declare const httpExecutor: NodeHttpExecutor;
export declare function buildGotProxyAgent(): {
    http?: HttpProxyAgent<string>;
    https?: HttpsProxyAgent<string>;
} | undefined;
