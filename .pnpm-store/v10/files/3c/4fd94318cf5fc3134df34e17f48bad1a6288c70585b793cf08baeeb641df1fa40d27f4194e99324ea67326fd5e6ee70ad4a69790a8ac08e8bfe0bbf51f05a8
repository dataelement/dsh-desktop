type OAuthDeviceCodeIncompletePollResult = {
    status: "pending";
} | {
    status: "slow_down";
    intervalSeconds?: number;
} | {
    status: "failed";
    message: string;
};
export type OAuthDeviceCodePollResult<T> = OAuthDeviceCodeIncompletePollResult | {
    status: "complete";
    value: T;
};
export type OAuthDeviceCodePollOptions<T> = {
    intervalSeconds?: number;
    expiresInSeconds?: number;
    waitBeforeFirstPoll?: boolean;
    poll: () => Promise<OAuthDeviceCodePollResult<T>>;
    signal: AbortSignal;
};
export declare function abortableSleep(ms: number, signal: AbortSignal, cancelMessage: string): Promise<void>;
export declare function pollOAuthDeviceCodeFlow<T>(options: OAuthDeviceCodePollOptions<T>): Promise<T>;
export {};
//# sourceMappingURL=device-code.d.ts.map