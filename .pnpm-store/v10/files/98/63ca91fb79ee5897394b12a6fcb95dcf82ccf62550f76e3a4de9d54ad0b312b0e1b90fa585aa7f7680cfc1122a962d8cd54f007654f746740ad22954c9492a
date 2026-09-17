import type { Agent, AgentApp, AgentSideConnection, AuthenticateRequest, AuthenticateResponse, CancelNotification, InitializeRequest, InitializeResponse, NewSessionRequest, NewSessionResponse, PromptRequest, PromptResponse } from "../acp.js";
export interface TestAgentOptions {
    readonly chunkCount?: number;
    readonly chunkDelayMs?: number;
    readonly enablePermission?: boolean;
}
export interface TestAgentAppOptions extends TestAgentOptions {
    readonly initialize?: (params: InitializeRequest) => Promise<InitializeResponse> | InitializeResponse;
    readonly onInitialize?: () => void;
    readonly newSession?: (params: NewSessionRequest) => Promise<NewSessionResponse> | NewSessionResponse;
}
export declare class TestAgent implements Agent {
    private readonly connection;
    private readonly chunkCount;
    private readonly chunkDelayMs;
    private readonly enablePermission;
    constructor(connection: AgentSideConnection, options?: TestAgentOptions);
    initialize(_params: InitializeRequest): Promise<InitializeResponse>;
    newSession(_params: NewSessionRequest): Promise<NewSessionResponse>;
    authenticate(_params: AuthenticateRequest): Promise<AuthenticateResponse | void>;
    prompt(params: PromptRequest): Promise<PromptResponse>;
    cancel(_params: CancelNotification): Promise<void>;
}
export declare function createTestAgentApp(options?: TestAgentAppOptions): AgentApp;
