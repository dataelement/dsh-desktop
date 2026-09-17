import type { Webhooks } from "../index.ts";
import type { MiddlewareOptions } from "./types.ts";
type CreateMiddlewareOptions = {
    handleResponse: (body: string | null, status?: number, headers?: Record<string, string>, response?: any) => any;
    getPayload: (request: Request) => Promise<string>;
    getRequestHeader: <T = string>(request: Request, key: string) => T;
};
type IncomingMessage = any;
type ServerResponse = any;
export declare function createMiddleware(options: CreateMiddlewareOptions): (webhooks: Webhooks, options: Required<MiddlewareOptions>) => (request: IncomingMessage, response?: ServerResponse, next?: Function) => Promise<any>;
export {};
