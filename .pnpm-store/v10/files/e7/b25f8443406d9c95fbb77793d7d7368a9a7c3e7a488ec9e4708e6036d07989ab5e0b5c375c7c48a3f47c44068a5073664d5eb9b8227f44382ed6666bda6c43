import type { AgentApp } from "../acp.js";
export interface TestHttpServer {
    readonly url: string;
    readonly wsUrl: string;
    readonly close: () => Promise<void>;
}
export declare function startTestServer(createAgent?: () => AgentApp, options?: {
    port?: number;
}): Promise<TestHttpServer>;
