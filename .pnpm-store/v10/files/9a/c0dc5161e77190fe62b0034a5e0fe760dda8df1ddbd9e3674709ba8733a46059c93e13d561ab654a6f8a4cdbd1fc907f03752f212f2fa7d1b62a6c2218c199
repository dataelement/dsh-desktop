/** Host composition entry for the standard Composer Office PPT adapter. */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import * as officePpt from 'dsh-ppt';
/** Cordis plugin identity. */
export declare const name = "dsh-ppt-composer";
/** Host services required by the shared Office PPT implementation. */
export declare const inject: string[];
/** Shared Office PPT configuration. */
export type Config = officePpt.Config;
/** Validate the adapter with the shared Office PPT schema. */
export declare const Config: z<Config>;
/** Start the shared Office PPT Host plugin below the adapter fiber. */
export declare function apply(ctx: Context, config: Config): Promise<void>;