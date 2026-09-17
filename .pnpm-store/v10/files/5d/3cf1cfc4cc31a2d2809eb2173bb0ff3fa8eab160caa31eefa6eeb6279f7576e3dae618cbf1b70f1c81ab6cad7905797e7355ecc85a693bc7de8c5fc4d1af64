/** Signed GitHub HTTP adapter for the provider-neutral webhook runtime. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type * from './types.ts';
/** Cordis function-plugin name. */
export declare const name = "webhook-github";
/** Host services required before the exact route can register. */
export declare const inject: string[];
/** Required GitHub ingress configuration. */
export interface Config {
    /** Adapter instance name carried to rules. */
    readonly source: string;
    /** Exact absolute route path. */
    readonly path: string;
    /** Credential reference containing the shared webhook secret. */
    readonly secretEnv: string;
    /** Positive raw body ceiling in bytes. */
    readonly maxBodyBytes: number;
}
export declare const Config: z<Config>;
/** Register one signed GitHub endpoint on the injected WebServer. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map